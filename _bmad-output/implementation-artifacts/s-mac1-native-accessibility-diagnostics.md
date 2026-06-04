# Story 9.1 (S-MAC1): Native macOS Accessibility diagnostics command

Status: ready-for-dev

## Story

As a macOS Companion user,
I want backend phân biệt thiếu quyền thật với TCC stale/dev build mismatch,
so that tôi không phải thử mò khi đã allow lại mà app vẫn báo không có quyền.

## Acceptance Criteria

1. **Given** macOS,
   **When** gọi command `get_input_permission_diagnostics`,
   **Then** trả struct serialize gồm `trusted`, `bundleIdentifier`, `executablePath`, `appBundlePath`, `isPackagedApp`, `recommendedAction` (`allow`|`remove_stale_entry`|`restart_app`|`open_settings`).
2. **Given** trạng thái quyền,
   **When** probe,
   **Then** ưu tiên API native `AXIsProcessTrusted`/`AXIsProcessTrustedWithOptions`; giữ Enigo probe như kiểm chứng thực thi input.
3. **Given** UI cũ,
   **When** gọi `probe_input_permission`,
   **Then** vẫn tương thích, không vỡ.
4. **Given** logic path/bundle fallback,
   **When** chạy unit test (không phụ thuộc TCC),
   **Then** pass.

## Tasks / Subtasks

- [ ] Task 1: AX FFI (AC: 2)
  - [ ] Thêm macOS FFI/CoreFoundation hoặc crate gọi AX trust APIs (new file `src-tauri/src/accessibility.rs`).
- [ ] Task 2: Diagnostics command (AC: 1)
  - [ ] `get_input_permission_diagnostics` trả struct với `#[serde(rename)]` camelCase.
  - [ ] `executablePath` = `std::env::current_exe()`; resolve `.app` cho `appBundlePath`/`isPackagedApp`.
- [ ] Task 3: Backward compat (AC: 3)
  - [ ] Giữ `probe_input_permission` tại `src-tauri/src/lib.rs:796`.
- [ ] Task 4: Unit test (AC: 4)
  - [ ] Test path/bundle fallback không phụ thuộc macOS TCC.

## Dev Notes

- **Gotcha:** Enigo không `Send` trên macOS — KHÔNG lưu global. Khởi tạo trong scope dưới `ENIGO_LOCK`.
- Import `tauri::Manager` nếu gọi `.path()` trên AppHandle.
- Gốc dependency: chặn S-MAC2.

### References

- [Source: src-tauri/src/lib.rs:796] - `probe_input_permission` dùng Enigo init.
- [Source: src-tauri/src/lib.rs:782] - error message hướng dẫn reset entry.
- [New file: src-tauri/src/accessibility.rs]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §2]
