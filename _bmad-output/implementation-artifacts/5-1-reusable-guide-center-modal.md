# Story 5.1: Modal Trung tâm trợ giúp (Guide Center) tích hợp

Status: ready-for-dev

## Story

As a Dashboard user,
I want một trung tâm hướng dẫn tích hợp chứa các mẫu lệnh gán phím tắt/mở app định dạng sẵn theo OS,
so that tôi sao chép hoặc áp dụng trực tiếp nhanh mà không cần lục tìm tài liệu PDF/README.

## Acceptance Criteria

1. **Given** Modal Guide Center được kích hoạt,
   **When** người dùng chọn phần "Tự động mở trình duyệt Web",
   **Then** hiển thị mã lệnh gán mẫu chia rõ theo hệ điều hành hiện tại:
   - Windows: `start "" chrome "https://facebook.com"`
   - macOS: `open -a "Google Chrome" "https://facebook.com"`
   **And** cung cấp nút "Dùng mẫu này" để điền trực tiếp giá trị vào form cấu hình của nút macro hiện tại đang sửa.
2. **Given** người dùng chọn phần "Hướng dẫn dán (.lnk) Shortcut & Copy as path",
   **When** xem,
   **Then** mô tả chi tiết 4 bước thao tác kéo/thả/dán tệp liên kết tắt trên Windows để Companion tự động xử lý.

## Tasks / Subtasks

- [x] Task 1: Xây dựng Component Modal Guide Center (AC: 1, 2)
  - [x] Tạo file component `src/components/GuideCenterModal.vue` sử dụng CSS của tailwind.
  - [x] Thiết kế menu lề trái chọn mục hướng dẫn, khung hiển thị nội dung bên phải.
  - [x] Tạo template các ví dụ OS-aware (tự động highlight mẫu code cho Windows/macOS theo User Agent).
- [x] Task 2: Implement hành động "Dùng mẫu này" (AC: 1)
  - [x] Phát ra emit event `apply-template` kèm theo command string tương ứng.
  - [x] Lắng nghe event trên Dashboard editor và tự động apply vào textbox `commandValue` của button cấu hình hiện đang mở.

## Dev Notes

- **Scrollable view**: Cần đảm bảo UI modal không bị lệch tỉ lệ kéo dài tràn trên các màn hình Companion Windows kích thước nhỏ (default 800x600).

### References

- [Source: src/components/AppPickerModal.vue] - Cấu trúc tham khảo của một panel Modal hiện hữu.
