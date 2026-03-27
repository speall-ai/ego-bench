struct Params {
  width: u32,
  height: u32,
  block_size: u32,
  search_range: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> current_frame: array<u32>;
@group(0) @binding(2) var<storage, read> previous_frame: array<u32>;
@group(0) @binding(3) var<storage, read_write> motion: array<f32>;

fn grayscale(packed: u32) -> f32 {
  let r = f32(packed & 0xFFu);
  let g = f32((packed >> 8u) & 0xFFu);
  let b = f32((packed >> 16u) & 0xFFu);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let blocks_x = (params.width + params.block_size - 1u) / params.block_size;
  let blocks_y = (params.height + params.block_size - 1u) / params.block_size;

  let bx = gid.x;
  let by = gid.y;

  if (bx >= blocks_x || by >= blocks_y) {
    return;
  }

  let block_origin_x = bx * params.block_size;
  let block_origin_y = by * params.block_size;

  var best_sad = 1e30;
  var best_dx = 0i;
  var best_dy = 0i;

  let sr = i32(params.search_range);

  for (var dy = -sr; dy <= sr; dy = dy + 1i) {
    for (var dx = -sr; dx <= sr; dx = dx + 1i) {
      var sad = 0.0;

      for (var py = 0u; py < params.block_size; py = py + 1u) {
        for (var px = 0u; px < params.block_size; px = px + 1u) {
          let cx = block_origin_x + px;
          let cy = block_origin_y + py;

          if (cx >= params.width || cy >= params.height) {
            continue;
          }

          let prev_x = i32(cx) + dx;
          let prev_y = i32(cy) + dy;

          if (prev_x < 0i || prev_x >= i32(params.width) || prev_y < 0i || prev_y >= i32(params.height)) {
            sad = sad + 255.0;
            continue;
          }

          let cur_val = grayscale(current_frame[cy * params.width + cx]);
          let prev_val = grayscale(previous_frame[u32(prev_y) * params.width + u32(prev_x)]);
          sad = sad + abs(cur_val - prev_val);
        }
      }

      if (sad < best_sad) {
        best_sad = sad;
        best_dx = dx;
        best_dy = dy;
      }
    }
  }

  let fdx = f32(best_dx);
  let fdy = f32(best_dy);
  motion[by * blocks_x + bx] = sqrt(fdx * fdx + fdy * fdy);
}
