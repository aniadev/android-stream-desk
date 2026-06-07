# Kế hoạch release iOS App Store — Android Stream Desk Client

> Trạng thái codebase tại thời điểm audit: commit `3a15d0a` ([iOS] Add ios app), version 1.5.2. Phạm vi: app iOS chỉ đóng vai trò **Client** (macro pad), không phải Companion.

## Tổng quan kết quả audit

Phần iOS scaffold (gen/apple) đã dựng đúng chuẩn Tauri v2, build được, nhưng có **3 nhóm vấn đề** phải xử lý trước khi nộp App Store:

1. **Blocker chắc chắn bị reject hoặc crash/không kết nối được** — thiếu các key Info.plist bắt buộc, tên app chứa "Android", iPad bị route nhầm sang Dashboard.
2. **Bug tương thích iOS** — orientation bridge là dead code, QR scan bị ẩn trên iOS, UI text Android-specific hiển thị trên iOS.
3. **UI frame chưa đạt chuẩn store** — launch screen flash trắng, thiếu viewport-fit=cover nên safe-area không hoạt động, status bar sai màu.

---

## Giai đoạn 0 — Blocker App Store (bắt buộc, làm trước tiên)

### 0.1. Thiếu `NSLocalNetworkUsageDescription` trong Info.plist — app KHÔNG THỂ kết nối LAN

- **File**: `src-tauri/gen/apple/android-stream-desk_iOS/Info.plist` (và đồng bộ `project.yml` mục `info.properties`)
- **Vấn đề**: từ iOS 14, mọi kết nối tới IP LAN (WebSocket `ws://192.168.x.x:8089`) đều trigger quyền *Local Network*. Thiếu key mô tả này thì hệ thống từ chối âm thầm → app mở lên không bao giờ kết nối được Companion. Đây là chức năng duy nhất của app nên là blocker số 1.
- **Fix**: thêm key với mô tả tiếng Việt + Anh, ví dụ: `"App cần quyền Mạng nội bộ để kết nối tới Companion trên máy tính của bạn trong cùng mạng LAN."`
- **Lưu ý test**: prompt Local Network chỉ hiện 1 lần; test trên **device thật** (simulator không enforce quyền này).

### 0.2. ATS chặn WebSocket cleartext `ws://`

- **File**: Info.plist
- **Vấn đề**: App Transport Security mặc định chặn kết nối không mã hóa từ WKWebView. Companion chỉ phục vụ `ws://` trong LAN, không có TLS.
- **Fix**: thêm `NSAppTransportSecurity` → `NSAllowsLocalNetworking = true` (đúng phạm vi LAN, KHÔNG dùng `NSAllowsArbitraryLoads` để tránh bị hỏi khi review).

### 0.3. Tên hiển thị chứa "Android" — rủi ro reject guideline 2.3.7

- **File**: `src-tauri/gen/apple/project.yml` (`PRODUCT_NAME: Android Stream Desk`), Info.plist
- **Vấn đề**: Apple thường reject app có metadata/tên nhắc tới nền tảng đối thủ. Tên app dưới icon sẽ là "Android Stream Desk".
- **Fix**: thêm `CFBundleDisplayName` riêng cho iOS, đề xuất **"Stream Desk"** hoặc **"Stream Desk Pad"** (giữ `productName` chung không đổi để không ảnh hưởng desktop). Đồng thời rà soát mô tả App Store Connect, screenshot không chứa chữ "Android".

### 0.4. iPad bị route sang Dashboard (Companion UI) — app hỏng hoàn toàn trên iPad

- **File**: `src/main.ts` (router guard), `src/views/ClientView.vue`
- **Vấn đề**: WKWebView trên iPadOS 13+ báo user-agent là `Macintosh`, không khớp regex `/Android|...|iPad|.../` → guard redirect `/` → `/dashboard`, iPad hiển thị giao diện Companion với các invoke command desktop-only. App support iPad (đã khai orientation `~ipad`, có icon 76x76/83.5x83.5) nên reviewer chắc chắn mở trên iPad → reject "app does not function".
- **Fix** (chọn 1, đề xuất a):
  - (a) Trong guard, coi là mobile khi `window.__TAURI_INTERNALS__` tồn tại **và** platform là mobile — dùng `navigator.maxTouchPoints > 1` kết hợp UA `Macintosh` để bắt iPadOS, hoặc đọc `import.meta.env.TAURI_ENV_PLATFORM === 'ios'` (Vite expose sẵn khi build qua tauri CLI).
  - (b) Build iOS bằng frontend client-only (`--mode client`, `dist-client`) qua một `tauri.ios.conf.json` override `frontendDist` — triệt để nhất vì loại hẳn DashboardView/updater UI khỏi bundle iOS (App Store cấm UI self-update).
