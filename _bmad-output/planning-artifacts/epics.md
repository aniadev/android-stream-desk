---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/breakdown-v1.4.0.md
  - _bmad-output/planning-artifacts/architecture.md
project_name: 'android-stream-desk'
version: '1.4.0'
---

# android-stream-desk v1.4.0 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **android-stream-desk v1.4.0**, decomposing requirements from `breakdown-v1.4.0.md` (8 features + 3 bug fixes, 19 stories) and technical context from `architecture.md` into implementable stories. Nguồn yêu cầu chính là breakdown-v1.4.0.md — project không có PRD riêng cho release này.

## Requirements Inventory

### Functional Requirements

FR1: Multi-page — cấu hình nhiều trang button; mỗi trang có mảng button riêng, dùng chung `rows`/`cols`. Layout cũ (single-page) tự migrate sang `pages`. (S-PAGE1, S-PAGE2)
FR2: Điều hướng trang — Client chuyển trang bằng carousel (swipe) + dot pagination; Dashboard editor chuyển trang bằng page tabs/dot CLICK. Trạng thái trang cục bộ từng client, không broadcast. (S-PAGE3, S-PAGE4)
FR3: Record chord 3 phím nhấn ĐỒNG THỜI (vd Alt+P+W) — giữ cùng lúc rồi nhả; backend press-giữ-release thay vì click tuần tự. (S-REC1, S-REC2)
FR4: Hỗ trợ PrintScreen + combo bị OS chặn (Win+Shift+S, Win+S) — qua bắt keyup, parse key mới, và manual entry/preset cho combo không record được. (S-REC1, S-REC2, S-REC3)
FR5: Upload icon tùy biến (png/jpg) từ máy — downscale + lưu data URI trong `icon`, render `<img>`. (S-IMG1)
FR6: Tự động khởi động cùng Windows (Companion) — bật/tắt trong settings Dashboard; khởi động vào tray. (S-AUTO1)
FR7: Sound + vibration khi nhấn button trên Android Client — bật/tắt độc lập trong settings. (S-FB1, S-FB2)
FR8: Reconnect ngầm — modal connect chỉ hiện lần đầu HOẶC khi chủ động ngắt; rớt giữa session → giữ grid, đổi status icon, auto-reconnect 30s không giới hạn. (S-CONN1)
FR9: Export cấu hình có chọn đường dẫn — native save dialog + ghi file atomic; sửa luôn lỗi drag-drop chết sau export. (S-EXP1, fix bug 6a+6b)
FR10: Dán shortcut app đã copy trên Windows (vd Chrome) vào ô App path → đọc clipboard file-drop → resolve `.lnk` đúng. (S-PASTE1, fix bug 6c)
FR11: App Picker hỗ trợ app cần launcher/args (vd League of Legends) — quét shortcut Start Menu mang `TargetPath + Arguments`. (S-APP1)
FR12: Build macOS (.dmg, unsigned) + Linux (.deb/.AppImage) + hướng dẫn cài (Gatekeeper macOS, deps/Wayland Linux). (S-BUILD1, S-BUILD2, S-BUILD3)
FR13: Nghiên cứu khả thi kết nối qua cáp USB (ADB reverse / USB tethering) — spike research, không implement production. (S-USB1)

### NonFunctional Requirements

NFR1: Backward compatibility — layout cũ (thiếu `pages`/`buttonKind`/`theme`) tự migrate, không mất button, không crash.
NFR2: Payload size — data URI icon bắt buộc downscale ~96px + cap ~20KB/icon để không phình WS `sync_layout` broadcast.
NFR3: Atomic file write — export ghi staging `.tmp` → rename (mirror `save_layout_config`); không để file export dở dang.
NFR4: Cross-platform Companion — chạy Windows/macOS/Linux; ghi rõ caveat Wayland (enigo hỗ trợ hạn chế, khuyến nghị X11).
NFR5: Gesture isolation — embla carousel (chỉ Client) và vue-draggable-plus (chỉ Dashboard) không bao giờ cùng vùng → không tranh chấp pointer/touch.
NFR6: Graceful fallback — vibration/audio/wakeLock/clipboard guard khi nền tảng không hỗ trợ, không crash; reconnect ngầm không spam modal/lỗi.
NFR7: Giữ ràng buộc Rust hiện có — `Enigo` không `Send` trên macOS (tạo trong hàm, không store); release modifier + base key đối xứng kể cả khi fail. Preserve khi sửa `simulate_shortcut`.
NFR8: Local-first/LAN-only giữ nguyên — không thêm dependency cloud; data URI icon đi kèm layout qua WS (không cần transport mới).

