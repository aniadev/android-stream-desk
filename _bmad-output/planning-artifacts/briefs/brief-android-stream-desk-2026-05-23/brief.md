# Mô tả Sản phẩm: Android Stream Desk

## Thông tin chung
- **Trạng thái**: Bản thảo (Draft)
- **Ngày tạo**: 23-05-2026
- **Cập nhật**: 23-05-2026
- **Mức độ ưu tiên**: Dự án tiện ích cá nhân (Mức độ vừa/nhỏ)

## Tóm tắt dự án (Executive Summary)
Android Stream Desk là một giải pháp tự lưu trữ (self-hosted), dung lượng nhẹ thay thế cho các thiết bị điều khiển macro vật lý như Elgato Stream Deck. Nhược điểm lớn của các thiết bị này là giá thành cao, vì vậy dự án này tận dụng các điện thoại hoặc máy tính bảng Android cũ/dư thừa để làm màn hình điều khiển cảm ứng, kết nối và tương tác trực tiếp với máy tính Windows thông qua mạng Wi-Fi cục bộ.

Ứng dụng được xây dựng trên nền tảng Tauri v2 (kết hợp Rust backend) và Vue 3 cho giao diện người dùng, đảm bảo tốc độ truyền nhận tín hiệu cực nhanh với độ trễ cực thấp. Người dùng có thể nhấn các nút ảo trên thiết bị Android để kích hoạt các hành động trên máy tính Windows (như mô phỏng nhấn phím, tổ hợp phím tắt, điều khiển nhạc/media, khởi chạy ứng dụng nhanh).

## Vấn đề cần giải quyết (The Problem)
Các bàn phím macro vật lý (Elgato Stream Deck) rất đắt đỏ (từ $60 đến hơn $150) và chiếm diện tích bàn làm việc. Trong khi đó, hầu hết mọi người đều có thiết bị Android cũ không còn sử dụng nằm trong ngăn kéo. Các ứng dụng thay thế bằng phần mềm hiện tại thường có quá nhiều quảng cáo, giao diện lỗi thời, yêu cầu trả phí đăng ký đám mây hoặc quá phức tạp để cài đặt cấu hình qua tường lửa mạng cục bộ. Nhu cầu thực tế là một công cụ mã nguồn mở, miễn phí, hiện đại và hoạt động hoàn toàn offline trong mạng nội bộ.

## Giải pháp (The Solution)
Hệ thống gồm 2 thành phần phát triển chung trong một codebase sử dụng Tauri v2:
1. **Windows Companion (Server)**: Ứng dụng chạy ngầm trên khay hệ thống Windows (Tauri với backend Rust, giao diện chỉnh cài đặt bằng Vue 3). Server lắng nghe các yêu cầu kết nối qua HTTP/WebSocket trong mạng nội bộ, sau khi xác thực sẽ thực thi các hành động hệ thống trên Windows (nhấn phím, phím tắt, điều khiển đa phương tiện, chạy phần mềm cấu hình sẵn).
2. **Android App (Client)**: Ứng dụng di động viết bằng Tauri v2 tối ưu hóa cho màn hình cảm ứng, kết nối tới Windows Companion qua IP nội bộ. Ứng dụng hiển thị lưới các ô nút (ví dụ 3x3, 4x5) đại diện cho các macro, phím tắt do người dùng thiết lập.

Công nghệ sử dụng:
- **Tauri v2**: Tích hợp Rust để giao tiếp API hệ thống Windows hiệu năng cao, đóng gói ứng dụng đa nền tảng tối giản dung lượng.
- **Vue 3**: Quản lý trạng thái giao diện phản hồi nhanh, hỗ trợ kéo thả thiết lập lưới nút nhanh chóng.

## Điểm khác biệt (What Makes This Different)
- **Hiệu năng từ Tauri v2**: Dung lượng cài đặt siêu nhẹ (chỉ vài MB), tối ưu bộ nhớ RAM vượt trội so với các giải pháp dùng Electron.
- **Dùng chung Codebase**: Tiết kiệm thời gian lập trình nhờ chia sẻ chung các component giao diện (UI) và kiểu dữ liệu (Types) giữa client Android và server Windows.
- **Mạng cục bộ & Bảo mật**: Hoạt động hoàn toàn offline, không yêu cầu tạo tài khoản đám mây hay kết nối internet bên ngoài.
- **Giao diện Vue 3 linh hoạt**: Cho phép chỉnh sửa lưới nút tùy biến với các bộ icon và hình nền tự chọn.

## Đối tượng sử dụng (Who This Serves)
- **Streamer & Nhà sáng tạo nội dung**: Chuyển cảnh nhanh trên OBS, tắt/mở micro, bắt đầu/dừng stream.
- **Lập trình viên & Người dùng nâng cao**: Kích hoạt nhanh các phím tắt IDE, chuyển không gian làm việc hoặc quản lý cửa sổ nhanh.
- **Người đam mê công nghệ**: Tiết kiệm chi phí tự dựng bàn macro deck từ điện thoại/tablet cũ.

## Tiêu chí thành công (Success Criteria)
- **Độ trễ tối thiểu**: Thời gian từ lúc chạm nút trên Android đến lúc Windows thực thi hành động < 50ms.
- **Giao diện phản hồi tốt (Responsive)**: Lưới nút tự động co giãn đẹp mắt trên cả điện thoại màn hình nhỏ và máy tính bảng.
- **Tiết kiệm pin**: Giảm thiểu việc tiêu thụ tài nguyên của Android khi tắt màn hình hoặc ứng dụng chạy nền.
- **Kết nối ổn định**: Ghép đôi thiết bị dễ dàng qua nhập IP thủ công hoặc quét mã QR.

## Phạm vi dự án (Scope)
### Trong phạm vi (MVP)
- **Kết nối nội bộ**: Kết nối trực tiếp bằng cách nhập địa chỉ IP thủ công và ghép nối bảo mật qua WebSocket cục bộ.
- **Mô phỏng phím cơ bản**: Nhấn phím đơn lẻ, tổ hợp phím (Ctrl+Shift+M, v.v.), điều khiển nhạc (Play/Pause, tăng giảm âm lượng).
- **Trình chỉnh sửa lưới**: Cấu hình kích thước lưới, nhãn trên nút bấm, chọn màu nền và icon.
- **Khởi chạy ứng dụng**: Mở các phần mềm hoặc chạy file thực thi (`.exe`) đã cấu hình trên Windows.

### Ngoài phạm vi (Nâng cấp sau MVP)
- **Tự động quét tìm thiết bị**: Sử dụng giao thức mDNS để Android tự phát hiện ứng dụng máy chủ Windows.
- **Tích hợp OBS Studio trực tiếp**: Kết nối qua giao thức WebSocket của OBS để thao tác chuyên sâu.
- **Hệ sinh thái Plugin**: Hỗ trợ kết nối API trực tiếp với Discord, Spotify, v.v.
- **Đồng bộ icon đám mây**: Tải lên bộ icon cá nhân riêng và đồng bộ giữa các máy.

## Tầm nhìn 2-3 năm tới (Vision)
Trở thành khung nền tảng bảng điều khiển cục bộ mã nguồn mở phổ biến nhất, hỗ trợ kho thư viện plugin phong phú (lập trình bằng TypeScript/Rust) giúp điều khiển bất kỳ API thiết bị thông minh nào trong nhà hoặc hệ thống máy tính từ xa một cách nhanh chóng.
