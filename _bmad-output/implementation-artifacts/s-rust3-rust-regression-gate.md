# Story 12.4 (S-RUST3): Rust regression test pass gate

Status: ready-for-dev

## Story

As a maintainer,
I want bản hotfix không làm hỏng backend đã ổn compile,
so that release v1.5.1 an toàn để tag.

## Acceptance Criteria

1. **Given** repo sau các fix v1.5.1,
   **When** chạy `cargo check --manifest-path src-tauri/Cargo.toml`,
   **Then** pass.
2. **Given** repo,
   **When** chạy `cargo test --manifest-path src-tauri/Cargo.toml`,
   **Then** pass (giữ ≥10 test cũ).
3. **Given** contract/struct mới (diagnostics/status từ S-REL1, S-MAC1),
   **When** có,
   **Then** thêm test cho chúng.

## Tasks / Subtasks

- [ ] Task 1: Gate check (AC: 1, 2)
  - [ ] Verify `cargo check` + `cargo test` pass cuối sprint.
- [ ] Task 2: Test contract mới (AC: 3)
  - [ ] Test diagnostics/status structs nếu thêm.

## Dev Notes

- Gate cuối: phụ thuộc S-RUST1, S-LINK1, S-RUST2 (và S-REL1, S-MAC1 nếu thêm struct).
- Complexity Low. Chạy sau cùng trong Sprint 3.

### References

- [Source: src-tauri/Cargo.toml]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §5]
