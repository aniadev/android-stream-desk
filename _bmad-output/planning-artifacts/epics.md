---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/breakdown-v1.5.0.md
  - _bmad-output/planning-artifacts/prds/prd-android-stream-desk-2026-05-23/prd.md
  - _bmad-output/planning-artifacts/architecture.md
project_name: 'android-stream-desk'
version: '1.5.0'
---

# android-stream-desk v1.5.0 - Epic Breakdown

## Overview

Tài liệu này định nghĩa danh sách Epic và Story chi tiết cho **android-stream-desk v1.5.0**, phân rã từ các tài liệu `breakdown-v1.5.0.md` (bao gồm bổ sung tối ưu chống tắt màn hình Wake Lock) và bối cảnh kỹ thuật từ `architecture.md`.

## Requirements Inventory

### Functional Requirements

FR1: Cấu hình cổng Companion nâng cao — Cho phép xem cổng hiện tại và thiết lập cấu hình cổng WebSocket (`wsPort`), cổng HTTP (`webPort`) cùng trạng thái kích hoạt Web Client (`webEnabled`) qua tệp `server.json` lưu tại `app_config_dir()`. (S-NET1)
FR2: Dashboard chỉnh sửa tham số mạng — Form cài đặt LAN hiển thị trạng thái cổng đang chạy (read-only) và cổng mới sẽ áp dụng sau khi khởi động lại, nút lưu và kích hoạt khởi động lại Companion kèm cảnh báo. (S-NET2)
FR3: Máy chủ HTTP tĩnh nội bộ — Tự động khởi chạy máy chủ web nhẹ phục vụ giao diện Client (không phục vụ `/dashboard`), cung cấp API `/api/server-info` để Browser Client tự nhận diện cấu hình mạng LAN. (S-WEB1)
FR4: Web Client Bootstrap — Trình duyệt web tự động nhận diện hostname, gọi API lấy info và tự thiết lập kết nối WebSocket mà không bắt người dùng nhập lại thông số. (S-WEB2)
FR5: Thẻ truy cập Web Client — Dashboard hiển thị địa chỉ URL Web Client kèm mã QR riêng biệt và nút copy nhanh để Scan bằng camera thường của điện thoại/iPad. (S-WEB3)
FR6: QR kết nối APK — Dashboard tạo mã QR chứa chuỗi payload định dạng `android-stream-desk://connect?v=1&host=192.168.x.x&wsPort=8089` giúp APK kết nối nhanh. (S-QR1)
FR7: Quét mã QR trong APK di động — Tích hợp plugin native quét mã QR (`@tauri-apps/plugin-barcode-scanner`) đầu cuối trên Android Client, giải mã payload và tự động kết nối. (S-QR2)
FR8: Checklist thiết lập nhanh (Companion) — Hướng dẫn First-run từng bước dễ hiểu (Bật tự khởi động, Cho phép Firewall, Bật Web Client, Quét QR, Báo cáo số thiết bị đã kết nối). (S-SETUP1)
FR9: Trung tâm hướng dẫn tích hợp (Guide Center) — Popup/Modal hướng dẫn mẫu cấu hình theo hệ điều hành (mở Chrome/Safari, dán shortcut .lnk Windows, kết nối Client). (S-GUIDE1)
FR10: Điểm truy cập trợ giúp theo ngữ cảnh — Icon `?` tại từng trường nhập cấu hình hoặc link trực tiếp từ lỗi mạng tới bài viết tương ứng ở Guide Center. (S-GUIDE2)
FR11: Sửa triệt để Autostart Windows — Đảm bảo tự khởi động chạy ẩn (`--hidden` đi vào System Tray) hoạt động ổn định trên bản đóng gói installer thật. (S-AUTO1)
FR12: Chẩn đoán & Phản hồi Autostart — Cập nhật trạng thái toggle theo `isEnabled()` thực tế mỗi lần mở settings, hiển thị Toast phản hồi và đưa vào first-run checklist. (S-AUTO2)
FR13: Tối ưu Screen Wake Lock tránh hao pin — Chỉ kích hoạt chống tắt màn hình khi cài đặt `keepScreenOn` bật VÀ trạng thái kết nối WebSocket là `connected`. Tự động ngắt (release) Wake Lock ngay khi Companion offline hoặc thiết bị mất kết nối mạng.

### NonFunctional Requirements

