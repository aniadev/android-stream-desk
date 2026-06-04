---
title: 'S-ICON2 — Full-pack icon search + virtual scroll trong Icon Picker'
type: 'feature'
created: '2026-05-25'
status: 'done'
baseline_commit: '681d2d0'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khi user gõ "disc" trong icon picker, kết quả chỉ tìm trong curated list ~90 icon mdi hoặc ~90 icon lucide — bỏ sót `mdi:disc`, `mdi:disc-player` và hàng trăm icon tương tự. User muốn tìm tên icon chính xác nhưng không biết nó có trong curated list hay không.

**Approach:** Khi `searchQuery !== ''` và pack hiện tại là mdi/lucide/material (đã bundled offline), dùng `listIcons(undefined, prefix)` từ `@iconify/vue` để lấy toàn bộ tên icon trong pack (đã load vào memory qua `initOfflineIcons`), filter + giới hạn 200 kết quả. Thêm virtual scroll (IntersectionObserver + sentinel) khi kết quả > 120. Hiển thị badge thông báo khi đang ở full-search mode. Pack `si` (simple-icons) không bundled — vẫn dùng curated list.

## Boundaries & Constraints

**Always:** Virtual scroll chỉ tăng `visibleCount` — không xóa DOM node đã render. Observer root là scroll container div, không phải viewport. Reset `visibleCount = 120` khi `searchQuery` hoặc `activeIconGroup` thay đổi. Curated pool (no search) không cần virtual scroll vì < 120 icon.

**Ask First:** Nếu cần tăng giới hạn 200 kết quả hoặc thêm full-pack search cho simple-icons (cần install `@iconify-json/simple-icons` và bundle).

**Never:** Không fetch icon từ CDN để build search list. Không dùng `getIconList` (không tồn tại trong `@iconify/vue`) — dùng `listIcons(undefined, prefix)`. Không thay đổi pack `si` — vẫn dùng curated `siIcons`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Search mdi, query "disc" | `activeIconGroup='mdi'`, `searchQuery='disc'` | filteredIcons ≥ 3 (mdi:disc, mdi:disc-player, v.v.), badge hiện | — |
| Search si, query "spot" | `activeIconGroup='si'`, `searchQuery='spot'` | Chỉ lọc trong `siIcons` curated, không badge | — |
| Query rỗng, any pack | `searchQuery=''` | Trả về curated pool (hành vi cũ), không badge, không virtual scroll | — |
| Kết quả > 120 | filteredIcons.length = 180 | Chỉ render 120 icon đầu; scroll đến sentinel → render thêm 60 | — |
| Kết quả ≤ 120 | filteredIcons.length = 45 | Render toàn bộ, không sentinel | — |
| Đổi pack/query khi đang scroll | Thay `activeIconGroup` hoặc `searchQuery` | `visibleCount` reset về 120, scroll container không nhớ vị trí cũ | — |
| `listIcons` trả về [] | Pack chưa load vào memory | Fallback về curated pool của pack đó | — |

</frozen-after-approval>

## Code Map

- `src/views/DashboardView.vue:118–131` — `searchQuery`, `activeIconGroup`, `filteredIcons` computed hiện tại; toàn bộ logic + template icon picker
- `src/icons-bundle.ts` — `initOfflineIcons()` gọi `addCollection` cho mdi/lucide/material-symbols; simple-icons KHÔNG có ở đây
- `src/config/icons.ts` — `mdiIcons`, `lucideIcons`, `materialIcons`, `siIcons` curated arrays + `ICON_GROUPS` / `IconGroup` type
- `src/views/DashboardView.vue:879` — scrollable grid container `max-h-[140px] overflow-y-auto` cần thêm `ref` + `contain: strict`

## Tasks & Acceptance

