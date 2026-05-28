# Changelog

All notable changes to the **Android Stream Desk** project will be documented in this file.

---

## [1.4.1] - 2026-05-29

### Changed
- **Client carousel → CSS scroll-snap**: Bỏ engine `embla-carousel-vue`, chuyển sang pager `scroll-snap` HTML/CSS thuần (native vuốt, bỏ slide animation, tap dot nhảy tức thì) — mượt hơn trên chip yếu (POCO C40), gỡ dependency.

### Fixed
- **Rung khi nhấn không hoạt động (Android)**: Thêm quyền `android.permission.VIBRATE` vào AndroidManifest — trước đó WebView gọi `navigator.vibrate()` bị no-op do thiếu quyền.
- **Âm thanh khi nhấn (Android)**: Thay synth oscillator âm lượng nhỏ (gain 0.04) bằng file `public/sound/poop.wav` phát qua Web Audio buffer (preload ở gesture đầu, BufferSource mỗi tap) — nghe rõ trên loa máy yếu.

---

## [1.4.0] - 2026-05-29

### Added
- **Multi-page macro pad**: Tổ chức button thành nhiều trang dùng chung `rows`/`cols`. Client chuyển trang bằng carousel (vuốt) + dot pagination; Dashboard editor có page tabs CLICK để thêm (`+`) / xóa (`×`) / đổi tên trang (vẫn kéo-thả sắp xếp button). Layout single-page cũ tự migrate sang `pages`, không mất button. Trạng thái trang là cục bộ từng client (không broadcast).
- **Record chord nâng cao**: Ghi tổ hợp nhiều phím nhấn ĐỒNG THỜI (vd `Alt+P+W`) — Companion giữ rồi nhả ngược thay vì click tuần tự; preview chuỗi đang giữ realtime. Hỗ trợ `PrintScreen` (bắt qua keyup) và preset "phím hệ thống" cho combo bị OS chặn (`Win+Shift+S`, `Win+S`, `Win+L`).
- **Upload icon tùy biến**: Tải ảnh PNG/JPG từ máy làm icon button (downscale ~96px, lưu data URI), render `<img>` trên cả Companion và Client; chọn chế độ phủ ảnh `cover` / `contain` / `fill` / gốc.
- **App Picker quét Start Menu**: Liệt kê thêm shortcut `.lnk` (`%ProgramData%` + `%AppData%`) mang `target + arguments`, merge/dedupe với registry (ưu tiên entry có args) — chạy được app cần launcher như League of Legends qua `RiotClientServices.exe --launch-product=...`.
- **Reconnect ngầm**: Mất kết nối giữa session giữ nguyên grid, đổi status icon 3 trạng thái (connected / reconnecting / disconnected), tự kết nối lại mỗi 30s — không bật modal/lỗi phiền. Modal connect chỉ hiện lần đầu hoặc khi chủ động ngắt.
- **Sound + vibration khi nhấn**: Phản hồi âm thanh (Web Audio click) và rung (`navigator.vibrate`) khi nhấn button trên Client, bật/tắt độc lập trong settings, có guard khi nền tảng không hỗ trợ.
- **Tự khởi động cùng Windows**: Toggle trong settings Dashboard; app khởi động ẩn vào tray (arg `--hidden`) khi đăng nhập.
- **Export chọn đường dẫn**: Native save dialog (`stream-desk-layout-<ts>.json`, filter JSON) + ghi file atomic; không toast khi user hủy.
- **Build macOS + Linux**: CI sinh `.dmg` (macOS unsigned) và `.deb`/`.AppImage` (Linux); README có hướng dẫn vượt Gatekeeper (`xattr -dr com.apple.quarantine`) và deps Linux (caveat Wayland).

