/// <reference types="@webgpu/types" />

import type { FrameData } from '../types';
import shaderCode from './shaders/optical-flow.wgsl?raw';
import { toPackedPixels } from './pixel-buffer';
import { ReusableOpticalFlowBuffers } from './buffer-cache';

const BLOCK_SIZE = 16;
const SEARCH_RANGE = 4;

export class OpticalFlowMetric {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;
  private buffers: ReusableOpticalFlowBuffers;

  private constructor(
    device: GPUDevice,
    pipeline: GPUComputePipeline,
    bindGroupLayout: GPUBindGroupLayout
  ) {
    this.device = device;
    this.pipeline = pipeline;
    this.bindGroupLayout = bindGroupLayout;
    this.buffers = new ReusableOpticalFlowBuffers(device);
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
    const currentData = toPackedPixels(current.pixels);
    const previousData = toPackedPixels(previous.pixels);

    const blocksX = Math.ceil(current.width / BLOCK_SIZE);
    const blocksY = Math.ceil(current.height / BLOCK_SIZE);
    const totalBlocks = blocksX * blocksY;
    const {
      uniformBuffer,
      currentBuffer,
      previousBuffer,
      outputBuffer,
      stagingBuffer,
    } = this.buffers.ensure(pixelCount, totalBlocks, 16);

    this.device.queue.writeBuffer(
      uniformBuffer,
      0,
      new Uint32Array([current.width, current.height, BLOCK_SIZE, SEARCH_RANGE])
    );
    this.device.queue.writeBuffer(currentBuffer, 0, currentData);
    this.device.queue.writeBuffer(previousBuffer, 0, previousData);

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

    // Convert to stability score: 0 motion = 100, 10+ pixels motion = 0
    return Math.max(0, Math.min(100, 100 - meanMotion * 10));
  }

  destroy(): void {
    this.buffers.destroy();
  }
}
