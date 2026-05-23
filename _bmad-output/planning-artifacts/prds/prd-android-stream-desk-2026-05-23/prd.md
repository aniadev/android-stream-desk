---
title: Android Stream Desk
status: draft
created: 2026-05-23
updated: 2026-05-23
---

# PRD: Android Stream Desk

## 0. Quy trình & Tài liệu
Tài liệu PRD này định nghĩa các yêu cầu chức năng và phi chức năng cho phiên bản MVP của ứng dụng Android Stream Desk. PRD được xây dựng nhằm cung cấp hướng dẫn rõ ràng cho việc thiết kế kiến trúc kỹ thuật và triển khai mã nguồn tiếp theo. Tài liệu kế thừa các định hướng từ Product Brief đã duyệt.

## 1. Tầm nhìn (Vision)
Android Stream Desk biến các thiết bị di động Android cũ thành bàn phím macro cảm ứng không dây chuyên nghiệp. Sản phẩm giúp người dùng tiết kiệm chi phí mua thiết bị phần cứng chuyên dụng (Elgato Stream Deck) bằng cách tận dụng phần cứng cũ sẵn có, kết nối trực tiếp với máy tính Windows thông qua Wi-Fi nội bộ để gửi các lệnh điều khiển hệ thống và phím tắt với độ trễ cực thấp.

## 2. Đối tượng Người dùng & Hành trình (Target User & Journeys)
### 2.1 Persona chính: Minh - Streamer & Lập trình viên tự do
Minh sở hữu một máy tính Windows cấu hình mạnh để phát trực tuyến game và lập trình. Cậu ấy có một chiếc máy tính bảng Android cũ bỏ trong hộc tủ. Minh muốn tận dụng máy tính bảng này làm bảng bấm điều khiển chuyển cảnh OBS và kích hoạt nhanh các macro gõ phím khi dev mà không muốn tốn $150 mua Stream Deck vật lý.

### 2.2 Công việc cần thực hiện (Jobs To Be Done)
- **Tận dụng phần cứng cũ**: Tái sử dụng thiết bị Android rảnh rỗi để tránh lãng phí.
- **Tiết kiệm chi phí**: Có được tính năng macro pad tương đương thiết bị phần cứng thương mại mà không tốn tiền.
- **Độ trễ thấp**: Hành động trên máy tính Windows phải phản hồi ngay lập tức khi nhấn trên máy tính bảng Android.
- **Dễ dàng cấu hình**: Tạo và phân loại các bố cục nút bấm một cách hiệu quả trực quan.

### 2.3 Hành trình Người dùng chính (User Journeys)
- **UJ-1: Thiết lập kết nối ban đầu**
  - **Bối cảnh**: Minh mở ứng dụng Windows Companion lần đầu tiên và được hiển thị địa chỉ IP nội bộ cùng cổng kết nối (Port).
  - **Điểm bắt đầu**: Máy tính Windows và thiết bị Android kết nối cùng một mạng Wi-Fi cục bộ.
  - **Các bước thực hiện**: 
    1. Minh tải và khởi chạy file ứng dụng Android.
    2. Trên giao diện Android, Minh nhấn nút "Thêm kết nối mới", nhập địa chỉ IP và Port hiển thị từ Windows Companion.
    3. Minh nhấn "Kết nối".
  - **Thời điểm bàn giao giá trị**: Một thông báo "Đã kết nối thành công" xuất hiện trên cả 2 màn hình.
  - **Điểm kết thúc**: Thiết bị Android chuyển sang màn hình hiển thị lưới nút mặc định.

- **UJ-2: Cấu hình và kích hoạt nút phím tắt**
  - **Bối cảnh**: Minh muốn gán phím tắt `Ctrl + Shift + S` để lưu nhanh hoặc kích hoạt một hành động.
  - **Các bước thực hiện**:
    1. Minh mở màn hình thiết lập trên ứng dụng Companion Windows (dùng Vue UI).
    2. Minh chọn một ô nút trống trong lưới cấu hình, gõ nhãn nút là "Save All", chọn phím nóng giả lập là `Ctrl + Shift + S`.
    3. Cấu hình tự động đồng bộ sang client Android.
    4. Minh bấm nút "Save All" trên màn hình Android.
  - **Thời điểm bàn giao giá trị**: Windows Companion giả lập thao tác nhấn tổ hợp phím thành công trên hệ điều hành Windows cục bộ.

## 3. Thuật ngữ (Glossary)
- **Windows Companion (Server)**: Ứng dụng chạy ngầm trên hệ điều hành Windows chịu trách nhiệm lắng nghe kết nối, xử lý yêu cầu và giả lập hành động hệ thống.
- **Android Client (App)**: Ứng dụng chạy trên thiết bị Android hiển thị giao diện các nút bấm điều khiển cho người dùng chạm.
- **Lưới nút (Grid Area)**: Kiểu phân bố vị trí các nút macro trên giao diện Android (ví dụ lưới 3x3, 4x5).
- **Hành động hệ thống (System Action)**: Các lệnh giả lập gõ phím, chạy phần mềm, hoặc điều chỉnh âm lượng trên Windows từ xa.

## 4. Danh sách Tính năng (Features)

### 4.1 Tính năng Thiết lập Kết nối mạng nội bộ
**Mô tả**: Thiết lập kênh truyền dữ liệu bảo mật giữa thiết bị di động Android và máy tính chạy Windows trong cùng mạng Wi-Fi cục bộ. Hoạt động hoàn toàn không cần Internet.
`[ASSUMPTION: Giao thức truyền tin sử dụng WebSocket chạy trên một cổng TCP cố định do Server mở. Cổng mặc định là 8089.]`