### Fixed
- **Paste shortcut đã copy (Windows)**: Sửa typo type literal PowerShell `[System.Windows.Forms.Clipboard]` (trước là `Forms::Clipboard`) khiến `read_clipboard_files` luôn trả rỗng — giờ dán shortcut Chrome/app đã copy vào ô App path resolve đúng `.lnk`.
- **Import bypass sanitize (multi-page)**: Button trong `pages[]` giờ được sanitize icon + validate action khi import; trước đó file multi-page lách toàn bộ kiểm tra (chặn data URI lạ / XSS).
- **App Picker treo khi nhiều shortcut**: Resolve mọi `.lnk` trong MỘT lần gọi PowerShell thay vì spawn một tiến trình mỗi shortcut.
- **Client carousel desync**: `reInit` embla khi số trang thay đổi qua broadcast (thêm/xóa trang ở Dashboard).
- **macOS PrintScreen gõ nhầm**: Bỏ mapping `Key::Other(0)` (gõ ra 'a') trên macOS — giờ trả lỗi parse thay vì gõ bậy.
- **Metrics loop**: Bỏ qua `pages` rỗng để mảng `buttons` top-level vẫn quyết định interval; quét monitor button trên TẤT CẢ các trang.
- **Record kẹt khi mất focus**: Hủy ghi chord sạch khi cửa sổ mất focus giữa chừng.

---

## [1.3.3] - 2026-05-25

### Fixed
- **Auto-updater "not defined" crash**: Clicking "Tải & nâng cấp" khi Tauri native updater chưa được khởi tạo (chưa có minisign key) gây lỗi `downloadAndInstall is not a function`. Giờ fallback GitHub API tạo object thủ công với flag `isManual`, nút chuyển thành "Mở trang tải xuống →" và mở trình duyệt đến GitHub Releases thay vì gọi IPC không tồn tại.
- **Auto-updater false positive với suffix tag**: GitHub fallback dùng `/releases/latest` nên có thể trả về tag `v1.3.2-win` hoặc `v1.3.2-apk`, so sánh sai với `currentVersion` và hiện "có bản cập nhật mới" nhầm. Đổi sang `/releases` list và filter bằng regex `^v\d+\.\d+\.\d+$` để chỉ xét full release.
- **APK size giảm ~50%**: Universal APK từ ~70MB xuống ~25-35MB bằng cách bỏ target x86/x86_64 (emulator-only), thêm `abiFilters` Gradle giới hạn `arm64-v8a` + `armeabi-v7a`, và kích hoạt Rust release profile `opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`, `strip = true`.
- **TypeScript error `window.__TAURI_INTERNALS__`**: Thêm `src/tauri.d.ts` khai báo `interface Window { __TAURI_INTERNALS__?: unknown }` để IDE và vue-tsc không báo lỗi.

---

## [1.3.2] - 2026-05-25

### Added
- **Windows Shortcut Paste (.lnk resolver)**: Paste a Windows shortcut directly into the app path input on the Dashboard. If the pasted text ends in `.lnk`, the Companion resolves it via PowerShell `WScript.Shell` COM and fills in the real executable path and arguments automatically. Quoted paths copied from a shortcut's Properties → Target field are also handled. A brief `✓ Đã giải shortcut` / `✗` hint is shown after resolution.

### Fixed
- **App Launch — Elevation & Anti-cheat Errors**: Direct `Command::new` spawn failed with `os error 740` (elevation required, e.g. Steam) or `os error 5` (access denied, e.g. Riot/Vanguard-protected executables). Both errors now fall back to `cmd /c start` which routes through the Windows Shell (`ShellExecuteEx`), triggering the UAC prompt and respecting anti-cheat launch guards. Games launched via their Riot Client shortcut target (`RiotClientServices.exe --launch-product=...`) also work.
- **App Path Supports Arguments**: App path field now accepts a full command line (`C:\path\app.exe --flag value`). Arguments are split at the `.exe` boundary so the executable and its flags are passed correctly to the process.
- **ClientView Layout Responsiveness**: Adjusted overflow and height properties to fix layout clipping on smaller screens.

---

## [1.3.1] - 2026-05-25

