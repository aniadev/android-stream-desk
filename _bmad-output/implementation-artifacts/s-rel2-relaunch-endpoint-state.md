# Story 8.2 (S-REL2): Relaunch UX không phát QR/URL sai trạng thái

Status: ready-for-dev

## Story

As a Companion user đổi cấu hình mạng,
I want UI không cho scan/copy endpoint mới trước khi listener mới chạy,
so that mobile không kết nối nhầm port cũ/chưa active sau relaunch.

## Acceptance Criteria

1. **Given** user vừa lưu config mạng,
   **When** app chưa relaunch xong,
   **Then** hiển thị badge `Đang áp dụng` cho tới khi listener mới ready (hoặc dev-mode manual restart).
2. **Given** Dashboard sinh QR `Kết nối APK`,
   **When** render,
   **Then** payload dùng `runningWsPort` (từ S-REL1), không dùng draft/persisted config chưa active.
3. **Given** relaunch fail hoặc đang dev mode,
   **When** không tự restart được,
   **Then** hiển thị checklist restart thủ công và giữ endpoint cũ.
4. **Given** computed state,
   **When** test,
   **Then** có component check cho `hasPendingServerChanges`, `apkConnectPayload`, `webClientUrl`.

## Tasks / Subtasks

- [ ] Task 1: Pending state badge (AC: 1, 3)
  - [ ] Computed `hasPendingServerChanges` so config draft vs `runningWsPort`.
  - [ ] Badge `Đang áp dụng` + checklist fallback khi relaunch fail/dev mode.
- [ ] Task 2: QR/URL dùng running port (AC: 2)
  - [ ] `apkConnectPayload`/`webClientUrl` đọc `runningWsPort`, disable khi pending/bind error.
- [ ] Task 3: Tests (AC: 4)
  - [ ] Component/computed test cho 3 computed trên.

## Dev Notes

- Phụ thuộc S-REL1 (`runningWsPort`, `wsReady`, `wsBindError`).
- Relaunch hiện gọi plugin `relaunch()` sau timeout 450ms — giữ luồng, chỉ chặn UI phát endpoint sớm.

### References

- [Source: src/views/DashboardView.vue:228] - save config + relaunch.
- [Source: src/views/DashboardView.vue:174] - `serverPort` listener hiện tại.
- [Source: src/views/DashboardView.vue:182] - `savedServerConfig`.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §1]
