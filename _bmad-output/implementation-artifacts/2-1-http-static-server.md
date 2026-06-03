# Story 2.1: Phục vụ Web Client tĩnh & API Server Info

Status: review

## Story

As a Companion user,
I want Companion tự chạy một Web Server nội bộ phục vụ static client view và API nhận diện cấu hình mạng trong LAN,
so that tôi dễ dàng truy cập macro pad bằng trình duyệt web.

## Acceptance Criteria

1. **Given** `webEnabled` là `true` trong `server.json`,
   **When** ứng dụng Companion khởi động,
   **Then** tiến trình Rust spawn một máy chủ HTTP tĩnh bind cổng `webPort` trong LAN, phục vụ tệp HTML/JS của Client (`ClientView.vue` shell) tại route `/`,
   **And** chặn toàn bộ truy cập vào Dashboard `/dashboard` (trả về 403 Forbidden hoặc redirect về `/`).
2. **Given** trình duyệt gửi request tới đầu cuối `/api/server-info`,
   **When** truy cập,
   **Then** trả về cấu hình JSON chứa `wsPort: number` của WebSocket server thực tế đang phục vụ.
3. **Given** cổng `webPort` bị conflict hoặc chiếm dụng bởi tiến trình của ứng dụng khác,
   **When** bind,
   **Then** hệ thống emit event `server-error` lên frontend xử lý thay vì crash silent hoặc crash hệ thống.

## Tasks / Subtasks

- [x] Task 1: Tách đóng gói Web client static folder (AC: 1)
  - [x] Cấu hình trong `dist-client/` chứa bundle phục vụ di động (chỉ chứa views `/`).
  - [x] Sử dụng crate `rust-embed` hoặc `include_dir` để compile thư mục static assets vào trực tiếp binary Rust.
- [x] Task 2: Implement HTTP server tĩnh và endpoint config (AC: 1, 2, 3)
  - [x] Tạo module `src-tauri/src/webserver.rs` sử dụng crate `axum` hoặc `tiny-http` hoặc `actix-web` (tùy vào dep có sẵn).
  - [x] Thêm route `/api/server-info` trả về `wsPort` dạng JSON.
  - [x] Thêm router phục vụ asset thư mục static, kiểm tra chặn các URL chứa `/dashboard` trả về redirection.
- [x] Task 3: Tích hợp vòng đời server vào system bootstrap (AC: 1, 3)
  - [x] Đọc cấu hình mạng `ServerConfig` khi startup; nếu `webEnabled` được bật thì spawn HTTP Web Server trên thread blocking độc lập.
  - [x] Bắt lỗi bind cổng TCP port conflict, nếu gặp lỗi thì gửi message `server-web-error` thông trình xử lý backend lên cửa sổ Dashboard.

## Dev Notes

- **Package footprint**: Tránh đưa quá nhiều dependencies cồng kềnh. Sử dụng `axum` + `tokio` (sẵn có từ tauri runtime) hoặc `tiny-http` tối giản.
- **Cross-origin**: Cấu hình CORS hợp lý cho endpoint `/api/server-info` để Browser di động LAN gọi AJAX thành công.

### References

- [Source: src-tauri/src/lib.rs#898] - Nơi spawn luồng async.

## Dev Agent Record

### Implementation Plan

- Red: thêm unit tests cho JSON `/api/server-info`, chặn `/dashboard`, và mapping static root trước khi implement.
- Green: thêm `tiny_http` + `include_dir`, module `webserver`, route API/static/CORS, và event lỗi bind.
- Refactor/verify: chuyển `src/main.ts` sang client-only build mode để `dist-client` không bundle Dashboard.

### Debug Log

- `cargo test --manifest-path src-tauri/Cargo.toml webserver` fail đúng kỳ vọng ở red phase: 3 test fail với stub ban đầu.
- `cargo test --manifest-path src-tauri/Cargo.toml webserver` pass sau green phase: 4/4.
- `pnpm build:client` pass; kiểm tra grep không thấy `DashboardView`, `/dashboard`, hoặc text Dashboard trong `dist-client`.
- `pnpm exec vue-tsc -b` pass.
- `pnpm build` pass; Vite chỉ cảnh báo chunk lớn, không fail build.
- `cargo test --manifest-path src-tauri/Cargo.toml` pass: 10/10.
- `cargo check --manifest-path src-tauri/Cargo.toml` pass.

### Completion Notes

- Companion giờ spawn HTTP Web Client server trên thread blocking độc lập khi `ServerConfig.webEnabled=true`.
- Server phục vụ static assets nhúng từ `dist-client/`, trả `/api/server-info` dạng `{"wsPort":number}`, thêm CORS cho API, và trả `403 Forbidden` cho URL chứa `/dashboard`.
- Lỗi bind `webPort` emit cả `server-web-error` và `server-error` với payload `kind: "web"` để đáp ứng AC và task backend.
- Build frontend tạo thêm `dist-client` ở mode `client`, trong đó router chỉ có ClientView route `/`.

### File List

- `package.json`
- `vite.config.ts`
- `src/main.ts`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/src/lib.rs`
- `src-tauri/src/webserver.rs`
- `dist-client/index.html`
- `dist-client/assets/core-CwxXejkd.js`
- `dist-client/assets/dist-js-wShhpOtu.js`
- `dist-client/assets/index-BUn5KQWo.js`
- `dist-client/assets/index-CISstjn4.css`
- `dist-client/favicon.svg`
- `dist-client/icons.svg`
- `dist-client/logo-1.png`
- `dist-client/logo.bk.png`
- `dist-client/logo.png`
- `dist-client/sound/poop.wav`

### Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-03 | 1.0 | Implement HTTP static Web Client server, server-info API, client-only bundle, and bootstrap integration. | Amelia |