### Fixed
- **Android WiFi Drops When Wake Lock Enabled (MIUI / POCO C40)**: On battery-powered MIUI devices, enabling screen wake lock triggered the OS to apply aggressive battery optimization that overrode the WiFi lock and dropped the WebSocket connection (charging was unaffected because a different power profile is used). Added a native `WifiManager.WifiLock` (`WIFI_MODE_FULL_LOW_LATENCY` on API 29+, `WIFI_MODE_FULL_HIGH_PERF` on older) held for the entire foreground lifetime. Also prompts once on first launch via `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` so MIUI cannot kill the app's network. A Toast message and in-settings notice guide users through granting the exemption.
- **Monitor Metrics Not Updating on Client**: `currentMetrics` was a module-level Vue `ref` defined outside the Pinia store. In HMR re-evaluations during development (and edge cases in production), `GridButton.vue` could import a fresh zero ref while the `ws-message` event listener still wrote to the old one — leaving the displayed value frozen at 0%. Moved into the Pinia `layout` store and exposed as store state so both the listener closure and components reference the same reactive object.
- **Settings Modal — Close Button Too Small**: Close button tap target was a bare icon with no padding, making it difficult to tap on small screens. Enlarged with `p-2 rounded-xl` hit area and added backdrop `@click.self` to close the modal by tapping outside the card.

---

## [1.3.0] - 2026-05-25

### Added
- **Monitor Button (Ambient Monitoring)**: A new display-only button type visually showing system hardware metrics (CPU / RAM percentage) using real-time information streamed from the Companion app via WebSockets.
- **Brand Icons (Simple Icons)**: Expand offline curations with `@iconify-json/simple-icons`, supplying over 80 pre-selected apps including popular brand assets such as Discord, Steam, Spotify, and GitHub.
- **Full-Pack Icon Search & Virtual Scroll**: Lifted search constraints beyond the manually curated list. Enter text, and it pulls icons from the entire @iconify collection using `getIconList()`. Incorporates lazy loaded DOM elements handling grids mapping over 7000 items seamlessly. Search input is now cleanly positioned below the pack tabs for better UX.
- **Multi-Theme Engine**: Introduced 3 custom themes globally applied & synchronized seamlessly from Desktop to Client via layout JSON config. Includes the default 'Cyber', 'Midnight' (Violet Neon), and 'Ember' (Warm Orange Retro).
- **Android Screen Wake Lock**: Utilizes the modern `navigator.wakeLock` Web API to intercept auto-sleep cycles natively for the Client WebView, seamlessly regaining active sessions upon returning to the foreground tab without asking for device app permissions.
- **Dynamic CI Build Iterations**: Github Actions now explicitly attach semantic build numbers (e.g. `android-stream-desk-v1_3_0.apk`) onto APK names during the universal generation cycle ensuring output clarity.

### Changed
- **Branding Update**: App icon has been redesigned and replaced, bringing a fresh identity look across Android & Desktop deployments.

### Fixed
- **Windows MSVC CI Stability**: Improved dependency resolutions bridging native MSVC integrations via junction fallbacks tracking `cc-rs` variables. Fixed linking fatal crashes (`cc-rs spaces-in-path crash`). The deployment CI flow now correctly detects Visual Build Tools directories.

---

## [1.2.0] - 2026-05-24

### Added
- **Shell Command Action**: New button action type `command` executes arbitrary shell commands — `sh -c` on macOS/Linux, `cmd /C` on Windows. Power users can now run scripts, open URLs in specific apps, or chain multiple commands from a single macro button. Includes a security warning in the UI.
- **Hex Color Input for Button Background**: A text input alongside the native color picker allows directly typing or pasting hex codes (`#RRGGBB` or 3-char shorthand `#RGB`). Two-way sync between text input and color swatch; invalid input reverts on blur.
- **App Picker Modal (Windows)**: Browse all installed applications from a searchable modal instead of manually typing exe paths. Features fuzzy search (Fuse.js), recently-used section, keyboard navigation (↑↓ Enter Esc), matched-character highlighting, and stale-while-revalidate caching for instant re-open.
- **Android Release APK Signing**: CI now produces a signed `app-universal-release.apk` using a keystore stored in GitHub Actions secrets. Gradle signing config reads from `keystore.properties` at runtime with a safe fallback to unsigned when secrets are absent. Includes `scripts/generate-keystore.sh` helper and `docs/release/signing-setup.md` guide.
- **Android Debug APK CI Workflow**: New `android-debug.yml` GitHub Actions workflow builds a debug APK on `workflow_dispatch` or push to the `releases` branch, uploading it as an artifact (14-day retention) — no tag or release required.

