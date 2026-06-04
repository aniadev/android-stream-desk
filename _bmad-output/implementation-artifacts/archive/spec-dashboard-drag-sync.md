---
title: 'Dashboard Drag-Drop & Auto-Sync'
type: 'feature'
created: '2026-05-24'
status: 'done'
baseline: 'faff53b79e48f1bd2b6cbb0acd9ff9764b478fa1'
context: []
baseline: 'faff53b79e48f1bd2b6cbb0acd9ff9764b478fa1'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dashboard thiếu khả năng sắp xếp lại vị trí nút qua drag-drop, phải sync thủ công cấu hình sang companion, và scroll dùng mặc định hệ thống không đồng nhất cyberpunk theme.

**Approach:** Thêm HTML5 drag-drop reorder nút trên dashboard preview, auto-broadcast mỗi khi layout thay đổi, nút sync thủ công trên header, và custom scrollbar CSS cho tất cả panel.

## Boundaries & Constraints

**Always:**
- Drag-drop chỉ hoạt động trong DashboardView preview, không ảnh hưởng GridArea (Android client)
- Sau mỗi thao tác reorder/sync, gọi `broadcastSync()` để đồng bộ companion + lưu localStorage
- Scroll CSS áp dụng toàn cục, hỗ trợ cả WebKit (Chrome/Safari) và Firefox
- Giữ nguyên `updateLayout()` API hiện tại, không thay đổi signature công khai

**Ask First:**
- Không có — tất cả quyết định đã rõ ràng

**Never:**
- Không dùng thư viện drag-drop bên thứ 3 (chỉ HTML5 native API)
- Không thay đổi cấu trúc dữ liệu `Layout` hoặc `ButtonConfig`
- Không thêm dependency mới vào package.json

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Drag button từ vị trí 0 → 2 | Grid 3x3, kéo nút đầu xuống vị trí thứ 3 | Mảng buttons được sắp xếp lại, giao diện cập nhật, broadcastSync gọi | N/A |
| Drag button thả ngoài vùng grid | Kéo nút ra ngoài preview | Không có gì thay đổi, nút trở về vị trí cũ, drag state được reset | Silent no-op, drop handler trên grid container reset state |
| Drag button thả cùng vị trí | Kéo và thả tại chỗ cũ | Không thay đổi mảng, không gọi broadcastSync | So sánh fromIndex === toIndex → skip |
| Drag button khi layout thay đổi giữa chừng | Grid resize hoặc WS sync xảy ra giữa dragstart và drop | `reorderButtons` tìm lại vị trí bằng ID, bỏ qua nếu ID không còn tồn tại | Bounds validation, ID lookup an toàn |
| Bấm nút Sync khi đang disconnected | WebSocket offline | Gọi broadcastSync() lưu localStorage, hiển thị toast "Đã đồng bộ cục bộ" | Không crash, chỉ lưu local |
| Bấm nút Sync khi connected | WebSocket online | Gửi sync_layout qua WS, lưu localStorage, hiển thị "Đã đồng bộ!" trong 1.5s | N/A |
| Thay đổi layout (rows/cols) | Gọi updateGridDimensions | Auto broadcastSync được gọi từ updateLayout | N/A |
| Scroll panel dài | Sidebar có nhiều nội dung hơn viewport | Scrollbar cyberpunk style, thin, không che nội dung | Firefox fallback scrollbar-width: thin |

</frozen-after-approval>

## Code Map

- `src/stores/layout.ts:103` -- `useLayoutStore`: thêm `reorderButtons()`, auto-broadcast trong `updateLayout()`
- `src/views/DashboardView.vue:1` -- Dashboard: drag-drop handlers trên GridButton, sync button header, scroll CSS
- `src/components/GridButton.vue:1` -- GridButton: thêm `draggable` attribute, drag event emits
- `src/components/GridArea.vue:1` -- GridArea: custom scrollbar CSS (đã có sẵn)
- `src/types/index.ts:1` -- Types: không thay đổi

## Tasks & Acceptance

**Execution:**
- [x] `src/stores/layout.ts` -- Thêm `reorderButtons(fromIdx, toIdx)` method; sửa `updateLayout()` để tự động gọi `broadcastSync()` thay vì để DashboardView gọi thủ công
- [x] `src/components/GridButton.vue` -- Thêm `draggable="true"` và emit `dragstart`, `dragover`, `drop` events
- [x] `src/views/DashboardView.vue` -- Implement drag-drop logic trong preview grid; thêm sync button trên header với visual feedback; cập nhật scroll CSS global
- [x] Xoá các `broadcastSync()` thủ công trong DashboardView (updateGridDimensions, saveButtonSettings)

