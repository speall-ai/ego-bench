/// <reference types="@webgpu/types" />

import type { FrameData } from '../types';
import shaderCode from './shaders/brightness.wgsl?raw';

export class BrightnessMetric {
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

  static async create(device: GPUDevice): Promise<BrightnessMetric> {
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

    return new BrightnessMetric(device, pipeline, bindGroupLayout);
  }

  async compute(frame: FrameData): Promise<number> {
    const pixelCount = frame.width * frame.height;
    const pixelData = new Uint32Array(new Uint8Array(frame.pixels).buffer);

    // Uniform buffer: pixel_count (u32)
    const uniformBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(uniformBuffer, 0, new Uint32Array([pixelCount]));

    // Input pixel buffer
    const pixelBuffer = this.device.createBuffer({
      size: pixelCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(pixelBuffer, 0, pixelData);

    // Output luminance buffer
    const outputBuffer = this.device.createBuffer({
      size: pixelCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Staging buffer for readback
    const stagingBuffer = this.device.createBuffer({
      size: pixelCount * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

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
    pass.dispatchWorkgroups(Math.ceil(pixelCount / 256));
    pass.end();

    commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, pixelCount * 4);
    this.device.queue.submit([commandEncoder.finish()]);

    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(stagingBuffer.getMappedRange());

    let sum = 0;
    for (let i = 0; i < pixelCount; i++) {
      sum += result[i];
    }
    const meanLuminance = sum / pixelCount;

    stagingBuffer.unmap();

    // Cleanup per-frame buffers
    uniformBuffer.destroy();
    pixelBuffer.destroy();
    outputBuffer.destroy();
    stagingBuffer.destroy();

    return meanLuminance * 100;
  }

  destroy(): void {
    // Pipeline and bind group layout are lightweight; no explicit destroy needed
  }
}