- **Khuyến nghị**: làm cả (a) lẫn (b); (b) còn giảm size IPA và loại rủi ro reviewer thấy UI updater.

### 0.5. `ITSAppUsesNonExemptEncryption = false`

- **File**: Info.plist
- **Vấn đề**: không khai báo thì mỗi lần upload TestFlight phải trả lời thủ công câu hỏi export compliance. App chỉ dùng WS không mã hóa → exempt.
- **Fix**: thêm key, giá trị `false`.

---

## Giai đoạn 1 — Bug tương thích iOS (chức năng)

### 1.1. Orientation control trên iOS là dead code

- **File**: `src-tauri/gen/apple/Sources/android-stream-desk/OrientationMessageHandler.swift`, `iOSBridge.swift`, `src/views/ClientView.vue` (`applyOrientation`)
- **Vấn đề** (3 lớp):
  1. `OrientationMessageHandler` chưa bao giờ được register vào `WKUserContentController` — comment trong file trỏ tới `iOSPlugin.swift` **không tồn tại** trong repo. JS gọi `window.webkit.messageHandlers.iOSOrientation` sẽ throw.
  2. `applyOrientation` trong ClientView chỉ thử `window.AndroidOrientation` rồi rơi xuống `invoke('set_android_orientation')` — là stub no-op (xem `lib.rs:333`). Trên iOS không nhánh nào có tác dụng → mode mặc định `landscape` không được áp, app mở portrait.
  3. `iOSBridge.currentOrientationMask()` không được root view controller nào gọi (Tauri không cho subclass VC) → mask chỉ có tác dụng qua `requestGeometryUpdate` trên iOS 16+, và người dùng vẫn xoay lại được.
- **Fix đề xuất**:
  - Register message handler bằng swizzle `WKWebView.didMoveToWindow` (hoặc swizzle `WKUserContentController`) trong `iOSBridge.setup()`; viết file `WKWebViewBridgeInjector.swift` làm việc này.
  - Trong `applyOrientation`, thêm nhánh iOS **trước** nhánh Tauri-invoke: `window.webkit?.messageHandlers?.iOSOrientation?.postMessage(mode)` (map `landscape-reverse` → `landscapeRight`), bọc try/catch.
  - **Bỏ fallback iOS ≤15 dùng `UIDevice.setValue(forKey: "orientation")`** trong `iOSBridge.swift` — đây là KVC vào API private, có rủi ro reject khi review binary. Đề xuất nâng `deploymentTarget` trong `project.yml` từ `14.0` lên `16.0` (thị phần iOS ≤15 hiện không đáng kể) và chỉ giữ đường `requestGeometryUpdate`.

### 1.2. Nút quét QR Companion bị ẩn trên iOS

- **File**: `src/views/ClientView.vue` (`isAndroidTauriApp`), Info.plist
- **Vấn đề**: gate `isAndroidTauriApp` yêu cầu UA chứa "Android" → iOS không có nút quét QR dù plugin `barcode-scanner` v2 hỗ trợ iOS và capability `mobile.json` đã khai `iOS`.
- **Fix**:
  - Đổi thành `isMobileTauriApp` = có `__TAURI_INTERNALS__` và (Android UA hoặc iOS/iPadOS — dùng cùng helper detect ở mục 0.4). Giữ alias cũ cho `shouldShowScanAgainCta`.
  - **Bắt buộc** thêm `NSCameraUsageDescription` vào Info.plist — thiếu key này app **crash ngay** khi `requestPermissions()` chạy (và auto-reject khi review nếu binary link camera API mà thiếu mô tả).
  - Phần orientation-pin-portrait trước khi scan (`applyOrientation('portrait')`) hoạt động được sau khi 1.1 xong; kiểm tra hành vi `windowed: true` trên iOS (plugin render preview sau WebView trong suốt — cơ chế `qr-scan-active` CSS dùng lại được).
  - Test cancel flow trên iOS: ghi chú trong `cancelScanQr` mô tả hành vi Android (cancel không reject promise scan) — cần verify trên iOS có giống không, nếu khác thì giữ nguyên logic idempotent hiện tại là đủ.

### 1.3. Text hướng dẫn pin MIUI/Android hiển thị trên iOS

- **File**: `src/views/ClientView.vue` (khối "Battery optimization notice", gate `!isBrowserModeActive`)
- **Vấn đề**: người dùng iOS (và reviewer) thấy hướng dẫn "Cài đặt → Ứng dụng → Pin → Không có hạn chế" của Android.
- **Fix**: chỉ render khi là Android Tauri app (`isAndroidTauriApp`), ẩn trên iOS/browser.

