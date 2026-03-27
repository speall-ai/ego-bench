/// <reference types="@webgpu/types" />

import type { FrameData } from '../types';
import shaderCode from './shaders/optical-flow.wgsl?raw';

const BLOCK_SIZE = 16;
const SEARCH_RANGE = 4;

export class OpticalFlowMetric {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  private constructor(
    device: GPUDevice,
    pipeline: GPUComputePipeline,
    bindGroupLayout: GPUBindGroupLayout
  ) {
    this.device = device;
    this.pipeline = pipeline;
    this.bindGroupLayout = bindGroupLayout;
  }

  static async create(device: GPUDevice): Promise<OpticalFlowMetric> {
    const shaderModule = device.createShaderModule({ code: shaderCode });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });

    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    return new OpticalFlowMetric(device, pipeline, bindGroupLayout);
  }

  async compute(current: FrameData, previous: FrameData): Promise<number> {
    const pixelCount = current.width * current.height;
    const currentData = new Uint32Array(new Uint8Array(current.pixels).buffer);
    const previousData = new Uint32Array(new Uint8Array(previous.pixels).buffer);

    const blocksX = Math.ceil(current.width / BLOCK_SIZE);
    const blocksY = Math.ceil(current.height / BLOCK_SIZE);
    const totalBlocks = blocksX * blocksY;

    // Uniform buffer: width, height, block_size, search_range (4x u32 = 16 bytes)
    const uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      uniformBuffer,
      0,
      new Uint32Array([current.width, current.height, BLOCK_SIZE, SEARCH_RANGE])
    );

    // Current frame buffer
    const currentBuffer = this.device.createBuffer({
      size: pixelCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(currentBuffer, 0, currentData);

    // Previous frame buffer
    const previousBuffer = this.device.createBuffer({
      size: pixelCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(previousBuffer, 0, previousData);

    // Output motion buffer
    const outputBuffer = this.device.createBuffer({
      size: totalBlocks * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Staging buffer for readback
    const stagingBuffer = this.device.createBuffer({
      size: totalBlocks * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: currentBuffer } },
        { binding: 2, resource: { buffer: previousBuffer } },
        { binding: 3, resource: { buffer: outputBuffer } },
      ],
    });

    const commandEncoder = this.device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(blocksX / 16), Math.ceil(blocksY / 16));
    pass.end();

    commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, totalBlocks * 4);
    this.device.queue.submit([commandEncoder.finish()]);

    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(stagingBuffer.getMappedRange());

    let sum = 0;
    for (let i = 0; i < totalBlocks; i++) {
      sum += result[i];
    }
    const meanMotion = sum / totalBlocks;

    stagingBuffer.unmap();

    // Cleanup per-frame buffers
    uniformBuffer.destroy();
    currentBuffer.destroy();
    previousBuffer.destroy();
    outputBuffer.destroy();
    stagingBuffer.destroy();

    // Convert to stability score: 0 motion = 100, 10+ pixels motion = 0
    return Math.max(0, Math.min(100, 100 - meanMotion * 10));
  }

  destroy(): void {
    // Pipeline and bind group layout are lightweight; no explicit destroy needed
  }
}
