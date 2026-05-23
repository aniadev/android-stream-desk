---
title: 'Android Stream Desk MVP'
type: 'feature'
created: '2026-05-23'
status: 'done'
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
- **AC-6:** Given Windows Companion vừa khởi chạy, when user mở Dashboard, then UI hiển thị địa chỉ IPv4 LAN nội bộ của máy + Port (mặc định 8089) ngay tại HUD đầu trang để user nhập vào Android.
- **AC-7:** Given user cấu hình shortcut, when nhập chuỗi chứa các phím sau (case-insensitive), then `simulate_shortcut` map đúng sang `enigo::Key`:
  - **Modifiers**: `Ctrl`/`Control`, `Shift`, `Alt`, `Meta`/`Win`/`Super`/`Command`.
  - **Function**: `F1`..`F12`.
  - **Navigation**: `PgUp`/`PageUp`, `PgDn`/`PageDown`, `Home`, `End`, `Up`/`Down`/`Left`/`Right` (Arrow).
  - **Editing**: `Space`, `Enter`/`Return`, `Tab`, `Escape`/`Esc`, `Backspace`, `Delete`/`Del`, `Insert`.
  - **Alphanumeric**: `a`-`z`, `0`-`9`.
  - Chuỗi không khớp → trả lỗi rõ ràng, không Press modifier mồ côi.

## Verification

**Commands:**
- `pnpm tauri dev` -- expected: Chạy ứng dụng Windows Companion thành công
- `pnpm tauri android dev` -- expected: Biên dịch và chạy ứng dụng client trên thiết bị/máy ảo Android
- `cargo test --manifest-path src-tauri/Cargo.toml` -- expected: Chạy thành công các unit test của backend
- `pnpm run test` -- expected: Các unit test Vue/Vite chạy pass hoàn toàn

**Manual checks (if no CLI):**
- Bấm nút trên Android kiểm tra xem có giả lập chính xác phím hệ thống của OS Windows.
- Thử thay đổi kích thước lưới trên Windows Dashboard rồi kiểm tra xem Android có re-render lưới mới.

## Spec Change Log

### 2026-05-23 — Amendment after step-04 verify review

**Triggering findings:**
- AA-14 (bad_spec): Spec không có AC trực tiếp cho FR-1 PRD (Companion hiển thị IP + Port). Code DashboardView không show local IP → user không biết IP nhập trên Android. → Thêm **AC-6**.
- BH-11 / AA-2 / AA-24 (bad_spec): Spec không liệt kê key set tối thiểu cho `simulate_shortcut`. Default layout dùng `Ctrl+PgUp` → fail silent vì map thiếu PgUp/PgDown/Home/End/Arrows/digits. → Thêm **AC-7**.

**Amendments:**
- Append AC-6 (IP/Port HUD trên Dashboard).
- Append AC-7 (key map tối thiểu) với danh sách chính tả case-insensitive cụ thể.

**Known-bad state avoided:**
- Cấu hình button mặc định dùng phím navigation nhưng không nhấn được → demo MVP broken.
- User mở Companion nhưng không biết IP để nhập trên Android client → setup flow tắc.

