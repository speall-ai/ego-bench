(module
  (memory (export "memory") 1)
  (global $heap (mut i32) (i32.const 0))

  (func $ensure_capacity (param $required_end i32)
    (local $capacity_bytes i32)
    memory.size
    i32.const 65536
    i32.mul
    local.set $capacity_bytes
    block $done
      loop $grow
        local.get $capacity_bytes
        local.get $required_end
        i32.ge_u
        br_if $done
        i32.const 1
        memory.grow
        drop
        local.get $capacity_bytes
        i32.const 65536
        i32.add
        local.set $capacity_bytes
        br $grow
      end
    end)

  (func (export "reset")
    i32.const 0
    global.set $heap)

  (func (export "alloc") (param $size i32) (result i32)
    (local $ptr i32)
    (local $end i32)
    global.get $heap
    local.set $ptr
    local.get $ptr
    local.get $size
    i32.add
    local.set $end
    local.get $end
    call $ensure_capacity
    local.get $end
    global.set $heap
    local.get $ptr)

  (func $luma (param $ptr i32) (result i32)
    local.get $ptr
    i32.load8_u
    i32.const 77
    i32.mul
    local.get $ptr
    i32.const 1
    i32.add
    i32.load8_u
    i32.const 150
    i32.mul
    i32.add
    local.get $ptr
    i32.const 2
    i32.add
    i32.load8_u
    i32.const 29
    i32.mul
    i32.add
    i32.const 8
    i32.shr_u)

  (func $abs_i32 (param $value i32) (result i32)
    local.get $value
    i32.const 0
    i32.lt_s
    if (result i32)
      i32.const 0
      local.get $value
      i32.sub
    else
      local.get $value
    end)

  (func (export "histogram16") (param $rgba_ptr i32) (param $pixel_count i32) (param $out_ptr i32)
    (local $i i32)
    (local $rgba_offset i32)
    (local $bin i32)
    (local $bin_ptr i32)

    i32.const 0
    local.set $i
    block $zero_done
      loop $zero
        local.get $i
        i32.const 16
        i32.ge_u
        br_if $zero_done
        local.get $out_ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        i32.const 0
        i32.store
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $zero
      end
    end

    i32.const 0
    local.set $i
    block $hist_done
      loop $hist
        local.get $i
        local.get $pixel_count
        i32.ge_u
        br_if $hist_done
        local.get $rgba_ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        local.set $rgba_offset
        local.get $rgba_offset
        call $luma
        i32.const 4
        i32.shr_u
        local.set $bin
        local.get $out_ptr
        local.get $bin
        i32.const 4
        i32.mul
        i32.add
        local.set $bin_ptr
        local.get $bin_ptr
        local.get $bin_ptr
        i32.load
        i32.const 1
        i32.add
        i32.store
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $hist
      end
    end)

  (func (export "frameDiff") (param $rgba_a_ptr i32) (param $rgba_b_ptr i32) (param $pixel_count i32) (result f32)
    (local $i i32)
    (local $offset_a i32)
    (local $offset_b i32)
    (local $sum i32)

    i32.const 0
    local.set $i
    i32.const 0
    local.set $sum

    block $done
      loop $diff
        local.get $i
        local.get $pixel_count
        i32.ge_u
        br_if $done
        local.get $rgba_a_ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        local.set $offset_a
        local.get $rgba_b_ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        local.set $offset_b
        local.get $sum
        local.get $offset_a
        call $luma
        local.get $offset_b
        call $luma
        i32.sub
        call $abs_i32
        i32.add
        local.set $sum
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $diff
      end
    end

    local.get $sum
    f32.convert_i32_u
    local.get $pixel_count
    f32.convert_i32_u
    f32.div)
)
