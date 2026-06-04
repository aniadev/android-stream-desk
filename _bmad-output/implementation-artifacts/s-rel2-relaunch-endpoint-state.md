# Story 8.2 (S-REL2): Relaunch UX không phát QR/URL sai trạng thái

Status: done

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

- [x] Task 1: Pending state badge (AC: 1, 3)
  - [x] Computed `hasPendingServerChanges` so config draft vs `runningWsPort`.
  - [x] Badge `Đang áp dụng` + checklist fallback khi relaunch fail/dev mode.
- [x] Task 2: QR/URL dùng running port (AC: 2)
  - [x] `apkConnectPayload`/`webClientUrl` đọc `runningWsPort`, disable khi pending/bind error.
- [x] Task 3: Tests (AC: 4)
  - [x] Component/computed test cho 3 computed trên.

## Dev Notes

- Phụ thuộc S-REL1 (`runningWsPort`, `wsReady`, `wsBindError`).
- Relaunch hiện gọi plugin `relaunch()` sau timeout 450ms — giữ luồng, chỉ chặn UI phát endpoint sớm.

### References

- [Source: src/views/DashboardView.vue:228] - save config + relaunch.
- [Source: src/views/DashboardView.vue:174] - `serverPort` listener hiện tại.
- [Source: src/views/DashboardView.vue:182] - `savedServerConfig`.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §1]

## Dev Agent Record

### Implementation Plan

- Tách logic endpoint/pending thành helper TypeScript thuần để test được các computed quan trọng mà không thêm framework test mới.
- Dashboard so sánh draft config với `runningWsPort` thay vì configured port, và chỉ phát APK/Web endpoint khi listener runtime đã sẵn sàng.
- Relaunch dialog hiển thị checklist restart thủ công khi dev-mode hoặc relaunch fail.

### Debug Log

- RED: `node --experimental-strip-types src/lib/networkEndpointState.test.mjs` fail vì helper chưa tồn tại.
- GREEN: helper endpoint pass sau khi thêm `src/lib/networkEndpointState.ts`.
- Frontend: `pnpm build` pass; Vite chỉ còn warning chunk lớn/dynamic import hiện hữu.

### Completion Notes

- Badge network hiển thị `Đang áp dụng` khi config draft chưa khớp listener đang chạy.
- APK QR payload và Web URL dùng running endpoint, đồng thời bị ẩn khi pending hoặc bind error.
- Dialog relaunch fail/dev-mode có checklist restart thủ công và nhắc chờ `Listening` trước khi quét/copy endpoint.

## File List

- `_bmad-output/implementation-artifacts/s-rel2-relaunch-endpoint-state.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/lib/networkEndpointState.ts`
- `src/lib/networkEndpointState.test.mjs`
- `src/views/DashboardView.vue`

## Change Log

- 2026-06-04: Implemented relaunch endpoint gating, running-port QR/Web URL generation, manual restart checklist, and computed helper tests.

## Review Findings (2026-06-04)

- Không có patch/decision riêng cho story này. Tất cả AC1–AC4 đạt; QR/Web URL dùng `runningWsPort`, gate đúng theo pending/bind-error. (Lưu ý liên quan: blank web QR khi WS bind fail được đánh giá là hành vi đúng — web client cũng cần WS — nên dismissed.)
