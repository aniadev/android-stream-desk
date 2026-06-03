# Story 6.1: Chạy ẩn Companion đi vào System Tray khi khởi động hệ thống

Status: ready-for-dev

## Story

As a Windows user,
I want ứng dụng Companion tự động kích hoạt chạy ẩn dưới System Tray sau khi khởi động máy tính,
so that ứng dụng sẵn sàng nhận kết nối macro mà không làm gián đoạn màn hình làm việc của tôi.

## Acceptance Criteria

1. **Given** tùy chọn "Khởi động cùng Windows" được bật trong settings,
   **When** máy tính khởi động lại và người dùng đăng nhập,
   **Then** ứng dụng Companion được kích hoạt ngầm với tham số `--hidden` (parse trong `lib.rs`),
   **And** thu nhỏ hoàn toàn vào System Tray, không bật giao diện Dashboard cửa sổ chính lên màn hình.
2. **Given** user bật/tắt toggle Autostart trên Dashboard,
   **When** thay đổi sự kiện,
   **Then** gọi API native tương ứng của `tauri-plugin-autostart` để đồng bộ Registry startup entry trên Windows cho ứng dụng đóng gói (.msi/.exe).

## Tasks / Subtasks

- [ ] Task 1: Cấu hình build & CLI arg parsing (AC: 1)
  - [ ] Bổ sung/kiểm tra parser tham số CLI trong `src-tauri/src/lib.rs` để lắng nghe token arg `--hidden`.
  - [ ] Bỏ qua lệnh `.show()` đối với cửa sổ chính chính của Tauri nếu phát hiện cờ ẩn.
- [ ] Task 2: Đồng bộ Registry qua plugin Autostart (AC: 2)
  - [ ] Tải plugin `autostart` nếu cần thiết và cấp permissions tương ứng.
  - [ ] Gọi hàm `enable()` kèm args là `["--hidden"]` khi người dùng kích hoạt toggle cài đặt khởi động.

## Dev Notes

- **Tauri capability requirement**: Hãy chắc chắn cờ capabilities cấp phép đầy đủ cho plugin autostart hoạt động trên file build cài đặt msi.

### References

- [Source: src-tauri/src/lib.rs#862] - Nơi nạp tray setup và logic CLI arguments.
- [Source: src-tauri/Cargo.toml#21] - Declared dependencies của dự án.