### Additional Requirements

- `tauri-plugin-dialog` (path picker export) + Rust command `export_layout_to_path` (atomic write) — KHÔNG dùng `tauri-plugin-fs` (tránh fs scope).
- `tauri-plugin-autostart` (Win/macOS/Linux) — khởi động `--hidden` vào tray.
- Clipboard file-drop reader (Windows `CF_HDROP` qua `clipboard-win` hoặc PowerShell `Get-Clipboard -Format FileDropList`) cho paste app shortcut.
- shadcn-vue Carousel (`npx shadcn-vue add carousel` → dep `embla-carousel-vue`) cho Client.
- App Picker mở rộng: enumerate `.lnk` Start Menu (`%ProgramData%` + `%AppData%`), resolve qua `resolve_shortcut`, merge/dedupe với registry (ưu tiên entry có args).
- `release.yml`: thêm job `build-macos` + `build-linux`, tag flags `-mac`/`-linux`, Linux apt deps (`libwebkit2gtk-4.1-dev libgtk-3-dev libxdo-dev libappindicator3-dev librsvg2-dev`).
- `capabilities/default.json`: thêm `dialog:default`, `autostart:default`, clipboard permissions.
- Metrics loop (v1.3.0 S-MON3) phải quét monitor button trên TẤT CẢ các trang sau khi có multi-page.
- `src/lib/clicksound.ts` (mới): AudioContext lazy init + unlock ở user-gesture đầu.

### UX Design Requirements

UX-DR1: Client carousel + dot pagination indicator — active dot = trang hiện tại, tap dot nhảy trang, swipe đổi trang; ẩn chrome khi chỉ 1 trang.
UX-DR2: Dashboard page tabs/dot CLICK — thêm (`+`) / xóa (`×`) / đổi tên trang; chuyển trang không dùng swipe (giữ Sortable drag-reorder).
UX-DR3: Client status icon 3 trạng thái — connected / reconnecting / disconnected (mở rộng HUD pill top-right), màu khác nhau; khi reconnect ngầm giữ grid + đổi icon, không modal.
UX-DR4: Client settings toggles — "Rung khi nhấn" + "Âm thanh khi nhấn" (cạnh "Luôn bật màn hình" sẵn có).
UX-DR5: Dashboard settings toggle — "Khởi động cùng Windows" trong settings modal.
UX-DR6: Icon picker — tab/nút "Tải ảnh lên" (`accept="image/png,image/jpeg"`); preview + render `<img>` cho data URI icon; cảnh báo khi vượt ~20KB.
UX-DR7: Record UI — preview chuỗi chord đang giữ realtime (vd "Alt + P + …"); preset nhóm "phím hệ thống" (Win+Shift+S, PrintScreen…) cho combo bị OS chặn.
UX-DR8: Export UX — native save dialog (default name `stream-desk-layout-<ts>.json`, filter JSON); KHÔNG toast success khi user hủy dialog.

### FR Coverage Map

FR1: Epic 1 — Multi-page data model + migration
FR2: Epic 1 — Điều hướng trang (Client carousel / Dashboard tabs)
FR3: Epic 2 — Record chord 3 phím đồng thời
FR4: Epic 2 — PrintScreen + combo bị OS chặn
FR5: Epic 4 — Upload icon tùy biến (data URI)
FR6: Epic 6 — Autostart cùng Windows
FR7: Epic 5 — Sound + vibration khi nhấn
FR8: Epic 5 — Reconnect ngầm + status icon
FR9: Epic 6 — Export chọn đường dẫn (+fix drag-drop)
FR10: Epic 3 — Dán shortcut app đã copy
FR11: Epic 3 — App Picker quét Start Menu (launcher/args)
FR12: Epic 7 — Build macOS/Linux + hướng dẫn
FR13: Epic 7 — Spike nghiên cứu kết nối USB

## Epic List

### Epic 1: Multi-page Macro Pad
Người dùng tổ chức macro thành nhiều trang, chuyển trang trên Client (carousel + swipe + dot) và Dashboard (page tabs click). Layout single-page cũ tự migrate, không mất button.
**FRs covered:** FR1, FR2
**Stories:** S-PAGE1, S-PAGE2, S-PAGE3, S-PAGE4

