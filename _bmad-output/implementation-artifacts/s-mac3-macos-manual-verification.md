# Story 9.3 (S-MAC3): macOS manual verification script/checklist

Status: ready-for-dev

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

- [ ] Task 1: Cập nhật docs (AC: 1, 2, 3)
  - [ ] Thêm section reset Accessibility vào `docs/manual-test.md`.
  - [ ] Liệt kê checklist từng bước + ghi chú quit/reopen.

## Dev Notes

- Phụ thuộc S-MAC2 (UI recovery để verify).
- Story docs-only, complexity Low.

### References

- [Source: docs/manual-test.md]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §2]
