export function toPackedPixels(pixels: Uint8Array): Uint32Array<ArrayBuffer> {
  return new Uint32Array(pixels.buffer as ArrayBuffer, pixels.byteOffset, pixels.byteLength / 4);
}