### Epic 2: Ghi Shortcut nâng cao
Người dùng gán được mọi tổ hợp phím cần: chord 3 phím nhấn đồng thời (Alt+P+W), PrintScreen, và combo bị OS chặn (Win+Shift+S) qua manual entry/preset.
**FRs covered:** FR3, FR4
**Stories:** S-REC1, S-REC2, S-REC3

### Epic 3: Khởi chạy App đáng tin cậy
Người dùng mở đúng app kể cả app cần launcher (League of Legends qua Riot Client) và dán shortcut Windows đã copy vào ô App path. Chung core files: `lib.rs` (app/clipboard/resolve_shortcut), `AppPickerModal.vue`, `DashboardView` paste handler.
**FRs covered:** FR10, FR11
**Stories:** S-PASTE1, S-APP1

### Epic 4: Icon button tùy biến
Người dùng upload ảnh png/jpg riêng làm icon button (downscale + data URI, hiển thị trên cả Companion và Client).
**FRs covered:** FR5
**Stories:** S-IMG1

### Epic 5: Trải nghiệm chạm Client
Client mượt và phản hồi hơn: mất kết nối giữa session reconnect ngầm (không modal/lỗi phiền, chỉ đổi status icon) + sound/vibration feedback khi nhấn. Chung core files: `ClientView.vue`, settings store, `GridArea.vue`.
**FRs covered:** FR7, FR8
**Stories:** S-CONN1, S-FB1, S-FB2

### Epic 6: Tiện ích Companion
Companion tiện dùng hơn: tự khởi động cùng Windows (vào tray) + export cấu hình có chọn đường dẫn (sửa luôn lỗi drag-drop chết sau export). Chung core files: `DashboardView` settings, `lib.rs` plugin register.
**FRs covered:** FR6, FR9
**Stories:** S-AUTO1, S-EXP1

### Epic 7: Phân phối đa nền tảng
Người dùng macOS và Linux cài & chạy được Companion (build + hướng dẫn); đánh giá khả thi kết nối qua cáp USB cho version sau.
**FRs covered:** FR12, FR13
**Stories:** S-BUILD1, S-BUILD2, S-BUILD3, S-USB1

---

## Epic 1: Multi-page Macro Pad

Người dùng tổ chức macro thành nhiều trang và chuyển trang trên cả Client lẫn Dashboard, vượt giới hạn một lưới duy nhất. Layout single-page cũ tự migrate.

### Story 1.1 (S-PAGE1): Mô hình dữ liệu multi-page + migration

As a người dùng đang có layout cũ,
I want layout của tôi được nâng cấp sang cấu trúc nhiều trang mà không mất button,
So that tôi dùng được tính năng multi-page mà không phải dựng lại layout.

**Acceptance Criteria:**

**Given** một `layout.json` cũ chỉ có mảng `buttons` (không `pages`),
**When** app nạp layout,
**Then** layout tự migrate thành `pages: [{ id, buttons }]`, không mất button, không crash,
**And** mỗi button thiếu `buttonKind` được backfill `'action'`.

**Given** layout có monitor button nằm ở nhiều trang khác nhau,
**When** metrics loop tính interval,
**Then** loop quét monitor button trên TẤT CẢ các trang (không chỉ trang đầu).

**Given** TS + Rust struct,
**When** build,
**Then** `Page` type + `pages` field tồn tại ở cả `src/types/index.ts` và Rust `Layout`, `save_layout_config` ghi `pages`.

### Story 1.2 (S-PAGE2): Quản lý trạng thái trang trong store

As a người dùng,
I want store theo dõi trang hiện tại và cho thêm/xóa/đổi tên/điều hướng trang,
So that mọi view đọc đúng trang đang xem mà không vỡ drag-reorder.

**Acceptance Criteria:**

**Given** layout nhiều trang,
**When** gọi `goNextPage()`/`goPrevPage()`,
**Then** `currentPageIndex` đổi đúng, `currentButtons` trả về button của trang hiện tại.

**Given** chỉ còn một trang,
**When** gọi `removePage`,
**Then** thao tác bị chặn (không xóa trang cuối).

**Given** đổi trang,
**When** Sortable đang bind,
**Then** không reassign mảng phá tham chiếu Sortable (remount qua `:key` hoặc splice in-place).

### Story 1.3 (S-PAGE3): Client carousel + dot pagination

