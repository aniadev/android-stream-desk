# Manual Test Guide — Android Stream Desk

Mục tiêu: xác thực toàn bộ luồng MVP bằng tay trước khi build release. Không có test tự động trong repo — đây là kịch bản kiểm thử bắt buộc.

> ⚠️ Chưa có Windows installer build sẵn. Test trên **macOS** (Companion native) hoặc **Windows** (sau khi `pnpm tauri build`). Android Client cần Android Studio + thiết bị/emulator.

---

## 0. Tiền đề

- Node 18+, `pnpm` đã cài.
- Rust + Cargo đã cài (`rustup show`).
- macOS: Xcode CLT (`xcode-select --install`). Windows: VS C++ Build Tools.
- Android (chỉ test Client thật): Android Studio + NDK + 1 thiết bị/emulator cùng LAN với máy dev.
- Máy dev và Android **cùng Wi-Fi** (không Guest, không client isolation).

Khởi tạo:
```bash
pnpm install
```

---

## 1. Smoke test — Companion khởi động

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 1.1 | `pnpm tauri dev` | Cửa sổ "Android Stream Desk Companion" mở. Console in `WebSocket server listening on ws://0.0.0.0:8089`. |
| 1.2 | Mở `/dashboard` trong cửa sổ | HUD trên cùng hiển thị IP LAN (vd `192.168.x.y:8089`), KHÔNG phải `127.0.0.1`. |
| 1.3 | Nhấn nút "Sao chép" | Hiện "Đã sao chép!", clipboard chứa `ip:port`. |
| 1.4 | Đóng cửa sổ (nút ❌) | Cửa sổ **ẩn xuống tray**, process vẫn chạy (`ps aux \| grep stream-desk`). |
| 1.5 | Click tray icon trái | Cửa sổ hiện lại + focus. |
| 1.6 | Tray menu → "Thoát" | Process exit. |

❌ Fail nếu: IP hiện `127.0.0.1` (mạng tắt hoặc loopback only) → kiểm tra `detect_local_ipv4()` đầu ra.

---

## 2. Single-instance guard

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 2.1 | Chạy `pnpm tauri dev` | Instance 1 chạy. |
| 2.2 | Mở terminal khác, chạy lại `pnpm tauri dev` | Instance 2 **không** mở cửa sổ mới. Instance 1 cửa sổ show + focus. |

(Yêu cầu binary build — `pnpm tauri dev` spawn process mới mỗi lần. Test này chính xác hơn sau `tauri build`.)

---

## 3. WebSocket smoke (không cần Android)

Mở DevTools Console trong cửa sổ Companion (hoặc Chromium tab `http://localhost:1420/`):

```js
const ws = new WebSocket('ws://localhost:8089');
ws.onopen = () => console.log('OPEN');
ws.onmessage = (e) => console.log('RX', e.data);
ws.onclose = () => console.log('CLOSE');
```

Kỳ vọng:
- `OPEN`
- Tin đầu tiên: `RX {"type":"sync_layout","payload":{"rows":3,"cols":3,"buttons":[...]}}` — seed layout.

Gửi ping:
```js
ws.send(JSON.stringify({ type: 'ping' }));
```
Kỳ vọng: `RX {"type":"pong","payload":null}`.

❌ Fail nếu: timeout, không nhận sync_layout → kiểm tra `app_config_dir` quyền ghi, file `layout.json` có corrupt không.

---