### Fixed
- **Drag-and-Drop Breaks After Grid Resize**: Buttons snapped back to old positions after changing row/column count because `vue-draggable-plus` held a stale array reference. Layout store now mutates the buttons array in-place (`splice`) instead of replacing it, preserving Sortable's reference identity.
- **Neon Glow Color Inaccuracy**: `hexToRgb` rejected 3-character hex shorthand (`#RGB`), falling back to cyan for all shorthand colors. Additionally, neon HSL was hardcoded to 90% saturation/58% lightness regardless of the original color. Now resolves shorthand via `normalizeHex` and clamps lightness to 45–70% / saturation to ≥60% while respecting the source hue.
- **GridButton Click Unreliable in Dashboard**: Sortable.js occasionally consumed fast clicks as drag-start events. Added `delay: 100ms` + `delayOnTouchOnly: true` + `touchStartThreshold: 5` to the draggable config, disambiguating taps from drags without affecting drag UX.

---

## [1.1.0] - 2026-05-24

### Added
- **Drag-and-Drop Grid Layout Reordering**: Integrated `vue-draggable-plus` to organize the button matrix through direct drag-and-drop actions.
- **Atomic Layout Serialization & Synchronization**: Fully implemented server-side live-saving (`layout.json`) with an atomic write mechanism (staged through a temporary file then renamed) to prevent layout corruption during unexpected crashes.
- **Instant Layout Import & Export**: Users can easily transfer layout matrices via backup JSON files through the desktop dashboard.
- **Improved macOS System Accessibility Permission Checker**:
  - Added backend probe capabilities (`probe_input_permission`) to detect `enigo` simulation access.
  - Implemented macOS Systems Accessibility Settings link helper (`open_accessibility_settings`) to guide users on granting permissions.
- **Cyberpunk Futuristic Styling Elements**: Custom stylized headers, active cyberpunk-styled custom scrollbars, glowing active states, and custom colors on grid matrices.

### Changed
- **Optimized Dynamic App Path Mapping**: Restructured preset shortcuts dynamically based on the Host OS (macOS paths vs. Windows executable binary pathways).
- **WebSocket Broadcast Robustness**: Handled client lagging recovery in WebSocket connection thread loops by resyning the layout payload automatically if client lag is detected.

---

## [1.0.0] - 2026-05-18

### Added
- **Companion WebSocket Server**: Lightweight, low-overhead TCP server running on port `8089` handling asynchronous client inputs, keeping real-time device connection alive.
- **Multi-protocol Action Execution Engine**:
  - **Keystroke / Hotkey Simulation**: Thread-safe hotkey emulation using the `enigo` library with an overarching concurrency lock (`ENIGO_LOCK`) preventing interleaved modifier states.
  - **System Media Keys Control**: Quick-actions simulating standard media playback keys (Play/Pause, Next/Prev Track, Vol Up/Down, Mute).
  - **Launch Applications**: Cross-platform system processes spawning supporting macOS (`open --`), Windows, and Linux (`xdg-open`).
- **Intelligent Local IP Discovery**: Leverages active UDP socket routing lookup without dispatching actual packets to safely discover local LAN IPv4 addresses.
- **Dashboard Configuration Editor UI**: Vue 3 + Tailwind framework layout builder, enabling labels, emojis, active custom icons (`Lucide`, `MDI`, `Material Icons` via `@iconify/vue`), and background colors customization on any key button.
- **Intuitive Modifier Hold Pre-Arm Mode**: Enables users to manually arm mod keys (`Ctrl` + `Shift` + `Alt` + `Meta`) inside the recorder interface to record shortcuts without triggering localized OS hotkey traps (Cmd+Q/Alt+F4).
- **Graceful Window Close Behavior & System Tray Integration**:
  - Implemented desktop menu-bar integration featuring "Mở Dashboard" and "Thoát".
  - Prevented window termination on clicking standard exit buttons; instead, minimizes to system tray silently preserving active server threads.
  - Added Single Instance Locking using `tauri-plugin-single-instance`.