**KEEP instructions (preserve qua re-derivation nếu có):**
- Frontend wording "Đã kết nối/Đang kết nối.../Lỗi kết nối" giữ nguyên; chỉ đổi trạng thái disconnected sang "Mất kết nối" theo I/O matrix.
- WebSocket port mặc định 8089 trong cả backend + frontend default.
- Layout JSON ghi tại `app_config_dir()` (= `%APPDATA%\com.ania.android.stream.desk\` trên Windows).
- Pinia store kiến trúc connection/layout giữ nguyên — chỉ thêm/sửa trong nội bộ.

## Suggested Review Order

**Security hardening (highest priority)**

- Replaced shell wrapper with direct binary spawn + path existence check; eliminates LAN-injectable command chains.
  [`lib.rs:271`](../../src-tauri/src/lib.rs#L271)
- Capability surface trimmed to `core:default` + `updater:default`; no more `shell:allow-execute`.
  [`default.json:6`](../../src-tauri/capabilities/default.json#L6)
- Production CSP populated so any XSS path can't reach IPC freely.
  [`tauri.conf.json:17`](../../src-tauri/tauri.conf.json#L17)

**WS server reliability**

- `start_ws_server` now surfaces bind failure to frontend via `server-error` event and signals readiness with `server-ready`.
  [`websocket.rs:27`](../../src-tauri/src/websocket.rs#L27)
- `handle_connection` matches `RecvError::Lagged` and re-sends the current layout, so slow clients can't lose sync silently.
  [`websocket.rs:102`](../../src-tauri/src/websocket.rs#L102)
- New `default_layout()` returns `rows*cols` buttons so fresh clients see a full grid instead of a 1-cell stub.
  [`websocket.rs:186`](../../src-tauri/src/websocket.rs#L186)
- Layout writes go through a tmp + rename pair to keep the on-disk JSON atomic.
  [`lib.rs:41`](../../src-tauri/src/lib.rs#L41)

**Shortcut engine (AC-7)**

- `parse_shortcut` rejects modifier-only or unknown tokens and never presses orphan modifiers.
  [`lib.rs:188`](../../src-tauri/src/lib.rs#L188)
- `parse_key` covers F1–F12, navigation, arrows, editing keys, digits, alphas — the AC-7 token set.
  [`lib.rs:155`](../../src-tauri/src/lib.rs#L155)
- `simulate_shortcut` serialises calls through `ENIGO_LOCK` so concurrent presses can't interleave modifier state.
  [`lib.rs:220`](../../src-tauri/src/lib.rs#L220)

**Reconnect + lifecycle**

- Connect path detaches stale socket handlers and clears auto-reconnect before opening a new socket.
  [`connection.ts:34`](../../src/stores/connection.ts#L34)
- `disconnect()` raises `userDisconnected` so onclose can't restart the reconnect loop after an explicit user action.
  [`connection.ts:108`](../../src/stores/connection.ts#L108)
- `isReconnecting` ref drives the new "Mất kết nối" wording per AC-5.
  [`ConnectionStatus.vue:33`](../../src/components/ConnectionStatus.vue#L33)

**FR-1 / AC-6 — IP HUD**

- `get_server_info` command + `detect_local_ipv4` UDP-routing trick for an offline-safe IPv4 lookup.
  [`lib.rs:82`](../../src-tauri/src/lib.rs#L82)
- DashboardView fetches the address on mount and renders it with a Copy button.
  [`DashboardView.vue:11`](../../src/views/DashboardView.vue#L11)

**Tray + single instance**

- `setup_tray` builds the system tray with Show/Quit, gated to desktop targets.
  [`lib.rs:376`](../../src-tauri/src/lib.rs#L376)
- Close button hides to tray instead of quitting the companion.
  [`lib.rs:357`](../../src-tauri/src/lib.rs#L357)
- `tauri-plugin-single-instance` focuses the existing window on duplicate launch.
  [`lib.rs:321`](../../src-tauri/src/lib.rs#L321)

**Toast + UX polish**

- Server emits `broadcast_toast` after action failures so Android clients see the error.
  [`websocket.rs:69`](../../src-tauri/src/websocket.rs#L69)
- `useLayoutStore` exposes `lastToast` (module-level WS listener guard avoids HMR duplicates).
  [`layout.ts:62`](../../src/stores/layout.ts#L62)
- ClientView renders the toast and Dashboard debounces `broadcastSync` so keystrokes don't spam disk/WS.
  [`DashboardView.vue:99`](../../src/views/DashboardView.vue#L99)

**Release pipeline**

- Release workflow builds Windows + Android, attaches to a GitHub release, then refreshes the updater manifest.
  [`release.yml:1`](../../.github/workflows/release.yml#L1)
- CI workflow runs type-check / build for frontend and clippy + tests for Rust.
  [`ci.yml:1`](../../.github/workflows/ci.yml#L1)

**Supporting peripherals**

- Cargo manifest adds `tray-icon` feature + `tauri-plugin-single-instance`, drops `tauri-plugin-shell`.
  [`Cargo.toml:14`](../../src-tauri/Cargo.toml#L14)
- PostCSS config renamed to `.cjs` so the ESM build can load it.
  [`postcss.config.cjs:1`](../../postcss.config.cjs#L1)
