# Story 2.2: Trình duyệt Web Client tự nhận diện cấu hình LAN

Status: ready-for-dev

## Story

As a Web Client user,
I want Web Client tự phân tách hostname và fetch API thông tin Companion để tự kết nối,
so that tôi không cần gõ thủ công IP và cổng trên trình duyệt thiết bị.

## Acceptance Criteria

1. **Given** Web Client chạy trong môi trường trình duyệt thường (không có Tauri internals),
   **When** nạp trang,
   **Then** tự động gọi API `/api/server-info` từ server Companion phục vụ, lấy thông tin cổng WebSocket,
   **And** khởi tạo WebSocket tới `ws://<local_hostname>:<wsPort>` để tự động kết nối và đồng bộ layout.
2. **Given** API fetch hoặc WebSocket kết nối thất bại,
   **When** lỗi xảy ra,
   **Then** hiển thị màn hình kết nối thủ công làm fallback để sửa lại IP và Port.

## Tasks / Subtasks

- [ ] Task 1: Phát hiện môi trường chạy Web Browser (AC: 1)
  - [ ] Thêm check logic `isBrowserMode = !window.__TAURI_INTERNALS__` trong `ClientView.vue`.
  - [ ] Ẩn các cài đặt không khả thi trên browser (như chọn camera native picker, v.v.).
- [ ] Task 2: Implement tự bootstrap thông số kết nối (AC: 1, 2)
  - [ ] Khi khởi chạy browser web app, fetch `http://<location.hostname>:<location.port>/api/server-info`.
  - [ ] Nạp kết quả thu được để điền `connectionStore.ipAddress` và `connectionStore.port`, sau đó kích hoạt hàm `connectionStore.connect()`.
  - [ ] Thiết lập error-catch: Nếu fetch API hoặc WS handshake lỗi sau timeout, tự động hiển thị Modal nhập thủ công IP/Port.

## Dev Notes

- **Fallback Context**: Khi chạy trên browser thường, Wake Lock có thể bị từ chối nếu không chạy trên context HTTPS/localhost. Cần log cảnh báo nhẹ, không crash.

### References

- [Source: src/views/ClientView.vue#151] - Logic auto-connect / read server info hiện hữu.
