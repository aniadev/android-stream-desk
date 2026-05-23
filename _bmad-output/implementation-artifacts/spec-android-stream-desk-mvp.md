---
title: 'Android Stream Desk MVP'
type: 'feature'
created: '2026-05-23'
status: 'in-review'
baseline_commit: 'dda653c5b09d28a0a57fc9d519efa603a0ed784d'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Thiết bị điều khiển macro vật lý (Elgato Stream Deck) rất đắt đỏ ($60 - $150). Trong khi đó, người dùng có nhiều điện thoại/máy tính bảng Android cũ nhàn rỗi không tận dụng được, còn các app thay thế hiện tại thường có quảng cáo, bảo mật kém (dùng cloud) hoặc cấu hình phức tạp.

**Approach:** Xây dựng giải pháp tự lưu trữ (self-hosted) cục bộ không cần Internet. Sử dụng Tauri v2 (Rust) + Vue 3 (Vite, TS, Tailwind CSS) làm chung một codebase. Windows Companion chạy tray app ngầm lập WebSocket Server và giả lập phím/media/app launch qua thư viện `enigo`. Android Client kết nối qua WebSocket nội bộ nhận layout config thời gian thực và bấm nút điều khiển.

## Boundaries & Constraints

**Always:**
- Hoạt động hoàn toàn cục bộ (LAN), không gửi dữ liệu ra mạng Internet.
- Giao thức truyền dữ liệu: WebSocket JSON payload chạy trên port mặc định `8089`.
- Lưu trữ cấu hình dạng JSON tại thư mục AppData cục bộ của Windows Server.
- Giả lập hệ thống Windows sử dụng crate Rust `enigo` (v0.3.0).
- State-management phía Frontend sử dụng Pinia, styling sử dụng Tailwind CSS.
- Đảm bảo tổng độ trễ sự kiện từ lúc chạm đến khi thực thi < 50ms (lý tưởng < 30ms).

**Ask First:**
- Thay đổi cổng WebSocket server mặc định (8089).
- Thêm cơ chế ghép đôi xác thực (mã PIN/mã QR).
- Triển khai mDNS / Bonjour tự cấu hình IP tự động.

**Never:**
- Sử dụng bất kỳ dịch vụ cloud hay lưu trữ đám mây bên thứ ba nào.
- Tích hợp trực tiếp OBS WebSocket SDK (v1 chỉ lập giả lập phím nóng để OBS bắt).
- Cho phép kết nối ngoài mạng Wi-Fi cục bộ.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Kết nối thành công | Nhập đúng IP và Port 8089 trên Android | Client hiển thị "Đã kết nối", nhận đúng layout từ Server và render | Hiển thị thông báo Toast kết nối thành công |
| Mất mạng / Timeout | Máy tính tắt Server hoặc ngắt Wi-Fi | Client phát hiện mất kết nối qua Ping/Pong heartbeat (5s) | Client chuyển sang trạng thái "Mất kết nối", kích hoạt auto-reconnect sau mỗi 3s |
| Nhấn nút Shortcut | Android gửi payload type `press` với Shortcut | Windows Companion giả lập thao tác nhấn tổ hợp phím thành công | Log lỗi phía Rust nếu enigo giả lập thất bại. Không làm crash Server. |
| Đồng bộ Layout | Dashboard Windows cập nhật grid size hoặc nút bấm và click "Save" | JSON Layout được lưu vào AppData và broadcast qua WebSocket lập tức | Nếu ghi file AppData thất bại, log lỗi và không đồng bộ |
| Launch App | Android gửi payload type `launch` kèm path `.exe` | Windows Companion thực thi tệp `.exe` bằng đặc quyền user hiện tại | Nếu path không tồn tại hoặc sai, trả lỗi về client hiển thị Toast báo lỗi |

</frozen-after-approval>

## Code Map

- `src-tauri/Cargo.toml` -- Khai báo Rust dependencies: tokio-tungstenite, enigo, serde, serde_json
- `src-tauri/tauri.conf.json` -- Cấu hình Tauri v2 (updater, capabilities, default window, tray setup)
- `src-tauri/capabilities/default.json` -- ACL phân quyền Tauri v2 cho shell execute và fs
- `src-tauri/src/main.rs` -- Khởi chạy ứng dụng Tauri và đăng ký plugin
- `src-tauri/src/lib.rs` -- Entry point backend, Tauri commands giả lập phím, path launcher, load/save config, setup tray
- `src-tauri/src/websocket.rs` -- WebSocket Server Tokio quản lý connection, listen port 8089, route events
- `src/types/index.ts` -- Chứa enum và interface chung cho layout, message payload, connection state
- `src/stores/connection.ts` -- Pinia store quản lý WebSocket client phía Android và reconnect logic
- `src/stores/layout.ts` -- Pinia store quản lý layout, button configuration và đồng bộ
- `src/components/ConnectionStatus.vue` -- Component nhập IP/Port và biểu diễn trạng thái online/offline
- `src/components/GridButton.vue` -- Button single tùy biến label, emoji, màu, kích hoạt action gửi ws
- `src/components/GridArea.vue` -- Component render CSS Grid co giãn động theo dòng/cột nhận được
- `src/views/ClientView.vue` -- View chính chạy trên Android hiển thị lưới nút
- `src/views/DashboardView.vue` -- View cấu hình trên Windows cho phép resize grid, edit button settings
- `src/App.vue` -- Switch view router (Android Client vs Windows Dashboard)
- `src/main.ts` -- Bootstrap app frontend Vue 3
- `.github/workflows/version.yml` -- CI/CD build và tự động release release APK + MSI + Updater JSON