### 1.4. Toggle "Rung khi nhấn" vô dụng trên iOS

- **File**: `src/views/ClientView.vue`, `src/components/GridArea.vue`
- **Vấn đề**: WKWebView không có `navigator.vibrate` (guard `'vibrate' in navigator` đã an toàn, không crash) → toggle bật/tắt không làm gì.
- **Fix tối thiểu**: ẩn toggle trên iOS. **Fix đẹp** (optional, sau release đầu): thêm haptic qua bridge native (`UIImpactFeedbackGenerator`) trong `iOSBridge` + message handler `iOSHaptic`, GridArea gọi bridge khi có.

### 1.5. "Luôn bật màn hình" trên iOS đang bật cứng, bỏ qua setting

- **File**: `src-tauri/gen/apple/Sources/android-stream-desk/iOSBridge.swift` (`onAppBecomeActive`)
- **Vấn đề**: `isIdleTimerDisabled = true` vô điều kiện khi app active → setting `keepScreenOn = false` của người dùng không có tác dụng (Web Wake Lock chỉ là lớp phụ, có từ iOS 16.4). Màn hình không bao giờ tự tắt khi mở app → tốn pin ngoài ý muốn.
- **Fix**: thêm message handler `iOSKeepScreenOn` (true/false) vào bridge; settings store gọi khi toggle đổi + khi app active. Mặc định ban đầu `true` để giữ hành vi hiện tại.

### 1.6. WS server + web server khởi động cả trên mobile

- **File**: `src-tauri/src/lib.rs` (`setup()` — spawn `start_ws_server`/`start_web_server` không gate)
- **Vấn đề**: app Client trên iOS/Android bind port 8089 (và web server nếu enabled) hoàn toàn vô nghĩa — tốn pin, tốn tài nguyên, và là surface không cần khai báo khi review.
- **Fix**: bọc khối spawn server trong `#[cfg(desktop)]`. Kiểm tra `get_server_info` vẫn dùng được trên mobile (chỉ cần `detect_local_ipv4` để prefill IP — giữ nguyên, phần bind status trả default).
- **Cẩn trọng**: đây là thay đổi chạm cả Android — test lại `pnpm tauri android dev` sau khi sửa.

---

## Giai đoạn 2 — UI frame cho store (polish hiển thị)

### 2.1. Launch screen flash trắng

