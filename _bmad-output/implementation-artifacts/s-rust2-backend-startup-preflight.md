# Story 12.3 (S-RUST2): Backend startup/build preflight

Status: review

## Story

As a maintainer,
I want release không fail ngầm vì thiếu `dist-client` hoặc bind service lỗi,
so that build và startup quan sát được, không vỡ im lặng.

## Acceptance Criteria

1. **Given** trước Tauri build,
   **When** preflight,
   **Then** có release checklist/script kiểm tra `dist-client/index.html` tồn tại.
2. **Given** server start,
   **When** WS/Web bind,
   **Then** log rõ `server-ready`, `server-error`, `server-web-ready`, `server-web-error`.
3. **Given** bind error,
   **When** xảy ra,
   **Then** đưa vào Dashboard health UI của S-REL1.

## Tasks / Subtasks

- [x] Task 1: Preflight check (AC: 1)
  - [x] Script/checklist verify `dist-client/index.html` trước build.
- [x] Task 2: Lifecycle log (AC: 2)
  - [x] Log 4 event ở `websocket.rs`/`webserver.rs`.
- [x] Task 3: Bind error → health UI (AC: 3)
  - [x] Nối `wsBindError`/`webBindError` vào Dashboard (S-REL1).

## Dev Notes

- Phụ thuộc S-REL1 (health UI). Web server dùng `include_dir!("$CARGO_MANIFEST_DIR/../dist-client")` — release phải tạo `dist-client` trước compile.
- Complexity Low.

### References

- [Source: src-tauri/src/webserver.rs:7] - include_dir dist-client.
- [Source: src-tauri/src/websocket.rs:20] - WS_MUTEX broadcaster.
- [Source: docs/manual-test.md] - release checklist.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §5]

## Dev Agent Record

### Implementation Plan

Audit phát hiện 2 trong 3 AC ĐÃ implement từ trước (S-REL1 epic-8):

- **AC-2 đã done:** `websocket.rs:66/72` emit `server-error`/`server-ready` (kèm `WsServerErrorPayload`/`WsServerReadyPayload` test-covered). `webserver.rs:59/90` emit `server-web-ready`/`server-web-error` (kèm `WebServerReadyPayload`/`WebServerErrorPayload` test-covered).
- **AC-3 đã done:** `DashboardView.vue:1149-1166` listen cả 4 events + populate `wsBindError`/`webBindError`; `ServerInfo` struct (`lib.rs:280-282`) đã có cả 2 field; HUD/QR/Web Client panels `DashboardView.vue:1613,1929,1976` đã reactive với bind error states.

Chỉ AC-1 là gap. Implementation:

1. **`src-tauri/build.rs`:** thêm `preflight_dist_client()` chạy trước `tauri_build::build()`. Check `$CARGO_MANIFEST_DIR/../dist-client/index.html` tồn tại — nếu không, `panic!` với message hướng dẫn rõ chạy `pnpm build:client`. Đăng ký `cargo:rerun-if-changed` cho cả index.html và folder để rebuild khi file xuất hiện/biến mất.
2. **`docs/manual-test.md`:** mới §10A — release preflight cho cả dist-client + 4 lifecycle events; bổ sung 2 checklist item cuối tài liệu.

### Completion Notes

- `cargo check` pass trên dev tree (dist-client tồn tại).
- Smoke test preflight: `mv dist-client dist-client.bak && cargo check` → panic đúng message "S-RUST2 preflight FAILED: dist-client/index.html missing" + Path checked + hướng dẫn fix. Restore xong build lại pass.
- `cargo test` giữ 28 pass (không thêm test mới vì build.rs không trong test target; thay vào đó smoke-test bằng mv/cargo-check ghi trong manual-test §10A.1).
- AC-2/AC-3 verify lại bằng codegrep: 26 ref `server-*` events + `wsBindError`/`webBindError` cross Dashboard + ServerInfo — wiring đầy đủ từ epic-8.
- Khi developer chạy `pnpm tauri build` trong CI mà quên `pnpm build:client`, build sẽ panic ngay step compile rust thay vì silent ship release thiếu Web Client.

## File List

- src-tauri/build.rs (modified) — preflight_dist_client() panics if dist-client/index.html missing
- docs/manual-test.md (modified) — §10A.1 dist-client preflight, §10A.2 lifecycle events test, +2 checklist items

## Change Log

| Date       | Version | Description                                                                                                | Author |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 2026-06-04 | 1.5.1   | S-RUST2: build.rs preflight chặn missing `dist-client/index.html`; document 4 lifecycle events trong manual test. | Amelia |