## Tasks & Acceptance

**Execution:**
- [ ] Setup -- Khởi tạo dự án bằng `pnpm create tauri-app` và cấu hình package.json, vite.config.ts, tsconfig.json -- Nền tảng
- [ ] Shell config -- Khởi tạo tailwindcss và cấu hình `tailwind.config.ts` cùng `src/assets/tailwind.css` -- Style nền
- [ ] Types -- Tạo file `src/types/index.ts` chứa interface `ButtonConfig`, `Layout`, `WSMessage`, `ActionType` -- Định nghĩa giao tiếp
- [ ] Connection Store -- Viết `src/stores/connection.ts` để quản lý kết nối socket phía browser -- Logic di động
- [ ] Connection UI -- Viết `src/components/ConnectionStatus.vue` hiển thị trạng thái kết nối -- Giao diện di động
- [ ] Layout Store -- Viết `src/stores/layout.ts` quản lý grid layout cục bộ -- State đồng bộ
- [ ] Grid Components -- Viết `src/components/GridButton.vue`, `src/components/GridArea.vue` -- Thành phần render
- [ ] View Routing -- Tạo `src/views/ClientView.vue`, `src/views/DashboardView.vue` và setup router trong `src/App.vue`, `src/main.ts` -- Routing
- [ ] Cargo backend -- Thêm dependencies cho `src-tauri/Cargo.toml` (`tokio-tungstenite`, `enigo`, `serde`, `serde_json`) -- Khung backend Rust
- [ ] WebSocket Module -- Viết `src-tauri/src/websocket.rs` websocket server tokio lắng nghe cổng 8089 -- Server core
- [ ] Tauri Business Logic -- Viết `src-tauri/src/lib.rs` xử lý các Tauri commands lưu/đọc config JSON, invoke enigo giả lập phím, khởi chạy file exe -- Thực thi chính
- [ ] Program Entry -- Sửa `src-tauri/src/main.rs` setup app tray, register plugins -- Bootstrap
- [ ] Capabilities & Config -- Cấu hình `src-tauri/capabilities/default.json` và `src-tauri/tauri.conf.json` -- Permission
- [ ] Release Workflow -- Viết workflow `.github/workflows/release.yml` để build tự động msi, apk -- Deployment

**Acceptance Criteria:**
- **AC-1:** Given Android + Windows cùng mạng LAN, when Android nhập đúng IP máy tính port 8089 và click Connect, then kết nối WebSocket thiết lập thành công dưới 2 giây và hiển thị "Đã kết nối".
- **AC-2:** Given Android đã kết nối thành công, when nhấn một phím bấm loại Shortcut (ví dụ: Ctrl+Tab), then máy tính Windows thực thi chính xác tổ hợp phím này với độ trễ < 50ms.
- **AC-3:** Given giao diện Dashboard trên Windows, when tăng số dòng/cột hoặc sửa màu nút và nhấn Save, then cấu hình tự cập nhật tức thì trên màn hình di động Android.
- **AC-4:** Given nút bấm gán action "Launch App" với đường dẫn `notepad.exe`, when nhấn trên Android, then Windows khởi chạy Notepad ngay lập tức.
- **AC-5:** Given ngắt kết nối mạng hoặc ngắt server, when Android gặp timeout ping/pong, then Android tự động nhảy trạng thái "Mất kết nối" và liên tục thử kết nối lại mỗi 3s.

## Verification

**Commands:**
- `pnpm tauri dev` -- expected: Chạy ứng dụng Windows Companion thành công
- `pnpm tauri android dev` -- expected: Biên dịch và chạy ứng dụng client trên thiết bị/máy ảo Android
- `cargo test --manifest-path src-tauri/Cargo.toml` -- expected: Chạy thành công các unit test của backend
- `pnpm run test` -- expected: Các unit test Vue/Vite chạy pass hoàn toàn

**Manual checks (if no CLI):**
- Bấm nút trên Android kiểm tra xem có giả lập chính xác phím hệ thống của OS Windows.
- Thử thay đổi kích thước lưới trên Windows Dashboard rồi kiểm tra xem Android có re-render lưới mới.