## 4. Dashboard — chỉnh sửa grid

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 4.1 | Bấm `+` cột → 4 cột | Grid tự thêm button "Button 4/8/12...", layout sync ngay. |
| 4.2 | Bấm `-` cột về 2 | Buttons dư bị cắt. Selected button nếu bị cắt → deselect tự động. |
| 4.3 | Giới hạn rows: bấm `-` về 2 rồi `-` nữa | Dừng ở 2 (min). |
| 4.4 | Giới hạn cols: bấm `+` đến 8 rồi `+` nữa | Dừng ở 8 (max). |
| 4.5 | Click 1 button → đổi label "Save File" | Label trên grid cập nhật. Sau ~250ms debounce → `broadcastSync()` gọi `save_layout_config`. |
| 4.6 | Đổi emoji + color | Hiển thị ngay. |
| 4.7 | Tab "media" → chọn "play_pause" | `mediaAction` lưu. Tab "app" → nhập path → `appPath` lưu. |
| 4.8 | Kill Companion. Mở lại. Vào `/dashboard` | Layout cũ load từ `layout.json` (kiểm tra trên macOS: `~/Library/Application Support/com.ania.android.stream.desk/layout.json`; Windows: `%APPDATA%\com.ania.android.stream.desk\layout.json`). |

Kiểm tra atomic write:
```bash
# macOS
ls -la ~/Library/Application\ Support/com.ania.android.stream.desk/
```
Không có file `layout.json.tmp` còn sót (nếu thấy → có crash mid-write).

---

## 5. Macro execution — shortcut

> ⚠️ macOS có thể yêu cầu cấp **Accessibility permission** lần đầu (System Settings → Privacy & Security → Accessibility → bật cho Terminal/Tauri app).

Setup test:
- Mở 1 text editor (TextEdit / Notepad / VSCode), đặt cursor vào document trống.
- Companion chạy, Dashboard mở.

| Bước | Cấu hình button | Action trên Dashboard | Kỳ vọng |
|---|---|---|---|
| 5.1 | shortcut = `a` | Click button trên grid Dashboard | **KHÔNG** trigger (Dashboard click chỉ select, không press). Phải qua Client. |
| 5.2 | shortcut = `Ctrl+Shift+S` | Trigger qua Client (xem mục 7) hoặc curl WS | Save dialog mở trong editor. |
| 5.3 | shortcut = `Alt+Tab` | Trigger | Cửa sổ switch. |
| 5.4 | shortcut = `bogus_key_xxx` | Trigger | Toast đỏ hiện trên Client: "Unrecognized key token: ...". Modifiers KHÔNG kẹt (verify: gõ phím thường, không bị stuck Ctrl). |
| 5.5 | shortcut = `Ctrl+Shift` (chỉ modifier) | Trigger | Toast lỗi "has only modifiers and no base key". |

**Critical test — modifier release:** Gõ 5 lần shortcut `Ctrl+Tab` liên tục nhanh. Sau đó gõ chữ thường vào editor. Không được có `Ctrl` kẹt (chữ không bị command-mode).

---

## 5A. macOS Accessibility reset & stale TCC entry

Mục tiêu: xác nhận Dashboard phân biệt thiếu quyền thật, entry TCC cũ và dev build/path mismatch.

Tiền đề:
- Chạy trên macOS.
- Có ít nhất 1 button shortcut đơn giản, ví dụ `A`, và 1 text editor đang focus để nhận input.
- Có thể test cả dev build (`pnpm tauri dev`) và packaged `.app` sau `pnpm tauri build`.

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 5A.1 | Quit Companion hoàn toàn. Mở System Settings → Privacy & Security → Accessibility. | Thấy danh sách app đã được cấp quyền Accessibility. |
| 5A.2 | Xoá mọi entry Android Stream Desk / binary dev cũ / Terminal cũ liên quan tới Companion. | Không còn entry cũ có thể làm TCC trust nhầm path. |
| 5A.3 | Mở packaged `.app`, vào Dashboard. | Recovery panel hiện nếu app chưa được allow; panel hiển thị `bundleIdentifier`, `executablePath`, `appBundlePath` copyable. |
| 5A.4 | Bấm `Mở Accessibility Settings`, kéo đúng packaged `.app` vào danh sách và bật quyền. | macOS bật permission cho đúng app bundle. |
| 5A.5 | Quit Companion rồi mở lại packaged `.app`. Bấm `Kiểm tra lại`. | Recovery panel biến mất hoặc báo trạng thái hợp lệ; shortcut test gửi được ký tự vào editor. |
| 5A.6 | Tạo trạng thái allow nhầm dev binary: cấp quyền cho Terminal/dev runner nhưng không cấp packaged `.app`, hoặc giữ entry cũ rồi chạy packaged `.app` mới. | Recovery panel vẫn chỉ ra `executablePath`/`appBundlePath` hiện tại để QA thấy path đang cần allow. |
| 5A.7 | Trigger shortcut/media khi chưa có quyền đúng. | Toast lỗi có nút `Xem panel khôi phục`; bấm nút sẽ scroll về recovery panel. |
| 5A.8 | Sau khi bật/tắt quyền trong Settings mà UI chưa đổi ngay. | Quit/reopen Companion trước khi kết luận fail, vì TCC cache có thể giữ trạng thái process đang chạy. |

