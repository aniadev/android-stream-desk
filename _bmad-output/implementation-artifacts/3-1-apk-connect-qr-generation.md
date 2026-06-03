# Story 3.1: Tạo và hiển thị mã QR kết nối chuyên dụng cho APK

Status: done

## Story

As a Companion user,
I want Companion hiển thị mã QR kết nối APK mang payload định nghĩa cấu trúc mạng LAN,
so that tôi dùng App trên thiết bị Android quét để thiết lập cấu hình tức thời.

## Acceptance Criteria

1. **Given** Companion Dashboard hiển thị,
   **When** tải thông tin server,
   **Then** kết xuất một mã QR mang nhãn "Kết nối APK" chứa payload định dạng:
   `android-stream-desk://connect?v=1&host=<LAN-IP>&wsPort=<wsPort>`
   **And** mã QR được tự động vẽ lại (regenerate) mỗi khi cài đặt mạng áp dụng thực tế chuyển đổi.

## Tasks / Subtasks

- [x] Task 1: Thiết lập schema payload QR code cho APK (AC: 1)
  - [x] Định nghĩa cấu trúc chuỗi QR: `android-stream-desk://connect?v=1&host=<LAN-IP>&wsPort=<wsPort>`.
- [x] Task 2: Tự động cập nhật QR Code theo thay đổi (AC: 1)
  - [x] Lắng nghe thay đổi của cấu hình đang chạy ở Dashboard.
  - [x] Cập nhật lại khung vẽ QR ngay khi config mới có hiệu lực để tránh quét nhầm cổng cũ.

## Dev Notes

- **Offline-Only**: Đảm bảo mã QR vẽ hoàn toàn client-side (VD thông qua `<canvas>` hoặc client-side SVG).

### References

- [Source: src/views/DashboardView.vue#22] - Trạng thái biến UI trong Dashboard.

## Dev Agent Record

### Debug Log

- Red: `pnpm run test:qr` fail vì `src/lib/apkConnectQr.ts` chưa tồn tại.
- Red spike trước test file: `createQrSvg('android-stream-desk://connect?v=1&host=192.168.100.200&wsPort=65535')` fail với `QR payload too long: 67/53 bytes`.
- Green: `pnpm run test:qr` pass sau khi thêm helper payload và nâng QR SVG encoder lên version 4-L.
- Validation: `pnpm exec vue-tsc -b` pass.
- Validation: `pnpm build` pass, chỉ còn warning Vite hiện hữu về chunk size và ineffective dynamic import.
- Validation: `cargo check --manifest-path src-tauri/Cargo.toml` pass.

### Completion Notes

- Đã thêm helper `buildApkConnectPayload(host, wsPort)` sinh đúng deep link APK theo AC1.
- Đã hiển thị block QR “Kết nối APK” trực tiếp trên Dashboard sidebar, vẽ hoàn toàn client-side bằng `createQrSvg`.
- QR APK tự regenerate qua computed state khi `serverIp` hoặc `serverPort` đang chạy thay đổi, nên không dùng nhầm cổng cũ sau khi Companion áp dụng cấu hình mới.
- Đã nâng QR encoder từ version 3-L lên version 4-L để chứa payload deep link LAN dài đến IPv4 + port 65535.

### File List

- package.json
- _bmad-output/implementation-artifacts/3-1-apk-connect-qr-generation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/lib/apkConnectQr.ts
- src/lib/apkConnectQr.test.mjs
- src/lib/qrSvg.ts
- src/views/DashboardView.vue
- dist-client/index.html
- dist-client/assets/index-B2y83_BM.css
- dist-client/assets/index-DjZwoRqC.js
- dist-client/assets/index-CcrVOKsV.js (deleted)
- dist-client/assets/index-Q_SfVjGk.css (deleted)

### Change Log

- 2026-06-03: Implemented APK connect QR payload, Dashboard QR rendering, QR capacity update, and QR payload regression test.
