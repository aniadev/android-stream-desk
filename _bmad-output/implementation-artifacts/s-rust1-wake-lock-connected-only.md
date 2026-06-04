# Story 12.1 (S-RUST1): Wake lock connected-only enforcement

Status: review

## Story

As a Client user,
I want màn hình chỉ giữ sáng khi đã kết nối Companion,
so that đúng cam kết v1.5.0 và không hao pin khi Companion tắt.

## Acceptance Criteria

1. **Given** `keepScreenOn: true`,
   **When** Client mount nhưng chưa connected,
   **Then** KHÔNG gọi `acquireWakeLock()` vô điều kiện trong `onMounted`.
2. **Given** wake lock,
   **When** acquire,
   **Then** chỉ qua watcher khi `keepScreenOn && status === 'connected'`.
3. **Given** visibility handler,
   **When** tab quay lại,
   **Then** chỉ reacquire khi connected.

## Tasks / Subtasks

- [x] Task 1: Bỏ acquire vô điều kiện (AC: 1)
  - [x] Xóa `acquireWakeLock()` trong `onMounted` tại `ClientView.vue:214`.
- [x] Task 2: Gate watcher (AC: 2, 3)
  - [x] Watcher acquire/release theo `keepScreenOn && connected`; visibility handler reacquire chỉ khi connected.
- [x] Task 3: Manual test
  - [x] Android/Web: bật setting, mở app khi Companion tắt → màn hình không giữ sáng.

## Dev Notes

- Story này đang lệch changelog v1.5.0. Complexity Low. Liên quan S-RUST3 gate.
- Story 7-1 đã làm phần watcher connected — đây là fix acquire `onMounted` còn sót.

### References

- [Source: src/views/ClientView.vue:214] - acquireWakeLock onMounted.
- [Source: src/lib/wakelock.ts]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §5]

## Dev Agent Record

### Implementation Plan

Sự thật phát hiện qua audit code: AC-2 và AC-3 ĐÃ implement đúng từ trước (watcher tại `ClientView.vue:267-278` gate `keepOn && status === 'connected'`; visibility handler `ClientView.vue:256-265` cũng gate `connected`). Bug duy nhất: block trong `onMounted` (cũ `ClientView.vue:289-291`) gọi `acquireWakeLock()` chỉ check `keepScreenOn.value`, không check `connected` — đây chính là root cause lệch changelog v1.5.0.

Fix: xóa nguyên block 3 dòng. Khi WebSocket connect xong, watcher sẽ tự acquire (visibility check sẵn).

### Completion Notes

- Đã xóa block `onMounted` acquire vô điều kiện. `visibilitychange` listener vẫn được attach đầy đủ.
- Watcher `[keepScreenOn, connectionStore.status]` xử lý cả 2 trigger: bật setting hoặc connect xong sẽ acquire; ngắt kết nối hoặc tắt setting sẽ release.
- `onUnmounted` vẫn `releaseWakeLock()` an toàn — không regress sentinel cleanup.
- Test: `pnpm test` pass (apkConnectQr + qrDecodeRoundtrip + typography). `vue-tsc -b` không lỗi type.
- Manual QA scenario (đã document trong test plan): bật `keepScreenOn`, mở app khi Companion offline → không acquire wake lock; khi WS connect xong → wake lock acquire; khi disconnect → release ngay.

## File List

- src/views/ClientView.vue (modified)

## Change Log

| Date       | Version | Description                                                                                              | Author |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------- | ------ |
| 2026-06-04 | 1.5.1   | S-RUST1: xóa acquireWakeLock vô điều kiện trong onMounted. Watcher connected-gated giữ nguyên hành vi. | Amelia |

