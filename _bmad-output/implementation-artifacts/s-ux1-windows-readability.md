# Story 10.4 (S-UX1): Windows readability pass

Status: ready-for-dev

## Story

As a Windows Companion user,
I want font dễ đọc hơn trên dashboard,
so that tôi vận hành không bị mỏi mắt vì chữ quá nhỏ.

## Acceptance Criteria

1. **Given** dashboard dense UI,
   **When** audit,
   **Then** rà các lớp `text-[8px]`, `text-[9px]`, `text-[10px]`.
2. **Given** typography,
   **When** set token,
   **Then** có font tối thiểu cho HUD/body/control label.
3. **Given** desktop 1366x768 và 1920x1080,
   **When** render,
   **Then** button không overflow.
4. **Given** mục tiêu,
   **When** chỉnh,
   **Then** giữ density tool vận hành, không biến dashboard thành landing page.

## Tasks / Subtasks

- [ ] Task 1: Audit font nhỏ (AC: 1)
  - [ ] Tìm các class `text-[8/9/10px]` trong `DashboardView.vue`.
- [ ] Task 2: Token font tối thiểu (AC: 2, 4)
  - [ ] HUD/body/control label min size, giữ density.
- [ ] Task 3: Overflow check (AC: 3)
  - [ ] Verify 1366x768 + 1920x1080.

## Dev Notes

- Complexity Low, frontend-only.

### References

- [Source: src/views/DashboardView.vue]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