**Acceptance Criteria:**
- Given grid có 6 nút, when kéo nút A từ vị trí 0 thả vào vị trí 3, then thứ tự nút trong layout thay đổi và companion nhận sync_layout
- Given dashboard đang mở, when thay đổi rows/cols hoặc bất kỳ config nút nào, then companion tự động nhận cập nhật không cần bấm nút sync
- Given dashboard header, when bấm nút Sync, then hiển thị text "Đã đồng bộ!" trong 1.5 giây và gửi sync_layout qua WebSocket
- Given bất kỳ panel có scroll (sidebar > 6 nút), when scroll, then scrollbar hiển thị style cyberpunk thin (cyan tone)

## Design Notes

**Drag-drop implementation:** Sử dụng HTML5 Drag and Drop API với ID-based tracking:
- `dragstart`: lưu `button.id` vào `dataTransfer` (không dùng array index — tránh stale index khi layout thay đổi giữa chừng)
- `dragover`: `e.preventDefault()` để cho phép drop trên grid container và từng GridButton
- `drop`: lấy `buttonId` gốc từ ref, tìm vị trí hiện tại của cả source và target bằng ID, gọi `reorderButtons`
- `reorderButtons` phải validate `fromIndex`/`toIndex` nằm trong bounds (>= 0, < buttons.length)
- Drop trên grid gaps (không phải button): reset drag state, no-op
- Visual feedback: `opacity-40` cho nút đang kéo

**Auto-sync strategy:** Chuyển `updateLayout()` thành single source of truth — mọi thay đổi layout đều qua hàm này, và nó tự gọi `broadcastSync()` khi `skipBroadcast !== true`. DashboardView không cần gọi `broadcastSync()` thủ công nữa, ngoại trừ sync button.
- `broadcastSync()` phải lưu `localStorage.setItem('local_layout', ...)` để hoạt động khi disconnected
- `syncLayout()` phải kiểm tra `connectionStore.status`: hiện "Đã đồng bộ!" khi connected, "Đã đồng bộ cục bộ" khi disconnected
- Clear `setTimeout` cũ trước khi set mới trong `syncLayout` để tránh leak timer

## Spec Change Log

- **Loop 1** (2026-05-24): Code review phát hiện: (a) `reorderButtons` thiếu bounds validation → có thể corrupt layout với splice âm/OOB; (b) index-based drag tracking stale khi grid resize hoặc WS sync giữa drag → dùng ID thay index; (c) drop trên grid gaps không reset drag state; (d) `syncLayout` sai toast text + không lưu localStorage khi disconnected; (e) leak `setTimeout`. Đã amend I/O Matrix, Design Notes, và Tasks.
  - **KEEP**: `updateLayout(skipBroadcast)` pattern, splice logic nền, HTML5 drag-drop API foundation, sync button placement, scroll CSS.

## Verification

**Commands:**
- `npx vue-tsc --noEmit` -- expected: no errors

## Suggested Review Order

**Store: auto-broadcast + reorder logic**

- Entry point — `updateLayout` now drives auto-broadcast via `skipBroadcast` flag
  [`layout.ts:125`](../../src/stores/layout.ts#L125)

- ID-validated reorder with bounds + off-by-one correction
  [`layout.ts:133`](../../src/stores/layout.ts#L133)

- `broadcastSync` dual-persists localStorage + WS so sync works offline
  [`layout.ts:144`](../../src/stores/layout.ts#L144)

- Received sync skips re-broadcast to avoid infinite loop
  [`layout.ts:169`](../../src/stores/layout.ts#L169)

**Drag-drop: ID-based HTML5 DnD**

- GridButton exposes `draggable` prop + drag emits; stopPropagation prevents double-fire
  [`GridButton.vue:6`](../../src/components/GridButton.vue#L6)

- ID-based tracking avoids stale indices when layout changes mid-drag
  [`DashboardView.vue:274`](../../src/views/DashboardView.vue#L274)

- Drop finds source/target by ID; -1 guards missing buttons after concurrent sync
  [`DashboardView.vue:285`](../../src/views/DashboardView.vue#L285)

- Grid container drop-on-gaps + Firefox dataTransfer.setData
  [`DashboardView.vue:301`](../../src/views/DashboardView.vue#L301)

**Sync button + timer safety**

- Connection-aware toast text; clears old timer to prevent leak
  [`DashboardView.vue:309`](../../src/views/DashboardView.vue#L309)

- Button placement in header between IP HUD and settings gear
  [`DashboardView.vue:412`](../../src/views/DashboardView.vue#L412)

**Cleanup + Scroll**

- Removed manual `broadcastSync` from `updateGridDimensions` + `saveButtonSettings`
  [`DashboardView.vue:270`](../../src/views/DashboardView.vue#L270)

- Timer cleanup in `onUnmounted` prevents memory leaks
  [`DashboardView.vue:220`](../../src/views/DashboardView.vue#L220)

- Firefox `scrollbar-width: thin` + WebKit 6px cyan scrollbar
  [`DashboardView.vue:1083`](../../src/views/DashboardView.vue#L1083)

