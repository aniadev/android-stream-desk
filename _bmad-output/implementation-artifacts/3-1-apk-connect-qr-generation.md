# Story 3.1: Tạo và hiển thị mã QR kết nối chuyên dụng cho APK

Status: ready-for-dev

## Story

As a Companion user,
I want Companion hiển thị mã QR kết nối APK mang payload định nghĩa cấu trúc mạng LAN,
so that tôi dùng App trên thiết bị Android quét để thiết lập cấu hình tức thời.

## Acceptance Criteria

1. **Given** Companion Dashboard hiển thị,
   **When** tải thông tin server,
   **Then** kết xuất một mã QR mang nhãn "Kết nối APK" chứa payload định dạng:
   `android-stream-desk://connect?v=1&host=<LAN-IP>&wsPort=<wsPort>`
   **And** mã QR được tự động vẽ lại (regenerate) mỗi khi cài đặt mạng áp dụng thực tế chuyển đổi.

## Tasks / Subtasks

- [ ] Task 1: Thiết lập schema payload QR code cho APK (AC: 1)
  - [ ] Định nghĩa cấu trúc chuỗi QR: `android-stream-desk://connect?v=1&host=<LAN-IP>&wsPort=<wsPort>`.
- [ ] Task 2: Tự động cập nhật QR Code theo thay đổi (AC: 1)
  - [ ] Lắng nghe thay đổi của cấu hình đang chạy ở Dashboard.
  - [ ] Cập nhật lại khung vẽ QR ngay khi config mới có hiệu lực để tránh quét nhầm cổng cũ.

## Dev Notes

- **Offline-Only**: Đảm bảo mã QR vẽ hoàn toàn client-side (VD thông qua `<canvas>` hoặc client-side SVG).

### References

- [Source: src/views/DashboardView.vue#22] - Trạng thái biến UI trong Dashboard.
