# Story 1.2: Giao diện thiết lập mạng Dashboard Network Settings

Status: review

## Story

As a Companion user,
I want giao diện cài đặt Dashboard cung cấp biểu mẫu quản trị cổng mạng và trạng thái thay đổi rõ ràng,
so that tôi lưu được cổng mới và dễ dàng khởi động lại ứng dụng để áp dụng.

## Acceptance Criteria

1. **Given** giao diện Settings hiển thị,
   **When** xem phần "Kết nối LAN",
   **Then** hiển thị hai trạng thái: "Cổng đang chạy" (Read-only, đọc từ cổng active thực tế của socket listener) và "Cổng sau khi khởi động lại" (Input có thể tự do nhập sửa).
2. **Given** giá trị thay đổi trong Input khác với cổng đang chạy thực tế,
   **When** nhập phím,
   **Then** hiển thị thẻ Badge "Có thay đổi chưa áp dụng" màu vàng nổi bật tại vùng cài đặt.
3. **Given** người dùng nhấn nút "Lưu và khởi động lại",
   **When** bấm,
   **Then** hệ thống gọi command lưu, hiển thị Dialog chờ khởi động lại, kích hoạt restart app qua Tauri API `relaunch()` để khởi tạo socket listener mới.

## Tasks / Subtasks

- [x] Task 1: Thiết kế giao diện Form cài đặt mạng LAN trên Settings (AC: 1, 2)
  - [x] Thêm mục "Mạng LAN & Ports" trong modal cấu hình chứa input port WS, port HTTP Web Client, và toggle bật Web Client.
  - [x] Thêm trường hiển thị "Cổng hiện thời đang lắng nghe" ở dạng chỉ đọc.
  - [x] Thêm logic so sánh: Nếu giá trị input khác với cổng đang chạy, hiển thị nhãn/badge "Cập nhật thay đổi sau khi restart".
- [x] Task 2: Implement hành động lưu và kích hoạt relaunch Companion (AC: 3)
  - [x] Gọi Tauri command `save_server_config` khi người dùng nhấn nút lưu cấu hình.
  - [x] Nhập API `relaunch` từ `@tauri-apps/plugin-process` để khởi động lại ứng dụng khi lưu thành công, kèm popup thông báo chờ.

## Dev Notes

- **Relaunch Capability**: Cập nhật file cấu hình permission/capabilities của Tauri để mở khóa quyền `process:default` (cho phép gọi lệnh relaunch an toàn).
- **Import Check**: Kiểm thử kiểu nhập dynamic của `@tauri-apps/plugin-process` trong web browser fallback (chỉ chạy relaunch trên máy desktop).

### References

- [Source: src/views/DashboardView.vue#1726] - Tham khảo modal cài đặt UI hiện hữu.
- [Source: src-tauri/capabilities/default.json] - Nơi khai báo mở permission tauri plugins.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex / Amelia

### Debug Log References

- 2026-06-03: Baseline `pnpm build` passed before implementation.
- 2026-06-03: Baseline `cargo test --manifest-path src-tauri/Cargo.toml server_config` passed before implementation.
- 2026-06-03: RED `cargo test --manifest-path src-tauri/Cargo.toml default_capability_allows_process_relaunch` failed because `process:default` was not yet available.
- 2026-06-03: GREEN `cargo test --manifest-path src-tauri/Cargo.toml default_capability_allows_process_relaunch` passed after adding `tauri-plugin-process` backend plugin and capability permission.
- 2026-06-03: Validation `pnpm build` passed.
- 2026-06-03: Validation `cargo test --manifest-path src-tauri/Cargo.toml` passed: 6 Rust tests.
- 2026-06-03: Validation `cargo check --manifest-path src-tauri/Cargo.toml` passed.

### Completion Notes List

- Added "Mạng LAN & Ports" section in Dashboard Settings with read-only active WebSocket port, editable restart WebSocket port, editable HTTP Web Client port, and Web Client toggle.
- Added pending-change detection against the active listener port and saved server config; the settings area now shows the yellow "Có thay đổi chưa áp dụng" badge when restart-required changes exist.
- Wired "Lưu và khởi động lại" to call `save_server_config`, show a relaunch wait dialog, and dynamically call `relaunch()` only in Tauri desktop context.
- Added frontend validation for port range and duplicate WS/HTTP ports when Web Client is enabled, matching backend constraints from Story 1.1.
- Added Rust plugin registration and generated capability/schema support for `process:default`.

### File List

- src/views/DashboardView.vue
- src-tauri/Cargo.toml
- src-tauri/Cargo.lock
- src-tauri/capabilities/default.json
- src-tauri/gen/schemas/acl-manifests.json
- src-tauri/gen/schemas/capabilities.json
- src-tauri/gen/schemas/desktop-schema.json
- src-tauri/gen/schemas/macOS-schema.json
- src-tauri/src/lib.rs
- _bmad-output/implementation-artifacts/1-2-network-settings-gui.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-06-03: Implemented Dashboard Network Settings GUI, relaunch flow, and process capability guard tests.
