# Story 9.1 (S-MAC1): Native macOS Accessibility diagnostics command

Status: done

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

- [x] Task 1: AX FFI (AC: 2)
  - [x] Thêm macOS FFI/CoreFoundation hoặc crate gọi AX trust APIs (new file `src-tauri/src/accessibility.rs`).
- [x] Task 2: Diagnostics command (AC: 1)
  - [x] `get_input_permission_diagnostics` trả struct với `#[serde(rename)]` camelCase.
  - [x] `executablePath` = `std::env::current_exe()`; resolve `.app` cho `appBundlePath`/`isPackagedApp`.
- [x] Task 3: Backward compat (AC: 3)
  - [x] Giữ `probe_input_permission` tại `src-tauri/src/lib.rs:796`.
- [x] Task 4: Unit test (AC: 4)
  - [x] Test path/bundle fallback không phụ thuộc macOS TCC.

### Review Findings

- [x] [Review][Patch] Đảo mapping `recommend_action`: untrusted+packaged → `RemoveStaleEntry` (rebuild đổi chữ ký, entry cũ vô dụng), untrusted+dev → `OpenSettings`. Đã sửa luôn `inputPermissionActionText` + swap unit test cho khớp. (Quyết định D1: đảo) [src-tauri/src/accessibility.rs:54]
- [x] [Review][Patch] `resolve_app_bundle_path` nhận nhầm mọi ancestor tên `*.app`. Đã đổi sang xác minh đúng layout `<Bundle>.app/Contents/MacOS/<exe>` + thêm test chống false-positive. [src-tauri/src/accessibility.rs:42]
- [x] [Review][Patch] `CFDictionaryCreate` truyền callbacks = null. Đã dùng `&kCFTypeDictionaryKeyCallBacks`/`&kCFTypeDictionaryValueCallBacks`. [src-tauri/src/accessibility.rs:103]
- [x] [Review][Defer] `trusted=false` + `enigo_probe_ok=true` bị mislabel "thiếu quyền" — `recommend_action` bỏ qua `enigo_probe_ok` ở nhánh untrusted. Trạng thái hiếm/gần như unreachable. [src-tauri/src/accessibility.rs:59] — deferred, edge case hiếm

## Dev Notes

- **Gotcha:** Enigo không `Send` trên macOS — KHÔNG lưu global. Khởi tạo trong scope dưới `ENIGO_LOCK`.
- Import `tauri::Manager` nếu gọi `.path()` trên AppHandle.
- Gốc dependency: chặn S-MAC2.

### References

- [Source: src-tauri/src/lib.rs:796] - `probe_input_permission` dùng Enigo init.
- [Source: src-tauri/src/lib.rs:782] - error message hướng dẫn reset entry.
- [New file: src-tauri/src/accessibility.rs]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §2]

## Dev Agent Record

### Debug Log

- 2026-06-04: RED `cargo test --manifest-path src-tauri/Cargo.toml accessibility::tests` fail đúng test resolve `.app` khi resolver còn trả `None`.
- 2026-06-04: GREEN `cargo test --manifest-path src-tauri/Cargo.toml accessibility::tests` pass 5/5 sau khi thêm resolver, recommendation logic và AX diagnostics module.
- 2026-06-04: Regression `cargo check --manifest-path src-tauri/Cargo.toml` pass.
- 2026-06-04: Regression `cargo test --manifest-path src-tauri/Cargo.toml` pass 22/22.
- 2026-06-04: Quality gate `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` pass sau khi sửa `&PathBuf` và raw pointer casts.

### Completion Notes

- Thêm `src-tauri/src/accessibility.rs` với `InputPermissionDiagnostics`, `RecommendedAction`, resolver `.app`, native macOS AX trust probe qua `AXIsProcessTrustedWithOptions` và fallback `AXIsProcessTrusted`.
- Thêm command Tauri `get_input_permission_diagnostics` và đăng ký trong `generate_handler!`; command cũ `probe_input_permission` vẫn giữ bool tương thích UI hiện tại.
- Enigo vẫn được khởi tạo per-call qua `probe_input_permission`, không lưu global instance; native AX là nguồn trust chính, Enigo chỉ là probe xác nhận thực thi input.
- Unit test path/bundle fallback và recommendation logic không phụ thuộc TCC/macOS runtime state.

### File List

- src-tauri/src/accessibility.rs
- src-tauri/src/lib.rs
- _bmad-output/implementation-artifacts/s-mac1-native-accessibility-diagnostics.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-06-04: Implemented native macOS Accessibility diagnostics command and non-TCC unit coverage.
