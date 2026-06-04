# Story 8.3 (S-REL3): Mobile reconnect after Companion restart

Status: ready-for-dev

## Story

As a mobile Client user,
I want kết nối lại được sau khi Companion relaunch, kể cả khi port đổi,
so that tôi không bị kẹt ở endpoint cũ và biết khi nào cần quét QR lại.

## Acceptance Criteria

1. **Given** socket close sau khi đã từng connected,
   **When** Companion restart cùng port,
   **Then** mobile reconnect silent theo endpoint cũ thành công.
2. **Given** reconnect fail hết retry budget,
   **When** đang chạy Android Tauri,
   **Then** hiển thị CTA nổi bật `Quét QR lại` (Companion có thể đã đổi port).
3. **Given** user quét QR mới,
   **When** scan thành công,
   **Then** overwrite endpoint cũ, reset reconnect counter, và connect ngay.
4. **Given** đang reconnect,
   **When** thử kết nối,
   **Then** log IP:port đang thử vào toast/debug text để user thấy.

## Tasks / Subtasks

- [ ] Task 1: Reset reconnect state khi đổi endpoint (AC: 3)
  - [ ] Reset reconnect counter trong `connection.ts` khi QR scan ghi endpoint mới.
- [ ] Task 2: CTA quét lại (AC: 2)
  - [ ] Khi hết retry budget + Android Tauri → CTA `Quét QR lại`.
- [ ] Task 3: Endpoint diagnostics (AC: 4)
  - [ ] Log `host:port` đang thử vào toast/debug.
- [ ] Task 4: Manual QA (AC: 1, 2, 3)
  - [ ] same-port restart, changed-port restart, bind error port conflict.

## Dev Notes

- Phụ thuộc S-REL1. `connection.ts` giữ `server_ip`/`server_port` trong localStorage.
- Giữ guard `socket.value !== ws` trong `onclose` — không phá.

### References

- [Source: src/stores/connection.ts:8] - localStorage server_ip/server_port.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §1]
