# Story 12.1 (S-RUST1): Wake lock connected-only enforcement

Status: ready-for-dev

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

- [ ] Task 1: Bỏ acquire vô điều kiện (AC: 1)
  - [ ] Xóa `acquireWakeLock()` trong `onMounted` tại `ClientView.vue:214`.
- [ ] Task 2: Gate watcher (AC: 2, 3)
  - [ ] Watcher acquire/release theo `keepScreenOn && connected`; visibility handler reacquire chỉ khi connected.
- [ ] Task 3: Manual test
  - [ ] Android/Web: bật setting, mở app khi Companion tắt → màn hình không giữ sáng.

## Dev Notes

- Story này đang lệch changelog v1.5.0. Complexity Low. Liên quan S-RUST3 gate.
- Story 7-1 đã làm phần watcher connected — đây là fix acquire `onMounted` còn sót.

### References

- [Source: src/views/ClientView.vue:214] - acquireWakeLock onMounted.
- [Source: src/lib/wakelock.ts]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §5]
