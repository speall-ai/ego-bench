/// <reference types="@webgpu/types" />

import type { FrameData } from '../types';
import shaderCode from './shaders/sharpness.wgsl?raw';
import { toPackedPixels } from './pixel-buffer';
import { ReusableSingleFrameBuffers } from './buffer-cache';

export class SharpnessMetric {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;
  private buffers: ReusableSingleFrameBuffers;

  private constructor(
    device: GPUDevice,
    pipeline: GPUComputePipeline,
    bindGroupLayout: GPUBindGroupLayout
  ) {
    this.device = device;
    this.pipeline = pipeline;
    this.bindGroupLayout = bindGroupLayout;
    this.buffers = new ReusableSingleFrameBuffers(device);
  }

  static async create(device: GPUDevice): Promise<SharpnessMetric> {
    const shaderModule = device.createShaderModule({ code: shaderCode });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });

    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    return new SharpnessMetric(device, pipeline, bindGroupLayout);
  }

  async compute(frame: FrameData): Promise<number> {
    const pixelCount = frame.width * frame.height;
    const pixelData = toPackedPixels(frame.pixels);
    const { uniformBuffer, pixelBuffer, outputBuffer, stagingBuffer } = this.buffers.ensure(
      pixelCount,
      8,
    );

    this.device.queue.writeBuffer(uniformBuffer, 0, new Uint32Array([frame.width, frame.height]));
    this.device.queue.writeBuffer(pixelBuffer, 0, pixelData);

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: pixelBuffer } },
        { binding: 2, resource: { buffer: outputBuffer } },
      ],
    });

    const commandEncoder = this.device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(frame.width / 16), Math.ceil(frame.height / 16));
    pass.end();

    commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, pixelCount * 4);
    this.device.queue.submit([commandEncoder.finish()]);

    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(stagingBuffer.getMappedRange());

    // Compute variance of Laplacian values
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < pixelCount; i++) {
      sum += result[i];
      sumSq += result[i] * result[i];
    }
    const mean = sum / pixelCount;
    const variance = sumSq / pixelCount - mean * mean;

    stagingBuffer.unmap();

    return Math.min(100, variance * 500);
  }

  destroy(): void {
    this.buffers.destroy();
  }
}