Ghi chú TCC cache:
- Nếu `AXIsProcessTrusted` đã true nhưng Enigo vẫn lỗi, ưu tiên quit/reopen Companion để process nạp lại TCC cache.
- Nếu vừa build lại app, chữ ký/path có thể đổi; xoá entry cũ rồi kéo đúng `.app` mới vào Accessibility trước khi test lại.
- Không đóng issue macOS Accessibility nếu chưa verify cả dev build path mismatch và packaged `.app`.

---

## 6. Macro execution — media + app launcher

| Bước | Cấu hình | Kỳ vọng |
|---|---|---|
| 6.1 | actionType=`media`, mediaAction=`play_pause` | Trigger → Spotify/Music play/pause. |
| 6.2 | `volume_up` ×3 | Volume tăng 3 nấc (xem chỉ báo OS). |
| 6.3 | `mute` | Mute toggle. |
| 6.4 | actionType=`app`, appPath=`/Applications/Calculator.app` (mac) / `C:\Windows\System32\calc.exe` (win) | Trigger → app mở. |
| 6.5 | appPath = `/nonexistent/path` | Toast lỗi "Application path does not exist". |
| 6.6 | appPath rỗng | Toast "Application path is empty". |

---

## 7. Android Client — kết nối + macro

Build dev APK:
```bash
pnpm tauri android dev   # cần device/emulator đã mở
```

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 7.1 | App mở trên Android | Màn hình "Chưa kết nối tới Windows Server" + ô nhập IP. |
| 7.2 | Nhập IP từ Dashboard HUD, port 8089, "Kết nối" | Status: connecting → connected. Grid render với layout từ server. |
| 7.3 | Tap 1 button | Macro execute trên máy dev (verify trong editor mục 5). Độ trễ < 100ms cảm nhận. |
| 7.4 | Trên Dashboard đổi rows 3→5 | Grid trên Android **đồng bộ tức thì** (live sync). |
| 7.5 | Tắt Wi-Fi router → bật lại sau 10s | Client: status disconnected → auto-reconnect (log "Attempting auto-reconnect..." mỗi 3s) → connected lại. |
| 7.6 | Tắt Companion (không tắt Android) | Client status disconnected. Mở lại Companion → reconnect tự động trong 3s. |
| 7.7 | Trigger button với shortcut sai | Toast đỏ hiện đáy màn hình Android, biến mất sau 3.5s. |

---

## 8. Heartbeat + lag resilience

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 8.1 | Client connected. Mở DevTools Network → throttle "Offline" 30s | Heartbeat fail, status → disconnected, reconnect loop. Mở lại mạng → connected lại, grid resync. |
| 8.2 | Mở 5 client cùng lúc (5 tab hoặc nhiều thiết bị), spam thay đổi layout từ Dashboard | Mọi client nhận sync_layout, không client nào bị lệch dài hạn. Nếu thấy log `Client X lagged by N messages` → server tự gửi lại full layout (verify client UI khớp). |

---

## 9. Edge case — layout corrupt

| Bước | Hành động | Kỳ vọng |
|---|---|---|
| 9.1 | Tắt Companion. Sửa `layout.json` thành `{ "broken": ` | Companion mở lại → fallback `default_layout()` (3x3, button "Button 1..9", shortcut `Ctrl+Tab`). Không crash. |
| 9.2 | Xoá `layout.json` | Mở lại → default 3x3. |

