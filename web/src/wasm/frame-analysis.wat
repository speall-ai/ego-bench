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

  (func $safe_avg (param $sum i32) (param $count i32) (result f32)
    local.get $count
    i32.eqz
    if (result f32)
      f32.const 0
    else
      local.get $sum
      f32.convert_i32_u
      local.get $count
      f32.convert_i32_u
      f32.div
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

  (func (export "clipStats") (param $rgba_ptr i32) (param $pixel_count i32) (param $out_ptr i32)
    (local $i i32)
    (local $rgba_offset i32)
    (local $luma i32)
    (local $shadow_count i32)
    (local $highlight_count i32)

    i32.const 0
    local.set $i
    i32.const 0
    local.set $shadow_count
    i32.const 0
    local.set $highlight_count

    block $done
      loop $stats
        local.get $i
        local.get $pixel_count
        i32.ge_u
        br_if $done
        local.get $rgba_ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        local.set $rgba_offset
        local.get $rgba_offset
        call $luma
        local.set $luma

        local.get $luma
        i32.const 16
        i32.le_u
        if
          local.get $shadow_count
          i32.const 1
          i32.add
          local.set $shadow_count
        end

        local.get $luma
        i32.const 235
        i32.ge_u
        if
          local.get $highlight_count
          i32.const 1
          i32.add
          local.set $highlight_count
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $stats
      end
    end

    local.get $out_ptr
    local.get $shadow_count
    i32.store
    local.get $out_ptr
    i32.const 4
    i32.add
    local.get $highlight_count
    i32.store)

  (func (export "frameDiffRegional")
    (param $rgba_a_ptr i32)
    (param $rgba_b_ptr i32)
    (param $width i32)
    (param $height i32)
    (param $out_ptr i32)
    (local $x i32)
    (local $y i32)
    (local $pixel_index i32)
    (local $pixel_count i32)
    (local $offset_a i32)
    (local $offset_b i32)
    (local $diff i32)
    (local $sum i32)
    (local $action_sum i32)
    (local $peripheral_sum i32)
    (local $action_count i32)
    (local $peripheral_count i32)
    (local $action_left i32)
    (local $action_right i32)
    (local $action_top i32)

    local.get $width
    local.get $height
    i32.mul
    local.set $pixel_count

    local.get $pixel_count
    i32.eqz
    if
      local.get $out_ptr
      f32.const 0
      f32.store
      local.get $out_ptr
      i32.const 4
      i32.add
      f32.const 0
      f32.store
      local.get $out_ptr
      i32.const 8
      i32.add
      f32.const 0
      f32.store
      return
    end

    local.get $width
    i32.const 5
    i32.div_u
    local.set $action_left

    local.get $width
    local.get $action_left
    i32.sub
    local.set $action_right

    local.get $height
    i32.const 7
    i32.mul
    i32.const 20
    i32.div_u
    local.set $action_top

    i32.const 0
    local.set $y
    i32.const 0
    local.set $sum
    i32.const 0
    local.set $action_sum
    i32.const 0
    local.set $peripheral_sum
    i32.const 0
    local.set $action_count
    i32.const 0
    local.set $peripheral_count

    block $y_done
      loop $y_loop
        local.get $y
        local.get $height
        i32.ge_u
        br_if $y_done

        i32.const 0
        local.set $x

        block $x_done
          loop $x_loop
            local.get $x
            local.get $width
            i32.ge_u
            br_if $x_done

            local.get $y
            local.get $width
            i32.mul
            local.get $x
            i32.add
            local.set $pixel_index

            local.get $rgba_a_ptr
            local.get $pixel_index
            i32.const 4
            i32.mul
            i32.add
            local.set $offset_a

            local.get $rgba_b_ptr
            local.get $pixel_index
            i32.const 4
            i32.mul
            i32.add
            local.set $offset_b

            local.get $offset_a
            call $luma
            local.get $offset_b
            call $luma
            i32.sub
            call $abs_i32
            local.set $diff

            local.get $sum
            local.get $diff
            i32.add
            local.set $sum

            local.get $x
            local.get $action_left
            i32.ge_u
            local.get $x
            local.get $action_right
            i32.lt_u
            i32.and
            local.get $y
            local.get $action_top
            i32.ge_u
            i32.and
            if
              local.get $action_sum
              local.get $diff
              i32.add
              local.set $action_sum
              local.get $action_count
              i32.const 1
              i32.add
              local.set $action_count
            else
              local.get $peripheral_sum
              local.get $diff
              i32.add
              local.set $peripheral_sum
              local.get $peripheral_count
              i32.const 1
              i32.add
              local.set $peripheral_count
            end

            local.get $x
            i32.const 1
            i32.add
            local.set $x
            br $x_loop
          end
        end

        local.get $y
        i32.const 1
        i32.add
        local.set $y
        br $y_loop
      end
    end

    local.get $out_ptr
    local.get $sum
    local.get $pixel_count
    call $safe_avg
    f32.store

    local.get $out_ptr
    i32.const 4
    i32.add
    local.get $action_sum
    local.get $action_count
    call $safe_avg
    f32.store

    local.get $out_ptr
    i32.const 8
    i32.add
    local.get $peripheral_sum
    local.get $peripheral_count
    call $safe_avg
    f32.store))
