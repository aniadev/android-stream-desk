---
title: 'v1.4.0 S-PAGE3 — Client: shadcn Carousel + dot pagination (disable draggable)'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Client (`GridArea.vue`, dùng ở `ClientView.vue:179`) render một lưới `layout.buttons` với `v-draggable`. Cần chuyển trang bằng cảm ứng + chỉ báo trang. `GridArea` có `v-draggable` → nếu thêm carousel swipe sẽ tranh chấp gesture với Sortable.

**Approach:** Bọc các trang trong **shadcn Carousel** (`embla-carousel-vue`); mỗi slide render lưới `page.buttons`. **DISABLE `v-draggable` trên `GridArea`** (Client là controller, không reorder) → swipe sạch, không đụng Sortable. Dot pagination sync với embla API ↔ `currentPageIndex`. Ẩn chrome khi 1 trang.

## Boundaries & Constraints

**Always:** Disable drag-reorder trên Client. Dot pagination ẩn khi `pages.length <= 1`. Monitor button vẫn render đúng trên mỗi trang. Tap button vẫn gọi `pressButton` (monitor button không emit press — giữ guard `GridArea.handlePress`).

**Ask First:** Nếu muốn giữ drag-reorder trên Client (mặc định CHỐT bỏ).

**Never:** KHÔNG để embla drag-to-scroll chạy trên vùng cần Sortable (đã bỏ Sortable nên hết xung đột, nhưng KHÔNG vô tình bật lại draggable). KHÔNG broadcast đổi trang.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 1 trang | pages.length===1 | Carousel chrome + dots ẩn, render lưới như cũ | — |
| >1 trang | pages.length>1 | Carousel hiện; swipe đổi trang; dots active đúng | — |
| Tap dot | dot index k | scrollTo trang k, currentPageIndex = k | — |
| Swipe | gesture | embla `on('select')` → cập nhật currentPageIndex | — |
| Monitor button trên trang | buttonKind monitor | render giá trị, tap không press | guard sẵn |

</frozen-after-approval>

## Code Map

- `package.json` — `embla-carousel-vue` (qua `npx shadcn-vue add carousel`).
- `src/components/ui/Carousel*.vue` — NEW (auto-generated bởi shadcn-vue).
- `src/components/GridArea.vue` — bỏ `v-draggable`; bọc pages trong Carousel; mỗi slide render lưới `page.buttons`; sync embla ↔ `currentPageIndex`; dot pagination.

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` -- `npx shadcn-vue add carousel` → sinh `src/components/ui/Carousel*.vue` + thêm dep `embla-carousel-vue`. Chạy `pnpm install` nếu cần.
- [ ] `src/components/GridArea.vue` -- (1) BỎ directive `v-draggable=[layoutStore.layout.buttons, {...}]` và `onUpdate`. (2) Bọc nội dung trong `<Carousel>`: `v-for` slide theo `layoutStore.layout.pages`, mỗi slide render lưới (gridTemplateColumns/Rows giữ nguyên) với `v-for btn in page.buttons`. (3) Lấy embla API → `on('select')` cập nhật `layoutStore.setPage(api.selectedScrollSnap())`; watch `currentPageIndex` → `api.scrollTo(idx)`. (4) Dot pagination: `v-for` theo `pages.length`, active = `currentPageIndex`, `@click="api.scrollTo(i)"`; bọc `v-if="pages.length>1"`. (5) Giữ `handlePress` (monitor guard).
- [ ] `src/components/GridArea.vue` -- Style dot theo theme (`var(--accent)`), corner brackets/shell giữ nguyên.

**Acceptance Criteria:**
- Given layout >1 trang, when mở Client, then carousel hiện; vuốt đổi trang; dot active = trang hiện tại; tap dot nhảy trang.
- Given Client, when chạm-giữ button, then KHÔNG drag-reorder (draggable đã bỏ).
- Given 1 trang, when mở Client, then không hiện carousel chrome/dots.
- Given monitor button trên trang, then render giá trị, tap không press.

## Design Notes

Xung đột gesture embla↔Sortable được loại tận gốc bằng cách bỏ draggable trên Client (Client = controller). Dashboard editor giữ draggable riêng (S-PAGE4) + chuyển trang bằng tab click → hai cơ chế không cùng view. `currentPageIndex` cục bộ — vuốt trên một Client không ảnh hưởng Client khác.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: Carousel + embla typed sạch.

**Manual (thiết bị Android thật — bắt buộc):** vuốt đổi trang mượt; tap dot; không kéo nhầm button; tap button vẫn gửi press.

## Suggested Review Order

- Bỏ `v-draggable` + bọc Carousel + slide per page. [`GridArea.vue`](../../src/components/GridArea.vue)
- embla API ↔ `currentPageIndex` sync. [`GridArea.vue`](../../src/components/GridArea.vue)
- Dot pagination + ẩn khi 1 trang. [`GridArea.vue`](../../src/components/GridArea.vue)
