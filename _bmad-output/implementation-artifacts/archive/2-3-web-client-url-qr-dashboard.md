# Story 2.3: Hiển thị URL truy cập & Mã QR mở Web Client

Status: done

## Story

As a Companion user,
I want Dashboard hiển thị liên kết truy cập Web Client kèm mã QR tương ứng khi bật máy chủ HTTP,
so that tôi copy link nhanh hoặc quét bằng máy ảnh iPad để sử dụng ngay.

## Acceptance Criteria

1. **Given** cấu hình `webEnabled` được bật và Web Server đang lắng nghe bình thường,
   **When** Dashboard hiển thị,
   **Then** hiển thị dòng URL dạng `http://<LAN-IP>:<webPort>`, nút copy, kèm biểu tượng cảnh báo "Chỉ bật trên Wi-Fi tin cậy",
   **And** kết xuất mã QR có nhãn rõ ràng "Mở trên iPad / browser" chứa liên kết HTTP.

## Tasks / Subtasks

- [x] Task 1: Render liên kết mạng LAN Web Client (AC: 1)
  - [x] Thu thập địa chỉ IPv4 LAN đang chạy qua Tauri API.
  - [x] Hiển thị dòng chữ `http://<LAN-IP>:<webPort>` trong giao diện kết nối Dashboard.
  - [x] Thêm nút Copy nhanh liên kết này vào clipboard.
- [x] Task 2: Sinh mã QR địa chỉ URL Web (AC: 1)
  - [x] Dung thư viện Vue QR Code generator (không gọi API online để bảo mật ngoại tuyến).
  - [x] Kết xuất mã QR hiển thị bên dưới dòng URL cùng với tiêu đề nhãn "Mở trên iPad / Browser".

## Dev Notes

- **QRCode Library**: Sử dụng thư viện thuần JavaScript chạy offline như `qrcode.vue` hoặc sinh SVG trực tiếp để đảm bảo bundle size.

### References

- [Source: src/views/DashboardView.vue#343] - Nơi bind các event copy/action.

## Dev Agent Record

### Implementation Plan

- Red: thêm `src/lib/qrSvg.ts` stub và Node assertion yêu cầu SVG QR có path/viewBox, xác nhận fail.
- Green: implement QR SVG offline version 3-L byte mode, không thêm dependency và không gọi API online.
- UI: dùng `get_server_info` hiện có để lấy LAN IP, `get_server_config` để lấy `webEnabled/webPort`, render URL/copy/warning/QR trong Dashboard.

### Debug Log

- `node --input-type=module -e ... createQrSvg(...)` fail ở red phase vì helper trả chuỗi rỗng.
- `pnpm exec tsc src/lib/qrSvg.ts --ignoreConfig --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM --outDir /tmp/asd-qr-test --skipLibCheck --declaration false --sourceMap false` pass.
- `node --input-type=module -e ...` pass với assertions cho SVG, viewBox `37x37`, path modules và payload quá dài.
- `pnpm exec vue-tsc -b` pass.
- `pnpm build` pass; Vite chỉ cảnh báo chunk lớn, không fail build.
- `cargo test --manifest-path src-tauri/Cargo.toml` pass: 10/10.

### Completion Notes

- Dashboard hiển thị Web Client URL khi cấu hình đã lưu có `webEnabled=true` và LAN IP đã nạp: `http://<LAN-IP>:<webPort>`.
- URL có nút copy nhanh ở header desktop rộng và trong khối Network settings.
- UI hiển thị cảnh báo "Chỉ bật trên Wi-Fi tin cậy" bằng icon cảnh báo.
- QR SVG offline được render với nhãn "Mở trên iPad / Browser" và encode trực tiếp URL HTTP.

### File List

- `src/views/DashboardView.vue`
- `src/lib/qrSvg.ts`
- `dist-client/index.html`
- `dist-client/assets/index-CcrVOKsV.js`
- `dist-client/assets/index-Q_SfVjGk.css`
- `dist-client/assets/index-BUn5KQWo.js` (deleted)
- `dist-client/assets/index-CISstjn4.css` (deleted)
- `_bmad-output/implementation-artifacts/2-3-web-client-url-qr-dashboard.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-06-03 | 1.0 | Render Web Client URL, trusted Wi-Fi warning, copy action, and offline QR SVG on Dashboard. | Amelia |
