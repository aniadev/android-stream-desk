---
title: 'Client carousel: thay embla bằng CSS scroll-snap thuần (perf POCO C40)'
type: 'refactor'
created: '2026-05-29'
status: 'done'
baseline_commit: 'a63b627'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `GridArea.vue` (Client, `ClientView.vue`) chuyển trang bằng `embla-carousel-vue`. Embla chạy JS transform mỗi frame → lag trên chip yếu (POCO C40 / Helio G25).

**Approach:** Bỏ engine embla, thay bằng container HTML/CSS `scroll-snap` thuần — native browser xử lý vuốt, không JS mỗi frame. Vuốt đổi trang vẫn còn; bỏ slide animation (tap dot nhảy trang tức thì, không smooth-scroll). Gỡ dep `embla-carousel-vue`.

## Boundaries & Constraints

**Always:** Vuốt đổi trang vẫn hoạt động (native scroll-snap). Dot pagination giữ nguyên: ẩn khi `pages.length <= 1`, active = `currentPageIndex`, tap dot đổi trang. Sync 2 chiều `scroll ↔ currentPageIndex` qua `setPage()` / watch. Monitor button giữ guard `handlePress`. Sound/vibrate on click giữ nguyên. Trang trí giữ nguyên: scanline, bg-grid-dot, corner brackets, glow/shadow, dot `transition`.

**Ask First:** Nếu muốn bỏ luôn vuốt (chỉ tap dot) — mặc định GIỮ vuốt.

**Never:** KHÔNG thêm lại bất kỳ JS carousel lib nào. KHÔNG bật lại `v-draggable` trên Client. KHÔNG smooth-scroll animation khi tap dot / programmatic scroll (dùng `behavior:'auto'`). KHÔNG broadcast đổi trang. KHÔNG đổi shape `layout.pages` / store API.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vuốt | gesture ngang | scroll-snap đáp trang kế; `onScroll` → `setPage(round(scrollLeft/clientWidth))` | — |
| Tap dot | dot idx k | `setPage(k)` → watch scroll tức thì tới trang k (no anim) | — |
| Đổi index nội bộ | currentPageIndex đổi (action/Dashboard) | watch → `scrollTo` tức thì tới đúng trang | — |
| Pages +/- (broadcast) | pages.length đổi | sau DOM patch, re-scroll về currentPageIndex tức thì | — |
| 1 trang | pages.length===1 | dots ẩn; vuốt không tác dụng | — |
| Monitor button | buttonKind monitor | render giá trị, tap không press | guard sẵn |

</frozen-after-approval>

## Code Map

