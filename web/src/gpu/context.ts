/// <reference types="@webgpu/types" />

export async function initGPU(): Promise<GPUDevice> {
  if (!navigator.gpu) {
    throw new Error(
      'WebGPU is not supported in this browser. Please use a browser with WebGPU support (Chrome 113+, Edge 113+, or Firefox Nightly).'
    );
  }

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
    ?? await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error(
      'Failed to obtain a WebGPU adapter. Your GPU may not be supported.'
    );
  }

  const device = await adapter.requestDevice();
  return device;
}