NFR1: An toàn mạng LAN — Webserver mặc định `OFF`. Hiển thị cảnh báo rõ cho người dùng không nên kích hoạt Web Client trên các mạng Wi-Fi công cộng.
NFR2: Phạm vi cổng kết nối hợp lệ — Toàn bộ cổng cấu hình phải được validate chéo nằm trong dải `1024..=65535` và đảm bảo cổng WS không trùng cổng HTTP Web.
NFR3: Xử lý conflict cổng an toàn — Khi bind cổng lỗi, backend trả về `server-error` (không crash app ngầm), frontend hiển thị cảnh báo lỗi cụ thể kèm gợi ý đổi cổng.
NFR4: Tách biệt quyền hạn Web Client — Web Client chỉ được tiếp cận view `/` (ClientView), chặn truy cập `/dashboard` để bảo mật.
NFR5: Hỗ trợ fallback Wake Lock trên Browser — Kiểm tra `'wakeLock' in navigator` trước khi sử dụng để tránh gây crash giao diện điều khiển trên các browser không hỗ trợ API này (ví dụ iOS WKWebView).

### Additional Requirements

- Cấu hình file `server.json` tách riêng khỏi cấu hình bố cục phím `layout.json` để tránh đồng bộ hóa nhầm thiết lập cổng sang Client.
- Tích hợp `@tauri-apps/plugin-barcode-scanner` cho APK Android (yêu cầu thêm `android.permission.CAMERA` vào Android Manifest và capabilities default.json).
- Static assets web server: Đóng gói folder static build của client vào binary Tauri để phục vụ serve nội bộ không cần kết nối internet.
- Đảm bảo argument `--hidden` khi khởi động cùng hệ thống hoạt động chính xác thông qua CLI arg parsing trong `lib.rs`.

### UX Design Requirements

UX-DR1: Thiết kế Form Network Settings — Hiển thị huy hiệu "Có thay đổi chưa áp dụng" nếu cổng cấu hình khác cổng đang chạy; nút "Khởi động lại Companion" đổi màu nổi bật.
UX-DR2: Phân rõ 2 mã QR trên Dashboard — "Mã APK" và "Mã Web Client dạng link URL" phải có nhãn rõ ràng, tách biệt để tránh người dùng quét sai mục đích.
UX-DR3: Responsive Guide Center Modal — Giao diện cuộn mượt mà trên màn hình nhỏ, có nút sao chép nhanh (copy) các câu lệnh mẫu.
UX-DR4: HUD chẩn đoán mạng — Hiển thị số thiết bị đang kết nối realtime và trạng thái Service (Listening/Error).

### FR Coverage Map

FR1: Epic 1 — Cấu hình cổng Companion nâng cao (FR1, FR2)
FR2: Epic 1 — Cấu hình cổng Companion nâng cao (FR1, FR2)
FR3: Epic 2 — Web Client phục vụ trong mạng LAN (FR3, FR4, FR5)
FR4: Epic 2 — Web Client phục vụ trong mạng LAN (FR3, FR4, FR5)
FR5: Epic 2 — Web Client phục vụ trong mạng LAN (FR3, FR4, FR5)
FR6: Epic 3 — Kết nối APK siêu tốc bằng mã QR (FR6, FR7)
FR7: Epic 3 — Kết nối APK siêu tốc bằng mã QR (FR6, FR7)
FR8: Epic 4 — Trải nghiệm Setup ban đầu & Chẩn đoán hệ thống (FR8)
FR9: Epic 5 — Trung tâm Trợ giúp tích hợp & Ngữ cảnh báo lỗi (FR9, FR10)
FR10: Epic 5 — Trung tâm Trợ giúp tích hợp & Ngữ cảnh báo lỗi (FR9, FR10)
FR11: Epic 6 — Hoàn thiện tính năng tự khởi động cùng Windows (FR11, FR12)
FR12: Epic 6 — Hoàn thiện tính năng tự khởi động cùng Windows (FR11, FR12)
FR13: Epic 7 — Quản lý năng lượng & Trạng thái hoạt động Client (FR13)

## Epic List

