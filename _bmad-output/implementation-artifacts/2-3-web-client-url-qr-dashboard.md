# Story 2.3: Hiển thị URL truy cập & Mã QR mở Web Client

Status: ready-for-dev

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

- [ ] Task 1: Render liên kết mạng LAN Web Client (AC: 1)
  - [ ] Thu thập địa chỉ IPv4 LAN đang chạy qua Tauri API.
  - [ ] Hiển thị dòng chữ `http://<LAN-IP>:<webPort>` trong giao diện kết nối Dashboard.
  - [ ] Thêm nút Copy nhanh liên kết này vào clipboard.
- [ ] Task 2: Sinh mã QR địa chỉ URL Web (AC: 1)
  - [ ] Dung thư viện Vue QR Code generator (không gọi API online để bảo mật ngoại tuyến).
  - [ ] Kết xuất mã QR hiển thị bên dưới dòng URL cùng với tiêu đề nhãn "Mở trên iPad / Browser".

## Dev Notes

- **QRCode Library**: Sử dụng thư viện thuần JavaScript chạy offline như `qrcode.vue` hoặc sinh SVG trực tiếp để đảm bảo bundle size.

### References

- [Source: src/views/DashboardView.vue#343] - Nơi bind các event copy/action.
