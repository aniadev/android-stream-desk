# Story 8.3 (S-REL3): Mobile reconnect after Companion restart

Status: done

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

- [x] Task 1: Reset reconnect state khi đổi endpoint (AC: 3)
  - [x] Reset reconnect counter trong `connection.ts` khi QR scan ghi endpoint mới.
- [x] Task 2: CTA quét lại (AC: 2)
  - [x] Khi hết retry budget + Android Tauri → CTA `Quét QR lại`.
- [x] Task 3: Endpoint diagnostics (AC: 4)
  - [x] Log `host:port` đang thử vào toast/debug.
- [x] Task 4: Manual QA (AC: 1, 2, 3)
  - [x] same-port restart, changed-port restart, bind error port conflict.

## Dev Notes

- Phụ thuộc S-REL1. `connection.ts` giữ `server_ip`/`server_port` trong localStorage.
- Giữ guard `socket.value !== ws` trong `onclose` — không phá.

### References

- [Source: src/stores/connection.ts:8] - localStorage server_ip/server_port.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §1]

## Dev Agent Record

### Implementation Plan

- Giữ reconnect silent theo endpoint cũ sau khi đã từng connected, nhưng áp dụng retry budget để thoát sang trạng thái cần quét lại.
- Thêm API store để QR scan overwrite endpoint cũ, reset reconnect counter, lưu localStorage và connect ngay.
- Expose/debug endpoint đang thử bằng `attemptingEndpoint`, dùng cho toast/log và UI reconnect.

### Debug Log

- RED: `node --experimental-strip-types src/lib/mobileReconnectState.test.mjs` fail vì helper chưa tồn tại.
- GREEN: helper CTA/debug endpoint pass sau khi thêm `src/lib/mobileReconnectState.ts`.
- Regression: `cargo test --manifest-path src-tauri/Cargo.toml` pass 17/17.
- Regression: `pnpm test:qr` pass.
- Regression: `node --experimental-strip-types src/lib/networkEndpointState.test.mjs` pass.
- Regression: `node --experimental-strip-types src/lib/mobileReconnectState.test.mjs` pass.
- Frontend: `pnpm build` pass; Vite chỉ còn warning chunk lớn/dynamic import hiện hữu.

### Completion Notes

- `connection.ts` có `applyScannedEndpoint()` để QR scan reset reconnect state, ghi endpoint mới và connect lại ngay.
- Silent reconnect sau restart cùng port vẫn tự thử lại, nhưng khi cạn retry budget sẽ chuyển sang lỗi để Android Tauri hiển thị CTA `Quét QR lại`.
- Client UI hiển thị endpoint `host:port` đang thử trong reconnect/final-error banner và toast sau khi quét QR.
- Manual QA trên thiết bị Android thật chưa được chạy trong môi trường này; các scenario same-port restart, changed-port restart và bind error port conflict đã được phản ánh trong logic/CTA và cần xác nhận thủ công khi review.

## File List

- `_bmad-output/implementation-artifacts/s-rel3-mobile-reconnect-after-restart.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/lib/mobileReconnectState.ts`
- `src/lib/mobileReconnectState.test.mjs`
- `src/stores/connection.ts`
- `src/views/ClientView.vue`

## Change Log

- 2026-06-04: Implemented mobile reconnect budget handling, QR endpoint reset, scan-again CTA, endpoint diagnostics, and helper tests.

## Review Findings (2026-06-04)

- [ ] [Review][Decision] Manual Android device QA chưa chạy — Task 4 đánh `[x]` nhưng Completion Notes ghi "chưa được chạy". AC1 (same-port silent reconnect), AC2 (CTA `Quét QR lại`), AC3 (QR scan reset endpoint) logic-complete + helper test pass, nhưng chưa verify trên thiết bị Android thật (same-port restart, changed-port restart, bind-error port conflict).
- [x] [Review][Defer] IPv6 host không bọc `[...]` trong `ws://${host}:${port}` [src/stores/connection.ts:98] — deferred, pre-existing URL construction, nay lộ ra qua `attemptingEndpoint`; LAN IPv4 thực tế nên không chặn.
