# Story 11.2 (S-CLIENT2): Tablet portrait/landscape responsive CSS

Status: review

## Story

As a tablet/mobile Client user,
I want button không bị méo/quá nhỏ ở các tỉ lệ màn hình khác nhau,
so that tôi bấm macro dễ ở mọi thiết bị.

## Acceptance Criteria

1. **Given** viewport phone/tablet portrait/tablet landscape/desktop browser,
   **When** render grid,
   **Then** button giữ tỉ lệ hợp lý (`aspect-ratio`/`minmax`/scale wrapper), không stretch méo.
2. **Given** Web Client nhiều không gian,
   **When** render,
   **Then** bỏ hard limit gây nhỏ bất thường (hoặc chỉ áp limit ở mode `contain`).
3. **Given** breakpoint/container,
   **When** layout,
   **Then** grid gap/padding tối ưu, tránh fixed padding quá lớn trên màn hình thấp.
4. **Given** grid `3x3`, `4x4`, `5x3`, `6x4`, multi-page,
   **When** kiểm tra,
   **Then** không méo; HUD/settings pill không che button ở fullscreen.

## Tasks / Subtasks

- [x] Task 1: Audit layout (AC: 1)
  - [x] `ClientView.vue` root: `h-screen` → `h-dvh` (100dvh) + safe-area padding.
  - [x] `GridArea.vue` shell: `w-full h-full max-w-2xl` → `w-full h-full` + conditional `max-w-2xl` (contain only).
  - [x] Grid template đã dùng `minmax(0, 1fr)` + `items-stretch justify-items-stretch` → không méo.
  - [x] `GridButton.vue` icon/label dùng `clamp(rem, vw, rem)` cho tỉ lệ scale mượt.
- [x] Task 2: Bỏ/điều kiện hóa hard limit (AC: 2)
  - [x] `max-w-2xl` chỉ áp khi `fitMode === 'contain'` (binding `:class="{ 'max-w-2xl': applyContainMaxWidth }"`).
  - [x] `cover`/`fullscreen` bỏ cap → lưới phủ hết viewport ngang/dọc.
- [x] Task 3: Responsive gap/padding (AC: 3, 4)
  - [x] Grid gap 3 mode: contain `gap-3 sm:gap-4` / cover `gap-2 sm:gap-3` / fullscreen `gap-1.5 sm:gap-2`.
  - [x] Snap page padding 3 mode: contain `p-5 sm:p-6` / cover `p-3 sm:p-4` / fullscreen `p-2 sm:p-3`.
  - [x] Outer wrapper padding 3 mode: contain `p-4 sm:p-0 sm:pt-4` / cover `p-2 sm:p-3` / fullscreen `p-0`.
  - [x] GridButton `:compact` propagate fullscreen/cover → padding/gap thu hẹp.
  - [x] Pagination dots dùng `bottom-1 pb-[env(safe-area-inset-bottom)]` ở fullscreen, `bottom-3` ở contain/cover.
  - [x] HUD pill (settingsOpen) absolute top-right — nằm ngoài grid container, không che button.

## Dev Agent Record

### Implementation Plan
Bind responsive class theo 3-state fit mode (S-CLIENT1) thay vì thêm breakpoint mới. Áp safe-area-inset ở root ClientView; GridArea pagination dots offset theo mode. Compact prop của GridButton được truyền theo mode fullscreen/cover.

### File List
- `src/components/GridArea.vue` (template: 3-mode gap/padding, safe-area pagination, compact prop; style: `.shell--fullscreen`)
- `src/views/ClientView.vue` (root: h-dvh + env(safe-area-inset-*))

### Change Log
- `ClientView.vue` root: `h-screen` → `h-dvh` + `paddingTop`/`paddingBottom` env(safe-area-inset-*).
- `GridArea.vue` template: 3-mode gap/padding, compact `:compact` trên `GridButton`, pagination dots offset theo mode + safe-area.
- `GridArea.vue` style: `.shell--fullscreen` reset clip-path/border-radius/box-shadow/border.

## Dev Notes

- Phụ thuộc S-CLIENT1 (mode token).
- Không phá grid `3x3/4x4/5x3/6x4` — vẫn dùng `minmax(0, 1fr)` stretch, button tự scale theo viewport.
- Multi-page: pagination dots không che button vì nằm dưới bottom inset.

### References

- [Source: src/views/ClientView.vue:301]
- [Source: src/components/GridArea.vue:106]
- [Source: src/components/GridButton.vue:69]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §4]
