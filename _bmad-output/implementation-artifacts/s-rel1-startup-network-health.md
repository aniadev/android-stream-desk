# Story 8.1 (S-REL1): Startup network health contract

Status: done

## Story

As a Companion Dashboard,
I want backend expose trạng thái listener thực tế sau startup,
so that Dashboard và mobile biết app mới đã bind port thành công hay chưa, không phát endpoint sai.

## Acceptance Criteria

1. **Given** Companion khởi động xong,
   **When** Dashboard gọi `get_server_info`,
   **Then** `ServerInfo` trả `configuredWsPort`, `runningWsPort`, `webEnabled`, `webPort`, `wsReady`, `wsBindError` (giữ camelCase qua `#[serde(rename)]`).
2. **Given** WebSocket bind thành công,
   **When** server start,
   **Then** lưu in-memory bind status `wsReady=true`; nếu bind fail thì `wsBindError={port,error}`. Web server có status tương đương nếu bật.
3. **Given** trạng thái listener,
   **When** Dashboard render,
   **Then** hiển thị `Listening`, `Restart pending`, hoặc `Bind error` thay vì chỉ đọc config file.
4. **Given** các struct mới,
   **When** chạy `cargo test`,
   **Then** có test serialization/default và event payload pass.

## Tasks / Subtasks

- [x] Task 1: Mở rộng `ServerInfo` (AC: 1)
  - [x] Thêm field mới vào struct + `#[serde(rename = "camelCase")]`.
  - [x] Cập nhật `get_server_info` tại `src-tauri/src/lib.rs:221`.
- [x] Task 2: Bind status in-memory (AC: 2)
  - [x] Lưu trạng thái bind WS tại `src-tauri/src/websocket.rs:27` (`server-ready`/`server-error`).
  - [x] Lưu trạng thái bind Web tại `src-tauri/src/webserver.rs`.
- [x] Task 3: Dashboard health render (AC: 3)
  - [x] Hiển thị badge `Listening`/`Restart pending`/`Bind error` trong `DashboardView.vue`.
- [x] Task 4: Rust tests (AC: 4)
  - [x] Test serde default + serialize cho `ServerInfo`/bind status.

## Dev Notes

- WS port là `WS_PORT` const trong `lib.rs` — không hardcode.
- Story này là gốc dependency: chặn S-REL2, S-REL3, S-RUST2.

### References

- [Source: src-tauri/src/lib.rs:221] - `get_server_info` hiện chỉ trả ip/port.
- [Source: src-tauri/src/websocket.rs:27] - emit `server-ready`/`server-error`.
- [Source: src-tauri/src/webserver.rs:7] - HTTP server include_dir.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §1]

## Dev Agent Record

### Implementation Plan

- Mở rộng contract `ServerInfo` bằng `ListenerBindStatus` dùng chung cho WebSocket và Web server, vẫn giữ `ip`/`port` cũ để tương thích client hiện có.
- Lưu trạng thái bind trong memory ngay tại điểm listener bind success/fail, đồng thời type hóa payload event ready/error để test được contract serde.
- Dashboard đọc `ServerInfo` mới khi mount và cập nhật theo Tauri events để render badge health từ trạng thái runtime thay vì chỉ so sánh config.

### Debug Log

- RED: `cargo test --manifest-path src-tauri/Cargo.toml server_info_serializes_listener_health_contract_in_camel_case` fail vì thiếu `ServerInfo::from_config_and_bind_status` và `ListenerBindStatus`.
- GREEN: test contract `ServerInfo` pass sau khi thêm field camelCase và bind status.
- RED: `cargo test --manifest-path src-tauri/Cargo.toml websocket::tests` fail vì thiếu struct `WsServerReadyPayload`/`WsServerErrorPayload`.
- GREEN: `cargo test --manifest-path src-tauri/Cargo.toml websocket::tests` pass 3/3.
- GREEN: `cargo test --manifest-path src-tauri/Cargo.toml webserver::tests` pass 7/7.
- Regression: `cargo test --manifest-path src-tauri/Cargo.toml` pass 17/17.
- Frontend: `pnpm build` pass; Vite chỉ báo warning chunk lớn/dynamic import hiện hữu.

### Completion Notes

- `get_server_info` hiện trả `configuredWsPort`, `runningWsPort`, `webEnabled`, `webPort`, `wsReady`, `wsBindError`, đồng thời thêm `webReady`/`webBindError` cho trạng thái Web server tương đương.
- WebSocket và Web server ghi trạng thái in-memory khi bind thành công hoặc lỗi bind, và emit payload có struct serde rõ ràng.
- Dashboard hiển thị badge `Listening`, `Restart pending`, hoặc `Bind error` dựa trên runtime listener health và event realtime.

## File List

- `_bmad-output/implementation-artifacts/s-rel1-startup-network-health.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/webserver.rs`
- `src-tauri/src/websocket.rs`
- `src/views/DashboardView.vue`

## Change Log

- 2026-06-04: Implemented startup network health contract for `ServerInfo`, listener bind status, Dashboard health badge, and Rust serialization/status tests.

## Review Findings (2026-06-04)

- [x] [Review][Patch] Nhánh `kind === 'web'` chết trong listener `server-error` [src/views/DashboardView.vue:927] — WS `server-error` emit `WsServerErrorPayload { port, error }` không có field `kind`; web error đi qua event riêng `server-web-error` (test xác nhận: `ws_server_error_payload_serializes_port_and_error` không kind, `web_server_error_payload_serializes_port_error_and_kind` có kind). Nhánh không bao giờ chạy → dead code, gây hiểu nhầm wiring. **Đã fix 2026-06-04**: bỏ nhánh `kind`, giữ xử lý WS.
- [x] [Review][Patch] Listener đăng ký SAU snapshot trong `onMounted` [src/views/DashboardView.vue:907,926] — `get_server_info` đọc snapshot trước khi attach `server-ready`/`server-web-ready`/`server-error`; event (re)bind bắn trong khe hở đó bị mất → `runningWsPort`/`webReady` có thể stale tới lần mount sau. **Đã fix 2026-06-04**: attach listener trước rồi mới đọc snapshot.
- [x] [Review][Defer] Rust bind-status test mutate global `WS_BIND_STATUS`/`WEB_BIND_STATUS` [src-tauri/src/websocket.rs, src-tauri/src/webserver.rs] — deferred, pre-existing test-only flake risk khi cargo chạy test song song; hiện 17/17 pass.
