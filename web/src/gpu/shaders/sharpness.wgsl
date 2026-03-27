struct Params {
  width: u32,
  height: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> pixels: array<u32>;
@group(0) @binding(2) var<storage, read_write> laplacian: array<f32>;

fn luminance_at(idx: u32) -> f32 {
  let packed = pixels[idx];
  let r = f32(packed & 0xFFu) / 255.0;
  let g = f32((packed >> 8u) & 0xFFu) / 255.0;
  let b = f32((packed >> 16u) & 0xFFu) / 255.0;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;

  if (x >= params.width || y >= params.height) {
    return;
  }

  let idx = y * params.width + x;

  // Border pixels output 0.0
  if (x == 0u || y == 0u || x == params.width - 1u || y == params.height - 1u) {
    laplacian[idx] = 0.0;
    return;
  }

  // Laplacian kernel: [0,1,0; 1,-4,1; 0,1,0]
  let top    = luminance_at((y - 1u) * params.width + x);
  let bottom = luminance_at((y + 1u) * params.width + x);
  let left   = luminance_at(y * params.width + (x - 1u));
  let right  = luminance_at(y * params.width + (x + 1u));
  let center = luminance_at(idx);

  laplacian[idx] = abs(top + bottom + left + right - 4.0 * center);
}
