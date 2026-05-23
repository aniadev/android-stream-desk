# Android Stream Desk - Hướng dẫn cho Developer Agents 📲🤖

Tài liệu này chứa các quy tắc kiến trúc và bài học xương máu **bắt buộc phải biết** để tránh làm lỗi và crash trình biên dịch trên dự án Tauri v2 + Vue 3 này.

---

## ⚠️ BÀI HỌC XƯƠNG MÁU (CRITICAL RUST BACKEND GOTCHAS)

### 1. Enigo Thread Safety trên macOS
*   **Vấn đề:** Khai báo `Enigo` (công cụ giả lập phím) thông qua `lazy_static!` hoặc lưu trữ tĩnh trong `Mutex<Enigo>` sẽ gây lỗi biên dịch nghiêm trọng: `NonNull<CGEventSource> cannot be sent between threads safely`. Thư viện `enigo` trên macOS không an toàn luồng (`Send`/`Sync`).
*   **Quy tắc:** **KHÔNG** chia sẻ hoặc lưu instance `Enigo` toàn cục. **Bắt buộc** khởi tạo động (Dynamic Instantiation) trực tiếp ngay bên trong luồng (thread) xử lý sự kiện cục bộ cần dùng:
    ```rust
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to initialize Enigo: {}", e))?;
    ```

### 2. Import Manager Trait khi truy cập Path
*   **Vấn đề:** Cầm tham chiếu `AppHandle` hoặc `App` để gọi `.path().app_config_dir()` sẽ báo lỗi: `no method named path found`.
*   **Quy tắc:** Đảm bảo **bắt buộc** có import trait `tauri::Manager` ở đầu tệp tin Rust đang gọi (ví dụ trong `websocket.rs` hay `lib.rs`).

### 3. Quy chuẩn Icon đóng gói (Tauri v2 Context Macro)
*   **Vấn đề:** `tauri::generate_context!()` giải nén và kiểm tra ảnh tại compile-time. Nếu các tệp tin icon (`src-tauri/icons/*`) là file rỗng (0-byte) hoặc sai định dạng chữ ký PNG, trình biên dịch sẽ panic lập tức (`unexpected end of file / is not RGBA`).
*   **Quy tắc:** Các tệp tin ảnh dummy tại `src-tauri/icons/` bắt buộc phải là ảnh PNG chuẩn hóa hệ màu **RGBA (color type 6)**. Sử dụng script python sinh ảnh RGBA tối giản (1x1 pixel) nếu cần tạo ảnh giả lập.

### 4. Tên liên kết Library Crate (Dấu gạch ngang vs Gạch dưới)
*   **Vấn đề:** Trong `Cargo.toml`, gói thư viện được đặt tên `"android-stream-desk"`. Khi liên kết gọi hàm tại `src-tauri/src/main.rs`, trình biên dịch Rust tự động chuyển dấu gạch ngang thành gạch dưới. 
*   **Quy tắc:** Gọi `android_stream_desk::run()` thay vì đoán mò `android_stream_desk_lib::run()`.

---

## 🛠️ LỆNH PHÁT TRIỂN & CHẠY THỬ NHANH

- **Chạy song song Companion Server (Windows/macOS) & Vue Frontend:**
  ```bash
  pnpm tauri dev
  ```
- **Chạy ứng dụng Android Client giả lập/thiết bị thật:**
  ```bash
  pnpm tauri android dev
  ```
- **Kiểm thử tĩnh nhanh phía Rust Backend:**
  ```bash
  cargo check --manifest-path src-tauri/Cargo.toml
  ```

---

## 🧬 KIẾN TRÚC & PHÂN VÙNG DỮ LIỆU

- **WebSocket Connection:** WebSocket Server nội bộ lắng nghe cổng mặc định `8089` (Wi-Fi LAN). Frontend Client tự động Ping/Pong giữ nhịp mỗi 5 giây, reconnect mỗi 3 giây nếu offline.
- **Lưu trữ Cấu hình Lưới:** Client lưu layout nhận được tại `localStorage`. Windows Companion lưu layout JSON tại `AppConfig` directory (sắp xếp serde qua tệp `layout.json`).