- `src/components/GridArea.vue` — chứa toàn bộ embla (import, init, `on('select')`, watch, `emblaRef`, dot `@click`). Đây là file duy nhất sửa logic + template + style scroller.
- `src/stores/layout.ts` — `currentPageIndex` (ref), `setPage(idx)` (clamp), `layout.pages` (`{id,buttons}[]`), `layout.cols/rows`. Dùng nguyên, không sửa.
- `package.json` — dep `embla-carousel-vue` (chỉ GridArea.vue import) → gỡ.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/GridArea.vue` — Bỏ `import emblaCarouselVue` và toàn bộ embla (`emblaRef`/`emblaApi`, `onMounted` select, 3 watch dùng embla). Thêm `scrollerRef = ref<HTMLElement|null>()`. Template: viewport thành `<div ref="scrollerRef" class="scroller ...overflow-x-auto overflow-y-hidden..." @scroll.passive="onScroll">`, track `<div class="flex h-full w-full">`, mỗi slide thêm class `snap-page`. Giữ grid + GridButton + handlePress y nguyên.
- [x] `src/components/GridArea.vue` — `onScroll`: throttle bằng `requestAnimationFrame` (1 rAF pending), tính `idx = Math.round(el.scrollLeft / el.clientWidth)`, nếu `idx !== currentPageIndex` → `setPage(idx)`. `onMounted`: scroll tức thì tới `currentPageIndex`. `watch(currentPageIndex)`: nếu `Math.round(scrollLeft/clientWidth) !== newIdx` → `scrollerRef.scrollTo({left:newIdx*clientWidth, behavior:'auto'})` (guard chống vòng lặp với swipe). `watch(pages.length, {flush:'post'})`: re-scroll tức thì về `currentPageIndex`. Dot `@click="layoutStore.setPage(idx)"`.
- [x] `src/components/GridArea.vue` — `<style scoped>`: thêm `.scroller{scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; overscroll-behavior-x:contain; scrollbar-width:none}` + `.scroller::-webkit-scrollbar{display:none}` + `.snap-page{scroll-snap-align:center; scroll-snap-stop:always}`. Giữ nguyên `.cyber-shell/.bg-grid-dot/.scanline/.cyber-ghost`.
- [x] `package.json` — gỡ `"embla-carousel-vue"`; chạy `pnpm install` cập nhật lockfile.

**Acceptance Criteria:**
- Given layout >1 trang trên Client, when vuốt ngang, then snap sang trang kế và dot active cập nhật đúng, không lag.
- Given Client, when tap dot k, then nhảy ngay trang k không có hiệu ứng trượt.
- Given Dashboard thêm/xoá trang (broadcast), when Client nhận, then số dot và vị trí scroll khớp `currentPageIndex`.
- Given 1 trang, when mở Client, then dots ẩn, vuốt không tác dụng.
- Given không còn import embla nào trong `src/`, when grep `embla`, then 0 kết quả.

## Design Notes

Guard chống vòng lặp: swipe → `onScroll` → `setPage` → `currentPageIndex` đổi → `watch` chạy, nhưng `round(scrollLeft/clientWidth)===newIdx` (snap đã tới) → bỏ qua `scrollTo`, tránh giật với momentum. Mirror đúng guard cũ của embla (`selectedScrollSnap() !== newIdx`). `clientWidth` = bề rộng 1 slide vì mỗi `.snap-page` là `w-full`.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: sạch, không còn type embla.
- `grep -rn embla src/` -- expected: 0 kết quả.
- `pnpm build` -- expected: bundle thành công.

**Manual checks (thiết bị Android thật — bắt buộc):** Trên POCO C40: vuốt đổi trang mượt hơn embla; tap dot nhảy tức thì; tap button vẫn gửi press + sound/vibrate; monitor button không press.

## Suggested Review Order

**Cơ chế scroll-snap (entry point)**

- Viewport native `overflow-x-auto` thay engine carousel — vuốt do browser xử lý, không JS mỗi frame.
  [`GridArea.vue:138`](../../src/components/GridArea.vue#L138)

- CSS snap quyết định hành vi đổi trang (`x mandatory` + `snap-align`).
  [`GridArea.vue:214`](../../src/components/GridArea.vue#L214)

**Sync index ↔ scroll**

- scroll → store: `round(scrollLeft/clientWidth)`, throttle 1 rAF để gộp burst khi vuốt.
  [`GridArea.vue:45`](../../src/components/GridArea.vue#L45)

- store → scroll: cuộn tức thì (`behavior:'auto'`), guard `pageFromScroll!==newIdx` chống vòng lặp.
  [`GridArea.vue:84`](../../src/components/GridArea.vue#L84)

- tap dot → `setPage(idx)` (thay `emblaApi.scrollTo`).
  [`GridArea.vue:183`](../../src/components/GridArea.vue#L183)

**Robustness (chip yếu POCO C40)**

- Rotate/resize: realign snap về `currentPageIndex` (px scrollLeft lệch khi clientWidth đổi).
  [`GridArea.vue:61`](../../src/components/GridArea.vue#L61)

- Mount khi `clientWidth===0`: defer `nextTick` để không nhảy về page 0.
  [`GridArea.vue:65`](../../src/components/GridArea.vue#L65)

- Cleanup: `cancelAnimationFrame` + gỡ resize listener khi unmount.
  [`GridArea.vue:77`](../../src/components/GridArea.vue#L77)

**Peripheral**

- Gỡ dep `embla-carousel-vue`.
  [`package.json:26`](../../package.json#L26)
