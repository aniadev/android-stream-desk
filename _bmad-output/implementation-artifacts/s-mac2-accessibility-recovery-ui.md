# Story 9.2 (S-MAC2): Recovery UI cho Accessibility stale entry

Status: done

## Story

As a macOS Companion user,
I want biết đang allow nhầm app/path nào và làm gì tiếp theo,
so that tôi tự khôi phục quyền Accessibility không cần đoán.

## Acceptance Criteria

1. **Given** diagnostics từ S-MAC1,
   **When** Dashboard banner render,
   **Then** dùng diagnostics thay vì chỉ boolean `trusted`.
2. **Given** banner hiển thị,
   **When** user xem,
   **Then** thấy `executablePath`/`appBundlePath` dạng copyable + bundle id ngắn.
3. **Given** banner,
   **When** user thao tác,
   **Then** có nút `Mở Accessibility Settings` và `Kiểm tra lại` (re-probe).
4. **Given** action phím/media fail vì thiếu quyền,
   **When** toast lỗi hiện,
   **Then** link về recovery panel.

## Tasks / Subtasks

- [x] Task 1: Banner dùng diagnostics (AC: 1, 2)
  - [x] Render path copyable + bundle id; hướng dẫn reset TCC dev build (quit → xóa entry → kéo `.app` đúng → mở lại → kiểm tra).
- [x] Task 2: Action buttons (AC: 3)
  - [x] `Mở Accessibility Settings` (open settings), `Kiểm tra lại` (re-probe).
- [x] Task 3: Toast link (AC: 4)
  - [x] Toast lỗi action route về recovery panel.

### Review Findings

- [x] [Review][Patch] `accessibilityRecoveryRequested` không bao giờ reset → panel dính cả session. Đã reset cờ về `false` trong `probePermission` khi `!inputPermissionNeedsRecovery`. [src/views/DashboardView.vue]

## Dev Notes

- Phụ thuộc S-MAC1. UI hiện poll mỗi 3s khi thiếu quyền + probe khi focus.
- Giữ chuỗi tiếng Việt user-facing.

### References

- [Source: src/views/DashboardView.vue:789] - poll permission + probe on focus.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §2]

## Dev Agent Record

### Debug Log

- 2026-06-04: Implemented Dashboard diagnostics state using `get_input_permission_diagnostics` with fallback to `probe_input_permission`.
- 2026-06-04: Added recovery panel with copyable `bundleIdentifier`, `executablePath`, `appBundlePath`, reset-TCC guidance, open-settings and re-probe actions.
- 2026-06-04: Wired Tauri `action-error` listener and Accessibility toast CTA to route user back to the recovery panel.
- 2026-06-04: Validation `pnpm build` pass; Vite reported existing large chunk / ineffective dynamic import warnings.
- 2026-06-04: Regression `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` pass.

### Completion Notes

- Dashboard now prefers S-MAC1 diagnostics over the old boolean probe and keeps the old command fallback for compatibility.
- Recovery UI shows actionable macOS path/bundle context and supports copy actions for QA/user debugging.
- Toasts caused by Accessibility-related action failures link to the recovery panel instead of only opening Settings.

### File List

- src/views/DashboardView.vue
- _bmad-output/implementation-artifacts/s-mac2-accessibility-recovery-ui.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-06-04: Implemented macOS Accessibility recovery panel and toast route.
