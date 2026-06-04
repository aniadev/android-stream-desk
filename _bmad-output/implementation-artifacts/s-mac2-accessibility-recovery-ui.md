# Story 9.2 (S-MAC2): Recovery UI cho Accessibility stale entry

Status: ready-for-dev

## Story

As a macOS Companion user,
I want biết đang allow nhầm app/path nào và làm gì tiếp theo,
so that tôi tự khôi phục quyền Accessibility không cần đoán.

## Acceptance Criteria

1. **Given** diagnostics từ S-MAC1,
   **When** Dashboard banner render,
   **Then** dùng diagnostics thay vì chỉ boolean `trusted`.
2. **Given** banner hiển thị,
   **When** user xem,
   **Then** thấy `executablePath`/`appBundlePath` dạng copyable + bundle id ngắn.
3. **Given** banner,
   **When** user thao tác,
   **Then** có nút `Mở Accessibility Settings` và `Kiểm tra lại` (re-probe).
4. **Given** action phím/media fail vì thiếu quyền,
   **When** toast lỗi hiện,
   **Then** link về recovery panel.

## Tasks / Subtasks

- [ ] Task 1: Banner dùng diagnostics (AC: 1, 2)
  - [ ] Render path copyable + bundle id; hướng dẫn reset TCC dev build (quit → xóa entry → kéo `.app` đúng → mở lại → kiểm tra).
- [ ] Task 2: Action buttons (AC: 3)
  - [ ] `Mở Accessibility Settings` (open settings), `Kiểm tra lại` (re-probe).
- [ ] Task 3: Toast link (AC: 4)
  - [ ] Toast lỗi action route về recovery panel.

## Dev Notes

- Phụ thuộc S-MAC1. UI hiện poll mỗi 3s khi thiếu quyền + probe khi focus.
- Giữ chuỗi tiếng Việt user-facing.

### References

- [Source: src/views/DashboardView.vue:789] - poll permission + probe on focus.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §2]