1. **Epic 1: Cấu hình cổng Companion nâng cao (FR1, FR2)**
2. **Epic 2: Web Client phục vụ trong mạng LAN (FR3, FR4, FR5)**
3. **Epic 3: Kết nối APK siêu tốc bằng mã QR (FR6, FR7)**
4. **Epic 4: Trải nghiệm Setup ban đầu & Chẩn đoán hệ thống (FR8)**
5. **Epic 5: Trung tâm Trợ giúp tích hợp & Ngữ cảnh báo lỗi (FR9, FR10)**
6. **Epic 6: Hoàn thiện tính năng tự khởi động cùng Windows (FR11, FR12)**
7. **Epic 7: Quản lý năng lượng & Trạng thái hoạt động Client (FR13)**

---

## Epic 1: Cấu hình cổng Companion nâng cao (FR1, FR2)

Thiết lập cấu hình mạng động và cơ chế lưu trữ để lưu/tải các thiết lập cổng kết nối thay vì ghi cứng ở compile-time, đồng thời kiểm soát việc nạp lại dịch vụ Companion sau khi cấu hình thay đổi.

### Story 1.1 (S-NET1): Đọc/ghi cấu hình mạng từ tệp server.json

As a developer,
I want hệ thống nạp và ghi cấu hình cổng từ file `server.json` thay vì bind cứng compile-time,
So that người dùng có thể tùy chỉnh môi trường mạng phù hợp với thiết bị của họ.

**Acceptance Criteria:**

**Given** Companion khởi chạy chưa có file `server.json`,
**When** thực hiện nạp cài đặt tại `app_config_dir()`,
**Then** tự khởi tạo cấu hình mặc định: `wsPort: 8089`, `webEnabled: false`, `webPort: 8090`,
**And** trả về các giá trị này làm fallback an toàn.

**Given** một cổng được thiết lập ngoài dải `1024..=65535` hoặc bị trùng nhau giữa HTTP và WS khi `webEnabled` được bật,
**When** gọi command `save_server_config`,
**Then** trả về lỗi validation và không ghi đè cấu hình hiện tại.

**Given** cấu hình mạng thay đổi hợp lệ,
**When** gọi command `save_server_config` và ghi thành công file `server.json`,
**Then** trả về kết quả thành công mà không hot-rebind socket lập tức.

### Story 1.2 (S-NET2): Giao diện thiết lập mạng Dashboard Network Settings

As a Companion user,
I want giao diện cài đặt Dashboard cung cấp biểu mẫu quản trị cổng mạng và trạng thái thay đổi rõ ràng,
So that tôi lưu được cổng mới và dễ dàng khởi động lại ứng dụng để áp dụng.

**Acceptance Criteria:**

**Given** giao diện Settings hiển thị,
**When** xem phần "Kết nối LAN",
**Then** hiển thị hai trạng thái: "Cổng đang chạy" (Read-only, đọc từ cổng active thực tế của socket listener) và "Cổng sau khi khởi động lại" (Input có thể tự do nhập sửa).

**Given** giá trị thay đổi trong Input khác với cổng đang chạy thực tế,
**When** nhập phím,
**Then** hiển thị thẻ Badge "Có thay đổi chưa áp dụng" màu vàng nổi bật tại vùng cài đặt.

**Given** người dùng nhấn nút "Lưu và khởi động lại",
**When** bấm,
**Then** hệ thống gọi command lưu, hiển thị Dialog chờ khởi động lại, kích hoạt restart app qua Tauri API `relaunch()` để khởi tạo socket listener mới.

---

## Epic 2: Web Client phục vụ trong mạng LAN (FR3, FR4, FR5)

Companion tích hợp máy chủ HTTP phục vụ giao diện Client tĩnh (Web Client) trong mạng LAN giúp iPad, tablet hoặc thiết bị dùng browser truy cập nhanh không cần APK, bổ sung API tự nhận diện cổng điều khiển.

### Story 2.1 (S-WEB1): Phục vụ Web Client tĩnh & API Server Info

As a Companion user,
I want Companion tự chạy một Web Server nội bộ phục vụ static client view và API nhận diện cấu hình mạng trong LAN,
So that tôi dễ dàng truy cập macro pad bằng trình duyệt web.

**Acceptance Criteria:**

**Given** `webEnabled` là `true` trong `server.json`,
**When** ứng dụng Companion khởi động,
**Then** tiến trình Rust spawn một máy chủ HTTP tĩnh bind cổng `webPort` trong LAN, phục vụ tệp HTML/JS của Client (`ClientView.vue` shell) tại route `/`,
**And** chặn toàn bộ truy cập vào Dashboard `/dashboard` (trả về 403 Forbidden hoặc redirect về `/`).

