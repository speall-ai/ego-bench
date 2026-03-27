/// <reference types="@webgpu/types" />

export class ReusableSingleFrameBuffers {
  private uniformBuffer: GPUBuffer | null = null;
  private pixelBuffer: GPUBuffer | null = null;
  private outputBuffer: GPUBuffer | null = null;
  private stagingBuffer: GPUBuffer | null = null;
  private uniformCapacity = 0;
  private pixelCapacity = 0;

  constructor(private readonly device: GPUDevice) {}

  ensure(pixelCount: number, uniformSize: number): {
    uniformBuffer: GPUBuffer;
    pixelBuffer: GPUBuffer;
    outputBuffer: GPUBuffer;
    stagingBuffer: GPUBuffer;
  } {
    const pixelBytes = pixelCount * 4;

    if (!this.uniformBuffer || uniformSize > this.uniformCapacity) {
      this.uniformBuffer?.destroy();
      this.uniformBuffer = this.device.createBuffer({
        size: uniformSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.uniformCapacity = uniformSize;
    }

    if (!this.pixelBuffer || pixelCount > this.pixelCapacity) {
      this.pixelBuffer?.destroy();
      this.outputBuffer?.destroy();
      this.stagingBuffer?.destroy();

      this.pixelBuffer = this.device.createBuffer({
        size: pixelBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.outputBuffer = this.device.createBuffer({
        size: pixelBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      this.stagingBuffer = this.device.createBuffer({
        size: pixelBytes,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      this.pixelCapacity = pixelCount;
    }

    return {
      uniformBuffer: this.uniformBuffer,
      pixelBuffer: this.pixelBuffer,
      outputBuffer: this.outputBuffer!,
      stagingBuffer: this.stagingBuffer!,
    };
  }

  destroy(): void {
    this.uniformBuffer?.destroy();
    this.pixelBuffer?.destroy();
    this.outputBuffer?.destroy();
    this.stagingBuffer?.destroy();
  }
}

export class ReusableOpticalFlowBuffers {
  private uniformBuffer: GPUBuffer | null = null;
  private currentBuffer: GPUBuffer | null = null;
  private previousBuffer: GPUBuffer | null = null;
  private outputBuffer: GPUBuffer | null = null;
  private stagingBuffer: GPUBuffer | null = null;
  private uniformCapacity = 0;
  private pixelCapacity = 0;
  private blockCapacity = 0;

  constructor(private readonly device: GPUDevice) {}

  ensure(totalPixels: number, totalBlocks: number, uniformSize: number): {
    uniformBuffer: GPUBuffer;
    currentBuffer: GPUBuffer;
    previousBuffer: GPUBuffer;
    outputBuffer: GPUBuffer;
    stagingBuffer: GPUBuffer;
  } {
    const pixelBytes = totalPixels * 4;
    const blockBytes = totalBlocks * 4;

    if (!this.uniformBuffer || uniformSize > this.uniformCapacity) {
      this.uniformBuffer?.destroy();
      this.uniformBuffer = this.device.createBuffer({
        size: uniformSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.uniformCapacity = uniformSize;
    }

    if (!this.currentBuffer || totalPixels > this.pixelCapacity) {
      this.currentBuffer?.destroy();
      this.previousBuffer?.destroy();

      this.currentBuffer = this.device.createBuffer({
        size: pixelBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.previousBuffer = this.device.createBuffer({
        size: pixelBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.pixelCapacity = totalPixels;
    }

    if (!this.outputBuffer || totalBlocks > this.blockCapacity) {
      this.outputBuffer?.destroy();
      this.stagingBuffer?.destroy();

      this.outputBuffer = this.device.createBuffer({
        size: blockBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      this.stagingBuffer = this.device.createBuffer({
        size: blockBytes,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
      this.blockCapacity = totalBlocks;
    }

    return {
      uniformBuffer: this.uniformBuffer,
      currentBuffer: this.currentBuffer!,
      previousBuffer: this.previousBuffer!,
      outputBuffer: this.outputBuffer!,
      stagingBuffer: this.stagingBuffer!,
    };
  }

  destroy(): void {
    this.uniformBuffer?.destroy();
    this.currentBuffer?.destroy();
    this.previousBuffer?.destroy();
    this.outputBuffer?.destroy();
    this.stagingBuffer?.destroy();
  }
}
