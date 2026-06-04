# Story 2.2: Trình duyệt Web Client tự nhận diện cấu hình LAN

Status: review

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

- [x] Task 1: Phát hiện môi trường chạy Web Browser (AC: 1)
  - [x] Thêm check logic `isBrowserMode = !window.__TAURI_INTERNALS__` trong `ClientView.vue`.
  - [x] Ẩn các cài đặt không khả thi trên browser (như chọn camera native picker, v.v.).
- [x] Task 2: Implement tự bootstrap thông số kết nối (AC: 1, 2)
  - [x] Khi khởi chạy browser web app, fetch `http://<location.hostname>:<location.port>/api/server-info`.
  - [x] Nạp kết quả thu được để điền `connectionStore.ipAddress` và `connectionStore.port`, sau đó kích hoạt hàm `connectionStore.connect()`.
  - [x] Thiết lập error-catch: Nếu fetch API hoặc WS handshake lỗi sau timeout, tự động hiển thị Modal nhập thủ công IP/Port.

## Dev Notes

- **Fallback Context**: Khi chạy trên browser thường, Wake Lock có thể bị từ chối nếu không chạy trên context HTTPS/localhost. Cần log cảnh báo nhẹ, không crash.

### References

- [Source: src/views/ClientView.vue#151] - Logic auto-connect / read server info hiện hữu.

## Dev Agent Record

### Implementation Plan

- Red: thêm compile guard gọi helper chưa tồn tại trong `ClientView.vue`, xác nhận `vue-tsc` fail.
- Green: thêm `src/lib/browserBootstrap.ts` cho browser detection, URL `/api/server-info`, parse `wsPort`, và target hostname/port.
- Refactor/verify: nối browser bootstrap vào `onMounted`, giữ fallback manual modal khi fetch/WS fail, và rebuild `dist-client`.

### Debug Log

- `pnpm exec vue-tsc -b` fail ở red phase do thiếu `toBrowserBootstrapTarget` và unused imports.
- `pnpm exec vue-tsc -b` pass sau green phase.
- `pnpm exec tsc src/lib/browserBootstrap.ts --ignoreConfig --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM --outDir /tmp/asd-browser-bootstrap-test --skipLibCheck --declaration false --sourceMap false` pass.
- `node --input-type=module -e ...` pass với assertions cho browser detection, URL API, parse `wsPort`, target WS, và error fallback.
- `pnpm build:client` pass; `dist-client` không chứa `DashboardView`, `/dashboard`, hoặc text Dashboard.
- `pnpm build` pass; Vite chỉ cảnh báo chunk lớn, không fail build.
- `cargo test --manifest-path src-tauri/Cargo.toml` pass: 10/10.

### Completion Notes

- Web Client browser mode dùng `!window.__TAURI_INTERNALS__` để tự nhận diện môi trường browser thường.
- Khi browser load, client fetch `http://<location.hostname>:<location.port>/api/server-info`, set `connectionStore.ipAddress = location.hostname`, `connectionStore.port = wsPort`, rồi gọi `connectionStore.connect()`.
- Khi fetch server-info fail, code chỉ log cảnh báo nhẹ và giữ modal nhập IP/Port thủ công; khi WS handshake fail, store hiện có giữ modal/reconnect fallback.
- Settings browser mode ẩn notice tối ưu pin Android native; Wake Lock đã có warning nhẹ và không crash khi browser từ chối.

### File List

- `src/views/ClientView.vue`
- `src/lib/browserBootstrap.ts`
- `dist-client/index.html`
- `dist-client/assets/index-D1GlQ5UI.js`
- `dist-client/assets/index-BUn5KQWo.js` (deleted)
- `_bmad-output/implementation-artifacts/2-2-browser-client-bootstrap.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-03 | 1.0 | Implement browser-mode server-info bootstrap and manual fallback for Web Client. | Amelia |
