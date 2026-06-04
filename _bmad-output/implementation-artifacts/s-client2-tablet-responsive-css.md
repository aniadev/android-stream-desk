# Story 11.2 (S-CLIENT2): Tablet portrait/landscape responsive CSS

Status: ready-for-dev

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

- [ ] Task 1: Audit layout (AC: 1)
  - [ ] `ClientView.vue`, `GridArea.vue`, `GridButton.vue` theo các viewport.
- [ ] Task 2: Bỏ/điều kiện hóa hard limit (AC: 2)
  - [ ] `max-w-2xl` chỉ áp `contain` mode.
- [ ] Task 3: Responsive gap/padding (AC: 3, 4)
  - [ ] Breakpoint/container query; safe area cho fullscreen.

## Dev Notes

- Phụ thuộc S-CLIENT1 (mode). Chặn S-CLIENT3.

### References

- [Source: src/components/GridArea.vue:108] - shell `w-full h-full max-w-2xl`.
- [Source: src/components/GridArea.vue:151] - grid stretch `w-full h-full`.
- [Source: src/components/GridButton.vue]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §4]
