# Story 3.2: Quét mã QR native camera scanner hỗ trợ trên APK Android

Status: ready-for-dev

## Story

As an APK client user,
I want có nút quét mã QR sử dụng camera thiết bị trong màn hình kết nối di động,
so that tôi kết nối tới Companion tức thì mà không cần tự nhập địa chỉ IPv4.

## Acceptance Criteria

1. **Given** ứng dụng chạy trên APK Android di động,
   **When** màn hình "Chưa kết nối Companion" hiển thị,
   **Then** xuất hiện nút "Quét QR từ Companion".
2. **Given** nút Quét QR được nhấn lần đầu,
   **When** bấm,
   **Then** hệ thống yêu cầu quyền camera native (`android.permission.CAMERA`), mở màn hình quét camera sau qua plugin `@tauri-apps/plugin-barcode-scanner`.
3. **Given** mã QR được quét thành công mang format payload hợp lệ `android-stream-desk://connect?v=1&...`,
   **When** parse thành công,
   **Then** tự động trích xuất `host` lưu vào `localStorage.server_ip`, `wsPort` lưu vào `localStorage.server_port`, đóng scanner và gọi kết nối socket lập tức,
   **And** cảnh báo lỗi nếu payload sai format và giữ nguyên cấu hình cũ.

## Tasks / Subtasks

- [ ] Task 1: Tích hợp thư viện Barcode Scanner & Quyền Camera (AC: 1, 2)
  - [ ] Cài đặt `@tauri-apps/plugin-barcode-scanner` cho JavaScript/TypeScript.
  - [ ] Cập nhật files `src-tauri/Cargo.toml` và `src-tauri/capabilities/default.json` để cấp quyền mở scanner native.
  - [ ] Cấu hình Gradle Android: Kích hoạt camera permission trong AndroidManifest.xml.
- [ ] Task 2: Xây dựng UI controller quét mã và xử lý parser (AC: 3)
  - [ ] Thêm nút quét QR biểu tượng Camera cận input IP của `ClientView.vue` (chỉ hiển thị trên Mobile).
  - [ ] Viết hàm parse payload giải mã: regex lấy `host` và `wsPort` từ scheme `android-stream-desk://connect`.
  - [ ] Lưu thông số vào local storage/connection Store và kích hoạt `.connect()`, hiển thị toast báo kết quả.

## Dev Notes

- **Plugin compatibility**: Chặn gọi scanner native trên browser thường hoặc máy desktop để tránh sinh lỗi runtime.

### References

- [Source: src-tauri/capabilities/default.json] - Nơi khai báo tauri ACL permissions.
- [Source: src/views/ClientView.vue#195] - Điểm neo Modal "Chưa kết nối".