As a người dùng Client Android,
I want vuốt ngang để chuyển trang và thấy dot chỉ trang hiện tại,
So that tôi chuyển nhanh giữa các trang macro bằng cảm ứng.

**Acceptance Criteria:**

**Given** layout có >1 trang,
**When** mở Client,
**Then** các trang hiển thị trong shadcn Carousel; vuốt ngang đổi trang; dot pagination active = trang hiện tại; tap dot nhảy trang.

**Given** Client là controller,
**When** chạm-giữ button,
**Then** không drag-reorder (`v-draggable` bị disable trên `GridArea`) → vuốt carousel không tranh chấp gesture.

**Given** chỉ có một trang,
**When** mở Client,
**Then** chrome điều hướng (carousel arrows/dots) ẩn.

### Story 1.4 (S-PAGE4): Dashboard page tabs + quản lý trang

As a người dùng Dashboard,
I want thêm/xóa/đổi tên trang và chuyển trang bằng tab click khi chỉnh sửa,
So that tôi cấu hình từng trang mà vẫn kéo-thả sắp xếp button được.

**Acceptance Criteria:**

**Given** Dashboard editor,
**When** click page tab/dot,
**Then** chuyển trang KHÔNG dùng swipe (Sortable drag-reorder vẫn hoạt động).

**Given** bấm thêm trang,
**When** trang mới tạo,
**Then** trang khởi tạo đủ `rows×cols` ô mặc định.

**Given** đổi `rows`/`cols`,
**When** resize,
**Then** áp cho mọi trang; xóa trang đang chọn → `currentPageIndex` chuyển về trang hợp lệ gần nhất.

---

## Epic 2: Ghi Shortcut nâng cao

Người dùng gán được mọi tổ hợp phím cần thiết, gồm chord 3 phím đồng thời, PrintScreen, và combo bị OS chặn.

### Story 2.1 (S-REC1): Backend chord đa phím + PrintScreen

As a người dùng,
I want Companion thực thi được tổ hợp nhiều phím giữ đồng thời và phím PrintScreen,
So that macro chord (Alt+P+W) và chụp màn hình chạy đúng.

**Acceptance Criteria:**

**Given** shortcut `Alt+P+W`,
**When** thực thi,
**Then** Companion giữ Alt+P+W đồng thời rồi nhả ngược (W,P,Alt); không click tuần tự.

**Given** shortcut `PrintScreen`,
**When** thực thi,
**Then** parse thành `Key::Print` và click; không còn lỗi "Unrecognized key token".

**Given** một phím trong chord press fail,
**When** lỗi xảy ra,
**Then** các phím đã giữ được release ngược trước khi bail (không kẹt phím hệ thống).

### Story 2.2 (S-REC2): Record chord đồng thời + bắt PrintScreen keyup

As a người dùng Dashboard,
I want ghi tổ hợp phím bằng cách bấm đồng thời và thấy preview,
So that tôi gán chord (Alt+P+W) và PrintScreen trực tiếp từ bàn phím.

**Acceptance Criteria:**

**Given** đang record,
**When** giữ Alt+P+W đồng thời rồi nhả,
**Then** chuỗi `Alt+P+W` được ghi (snapshot tổ hợp lớn nhất khi phím đầu nhả); preview hiển thị realtime.

**Given** đang record,
**When** nhấn PrintScreen,
**Then** bắt qua `keyup` (vì keydown không phát trên Windows) và ghi nhận.

### Story 2.3 (S-REC3): Preset cho combo bị OS chặn

As a người dùng,
I want chọn nhanh combo bị Windows chặn từ danh sách preset,
So that tôi gán Win+Shift+S / PrintScreen mà không cần record.

**Acceptance Criteria:**

**Given** combo bị OS chặn (Win+Shift+S, Win+S),
**When** mở dropdown preset "phím hệ thống",
**Then** chọn được và gán vào button mà không cần live-record.

**Given** khối manual entry,
**When** xem,
**Then** có chú thích hướng dẫn bật modifier + chọn phím + Áp dụng cho combo không record được.

---

## Epic 3: Khởi chạy App đáng tin cậy

Người dùng mở đúng app kể cả app cần launcher, và dán shortcut Windows đã copy.

### Story 3.1 (S-PASTE1): Dán shortcut app đã copy vào ô App path