**Given** trình duyệt gửi request tới đầu cuối `/api/server-info`,
**When** truy cập,
**Then** trả về cấu hình JSON chứa `wsPort: number` của WebSocket server thực tế đang phục vụ.

**Given** cổng `webPort` bị conflict hoặc chiếm dụng bởi tiến trình của ứng dụng khác,
**When** bind,
**Then** hệ thống emit event `server-error` lên frontend xử lý thay vì crash silent hoặc crash hệ thống.

### Story 2.2 (S-WEB2): Trình duyệt Web Client tự nhận diện cấu hình LAN

As a Web Client user,
I want Web Client tự phân tách hostname và fetch API thông tin Companion để tự kết nối,
So that tôi không cần gõ thủ công IP và cổng trên trình duyệt thiết bị.

**Acceptance Criteria:**

**Given** Web Client chạy trong môi trường trình duyệt thường (không có Tauri internals),
**When** nạp trang,
**Then** tự động gọi API `/api/server-info` từ server Companion phục vụ, lấy thông tin cổng WebSocket,
**And** khởi tạo WebSocket tới `ws://<local_hostname>:<wsPort>` để tự động kết nối và đồng bộ layout.

**Given** API fetch hoặc WebSocket kết nối thất bại,
**When** lỗi xảy ra,
**Then** hiển thị màn hình kết nối thủ công làm fallback để sửa lại IP và Port.

### Story 2.3 (S-WEB3): Hiển thị URL truy cập & Mã QR mở Web Client

As a Companion user,
I want Dashboard hiển thị liên kết truy cập Web Client kèm mã QR tương ứng khi bật máy chủ HTTP,
So that tôi copy link nhanh hoặc quét bằng máy ảnh iPad để sử dụng ngay.

**Acceptance Criteria:**

**Given** cấu hình `webEnabled` được bật và Web Server đang lắng nghe bình thường,
**When** Dashboard hiển thị,
**Then** hiển thị dòng URL dạng `http://<LAN-IP>:<webPort>`, nút copy, kèm biểu tượng cảnh báo "Chỉ bật trên Wi-Fi tin cậy",
**And** kết xuất mã QR có nhãn rõ ràng "Mở trên iPad / browser" chứa liên kết HTTP.

---

## Epic 3: Kết nối APK di động siêu tốc bằng mã QR (FR6, FR7)

Nâng cấp trải nghiệm onboard cho APK di động bằng mã QR mang payload sâu để thiết bị Android quét bằng camera gốc, tự nhận cấu hình kết nối Companion nhanh hơn.

### Story 3.1 (S-QR1): Tạo và hiển thị mã QR kết nối chuyên dụng cho APK

As a Companion user,
I want Companion hiển thị mã QR kết nối APK mang payload định nghĩa cấu trúc mạng LAN,
So that tôi dùng App trên thiết bị Android quét để thiết lập cấu hình tức thời.

**Acceptance Criteria:**

**Given** Companion Dashboard hiển thị,
**When** tải thông tin server,
**Then** kết xuất một mã QR mang nhãn "Kết nối APK" chứa payload định dạng:
`android-stream-desk://connect?v=1&host=<LAN-IP>&wsPort=<wsPort>`
**And** mã QR được tự động vẽ lại (regenerate) mỗi khi cài đặt mạng áp dụng thực tế chuyển đổi.

### Story 3.2 (S-QR2): Quét mã QR native camera scanner hỗ trợ trên APK Android

As an APK client user,
I want có nút quét mã QR sử dụng camera thiết bị trong màn hình kết nối di động,
So that tôi kết nối tới Companion tức thì mà không cần tự nhập địa chỉ IPv4.

**Acceptance Criteria:**

**Given** ứng dụng chạy trên APK Android di động,
**When** màn hình "Chưa kết nối Companion" hiển thị,
**Then** xuất hiện nút "Quét QR từ Companion".

**Given** nút Quét QR được nhấn lần đầu,
**When** bấm,
**Then** hệ thống yêu cầu quyền camera native (`android.permission.CAMERA`), mở màn hình quét camera sau qua plugin `@tauri-apps/plugin-barcode-scanner`.

**Given** mã QR được quét thành công mang format payload hợp lệ `android-stream-desk://connect?v=1&...`,
**When** parse thành công,
**Then** tự động trích xuất `host` lưu vào `localStorage.server_ip`, `wsPort` lưu vào `localStorage.server_port`, đóng scanner và gọi kết nối socket lập tức,
**And** cảnh báo lỗi nếu payload sai format và giữ nguyên cấu hình cũ.

