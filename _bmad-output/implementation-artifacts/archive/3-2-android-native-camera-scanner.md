# Story 3.2: Quét mã QR native camera scanner hỗ trợ trên APK Android

Status: done

## Story

As an APK client user,
I want có nút quét mã QR sử dụng camera thiết bị trong màn hình kết nối di động,
so that tôi kết nối tới Companion tức thì mà không cần tự nhập địa chỉ IPv4.

## Acceptance Criteria

1. **Given** ứng dụng chạy trên APK Android di động,
   **When** màn hình "Chưa kết nối Companion" hiển thị,
   **Then** xuất hiện nút "Quét QR từ Companion".
2. **Given** nút Quét QR được nhấn lần đầu,
   **When** bấm,
   **Then** hệ thống yêu cầu quyền camera native (`android.permission.CAMERA`), mở màn hình quét camera sau qua plugin `@tauri-apps/plugin-barcode-scanner`.
3. **Given** mã QR được quét thành công mang format payload hợp lệ `android-stream-desk://connect?v=1&...`,
   **When** parse thành công,
   **Then** tự động trích xuất `host` lưu vào `localStorage.server_ip`, `wsPort` lưu vào `localStorage.server_port`, đóng scanner và gọi kết nối socket lập tức,
   **And** cảnh báo lỗi nếu payload sai format và giữ nguyên cấu hình cũ.

## Tasks / Subtasks

- [x] Task 1: Tích hợp thư viện Barcode Scanner & Quyền Camera (AC: 1, 2)
  - [x] Cài đặt `@tauri-apps/plugin-barcode-scanner` cho JavaScript/TypeScript.
  - [x] Cập nhật files `src-tauri/Cargo.toml` và capability mobile để cấp quyền mở scanner native.
  - [x] Cấu hình Gradle Android: Kích hoạt camera permission trong AndroidManifest.xml.
- [x] Task 2: Xây dựng UI controller quét mã và xử lý parser (AC: 3)
  - [x] Thêm nút quét QR biểu tượng Camera cận input IP của `ClientView.vue` (chỉ hiển thị trên Mobile).
  - [x] Viết hàm parse payload giải mã: lấy `host` và `wsPort` từ scheme `android-stream-desk://connect`.
  - [x] Lưu thông số vào local storage/connection Store và kích hoạt `.connect()`, hiển thị toast báo kết quả.

### Review Findings

- [x] [Review][Defer] Canh bao quyen camera neu nguoi dung tu choi vinh vien [src/views/ClientView.vue:141] — deferred, pre-existing

## Dev Notes

- **Plugin compatibility**: Chặn gọi scanner native trên browser thường hoặc máy desktop để tránh sinh lỗi runtime.

### References

- [Source: src-tauri/capabilities/default.json] - Nơi khai báo tauri ACL permissions.
- [Source: src/views/ClientView.vue#195] - Điểm neo Modal "Chưa kết nối".

## Dev Agent Record

### Debug Log

- Red: `pnpm run test:qr` fail vì `parseApkConnectPayload` chưa được export.
- Green: `pnpm run test:qr` pass sau khi thêm parser payload APK hợp lệ/sai format.
- Dependency: `pnpm tauri add barcode-scanner` pass với network escalation; Tauri CLI thêm JS package, Cargo crate mobile, plugin init và `mobile.json`.
- Fix: plugin init được đổi sang `#[cfg(mobile)]` để `cargo check --manifest-path src-tauri/Cargo.toml` desktop không reference crate mobile-only.
- Validation: `pnpm run test:qr` pass.
- Validation: `pnpm exec vue-tsc -b` pass.
- Validation: `cargo check --manifest-path src-tauri/Cargo.toml` pass.
- Validation: `pnpm build` pass, chỉ còn warning Vite hiện hữu về chunk size và ineffective dynamic import.
- Validation: `pnpm tauri android build --apk --debug` pass với network/escalation; APK tạo tại `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.

### Completion Notes

- Đã thêm plugin barcode scanner native cho mobile và quyền `android.permission.CAMERA`.
- Đã thêm capability `mobile-capability` cho `barcode-scanner:default` trên Android/iOS thay vì mở scanner ACL trên desktop.
- Đã thêm nút “Quét QR từ Companion” trong màn hình “Chưa kết nối Companion”, chỉ hiện trên Android Tauri APK.
- Khi quét thành công payload `android-stream-desk://connect?v=1&host=...&wsPort=...`, client lưu `server_ip`/`server_port`, cập nhật connection store và gọi `connect()` ngay.
- Payload sai format hoặc permission camera chưa được cấp sẽ hiện toast và giữ nguyên cấu hình cũ.

### File List

- package.json
- pnpm-lock.yaml
- _bmad-output/implementation-artifacts/3-2-android-native-camera-scanner.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/lib/apkConnectQr.ts
- src/lib/apkConnectQr.test.mjs
- src/views/ClientView.vue
- src-tauri/Cargo.toml
- src-tauri/Cargo.lock
- src-tauri/capabilities/mobile.json
- src-tauri/gen/android/app/src/main/AndroidManifest.xml
- src-tauri/gen/schemas/acl-manifests.json
- src-tauri/gen/schemas/android-schema.json
- src-tauri/gen/schemas/capabilities.json
- src-tauri/gen/schemas/mobile-schema.json
- src-tauri/src/lib.rs
- src-tauri/build.rs
- src-tauri/src/main.rs
- src-tauri/src/webserver.rs
- src-tauri/src/websocket.rs
- dist-client/index.html
- dist-client/assets/core-COU_ExCL.js
- dist-client/assets/core-CwxXejkd.js (deleted)
- dist-client/assets/dist-js-5wNgBcWI.js
- dist-client/assets/dist-js-ChaephPh.js
- dist-client/assets/dist-js-wShhpOtu.js (deleted)
- dist-client/assets/index-BYPn-qzL.css
- dist-client/assets/index-CcrVOKsV.js (deleted)
- dist-client/assets/index-Dhp85B8C.js
- dist-client/assets/index-Q_SfVjGk.css (deleted)

### Change Log

- 2026-06-03: Implemented Android native QR scanner integration, APK connect payload parser, mobile-only scanner UI, camera permission, and Android debug APK validation.