As a người dùng Dashboard,
I want dán shortcut Chrome (đã copy ở Windows) vào ô App path và nó tự resolve,
So that tôi gán app nhanh mà không phải tự tìm đường dẫn .exe.

**Acceptance Criteria:**

**Given** đã copy shortcut app ở Windows (clipboard chứa file-drop, không phải text),
**When** dán vào ô App path,
**Then** đọc clipboard file-drop native → lấy `.lnk` → `resolve_shortcut` → set `appPath` đúng target.

**Given** không lấy được path khả dụng,
**When** dán thất bại,
**Then** hint UX gợi ý dùng App Picker; không crash.

### Story 3.2 (S-APP1): App Picker quét Start Menu (launcher/args)

As a người dùng muốn gán game cần launcher,
I want chọn League of Legends trong App Picker và nó chạy qua Riot Client với args đúng,
So that button mở game vào đúng client thay vì lỗi.

**Acceptance Criteria:**

**Given** App Picker mở,
**When** liệt kê app,
**Then** quét thêm `.lnk` Start Menu (ProgramData + AppData), resolve mang `target + args`, merge/dedupe với registry (ưu tiên entry có args).

**Given** chọn League of Legends,
**When** lưu button,
**Then** `appPath` = `RiotClientServices.exe --launch-product=league_of_legends --launch-patchline=live`; bấm button mở game đúng.

---

## Epic 4: Icon button tùy biến

Người dùng dùng ảnh riêng làm icon button.

### Story 4.1 (S-IMG1): Upload icon png/jpg + downscale + render

As a người dùng Dashboard,
I want upload ảnh png/jpg từ máy làm icon button,
So that tôi dùng logo/ảnh riêng mà icon pack không có.

**Acceptance Criteria:**

**Given** chọn file ảnh png/jpg trong icon picker,
**When** upload,
**Then** ảnh được downscale ~96px, nén, lưu data URI vào `icon`; cảnh báo nếu > ~20KB.

**Given** button có `icon` dạng `data:image/...`,
**When** render trên Companion và Client,
**Then** hiển thị `<img>` (thay vì `<Icon>` iconify).

**Given** import/sanitize layout,
**When** gặp `icon` data URI,
**Then** chấp nhận `data:image/(png|jpeg|webp)`; chặn scheme khác (an toàn XSS).

---

## Epic 5: Trải nghiệm chạm Client

Client mượt và phản hồi hơn khi mất kết nối và khi nhấn button.

### Story 5.1 (S-CONN1): Reconnect ngầm + gate modal

As a người dùng Client,
I want mất kết nối giữa session không bật modal/lỗi phiền mà tự kết nối lại ngầm,
So that một lần rớt mạng tạm thời không phá trải nghiệm đang dùng.

**Acceptance Criteria:**

**Given** đã connect thành công rồi Companion tắt,
**When** mất kết nối,
**Then** grid vẫn hiển thị, chỉ đổi status icon sang "reconnecting", KHÔNG modal/lỗi, auto-reconnect mỗi 30s không giới hạn.

**Given** chưa từng connect HOẶC chủ động ngắt,
**When** không connected,
**Then** hiện modal connect (hành vi cũ).

**Given** đang reconnect ngầm,
**When** Companion bật lại,
**Then** tự kết nối lại trong vòng 30s, status icon về "connected".

### Story 5.2 (S-FB1): Settings toggle + vibration khi nhấn

As a người dùng Client,
I want button rung nhẹ khi nhấn và bật/tắt được,
So that tôi có phản hồi xúc giác khi không nhìn màn hình.

**Acceptance Criteria:**

**Given** `vibrateOnClick` bật và thiết bị hỗ trợ `navigator.vibrate`,
**When** tap button,
**Then** rung nhẹ (~20ms) trước khi gửi press.

**Given** thiết bị không hỗ trợ vibration,
**When** tap,
**Then** bỏ qua an toàn (guard `'vibrate' in navigator`), không crash.

**Given** settings overlay Client,
**When** xem,
**Then** có toggle "Rung khi nhấn" + "Âm thanh khi nhấn", persist qua localStorage.

### Story 5.3 (S-FB2): Click sound khi nhấn

As a người dùng Client,
I want nghe click sound ngắn khi nhấn button và bật/tắt được,
So that tôi có phản hồi âm thanh khi thao tác.

**Acceptance Criteria:**

**Given** `soundOnClick` bật,
**When** tap button,
**Then** phát click sound ngắn qua Web Audio (`AudioContext`).

