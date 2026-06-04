# Story 10.5 (S-UX2): Settings information architecture cleanup

Status: ready-for-dev

## Story

As a Companion user,
I want settings được nhóm rõ ràng,
so that tôi tìm cấu hình nhanh, không thấy các tính năng bị nhồi chung một màn hình.

## Acceptance Criteria

1. **Given** settings modal,
   **When** sắp xếp lại,
   **Then** chia nhóm: `General`, `Network`, `Client & QR`, `Permissions`, `Updates`, `Import/Export`, `About/Support`.
2. **Given** các tính năng hiện có,
   **When** phân nhóm,
   **Then** autostart, restart/network config, Web Client URL/QR, Accessibility, updater, donation/support về đúng nhóm.
3. **Given** action nguy hiểm (relaunch/restart),
   **When** hiển thị,
   **Then** ở khu vực có mô tả trạng thái + disabled state rõ.
4. **Given** màn hình thấp,
   **When** scroll,
   **Then** header/footer action không che nội dung; không lồng card trong card.

## Tasks / Subtasks

- [ ] Task 1: Định nghĩa nhóm IA (AC: 1, 2)
  - [ ] Chia section band/inset theo design system; map từng setting vào nhóm.
- [ ] Task 2: Action nguy hiểm (AC: 3)
  - [ ] Relaunch/restart có trạng thái + disabled (liên kết S-REL2).
- [ ] Task 3: Responsive scroll (AC: 4)
  - [ ] Header/footer không che; bỏ card lồng card.

## Dev Notes

- Theo sau S-CLIENT1 (fit mode setting cần chỗ trong nhóm Client & QR). Chặn S-QRX2 (QR layout nằm trong nhóm này).
- Complexity Medium, frontend-only.

### References

- [Source: src/views/DashboardView.vue]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
