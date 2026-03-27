struct Params {
  width: u32,
  height: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> pixels: array<u32>;
@group(0) @binding(2) var<storage, read_write> gradient: array<f32>;

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
    gradient[idx] = 0.0;
    return;
  }

  // Sample 3x3 neighborhood luminance
  let tl = luminance_at((y - 1u) * params.width + (x - 1u));
  let tc = luminance_at((y - 1u) * params.width + x);
  let tr = luminance_at((y - 1u) * params.width + (x + 1u));
  let ml = luminance_at(y * params.width + (x - 1u));
  let mr = luminance_at(y * params.width + (x + 1u));
  let bl = luminance_at((y + 1u) * params.width + (x - 1u));
  let bc = luminance_at((y + 1u) * params.width + x);
  let br = luminance_at((y + 1u) * params.width + (x + 1u));

  // Sobel Gx: [-1,0,1; -2,0,2; -1,0,1]
  let gx = -tl + tr - 2.0 * ml + 2.0 * mr - bl + br;

  // Sobel Gy: [-1,-2,-1; 0,0,0; 1,2,1]
  let gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;

  gradient[idx] = sqrt(gx * gx + gy * gy);
}
