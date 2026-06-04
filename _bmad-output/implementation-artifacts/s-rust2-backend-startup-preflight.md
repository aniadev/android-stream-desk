# Story 12.3 (S-RUST2): Backend startup/build preflight

Status: ready-for-dev

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

- [ ] Task 1: Preflight check (AC: 1)
  - [ ] Script/checklist verify `dist-client/index.html` trước build.
- [ ] Task 2: Lifecycle log (AC: 2)
  - [ ] Log 4 event ở `websocket.rs`/`webserver.rs`.
- [ ] Task 3: Bind error → health UI (AC: 3)
  - [ ] Nối `wsBindError`/`webBindError` vào Dashboard (S-REL1).

## Dev Notes

- Phụ thuộc S-REL1 (health UI). Web server dùng `include_dir!("$CARGO_MANIFEST_DIR/../dist-client")` — release phải tạo `dist-client` trước compile.
- Complexity Low.

### References

- [Source: src-tauri/src/webserver.rs:7] - include_dir dist-client.
- [Source: src-tauri/src/websocket.rs:20] - WS_MUTEX broadcaster.
- [Source: docs/manual-test.md] - release checklist.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §5]