**Yêu cầu chức năng:**
- **FR-1**: Khởi tạo Server trên Windows Companion.
  - Windows Companion tự động lấy IP nội bộ của máy tính và mở một Server WebSocket lắng nghe.
  - Kiểm thử: Ứng dụng phải hiển thị rõ IP máy tính và Port kết nối trên giao diện Companion.
- **FR-2**: Kết nối từ Client Android.
  - Client Android cho phép nhập địa chỉ IP và Port thủ công để kết nối tới WebSocket Server.
  - Kiểm thử: Trả về trạng thái kết nối trực quan (Đã kết nối/Mất kết nối) trong vòng dưới 2 giây.

### 4.2 Tính năng Giả lập Phím tắt và Hành động trên Windows
**Mô tả**: Nhận lệnh từ Android Client qua WebSocket và giả lập các hành động tương ứng trên hệ thống Windows.

**Yêu cầu chức năng:**
- **FR-3**: Giả lập Tổ hợp phím tắt (Keyboard Shortcut Simulation).
  - Server Windows nhận mã payload chứa các phím cần nhấn (ví dụ: MOD_CONTROL + MOD_SHIFT + KEY_S) và giả lập thao tác này trên OS.
  - Kiểm thử: Thực thi chính xác các tổ hợp phím hệ thống của các ứng dụng đang focus (như Photoshop, VS Code).
- **FR-4**: Điều khiển Đa phương tiện và Hệ thống (Media & Volume Control).
  - Hỗ trợ các hành động cơ bản: Play, Pause, Next, Previous track, tăng/giảm âm lượng, tắt tiếng (Mute).
- **FR-5**: Khởi chạy Ứng dụng nhanh (Application Launcher).
  - Server Windows cho phép đăng ký đường dẫn file thực thi `.exe` và khởi chạy ứng dụng đó khi nhận lệnh.
  - Kiểm thử: Khởi chạy file thực thi thành công dưới đặc quyền người dùng hiện tại mà không bị chặn bởi UAC.

### 4.3 Quản lý & Cấu hình Lưới nút bấm (Grid Editor)
**Mô tả**: Cho phép thiết kế và tùy biến giao diện điều khiển. Việc cấu hình thực hiện trên Windows Companion để dễ thao tác chuột và bàn phím, sau đó đồng bộ trực tiếp sang Android Client.

**Yêu cầu chức năng:**
- **FR-6**: Thiết lập kích thước lưới.
  - Định nghĩa số cột và hàng của lưới điều khiển (tối thiểu 2x2, tối đa 6x8).
- **FR-7**: Tùy biến nút bấm cá nhân.
  - Cho phép cấu hình nhãn chữ (Label), màu sắc nền của nút bấm, và loại hành động tương ứng (Shortcut, Media, App Launch).
- **FR-8**: Đồng bộ cấu hình thời gian thực.
  - Mỗi khi giao diện lưới trên Windows Companion thay đổi và nhấn "Lưu", cấu hình JSON mới sẽ được gửi ngay lập tức sang ứng dụng Android để dựng lại giao diện (Re-render).

### 4.4 Các yêu cầu phi chức năng diện rộng (Cross-Cutting NFRs)
- **Độ trễ truyền tin thấp**: Tổng thời gian từ lúc nhấn nút trên Android đến lúc Windows thực thi lệnh phải dưới 50ms.
- **Không sử dụng dịch vụ đám mây**: Ứng dụng không truyền bất kỳ trường dữ liệu nào ra mạng Internet ngoài mạng Wi-Fi nội bộ.
- **Tập tin đóng gói tối giản (Tauri v2)**: Kích thước file cài đặt `.msi`/`.exe` trên Windows phải dưới 10MB.

## 5. Mục tiêu nằm ngoài phạm vi v1 (Non-Goals)
- Không hỗ trợ tự động tìm kiếm kết nối qua mDNS / Bonjour (Sẽ làm trong các phiên bản sau để tránh phức tạp hóa giai đoạn đầu).
- Không xây dựng kho lưu trữ icon đám mây riêng của ứng dụng (Chỉ dùng các emoji mặc định hoặc tải ảnh nội bộ từ bộ nhớ máy tính).
- Không tích hợp sâu các SDK của OBS Studio bên thứ ba (Chỉ dùng giả lập phím tắt trên OBS trước).

## 6. Tiêu chí thành công (Success Metrics)
- **SM-1**: Người dùng thiết lập kết nối thành công giữa thiết bị Android và Windows trong vòng dưới 30 giây kể từ lần mở app đầu tiên.
- **SM-2**: Đạt độ trễ trung bình < 30ms cho các thao tác giả lập phím cục bộ qua mạng Wi-Fi tiêu chuẩn 2.4GHz/5GHz.

## 7. Các câu hỏi mở (Open Questions)
1. Liệu cơ chế bảo mật xác thực kết nối giữa Android và Windows Companion có cần sử dụng mã xác nhận PIN/QR code ngay trong MVP không, hay chỉ cần cho phép kết nối tự do từ cùng dải IP nội bộ?
`[NOTE FOR PM: MVP nên làm kết nối tự do cùng dải IP để tối giản hóa code, thêm xác thực ở v2.]`

## 8. Bảng chỉ mục giả định (Assumptions Index)
- **Giả định từ Mục 4.1**: Giao thức truyền tin sử dụng WebSocket chạy trên một cổng TCP cố định do Server mở. Cổng mặc định là 8089.
