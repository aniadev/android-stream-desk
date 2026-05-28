---
title: 'v1.4.0 S-PAGE2 — Layout store: page state + CRUD + draggable an toàn'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sau S-PAGE1 có `pages` trong data, nhưng store chưa có khái niệm "trang đang xem" hay CRUD trang. UI (S-PAGE3/4) cần `currentPageIndex`, `currentButtons`, và các action add/remove/rename/điều hướng.

**Approach:** Thêm page state + actions vào `useLayoutStore`. Giữ ràng buộc Sortable: `vue-draggable-plus` bám tham chiếu mảng — khi đổi trang KHÔNG reassign mảng phá tham chiếu (remount qua `:key` ở S-PAGE3, hoặc splice in-place). `reorderButtons`/`onUpdate` thao tác trên `currentPage.buttons`.

## Boundaries & Constraints

**Always:** Chặn xóa trang cuối cùng (luôn ≥1 trang). `currentPageIndex` clamp trong `[0, pages.length-1]`. Mọi mutate trang → persist localStorage + broadcast như `updateLayout`.

**Ask First:** Nếu cần giới hạn số trang tối đa.

**Never:** KHÔNG reassign mảng button đang bind Sortable theo cách phá tham chiếu (xem `resizeGrid` `:141-146` splice pattern). KHÔNG broadcast `currentPageIndex` (trạng thái trang là cục bộ từng client).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| goNextPage ở trang cuối | currentPageIndex = last | Không vượt quá last (no-op hoặc clamp) | — |
| removePage khi 1 trang | pages.length === 1 | Chặn, không xóa | return sớm |
| removePage trang đang xem | xóa pages[i] = current | currentPageIndex chuyển về trang hợp lệ gần nhất | clamp |
| addPage | bất kỳ | thêm trang mới đủ rows×cols ô mặc định, currentPageIndex tới trang mới | — |
| renamePage | (idx, name) | đổi pages[idx].name | — |

</frozen-after-approval>

## Code Map

- `src/stores/layout.ts` — thêm `currentPageIndex` ref; computed `currentPage`, `currentButtons`; actions `addPage`, `removePage`, `renamePage`, `goNextPage`, `goPrevPage`, `setPage`; sửa `reorderButtons`/`onUpdate` thao tác `currentPage.buttons`; export tất cả.

## Tasks & Acceptance

**Execution:**
- [ ] `src/stores/layout.ts` -- Thêm `const currentPageIndex = ref(0)`. Computed: `const currentPage = computed(() => layout.value.pages[currentPageIndex.value] ?? layout.value.pages[0])`; `const currentButtons = computed(() => currentPage.value?.buttons ?? [])`.
- [ ] `src/stores/layout.ts` -- Action `addPage()`: tạo `Page` mới id `page_${Date.now()}`, buttons đủ `rows*cols` ô mặc định (tái dùng factory tạo button trống); push vào `layout.value.pages`; set `currentPageIndex` tới trang mới; persist + broadcast.
- [ ] `src/stores/layout.ts` -- Action `removePage(idx)`: nếu `pages.length<=1` → return; splice; `currentPageIndex = Math.min(currentPageIndex, pages.length-1)`; persist+broadcast.
- [ ] `src/stores/layout.ts` -- Action `renamePage(idx, name)`; `goNextPage()`/`goPrevPage()` clamp; `setPage(idx)` clamp.
- [ ] `src/stores/layout.ts` -- Sửa `reorderButtons` (`:148-158`) thao tác trên `currentPage.value.buttons` thay vì `layout.buttons`; `resizeGrid` (`:141-146`) áp splice cho mọi `pages[].buttons`.
- [ ] `src/stores/layout.ts` -- Export `currentPageIndex, currentPage, currentButtons, addPage, removePage, renamePage, goNextPage, goPrevPage, setPage`.

**Acceptance Criteria:**
- Given layout 3 trang, when `goNextPage`/`goPrevPage`, then `currentPageIndex` đổi đúng, `currentButtons` trả button trang hiện tại.
- Given 1 trang, when `removePage`, then bị chặn.
- Given xóa trang đang xem, when `removePage`, then `currentPageIndex` về trang hợp lệ.
- Given `addPage`, then trang mới có đủ rows×cols ô, `currentPageIndex` trỏ trang mới.

## Design Notes

`currentPageIndex` KHÔNG nằm trong `layout`/`layout.json` → không persist, không broadcast (mỗi client xem trang riêng). Tham chiếu mảng Sortable: S-PAGE3 sẽ remount GridArea container theo `:key="currentPage.id"` → store chỉ cần cung cấp `currentButtons`; tránh splice xuyên trang gây nhầm.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: page state + actions typed sạch.

**Manual:** (cần S-PAGE3/4 để thấy UI) — unit-level: gọi actions trong devtools, kiểm `currentButtons`.

## Suggested Review Order

- `currentPage`/`currentButtons` computed + clamp. [`layout.ts`](../../src/stores/layout.ts)
- `addPage`/`removePage` (chặn trang cuối, clamp index). [`layout.ts`](../../src/stores/layout.ts)
- `reorderButtons` chuyển sang currentPage.buttons. [`layout.ts:148`](../../src/stores/layout.ts#L148)