---

## Epic 4: Trải nghiệm Setup ban đầu & Chẩn đoán hệ thống (FR8)

Giảm thiểu ma sát cài đặt ban đầu cho người dùng thông qua bảng chào mừng thiết lập từng bước kèm theo hệ thống chỉ dẫn lỗi/Firewall trực quan.

### Story 4.1 (S-SETUP1): Dashboard First-Run checklist & HUD chẩn đoán mạng

As a new user,
I want bảng chỉ dẫn kiểm tra cài đặt ban đầu và hiển thị trạng thái thiết bị chẩn đoán trực quan,
So that tôi nắm bắt được những bước cần làm để Companion hoạt động an toàn.

**Acceptance Criteria:**

**Given** người dùng mở Dashboard lần đầu,
**When** nạp,
**Then** hiển thị Card "Checklist cài đặt Companion" (có nút Dismiss để ẩn vĩnh viễn):
1. Bật toggle tự động khởi động cùng hệ thống.
2. Thiết lập quy tắc Windows Defender Firewall chặn/cho phép cổng.
3. Bật Web Client (nếu sử dụng browser iPad).
4. Thiết lập quét QR tải APK hoặc Web URL.

**Given** Dashboard đang hoạt động,
**When** thiết bị Client kết nối/ngắt kết nối,
**Then** HUD Counter ở góc màn hình Dashboard cập nhật realtime: "Đang có N thiết bị kết nối vào Companion",
**And** hiển thị huy hiệu báo lỗi Firewall/Port conflict nếu trạng thái socket server bị bind thất bại.

---

## Epic 5: Trung tâm Trợ giúp tích hợp & Ngữ cảnh báo lỗi (FR9, FR10)

Xây dựng hệ thống tài liệu hướng dẫn nhanh (Guide Center Modal) trực quan ngay trong giao diện Dashboard, cung cấp mẫu lệnh cấu hình theo OS (Windows/Mac/Linux) và các điểm liên kết ngữ cảnh khi sự cố xảy ra.

### Story 5.1 (S-GUIDE1): Modal Trung tâm trợ giúp (Guide Center) tích hợp

As a Dashboard user,
I want một trung tâm hướng dẫn tích hợp chứa các mẫu lệnh gán phím tắt/mở app định dạng sẵn theo OS,
So that tôi sao chép hoặc áp dụng trực tiếp nhanh mà không cần lục tìm tài liệu PDF/README.

**Acceptance Criteria:**

**Given** Modal Guide Center được kích hoạt,
**When** người dùng chọn phần "Tự động mở trình duyệt Web",
**Then** hiển thị mã lệnh gán mẫu chia rõ theo hệ điều hành hiện tại:
- Windows: `start "" chrome "https://facebook.com"`
- macOS: `open -a "Google Chrome" "https://facebook.com"`
**And** cung cấp nút "Dùng mẫu này" để điền trực tiếp giá trị vào form cấu hình của nút macro hiện tại đang sửa.

**Given** người dùng chọn phần "Hướng dẫn dán (.lnk) Shortcut & Copy as path",
**When** xem,
**Then** mô tả chi tiết 4 bước thao tác kéo/thả/dán tệp liên kết tắt trên Windows để Companion tự động xử lý.

### Story 5.2 (S-GUIDE2): Cung cấp điểm liên kết trợ giúp ngữ cảnh

As a Dashboard user,
I want các biểu tượng hỗ trợ cứu cánh xuất hiện cạnh cài đặt nhập liệu và màn hình báo lỗi,
So that tôi biết chính xác cách khắc phục sự cố tại vị trí lỗi phát sinh.

**Acceptance Criteria:**

**Given** tab App hoặc tab Command đang mở trên Dashboard,
**When** chỉnh sửa nút bấm,
**Then** xuất hiện icon Trợ giúp `?` nhỏ bên cạnh đầu vào, click vào tự động mở Guide Center Modal trỏ đúng mục hướng dẫn cấu hình của tab đó.

**Given** Socket Companion xảy ra lỗi bind cổng hoặc lỗi tường lửa,
**When** banner lỗi Dashboard hiển thị,
**Then** xuất hiện liên kết "Hướng dẫn mở khóa Tường lửa & Sửa dải cổng mạng" để đưa trực tiếp tới chuyên mục xử lý lỗi LAN trên Guide Center Modal.

