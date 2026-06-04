# Story 13.1 (S-APK1): Cắt ABI thừa + per-ABI split build

Status: review

## Story

As a maintainer phát hành Android,
I want build chỉ ship ABI cho điện thoại thật và xuất APK riêng từng ABI,
so that APK không gồng x86/x86_64 emulator và user chỉ tải đúng bản máy mình.

## Acceptance Criteria

1. **Given** build release Android,
   **When** build,
   **Then** APK KHÔNG còn `lib/x86` và `lib/x86_64` (chỉ `arm64-v8a`, và `armeabi-v7a` nếu giữ máy 32-bit) — đạt bằng `tauri android build --target aarch64-linux-android [armv7-linux-androideabi]`, KHÔNG dựa vào `ndk.abiFilters` (đã chứng minh không lọc jniLibs prebuilt).
2. **Given** build release,
   **When** chạy,
   **Then** xuất APK riêng cho từng ABI (không universal gộp), qua `splits.abi { isUniversalApk = false }` hoặc `tauri android build --apk --split-per-abi`.
3. **Given** môi trường build/CI,
   **When** cấu hình,
   **Then** chỉ cài rust target cần ship; `i686-linux-android`/`x86_64-linux-android` không được build. CI `release.yml` truyền `--target`/`--split-per-abi` tương ứng.
4. **Given** mỗi APK ABI,
   **When** đo size,
   **Then** ghi kết quả vào release checklist; xác nhận đã bỏ x86/x86_64.

## Tasks / Subtasks

- [x] Task 1: Cắt ABI thừa (AC: 1, 3)
  - [x] `package.json` `android:build` + CI `release.yml` build thêm `--target aarch64 --target armv7` (tên target ngắn của `tauri android build`, KHÔNG phải rust triple) → không build/ship x86/x86_64.
  - [x] Thêm `android:build:arm64` cho build nhanh 1 ABI.
- [x] Task 2: Per-ABI split (AC: 2)
  - [x] Dùng `--split-per-abi` (Tauri flavor `arm64`/`arm`), không dùng gradle `splits.abi` để tránh xung đột flavor của RustPlugin.
  - [x] `build.gradle.kts` output filename kèm `flavorName` → `...-arm64.apk` / `...-arm.apk` không trùng tên.
  - [x] CI upload glob `universal/release/` → `*/release/`.
- [ ] Task 3: Resource shrink + đo (AC: 4) — HOÃN
  - [ ] `isShrinkResources = true` chưa thêm (rủi ro strip nhầm resource; để cùng đợt đo S-APK2).
  - [ ] Cần build thật đo size từng APK ABI, ghi checklist.

## Dev Agent Record

### Implementation Notes (2026-06-04)

- Root cause thật: `RustPlugin.kt` tạo product flavor `universal` với `abiFilters = abiList` (mặc định cả 4 ABI), nên `tauri android build` (flavor universal) gói 4 ABI; `ndk.abiFilters` ở defaultConfig bị flavor override → vô hiệu. Control đúng = `--target` + `--split-per-abi` trên lệnh tauri, KHÔNG phải gradle `abiFilters`/`splits.abi`.
- Files sửa: `package.json` (android:build, android:build:arm64), `.github/workflows/release.yml` (build cmd + 2 upload glob), `src-tauri/gen/android/app/build.gradle.kts` (output filename kèm flavor).
- **Đã build & verify thật (2026-06-04):** 131MB universal 4-ABI → `-arm64.apk` 35MB (chỉ `lib/arm64-v8a`) + `-arm.apk` 34MB (chỉ `lib/armeabi-v7a`). Còn >20MB cho tới khi S-APK2 diet frontend nhúng.
- **Bug bắt khi build:** lần đầu mỗi split APK vẫn 66MB vì `ndk.abiFilters` ở `defaultConfig` (`build.gradle.kts:29`) union với abiFilters của flavor → mỗi flavor dính cả 2 ABI. Đã XÓA dòng đó; flavor `arm64`/`arm` tự giới hạn đúng 1 ABI. Tên target `tauri --target` là dạng ngắn (`aarch64`/`armv7`), không phải triple.

## Dev Notes

- **Root cause đã xác minh:** APK 131MB = 4 ABI × ~32MB. `abiFilters` list 2 ABI nhưng APK vẫn có 4 vì Tauri inject prebuilt jniLibs, bỏ qua `ndk.abiFilters`. Phải cắt bằng `--target` / hạn chế rust target / `splits.abi`, không phải abiFilters.
- **Lưu ý:** `gen/android/build.gradle.kts` được commit nhưng `tauri android init` có thể regenerate — verify init trong CI (`release.yml:207`) có ghi đè customization không; nếu có, patch qua tauri config/template.
- S-APK1 cắt ABI giảm ~50% (bỏ x86/x86_64) nhưng arm64 split vẫn ~32MB — cần S-APK2 giảm frontend nhúng mới xuống <20MB.
- Cargo `[profile.release]` đã strip tốt — KHÔNG đụng.

### References

- [Source: src-tauri/gen/android/app/build.gradle.kts:29] - abiFilters (không hiệu lực lọc).
- [Source: .github/workflows/release.yml:181] - rust targets CI (aarch64, armv7).
- [Source: .github/workflows/release.yml:228] - `tauri android build --apk` thiếu --target.
- [Source: package.json:10] - `android:build` = `tauri android build`.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §7]
