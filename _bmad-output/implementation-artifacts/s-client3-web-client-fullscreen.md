# Story 11.3 (S-CLIENT3): Web Client fullscreen ergonomics

Status: ready-for-dev

## Story

As a Web Client user trên tablet browser,
I want trải nghiệm gần app native ở mode fullscreen,
so that tôi dùng như macro pad cố định không bị shell che vùng bấm.

## Acceptance Criteria

1. **Given** mode `fullscreen`,
   **When** render,
   **Then** giảm shell decoration, padding, corner ornament để tối đa vùng bấm.
2. **Given** iPad/Android browser,
   **When** layout,
   **Then** dùng `100dvh` + safe-area CSS thay vì chỉ `h-screen`.
3. **Given** browser không lock được orientation/fullscreen,
   **When** chạy,
   **Then** UI vẫn scale đúng (không bắt buộc Fullscreen API).

## Tasks / Subtasks

- [ ] Task 1: Fullscreen shell (AC: 1)
  - [ ] Giảm decoration/padding ở mode fullscreen trong `ClientView.vue`/`GridArea.vue`.
- [ ] Task 2: dvh + safe-area (AC: 2)
  - [ ] `100dvh` + `env(safe-area-inset-*)`.
- [ ] Task 3: Graceful fallback (AC: 3)
  - [ ] Scale đúng khi không có Fullscreen API.
- [ ] Task 4: Manual QA
  - [ ] Safari/Chrome tablet portrait/landscape.

## Dev Notes

- Phụ thuộc S-CLIENT2. Web Client LAN có thể thiếu secure-context/gesture cho Fullscreen API — không bắt buộc.

### References

- [Source: src/views/ClientView.vue]
- [Source: src/components/GridArea.vue]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §4]