**Given** lần tương tác đầu,
**When** chạm màn hình,
**Then** AudioContext được `resume()` (unlock autoplay) → tiếng phát được từ tap sau.

**Given** trình duyệt không hỗ trợ Web Audio,
**When** tap,
**Then** no-op, không crash.

---

## Epic 6: Tiện ích Companion

Companion tiện dùng hơn: tự khởi động và export cấu hình dễ.

### Story 6.1 (S-AUTO1): Tự khởi động cùng Windows

As a người dùng Companion,
I want app tự chạy (vào tray) khi đăng nhập Windows và bật/tắt được,
So that Client kết nối được ngay mà tôi không phải mở app thủ công.

**Acceptance Criteria:**

**Given** bật toggle "Khởi động cùng Windows" trong settings Dashboard,
**When** đăng nhập Windows,
**Then** app tự chạy vào tray (arg `--hidden`), không bật cửa sổ.

**Given** mở settings,
**When** xem toggle,
**Then** trạng thái phản ánh `isEnabled()` thực tế; tắt toggle → `disable()` gỡ autostart.

### Story 6.2 (S-EXP1): Export cấu hình có chọn đường dẫn

As a người dùng Companion,
I want chọn nơi lưu file export và export không làm hỏng drag-drop,
So that tôi backup cấu hình vào đúng thư mục mong muốn mà editor vẫn dùng được.

**Acceptance Criteria:**

**Given** Companion desktop,
**When** bấm Export,
**Then** native save dialog mở (default `stream-desk-layout-<ts>.json`, filter JSON); chọn path → ghi file atomic + toast success.

**Given** user bấm Cancel trong dialog,
**When** hủy,
**Then** không ghi file, không toast success, không lỗi.

**Given** vừa export xong,
**When** kéo-thả button trong editor,
**Then** drag-drop hoạt động bình thường (fix bug 6b — không còn `<a>` injection).

---

## Epic 7: Phân phối đa nền tảng

Người dùng macOS/Linux cài & chạy được; đánh giá khả thi kết nối USB.

### Story 7.1 (S-BUILD1): Build macOS (.dmg, unsigned)

As a người dùng macOS,
I want tải bản .dmg và cài chạy được,
So that tôi dùng Companion trên Mac.

**Acceptance Criteria:**

**Given** tag release,
**When** CI chạy,
**Then** job `build-macos` sinh artifact .dmg/.app (unsigned, targets apple-darwin), upload lên release.

**Given** tag có suffix `-mac`,
**When** build flags,
**Then** chỉ build macOS.

### Story 7.2 (S-BUILD2): Build Linux (.deb/.AppImage)

As a người dùng Linux,
I want tải bản .deb/.AppImage và cài chạy được,
So that tôi dùng Companion trên Linux.

**Acceptance Criteria:**

**Given** tag release,
**When** CI chạy,
**Then** job `build-linux` cài apt deps (webkit2gtk, gtk, xdo, appindicator, rsvg), build .deb + .AppImage, upload lên release.

**Given** Linux X11,
**When** chạy macro,
**Then** enigo thực thi được (Wayland ghi rõ là caveat hạn chế).

### Story 7.3 (S-BUILD3): Tài liệu cài đặt + tag conventions

As a người dùng macOS/Linux mới,
I want hướng dẫn cài rõ ràng,
So that tôi vượt qua Gatekeeper (macOS) và deps (Linux) để chạy được.

**Acceptance Criteria:**

**Given** README,
**When** đọc,
**Then** có mục cài macOS (bỏ qua Gatekeeper: `xattr -dr com.apple.quarantine` hoặc "Open Anyway") + Linux (deps, caveat Wayland).

**Given** đầu `release.yml`,
**When** xem,
**Then** comment tag conventions cập nhật gồm `-mac`/`-linux`.

### Story 7.4 (S-USB1): Spike feasibility kết nối USB

As a maintainer,
I want báo cáo khả thi kết nối USB,
So that tôi quyết go/no-go cho version sau mà không tốn implement sớm.

**Acceptance Criteria:**

**Given** thiết bị thật,
**When** thử `adb reverse tcp:8089 tcp:8089`,
**Then** Client connect `127.0.0.1:8089` thành công (PoC).

**Given** spike hoàn tất,
**When** kết thúc,
**Then** ghi `research-usb-connection.md` (các hướng, rào cản, khuyến nghị); KHÔNG sửa code production.