---

## Epic 6: Hoàn thiện tính năng tự khởi động cùng Windows (FR11, FR12)

Kiểm tra và sửa dứt điểm lỗi tự khởi động (Autostart regression) trên môi trường cài đặt thực tế của hệ điều hành Windows, cải thiện logic chẩn đoán và thông báo cho người dùng.

### Story 6.1 (S-AUTO1): Chạy ẩn Companion đi vào System Tray khi khởi động hệ thống

As a Windows user,
I want ứng dụng Companion tự động kích hoạt chạy ẩn dưới System Tray sau khi khởi động máy tính,
So that ứng dụng sẵn sàng nhận kết nối macro mà không làm gián đoạn màn hình làm việc của tôi.

**Acceptance Criteria:**

**Given** tùy chọn "Khởi động cùng Windows" được bật trong settings,
**When** máy tính khởi động lại và người dùng đăng nhập,
**Then** ứng dụng Companion được kích hoạt ngầm với tham số `--hidden` (parse trong `lib.rs`),
**And** thu nhỏ hoàn toàn vào System Tray, không bật giao diện Dashboard cửa sổ chính lên màn hình.

**Given** user bật/tắt toggle Autostart trên Dashboard,
**When** thay đổi sự kiện,
**Then** gọi API native tương ứng của `tauri-plugin-autostart` để đồng bộ Registry startup entry trên Windows cho ứng dụng đóng gói (.msi/.exe).

### Story 6.2 (S-AUTO2): Cải thiện chẩn đoán và phản hồi thiết lập Autostart

As a Companion user,
I want giao diện Dashboard phản ánh chính xác trạng thái hoạt động thực của Autostart mỗi khi mở trang chỉnh sửa,
So that tôi tránh bật nhầm hoặc không biết tính năng có xung đột quyền hệ thống hay không.

**Acceptance Criteria:**

**Given** Dashboard settings modal được mở lên,
**When** hiển thị toggle,
**Then** gọi hàm kiểm thử `isEnabled()` của plugin autostart để cập nhật trạng thái toggle chính xác theo hệ thống thực, thay vì chỉ đọc từ cache frontend.

**Given** người dùng chuyển đổi toggle,
**When** thao tác hoàn tất,
**Then** hiển thị thông báo Toast "Đã áp dụng tự khởi động cùng hệ thống" hoặc hiển thị Banner cảnh báo lỗi chi tiết nếu bị hệ thống chặn quyền ghi Registry.

---

## Epic 7: Quản lý năng lượng & Trạng thái hoạt động Client (FR13)

Tối ưu hóa quản lý tiêu thụ điện năng cho các thiết bị dùng macro client bằng cách đồng bộ trạng thái Screen Wake Lock (chống tắt màn hình) trực tiếp với kết nối WebSocket của máy tính Companion.

### Story 7.1 (S-WAKE1): Tự động bật/tắt Screen Wake Lock theo trạng thái hoạt động của socket kết nối

As a macro client user,
I want tính năng chống tắt màn hình (Wake Lock) tự hủy khi tắt Companion hoặc mất kết nối,
So that thiết bị di động của tôi tự động ngủ tiết kiệm pin khi tôi không ngồi máy tính.

**Acceptance Criteria:**

**Given** cài đặt "Luôn bật màn hình" (`keepScreenOn: true`) được kích hoạt trong store,
**When** trạng thái WebSocket `connectionStore.status` chuyển thành `'connected'`,
**Then** hệ thống gọi API trình duyệt `navigator.wakeLock.request('screen')` để bắt đầu chặn tự động ngủ màn hình.

**Given** trạng thái WebSocket ngắt kết nối (`disconnected`, `error`, hoặc khi Companion Windows tắt),
**When** socket đổi trạng thái,
**Then** tự động giải phóng (release) sentinel của Wake Lock hiện tại, đưa thiết bị về chế độ tiết kiệm năng lượng ngủ tự động bình thường theo cài đặt OS.

**Given** thiết bị Client chạy trong nền tảng không hỗ trợ API Wake Lock (ví dụ một số WKWebView trên iOS),
**When** gọi,
**Then** bỏ qua việc gọi API an toàn (`'wakeLock' in navigator` check) mà không gây treo hay crash giao diện client.
