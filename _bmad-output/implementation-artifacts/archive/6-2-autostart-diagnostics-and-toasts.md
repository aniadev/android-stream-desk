# Story 6.2: Cải thiện chẩn đoán và phản hồi thiết lập Autostart

Status: done

## Story

As a Companion user,
I want giao diện Dashboard phản ánh chính xác trạng thái hoạt động thực của Autostart mỗi khi mở trang chỉnh sửa,
so that tôi tránh bật nhầm hoặc không biết tính năng có xung đột quyền hệ thống hay không.

## Acceptance Criteria

1. **Given** Dashboard settings modal được mở lên,
   **When** hiển thị toggle,
   **Then** gọi hàm kiểm thử `isEnabled()` của plugin autostart để cập nhật trạng thái toggle chính xác theo hệ thống thực, thay vì chỉ đọc từ cache frontend.
2. **Given** người dùng chuyển đổi toggle,
   **When** thao tác hoàn tất,
   **Then** hiển thị thông báo Toast "Đã áp dụng tự khởi động cùng hệ thống" hoặc hiển thị Banner cảnh báo lỗi chi tiết nếu bị hệ thống chặn quyền ghi Registry.

## Tasks / Subtasks

- [ ] Task 1: Check thực tế trạng thái Startup Registry (AC: 1)
  - [ ] Khi mount settings panel or modal, gọi async `isEnabled()` từ plugin autostart.
  - [ ] Override biến reactiveness `autostartEnabled` của Dashboard dựa trên kết quả trả về.
- [ ] Task 2: Thêm Toast / Alerts phản hồi trạng thái (AC: 2)
  - [ ] Viết khối try/catch bao ngoài thao tác thay đổi autostart settings.
  - [ ] Hiển thị thông báo Toast thành công hoặc cảnh báo chi tiết lỗi phân quyền nếu có ngoại lệ.

## Dev Notes

- **UI reactivity**: Đảm bảo trạng thái toggle không thể bị thay đổi khi tiến trình async chưa hoàn tất cập nhật.

### References

- [Source: src/views/DashboardView.vue#45] - Nơi quản lý trạng thái settings store và toggle layout UI.
