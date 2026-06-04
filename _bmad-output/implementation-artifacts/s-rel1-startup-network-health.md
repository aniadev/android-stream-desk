# Story 8.1 (S-REL1): Startup network health contract

Status: ready-for-dev

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

- [ ] Task 1: Mở rộng `ServerInfo` (AC: 1)
  - [ ] Thêm field mới vào struct + `#[serde(rename = "camelCase")]`.
  - [ ] Cập nhật `get_server_info` tại `src-tauri/src/lib.rs:221`.
- [ ] Task 2: Bind status in-memory (AC: 2)
  - [ ] Lưu trạng thái bind WS tại `src-tauri/src/websocket.rs:27` (`server-ready`/`server-error`).
  - [ ] Lưu trạng thái bind Web tại `src-tauri/src/webserver.rs`.
- [ ] Task 3: Dashboard health render (AC: 3)
  - [ ] Hiển thị badge `Listening`/`Restart pending`/`Bind error` trong `DashboardView.vue`.
- [ ] Task 4: Rust tests (AC: 4)
  - [ ] Test serde default + serialize cho `ServerInfo`/bind status.

## Dev Notes

- WS port là `WS_PORT` const trong `lib.rs` — không hardcode.
- Story này là gốc dependency: chặn S-REL2, S-REL3, S-RUST2.

### References

- [Source: src-tauri/src/lib.rs:221] - `get_server_info` hiện chỉ trả ip/port.
- [Source: src-tauri/src/websocket.rs:27] - emit `server-ready`/`server-error`.
- [Source: src-tauri/src/webserver.rs:7] - HTTP server include_dir.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §1]
