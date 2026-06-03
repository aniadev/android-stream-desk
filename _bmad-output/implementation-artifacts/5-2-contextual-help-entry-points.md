# Story 5.2: Cung cấp điểm liên kết trợ giúp ngữ cảnh

Status: done

## Story

As a Dashboard user,
I want các biểu tượng hỗ trợ cứu cánh xuất hiện cạnh cài đặt nhập liệu và màn hình báo lỗi,
so that tôi biết chính xác cách khắc phục sự cố tại vị trí lỗi phát sinh.

## Acceptance Criteria

1. **Given** tab App hoặc tab Command đang mở trên Dashboard,
   **When** chỉnh sửa nút bấm,
   **Then** xuất hiện icon Trợ giúp `?` nhỏ bên cạnh đầu vào, click vào tự động mở Guide Center Modal trỏ đúng mục hướng dẫn cấu hình của tab đó.
2. **Given** Socket Companion xảy ra lỗi bind cổng hoặc lỗi tường lửa,
   **When** banner lỗi Dashboard hiển thị,
   **Then** xuất hiện liên kết "Hướng dẫn mở khóa Tường lửa & Sửa dải cổng mạng" để đưa trực tiếp tới chuyên mục xử lý lỗi LAN trên Guide Center Modal.

## Tasks / Subtasks

- [x] Task 1: Bố trí icon trigger guide theo ngữ cảnh (AC: 1)
  - [x] Gắn thêm nút icon `?` kế bên textbox "Đường dẫn .exe" (tab App) và textbox "Lệnh shell" (tab Command).
  - [x] Kích hoạt mở modal `GuideCenterModal` với props `activeTopic` tương tự (`app-shortcut` hoặc `command-url`).
- [x] Task 2: Hướng dẫn giải quyết lỗi hệ thống (AC: 2)
  - [x] Tích hợp check lỗi socket bind thất bại. Giao diện hiển thị Banner cảnh báo lỗi màu đỏ kèm nút link gọi Modal Guide Center mục `firewall-troubleshooting`.

## Dev Notes

- **UX Polish**: Icon trợ giúp cần thiết kế tinh gọn dạng hover/click nhẹ, không chiếm diện tích làm sai lệch lưới layout editor.

### References

- [Source: src/views/DashboardView.vue#1370] - File HTML UI chỉnh sửa cấu hình nút macro.
