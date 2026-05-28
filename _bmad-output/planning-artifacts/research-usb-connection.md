# Báo cáo khả thi kết nối qua cáp USB — Android Stream Desk

## 1. Các hướng tiếp cận (Approach Pathways)

### Hướng 1: ADB Reverse (Tải ngược cổng)
*   **Cơ chế:** Khi thiết bị Android được cắm qua cáp USB và bật debug mode (USB Debugging), chạy lệnh phía máy tính:
    ```bash
    adb reverse tcp:8089 tcp:8089
    ```
    companion-server lắng nghe cổng `8089` trên máy tính sẽ được map trực tiếp về cổng `8089` cục bộ của thiết bị Android cảm ứng. Android Client chỉ cần truy cập vào địa chỉ IP vòng lặp `127.0.0.1:8089` để giao tiếp ổn định mà không cần Wi-Fi hay LAN.
*   **Đánh giá:** Rất khả thi, độ trễ cực thấp (phạm vi micro giây), ổn định cao, bảo mật LAN tốt. Không cần thay đổi mã nguồn backend WebSocket/heartbeat hiện có.

### Hướng 2: USB Tethering (RNDIS / Tether mạng)
*   **Cơ chế:** Thiết bị Android chia sẻ mạng dữ liệu di động qua cáp USB cho máy tính (USB Tethering). RNDIS driver trên Windows/macOS/Linux sẽ khởi tạo một card mạng ảo chung với IP subnet riêng.
*   **Đánh giá:** Không cần chỉnh sửa mã nguồn backend/frontend. Tuy nhiên, người dùng phải bật cấu hình thủ công sâu qua Cài đặt của hệ điều hành Android, kém thân thiện và phụ thuộc phần cứng của một số hãng (như MIUI/HyperOS cấu hình pin/APN ngặt nghèo).

### Hướng 3: AOA (Android Open Accessory) / USB Host Native
*   **Cơ chế:** Viết module USB driver native ở tầng Rust/Java để bắt gói tin Bulk-transfer USB thô gửi nhận trực tiếp.
*   **Đánh giá:** Cực kỳ phức tạp. WebView/Tauri không hỗ trợ giao thức thô này một cách tự nhiên. Yêu cầu viết lại hoàn toàn lớp truyền tải socket, công sức triển khai quá lớn và tỷ lệ rủi ro/crash cao. Không khuyến nghị.

---

## 2. Hệ quả & Rào cản (Barriers & Caveats)

*   **Yêu cầu ADB:**
    *   Hành động dùng `adb reverse` yêu cầu người dùng cài đặt công cụ dòng lệnh `adb` trên máy chủ PC, đồng thời bật **Developer Options → USB Debugging** trên Android thiết bị Client.
    *   Đối với người dùng phổ thông, việc này mang tính kỹ thuật cao và là rào cản trải nghiệm lớn.
*   **Tải Driver:** Trên hệ điều hành Windows cũ (Win 10/11 chưa update), thiết bị điện thoại Android cắm qua cáp có thể thiếu USB Driver hãng (Samsung, Xiaomi, Google), yêu cầu tải thủ công.

---

## 3. Khuyến nghị Kế hoạch Triển khai (Go/No-Go Recommendation)

### **KHUYẾN NGHỊ: GO** (Nhưng tách biệt theo flag thủ công)

Không cần thay đổi kiến trúc Socket hiện tại. Giải pháp tối thiểu và bền vững nhất:

1.  **Giao diện Client:** Thêm chế độ lựa chọn "Kết nối cáp USB" (IP mặc định được khóa cứng là `127.0.0.1`).
2.  **Dashboard Tooling:** Companion bổ sung một nút bấm "Kích hoạt USB (ADB)" hỗ trợ:
    *   Tự động tải xuống `adb.exe` mini (nếu chưa có).
    *   Thực thi lệnh shell `adb reverse tcp:8089 tcp:8089` trực tiếp qua plugin `tauri-plugin-shell`.
3.  **Tài liệu hỗ trợ:** Cung cấp hướng dẫn trực quan (hình ảnh) cách mở `USB Debugging` trên điện thoại khi chế độ này được lựa chọn.
