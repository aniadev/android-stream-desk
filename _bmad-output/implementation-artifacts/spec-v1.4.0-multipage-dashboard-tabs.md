---
title: 'v1.4.0 S-PAGE4 — Dashboard: page tabs (CLICK) + add/remove/rename, giữ Sortable'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dashboard editor (`DashboardView.vue`) có grid riêng với `v-draggable` (`:1344-1354`, render `GridButton` `:1368`). Cần cho user tạo/xóa/đổi tên/chuyển trang khi chỉnh sửa, NHƯNG giữ drag-reorder.

**Approach:** Thêm dải **page tabs/dot CLICK** phía trên grid editor — click tab chuyển trang, `+` thêm, `×`/menu xóa/rename. **KHÔNG dùng carousel/swipe ở Dashboard** → Sortable drag-reorder hoạt động bình thường. Grid editor render `currentButtons` (từ store S-PAGE2).

## Boundaries & Constraints

**Always:** Giữ `v-draggable` editor (`:1344`) hoạt động. Chuyển trang bằng CLICK (không swipe). Đổi `rows`/`cols` áp mọi trang. Xóa trang đang chọn → về trang hợp lệ.

**Ask First:** Nếu muốn drag button GIỮA các trang (out of scope v1.4.0).

**Never:** KHÔNG đưa carousel/embla vào Dashboard (tránh tranh chấp Sortable). KHÔNG để `selectedButtonId` trỏ button ở trang khác sau khi đổi trang.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Click page tab | tab k | currentPageIndex=k, grid render trang k, drag vẫn chạy | — |
| Bấm + | thêm trang | trang mới đủ rows×cols ô, chuyển tới | — |
| Xóa trang đang chọn | × trên tab current | về trang hợp lệ gần nhất; chặn nếu 1 trang | — |
| Đổi rows/cols | updateGridDimensions | áp mọi trang | — |
| Đổi trang khi đang chọn button | selectedButtonId thuộc trang cũ | reset selectedButtonId nếu không thuộc trang mới | — |

</frozen-after-approval>

## Code Map

- `src/views/DashboardView.vue` — dải page tabs (click) trên grid editor; nút thêm/xóa/rename; grid editor `v-for` đổi sang `layoutStore.currentButtons`; `updateGridDimensions` (`:473-504`) áp mọi trang qua store `resizeGrid`; reset `selectedButtonId` khi đổi trang.

## Tasks & Acceptance

**Execution:**
- [ ] `src/views/DashboardView.vue` -- Thêm dải **page tabs/dot CLICK** phía trên grid editor: `v-for` theo `layoutStore.layout.pages` → tab (tên hoặc số), `@click="layoutStore.setPage(i)"`, active highlight = `currentPageIndex`. Nút `+` → `layoutStore.addPage()`. Mỗi tab có `×` (hoặc context menu) → `layoutStore.removePage(i)` (chặn 1 trang); double-click → đổi tên → `layoutStore.renamePage(i, name)`.
- [ ] `src/views/DashboardView.vue` -- Grid editor (`:1344` `v-draggable` + `:1368` `GridButton v-for`): đổi nguồn từ `layoutStore.layout.buttons` sang `layoutStore.currentButtons` (giữ tham chiếu Sortable: directive bind mảng `currentPage.buttons`; thêm `:key="currentPage.id"` lên container draggable để remount sạch khi đổi trang). Giữ `onUpdate` → `broadcastSync`.
- [ ] `src/views/DashboardView.vue` -- `updateGridDimensions` (`:473-504`): gọi `layoutStore.resizeGrid` (đã map mọi trang ở S-PAGE2) thay vì chỉ trang hiện tại. Sau đổi trang: nếu `selectedButtonId` không thuộc `currentButtons` → set `null`.

**Acceptance Criteria:**
- Given editor, when click page tab, then chuyển trang KHÔNG swipe; drag-reorder vẫn hoạt động.
- Given bấm +, then trang mới đủ rows×cols ô; chuyển tới trang mới.
- Given xóa trang đang chọn, then về trang hợp lệ; chặn khi còn 1 trang.
- Given đổi rows/cols, then áp mọi trang.

## Design Notes

Dashboard dùng tab CLICK (không carousel) — đây là điểm tách gesture với Client (S-PAGE3 dùng carousel/swipe). Hai view khác nhau ⇒ embla và vue-draggable-plus không bao giờ cùng vùng. `:key="currentPage.id"` remount draggable container khi đổi trang → tránh con trỏ mảng Sortable lệch trang.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: sạch.

**Manual (Companion desktop):** tạo 3 trang; kéo-thả button trong từng trang còn ăn; đổi rows/cols áp mọi trang; xóa trang đang xem → về trang hợp lệ.

## Suggested Review Order

- Page tabs CLICK + add/remove/rename. [`DashboardView.vue`](../../src/views/DashboardView.vue)
- Grid editor đổi sang currentButtons + `:key` remount. [`DashboardView.vue:1344`](../../src/views/DashboardView.vue#L1344)
- resizeGrid áp mọi trang + reset selectedButtonId. [`DashboardView.vue:473`](../../src/views/DashboardView.vue#L473)