**Execution:**
- [x] `src/views/DashboardView.vue` -- Thêm import `listIcons` từ `@iconify/vue`. Thêm: `visibleCount = ref(120)`, `iconScrollRef = ref<HTMLElement | null>(null)`, `sentinelRef = ref<HTMLElement | null>(null)`. Cập nhật `filteredIcons` computed: khi `searchQuery !== ''` và `activeIconGroup !== 'si'`, tính `prefix` (`mdi`/`lucide`/`material-symbols`), lấy `listIcons(undefined, prefix)`, filter substring case-insensitive, slice(0, 200), map sang `prefix:name`; nếu kết quả rỗng fallback về curated pool filter; else khi `searchQuery === ''` hoặc `si` → hành vi cũ. Thêm computed: `isFullSearch = searchQuery !== '' && activeIconGroup !== 'si'`; `packLabel` (map group → label string); `visibleIcons = filteredIcons.slice(0, visibleCount)`. Watch `filteredIcons` → reset `visibleCount = 120`. Trong `onMounted`: tạo `IntersectionObserver` (root = `iconScrollRef.value`, threshold 0.1) watching `sentinelRef.value`; khi intersect → `visibleCount += 60`. Trong `onUnmounted`: disconnect observer. Template icon grid: (1) thêm `ref="iconScrollRef"` + style `contain: strict` vào scrollable div; (2) thêm badge `v-if="isFullSearch"` bên trên grid hiển thị `"Đang tìm trong toàn bộ {{ packLabel }} ({{ filteredIcons.length }} kết quả)"`; (3) đổi `v-for="ico in filteredIcons"` → `v-for="ico in visibleIcons"`; (4) thêm sentinel `<div ref="sentinelRef" v-if="filteredIcons.length > visibleCount" class="col-span-6 h-4" />` cuối grid.

**Acceptance Criteria:**
- Given mdi pack active, when user gõ "arrow", then badge "Đang tìm trong toàn bộ MDI (N kết quả)" hiện, N > số icon trong curated mdiIcons filter.
- Given kết quả > 120, when user scroll xuống cuối grid, then thêm icon xuất hiện (không load tất cả ngay lập tức).
- Given si pack active, when user gõ "spot", then không có badge, chỉ kết quả từ siIcons curated.
- Given searchQuery rỗng, when user switch pack, then không có badge, icon grid hiển thị curated pool bình thường.
- Given đang hiển thị full-search kết quả, when user xóa searchQuery, then badge biến mất, visibleCount reset, curated pool hiện lại.

## Spec Change Log

## Design Notes

`listIcons(undefined, prefix)` trả về `string[]` gồm tên icon không có prefix (e.g., `['play', 'pause', ...]`). Cần map sang `${prefix}:${name}` trước khi dùng. Với `material-symbols`, prefix trong Iconify là `'material-symbols'` (không phải `'material'`). Prefix map: `{ mdi: 'mdi', lucide: 'lucide', material: 'material-symbols', si: 'simple-icons' }`.

Observer lifecycle: tạo mới trong `onMounted`, observe lại `sentinelRef` mỗi khi `visibleCount` reset (dùng `nextTick` sau reset trước khi observe). Disconnect trong `onUnmounted`.

## Verification

**Commands:**
- `pnpm build` -- expected: compile sạch, không TypeScript error với `listIcons` import.

**Manual checks (if no CLI):**
- Mở Dashboard, chọn mdi pack, gõ "arrow" → badge xuất hiện với N > 10 kết quả.
- Kết quả > 120: scroll icon grid xuống cuối → thêm icon xuất hiện.
- Switch sang Brands (si) tab, gõ bất kỳ → không badge.

## Suggested Review Order

**Full-pack search logic**

- `filteredIcons` computed: full-pack path via `listIcons`, fallback, prefix map
  [`DashboardView.vue:134`](../../src/views/DashboardView.vue#L134)

- `isFullSearch` + `packLabel` + `visibleIcons` derived computeds
  [`DashboardView.vue:159`](../../src/views/DashboardView.vue#L159)

**Virtual scroll lifecycle**

- `watch(filteredIcons)` resets `visibleCount`; `watch(sentinelRef)` creates/destroys observer
  [`DashboardView.vue:175`](../../src/views/DashboardView.vue#L175)

- `iconObserver?.disconnect()` cleanup in `onUnmounted`
  [`DashboardView.vue:312`](../../src/views/DashboardView.vue#L312)

**Template**

- Badge (v-if isFullSearch) + scrollable container with `ref` + `contain: layout`
  [`DashboardView.vue:947`](../../src/views/DashboardView.vue#L947)

- `v-for` switched to `visibleIcons`; sentinel element at grid bottom
  [`DashboardView.vue:954`](../../src/views/DashboardView.vue#L954)