- **File**: `src-tauri/gen/apple/LaunchScreen.storyboard`
- **Vấn đề**: nền đang `systemBackgroundColor` (trắng ở light mode) trong khi app nền tối `#020617` → flash trắng chói mỗi lần mở app. Trông rất thiếu chỉn chu trên store video/screenshot.
- **Fix**: đổi backgroundColor thành màu cố định `red=0.008 green=0.024 blue=0.090` (#020617), thêm `UIImageView` logo căn giữa (thêm logo vào `Assets.xcassets`) để launch → app liền mạch.

### 2.2. Thiếu `viewport-fit=cover` → safe-area không hoạt động, app bị letterbox

- **File**: `index.html` (meta viewport)
- **Vấn đề**: không có `viewport-fit=cover` thì WKWebView letterbox nội dung trong safe area — màn hình notch sẽ lộ dải nền ở cạnh, và toàn bộ `env(safe-area-inset-*)` đang dùng trong ClientView/GridArea trả về 0 (code safe-area hiện tại là dead code trên iOS).
- **Fix**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />`.

### 2.3. Thiếu safe-area trái/phải cho landscape

- **File**: `src/views/ClientView.vue` (wrapper chỉ pad top/bottom)
- **Vấn đề**: app mặc định landscape — trên iPhone notch nằm bên trái/phải, nút grid sát mép sẽ bị notch/home-indicator che, đặc biệt fit mode `fullscreen`.
- **Fix**: thêm `paddingLeft: env(safe-area-inset-left)`, `paddingRight: env(safe-area-inset-right)` vào wrapper; rà thêm HUD pill `top-4 right-4` (cộng inset phải) và nút "Quét QR lại" `bottom-5` (cộng inset dưới).

### 2.4. Status bar sai màu trên nền tối

- **File**: Info.plist + `project.yml`
- **Vấn đề**: status bar mặc định chữ đen trên nền app gần đen → không đọc được giờ/pin.
- **Fix**: thêm `UIViewControllerBasedStatusBarAppearance = false` và `UIStatusBarStyle = UIStatusBarStyleLightContent`.

### 2.5. `h-screen` → `h-dvh` ở App.vue

- **File**: `src/App.vue`
- **Vấn đề**: `100vh` trong WKWebView có lịch sử tính sai khi có bar động; ClientView đã dùng `h-dvh` nhưng wrapper ngoài vẫn `h-screen overflow-hidden` có thể clip đáy.
- **Fix**: đổi `h-screen` → `h-dvh` (Tailwind hỗ trợ sẵn).

### 2.6. Chống long-press callout / text selection trên iOS

- **File**: `src/assets/tailwind.css` (global) hoặc wrapper ClientView
- **Vấn đề**: giữ ngón tay lâu trên GridButton có thể kích hoạt magnifier/callout của iOS dù đã `select-none`.
- **Fix**: thêm global cho client view: `-webkit-touch-callout: none; -webkit-user-select: none; touch-action: manipulation;` (touch-action còn loại double-tap-zoom làm trễ tap).

### 2.7. Theme màu Việt hoá + dark đồng bộ icon/launch

- Rà `theme-color #020617` (đã có), logo apple-touch-icon, đảm bảo bộ AppIcon hiện tại (đã đủ size, có 1024 marketing) render tốt trên nền dark của App Store. Không cần code, chỉ kiểm tra mắt.

---

## Giai đoạn 3 — Checklist nộp App Store Connect

| Mục | Việc cần làm |
|---|---|
| Bundle | `com.ania.android.stream.desk` — cân nhắc: identifier chứa "android" KHÔNG hiển thị cho user và đổi sẽ tạo app mới, **giữ nguyên** |
| Build number | `CFBundleVersion` phải tăng mỗi lần upload (đang trùng 1.5.2 với version — Tauri tự sinh từ `version`, nếu upload lại cùng version cần bump, ví dụ scheme `1.5.2` → build `1`, `2`, ...) |
| Updater | KHÔNG init `tauri-plugin-updater` trên iOS (hiện chưa init ở đâu — giữ nguyên, và nếu sau này bật cho desktop thì phải gate `#[cfg(desktop)]`); nếu làm mục 0.4(b) thì UI updater cũng không còn trong bundle iOS |
| App Privacy | Khai "Data Not Collected" (app LAN-only, không analytics trong app — lưu ý Vercel Analytics chỉ ở landing page, không ở app) |
| Quyền khai báo | Camera (QR scan), Local Network — mô tả khớp với Info.plist |
| Screenshot | Bắt buộc bộ 6.7"/6.5" iPhone + 12.9" iPad (vì app support iPad); chụp ở landscape với grid đẹp, KHÔNG để chữ "Android" lọt vào |
| Demo cho reviewer | App cần Companion để hoạt động → bắt buộc viết **Review Notes** + quay video demo kết nối, nếu không gần như chắc chắn bị reject "cannot review". Cân nhắc thêm một "Demo mode" hiển thị grid mẫu không cần kết nối (điểm cộng lớn khi review) |
| Export compliance | Đã xử lý bằng 0.5 |
| TestFlight | Chạy `pnpm ios:build:ipa` (export-method app-store-connect), test trên device thật: prompt Local Network, prompt Camera, xoay màn hình, reconnect khi vào background/foreground |

---

## Thứ tự thực hiện đề xuất

1. **Giai đoạn 0** (0.1 → 0.5): toàn bộ là sửa Info.plist/project.yml/router — nhỏ, độc lập, làm trong 1 PR.
2. **1.1 + 1.2** (orientation bridge + QR iOS): PR riêng vì chạm Swift native, cần test device thật.
3. **1.3, 1.4, 1.5, 2.x**: PR "iOS UI polish" — chủ yếu Vue/CSS/storyboard.
4. **1.6** (gate server theo desktop): PR riêng, test cả Android lẫn iOS.
5. **Giai đoạn 3**: việc thủ công trên App Store Connect, làm song song sau khi PR 1 merge.

## Việc test bắt buộc trên device thật trước khi nộp

- [ ] Prompt Local Network hiện ra với mô tả đúng, sau khi Allow thì kết nối WS thành công.
- [ ] Quét QR từ Companion HUD → kết nối tự động.
- [ ] Xoay màn hình theo 4 mode trong Settings, mặc định landscape áp dụng ngay khi mở.
- [ ] Background app 1 phút → foreground → tự reconnect (heartbeat 5s + auto-reconnect).
- [ ] iPad: mở app vào thẳng Client view (không lọt vào Dashboard).
- [ ] Fullscreen fit mode: không có nút nào bị notch/home-indicator che ở cả 2 hướng landscape.
- [ ] Tắt "Luôn bật màn hình" → màn hình tự tắt theo hệ thống.
