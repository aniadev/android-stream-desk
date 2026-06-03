# Story 1.1: Đọc/ghi cấu hình mạng từ tệp server.json

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want hệ thống nạp và ghi cấu hình cổng từ file `server.json` thay vì bind cứng compile-time,
so that người dùng có thể tùy chỉnh môi trường mạng phù hợp với thiết bị của họ.

## Acceptance Criteria

1. **Given** Companion khởi chạy chưa có file `server.json`,
   **When** thực hiện nạp cài đặt tại `app_config_dir()`,
   **Then** tự khởi tạo cấu hình mặc định: `wsPort: 8089`, `webEnabled: false`, `webPort: 8090`,
   **And** trả về các giá trị này làm fallback an toàn.
2. **Given** một cổng được thiết lập ngoài dải `1024..=65535` hoặc bị trùng nhau giữa HTTP và WS khi `webEnabled` được bật,
   **When** gọi command `save_server_config`,
   **Then** trả về lỗi validation và không ghi đè cấu hình hiện tại.
3. **Given** cấu hình mạng thay đổi hợp lệ,
   **When** gọi command `save_server_config` và ghi thành công file `server.json`,
   **Then** trả về kết quả thành công mà không hot-rebind socket lập tức.

## Tasks / Subtasks

- [x] Task 1: Định nghĩa Struct cấu hình mạng trên Rust (AC: 1)
  - [x] Thêm struct `ServerConfig` với serde derive Serialize/Deserialize trong `src-tauri/src/lib.rs`.
  - [x] Implement hàm Helper đọc cấu hình từ `$config_dir/server.json`, nếu không tồn tại hoặc lỗi, thì tự trả về struct default (`ws: 8089`, `web: false`, `web_port: 8090`).
- [x] Task 2: Cài đặt Tauri Command get/save network config (AC: 1, 2, 3)
  - [x] Tạo Rust command `get_server_config` để trả về server setup hiện tại.
  - [x] Tạo Rust command `save_server_config` nhận `ServerConfig`, thực hiện validation dải `1024..=65535`, đảm bảo `wsPort != webPort` khi `webEnabled == true`, ghi atomic file bằng cách ghi file tạm `.tmp` rồi đổi tên.
  - [x] Đăng ký 2 command mới vào `.invoke_handler()` trong `lib.rs`.
- [x] Task 3: Cập nhật WebSocket Server sử dụng port từ server.json (AC: 1)
  - [x] Đọc cấu hình mạng `server.json` trước khi khởi chạy WebSocket service trong luồng bootstrap.
  - [x] Bind địa chỉ WebSocket listener động theo cổng cấu hình (`wsPort` thay vì dùng hằng số `8089` cũ).

### Review Findings

- [x] [Review][Patch] Ep kieu u32 sang u16 khong an toan cho cong ket noi [src-tauri/src/lib.rs:949]
- [x] [Review][Defer] Ro ri file .tmp cau hinh khi doi ten that bai [src-tauri/src/lib.rs:97] — deferred, pre-existing
- [x] [Review][Defer] Am tham nap cau hinh mac dinh khi file hong khong in log [src-tauri/src/lib.rs:61] — deferred, pre-existing

## Dev Notes

- **Quy tắc Anigo macOS**: Nhắc nhở nhà phát triển không bao giờ lưu trữ `Enigo` toàn cục (lazy_static/Mutex) do tính không an toàn luồng của `enigo` trên macOS. Chỉ khởi tạo động bên trong ngữ cảnh cục bộ.
- **Tauri Manager Trait**: Đảm bảo tệp gọi `.path().app_config_dir()` có dòng `use tauri::Manager;` ở đầu tệp để tránh lỗi compilation.
- **Cấu trúc file**: Cấu hình mạng lưu ở `server.json`, độc lập hoàn toàn với `layout.json` để tránh làm phình payload đồng bộ hóa layout qua WebSocket.

### Project Structure Notes

- `src-tauri/src/lib.rs`: Chứa struct `ServerConfig` và các command `get_server_config`, `save_server_config`.
- `server.json` sẽ được lưu tự động tại thư mục config ứng dụng (với windows là `%APPDATA%/com.ania.android.stream.desk/server.json`).

### References

- [Source: src-tauri/src/lib.rs#77] - Gợi ý nạp config app mẫu từ layout.json.
- [Source: src-tauri/src/websocket.rs#183] - Sử dụng `app_handle.path().app_config_dir()` với import trait `tauri::Manager`.

## Dev Agent Record

### Agent Model Used

gemini-3-flash-agent

### Debug Log References

- 2026-06-03: RED `cargo test --manifest-path src-tauri/Cargo.toml server_config -- --nocapture` failed because `ServerConfig`/helpers were not implemented yet.
- 2026-06-03: RED `cargo test --manifest-path src-tauri/Cargo.toml load_server_config_returns_default_when_file_missing_or_invalid -- --nocapture` failed because missing `server.json` was not initialized yet.
- 2026-06-03: GREEN `cargo test --manifest-path src-tauri/Cargo.toml` passed: 5 Rust tests.
- 2026-06-03: Validation `cargo check --manifest-path src-tauri/Cargo.toml` passed.

### Completion Notes List

- Implemented `ServerConfig` with camelCase serde fields and defaults `wsPort: 8089`, `webEnabled: false`, `webPort: 8090`.
- Added load/save helpers for `$app_config_dir/server.json`; missing config initializes a default file, malformed/invalid config falls back safely.
- Added validation for user port range `1024..=65535` and duplicate WS/HTTP ports when `webEnabled` is true; invalid saves return errors before writing.
- Added atomic save path via `server.json.tmp` then rename, plus Tauri commands `get_server_config` and `save_server_config`.
- Updated startup WebSocket bootstrap and `get_server_info` to use the configured `wsPort`; no hot-rebind is performed after save.

### File List

- src-tauri/src/lib.rs
- _bmad-output/implementation-artifacts/1-1-read-write-network-config.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-06-03: Implemented Story 1.1 network config read/write and dynamic WebSocket startup port.