---

## 10. Build verification

### macOS / Windows desktop
```bash
pnpm tauri build
```
Kỳ vọng:
- Bundle output ở `src-tauri/target/release/bundle/` (`dmg/` trên mac, `msi/` + `nsis/` trên Windows).
- Kích thước MSI < 10MB (NFR).
- Mở installer cài → chạy thử mục 1.1–1.6.

### Android
```bash
pnpm tauri android build
```
APK output: `src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk`. Cài lên thiết bị, test mục 7.

❌ Fail nếu compile panic kiểu `unexpected end of file / is not RGBA` → check `src-tauri/icons/*.png` đúng RGBA (xem `AGENTS.md` mục 3).

---

## 10A. Release preflight — dist-client + lifecycle events (S-RUST2)

Mục tiêu: bắt early hai loại regression hay vỡ im lặng trong release: thiếu `dist-client/` và bind listener fail không hiện ra Dashboard.

### 10A.1 Preflight: `dist-client/index.html`

Web server Companion nhúng Vue Web Client bằng `include_dir!("$CARGO_MANIFEST_DIR/../dist-client")`. Nếu thư mục này thiếu, `pnpm tauri build` cũ vẫn pass nhưng release ship thiếu Web Client. Sau S-RUST2, `src-tauri/build.rs` chặn tại compile-time:

```bash
# Bắt buộc trước mọi lần `pnpm tauri build`:
pnpm build:client    # ghi dist-client/

# Verify preflight chặn được trường hợp thiếu:
mv dist-client dist-client.bak
cargo check --manifest-path src-tauri/Cargo.toml   # → panic "S-RUST2 preflight FAILED"
mv dist-client.bak dist-client
```

❌ Fail nếu: `cargo check` pass khi `dist-client/index.html` không tồn tại → `build.rs` bị regress.

### 10A.2 Lifecycle events trong Dashboard DevTools

Mở Dashboard → DevTools → Console, dán:

```js
const trap = (name) => __TAURI__.event.listen(name, (e) => console.log(name, e.payload));
['server-ready', 'server-error', 'server-web-ready', 'server-web-error'].forEach(trap);
```

| Bước | Hành động | Console kỳ vọng |
|---|---|---|
| 10A.2a | Bật Companion lần đầu (port 8089 / 8090 trống) | `server-ready {port: 8089}` + nếu webEnabled → `server-web-ready {port: 8090}`. |
| 10A.2b | Đặt `wsPort = 8089` rồi mở instance thứ 2 cùng port | Instance 2 in `server-error {port:8089, error:"address already in use..."}` ngay trong console. |
| 10A.2c | Bind error xảy ra | Dashboard HUD đỏ ngay phía dưới đầu trang hiện banner `Bind Error`, QR panel + Web Client panel chuyển sang overlay rose/amber với `wsBindError`/`webBindError`. |

❌ Fail nếu: bind fail xảy ra nhưng Dashboard vẫn xanh / không hiện banner → check `ServerInfo.wsBindError`/`webBindError` đã được populate từ `current_ws_bind_status()` / `current_web_bind_status()` chưa.

---

## Check-list tóm gọn trước release

- [ ] §1 smoke OK trên platform target
- [ ] §3 WS handshake + ping/pong OK
- [ ] §4 layout persist + reload OK
- [ ] §5.4 modifier KHÔNG kẹt sau lỗi
- [ ] §6 cả 3 action type (shortcut/media/app) chạy
- [ ] §7 Android live sync + auto-reconnect OK
- [ ] §8 heartbeat fail → reconnect OK
- [ ] §10 build production size < 10MB
- [ ] §10A.1 preflight chặn khi `dist-client/` thiếu (test rename)
- [ ] §10A.2 cả 4 lifecycle events fire đúng + Dashboard banner hiện khi bind fail

Bất kỳ mục nào ❌ → log Issue trước khi tag release.
