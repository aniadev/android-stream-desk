# Story 11.3 (S-CLIENT3): Web Client fullscreen ergonomics

Status: review

## Story

As a Web Client user trên tablet browser,
I want trải nghiệm gần app native ở mode fullscreen,
so that tôi dùng như macro pad cố định không bị shell che vùng bấm.

## Acceptance Criteria

1. **Given** mode `fullscreen`,
   **When** render,
   **Then** giảm shell decoration, padding, corner ornament để tối đa vùng bấm.
2. **Given** iPad/Android browser,
   **When** layout,
   **Then** dùng `100dvh` + safe-area CSS thay vì chỉ `h-screen`.
3. **Given** browser không lock được orientation/fullscreen,
   **When** chạy,
   **Then** UI vẫn scale đúng (không bắt buộc Fullscreen API).

## Tasks / Subtasks

- [x] Task 1: Fullscreen shell (AC: 1)
  - [x] `fitMode === 'fullscreen'` ẩn 4 corner brackets + scanline overlay + animated grid bg trong `GridArea.vue`.
  - [x] `shell--fullscreen` class reset `clip-path`, `border-radius`, `border`, `box-shadow` → lưới ra tới mép viewport.
  - [x] Padding/gap thu hẹp theo mode fullscreen (`p-0` outer, `p-2 sm:p-3` snap page, `gap-1.5 sm:gap-2` grid).
  - [x] `GridButton` `:compact="true"` ở fullscreen → padding/gap nội bộ thu hẹp.
- [x] Task 2: dvh + safe-area (AC: 2)
  - [x] `ClientView.vue` root: `h-dvh` thay cho `h-screen` (100dvh).
  - [x] `paddingTop: env(safe-area-inset-top)` + `paddingBottom: env(safe-area-inset-bottom)` ở root.
  - [x] Pagination dots: `pb-[env(safe-area-inset-bottom)]` ở fullscreen.
- [x] Task 3: Graceful fallback (AC: 3)
  - [x] Không dùng Fullscreen API.
  - [x] Mode đổi reactive qua Pinia — không cần reload/reconnect.
  - [x] Grid `min-w-0 min-h-0` + `minmax(0, 1fr)` → scale đúng khi viewport bất kỳ.

### Review Findings

- [x] [Review][Decision] Diff chứa QR scanner work và thay đổi wake-lock ngoài phạm vi Epic 11 — resolved: tách khỏi review Epic 11; chỉ xử lý patch thuộc S-CLIENT1/2/3 trong lượt này.

## Dev Agent Record

### Implementation Plan
Tận dụng S-CLIENT1 mode token để GridArea reactive theo 3 mode. ClientView root dùng `h-dvh` (dynamic viewport height, xử lý mobile browser URL bar) + `env(safe-area-inset-*)` cho iPhone notch/Android gesture bar. Fullscreen mode tắt shell decoration + padding/gap tối đa. Không dùng Fullscreen API (vì secure-context/gesture hạn chế trên web).

### File List
- `src/views/ClientView.vue` (root: `h-dvh` + env(safe-area-inset-*) padding)
- `src/components/GridArea.vue` (template: hide corner brackets/scanline/bg khi `isFullscreen`; style: `.shell--fullscreen`)

### Change Log
- `h-screen` → `h-dvh` ở root ClientView (100vh → 100dvh).
- `paddingTop`/`paddingBottom` env(safe-area-inset-*) ở root.
- `.shell--fullscreen` reset clip-path, border, border-radius, box-shadow.
- Corner brackets / scanline / bg-grid-dot ẩn khi `isFullscreen`.
- Pagination dots offset theo mode + safe-area.

## Dev Notes

- Phụ thuộc S-CLIENT2 (mode token đã có).
- Không dùng Fullscreen API theo dev note breakdown.
- Test: `pnpm test:qr` + `pnpm build` sạch; vue-tsc clean.

### References

- [Source: src/views/ClientView.vue:301]
- [Source: src/components/GridArea.vue:106]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §4]
