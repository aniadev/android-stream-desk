# Story 9.3 (S-MAC3): macOS manual verification script/checklist

Status: done

## Story

As a QA/maintainer,
I want checklist tái hiện và xác nhận fix Accessibility trên dev build và packaged `.app`,
so that release v1.5.1 không đóng issue mà chưa verify thật.

## Acceptance Criteria

1. **Given** `docs/manual-test.md`,
   **When** cập nhật,
   **Then** có kịch bản reset Accessibility entry.
2. **Given** checklist,
   **When** QA chạy,
   **Then** bao gồm: xóa entry, allow lại packaged app, allow nhầm dev binary, restart app, chạy shortcut test.
3. **Given** TCC cache,
   **When** ghi checklist,
   **Then** nêu rõ khi nào cần quit/reopen do TCC cache.

## Tasks / Subtasks

- [x] Task 1: Cập nhật docs (AC: 1, 2, 3)
  - [x] Thêm section reset Accessibility vào `docs/manual-test.md`.
  - [x] Liệt kê checklist từng bước + ghi chú quit/reopen.

## Dev Notes

- Phụ thuộc S-MAC2 (UI recovery để verify).
- Story docs-only, complexity Low.

### References

- [Source: docs/manual-test.md]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §2]

## Dev Agent Record

### Debug Log

- 2026-06-04: Added `docs/manual-test.md` §5A for macOS Accessibility reset and stale TCC entry verification.
- 2026-06-04: Validation `pnpm build` pass; Vite reported existing large chunk / ineffective dynamic import warnings.
- 2026-06-04: Regression `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` pass.

### Completion Notes

- Manual checklist now covers deleting stale entries, re-allowing packaged `.app`, path mismatch/dev binary cases, restart behavior for TCC cache, and shortcut verification.
- The checklist explicitly says to quit/reopen before declaring failure when TCC cache may still hold stale process trust.

### File List

- docs/manual-test.md
- _bmad-output/implementation-artifacts/s-mac3-macos-manual-verification.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-06-04: Added macOS Accessibility manual verification checklist.
