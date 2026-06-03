# Story 4.1: Dashboard First-Run checklist & HUD chẩn đoán mạng

Status: ready-for-dev

## Story

As a new user,
I want bảng chỉ dẫn kiểm tra cài đặt ban đầu và hiển thị trạng thái thiết bị chẩn đoán trực quan,
so that tôi nắm bắt được những bước cần làm để Companion hoạt động an toàn.

## Acceptance Criteria

1. **Given** người dùng mở Dashboard lần đầu,
   **When** nạp,
   **Then** hiển thị Card "Checklist cài đặt Companion" (có nút Dismiss để ẩn vĩnh viễn):
   1. Bật toggle tự động khởi động cùng hệ thống.
   2. Thiết lập quy tắc Windows Defender Firewall chặn/cho phép cổng.
   3. Bật Web Client (nếu sử dụng browser iPad).
   4. Thiết lập quét QR tải APK hoặc Web URL.
2. **Given** Dashboard đang hoạt động,
   **When** thiết bị Client kết nối/ngắt kết nối,
   **Then** HUD Counter ở góc màn hình Dashboard cập nhật realtime: "Đang có N thiết bị kết nối vào Companion",
   **And** hiển thị huy hiệu báo lỗi Firewall/Port conflict nếu trạng thái socket server bị bind thất bại.

## Tasks / Subtasks

- [ ] Task 1: Thiết kế giao diện First-Run Checklist Card (AC: 1)
  - [ ] Tạo box checklist ở đầu trang Dashboard với 4 đầu mục hướng dẫn.
  - [ ] Thêm cờ `dashboard:first-run-dismissed` vào `localStorage` của Companion để tắt vĩnh viễn checklist khi người dùng click dismiss.
- [ ] Task 2: Implement Realtime Status HUD & Bind check (AC: 2)
  - [ ] Đồng bộ hóa luồng socket truyền tin: Cập nhật biến số lượng connection (`activeConnectionsCount`) realtime thông qua backend truyền số lượng clients kết nối thực.
  - [ ] Lắng nghe tín hiệu bind error từ backend để cập nhật badge đỏ báo động "Firewall / Port Blocked" kèm link chẩn đoán.

## Dev Notes

- **Realtime sync**: Kênh IPC hoặc WS cần emit số lượng client kết nối sang Dashboard một cách tối giản để tránh gây nghẽn UI loop thread.

### References

- [Source: src/views/DashboardView.vue#1] - Root view Dashboard cài đặt.
