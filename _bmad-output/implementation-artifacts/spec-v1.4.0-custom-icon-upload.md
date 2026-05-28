---
title: 'v1.4.0 S-IMG1 — Upload icon tùy biến (png/jpg) + downscale + render'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ButtonConfig.icon` là chuỗi tên iconify (`src/types/index.ts:12`); `GridButton`/picker render qua `<Icon :icon>`. Không dùng được ảnh riêng của user.

**Approach:** Upload png/jpg → downscale (~96px) + nén → lưu **data URI** trong `icon`. Render branch: `icon.startsWith('data:')` → `<img>`, else `<Icon>`. Data URI đi kèm layout qua WS → hiển thị cả Companion lẫn Client, không cần transport mới. Bắt buộc downscale để không phình payload `sync_layout`.

## Boundaries & Constraints

**Always:** Downscale ~96px + nén (webp/png), cap ~20KB/icon; cảnh báo nếu vượt. Sanitize/import chỉ chấp nhận `data:image/(png|jpeg|webp)`.

**Ask First:** Nếu cần lưu icon ra file qua Rust thay vì data URI (hiện CHỐT data URI).

**Never:** KHÔNG nhận scheme khác `data:image/...` (chặn `javascript:`/`http:` → XSS/SSRF). KHÔNG bỏ data URI nguyên gốc vào WS mà không downscale.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upload PNG 2MB | file lớn | downscale 96px → data URI ~vài KB | nén; cảnh báo nếu >20KB |
| Render button data URI | icon `data:image/...` | `<img>` | — |
| Render button iconify | icon `mdi:play` | `<Icon>` (giữ) | — |
| Import layout có data URI icon | `data:image/png;base64,...` | chấp nhận | — |
| Import icon `http://evil` | scheme lạ | từ chối → fallback `mdi:button` | sanitize |
| File không phải ảnh | .txt | reject + thông báo | — |

</frozen-after-approval>

## Code Map

- `src/views/DashboardView.vue` — icon picker (`:149-230`) thêm nút "Tải ảnh lên" (`<input type=file accept=image/png,image/jpeg>`); pipeline FileReader→canvas→dataURL; set `selectedButton.icon`.
- `src/components/GridButton.vue` — render branch `<img>` cho data URI (gần icon render).
- `src/stores/layout.ts` — `importLayout` sanitize (`:255-274`) chấp nhận data URI icon; chặn scheme khác.

## Tasks & Acceptance

**Execution:**
- [ ] `src/views/DashboardView.vue` -- Trong icon picker, thêm nút "Tải ảnh lên" + `<input ref type="file" accept="image/png,image/jpeg" class="hidden">`. Handler: `FileReader.readAsDataURL` → `Image` → vẽ `<canvas>` 96×96 giữ tỉ lệ (letterbox) → `canvas.toDataURL('image/webp', 0.8)` → `selectedButton.icon = dataURL` → `saveButtonSettings()`. Nếu `dataURL.length` > ~20*1024*1.37 (base64 overhead) → toast cảnh báo.
- [ ] `src/components/GridButton.vue` -- Icon render: `v-if="button.icon?.startsWith('data:')"` → `<img :src="button.icon" class="...">` (cùng size với Icon); `v-else` → `<Icon :icon>` (giữ). Áp cả nhánh action lẫn nơi hiển thị icon.
- [ ] `src/views/DashboardView.vue` -- Preview icon đang chọn trong editor cũng branch `<img>` cho data URI (nếu có preview).
- [ ] `src/stores/layout.ts` -- `importLayout` sanitize icon (`:258`): chấp nhận khi `b.icon` match `^data:image\/(png|jpeg|webp);base64,` HOẶC string iconify thường; scheme khác → `'mdi:button'`.

**Acceptance Criteria:**
- Given upload PNG/JPG, when xử lý, then downscale ~96px + data URI; cảnh báo nếu >20KB.
- Given button icon data URI, when render Companion + Client, then `<img>` hiển thị đúng.
- Given button icon iconify, when render, then `<Icon>` như cũ.
- Given import layout có icon `http://...`, then bị từ chối → fallback, không XSS.

## Design Notes

Data URI vì Client không truy cập filesystem Companion; icon đi kèm layout qua WS sẵn có. Cap 20KB then chốt (Ania) để giữ payload `sync_layout` nhẹ — nhiều icon lớn sẽ phình broadcast. webp 0.8 @96px thường < 10KB.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: sạch.

**Manual:** Upload ảnh → button hiện ảnh trên Dashboard + Android Client; export/import giữ icon; thử icon ảnh lớn → cảnh báo.

## Suggested Review Order

- Upload + canvas downscale + cap. [`DashboardView.vue:149`](../../src/views/DashboardView.vue#L149)
- `<img>` vs `<Icon>` branch. [`GridButton.vue`](../../src/components/GridButton.vue)
- Sanitize data URI (chặn scheme lạ). [`layout.ts:255`](../../src/stores/layout.ts#L255)
