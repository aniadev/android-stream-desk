---
title: 'v1.4.0 S-AUTO1 — Tự khởi động cùng Windows + Dashboard toggle'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Companion là server LAN — user muốn nó chạy sẵn khi bật máy để Client kết nối ngay. Hiện không có autostart (grep → none). Window close đã hide-to-tray (`lib.rs:739-746`), tray "Thoát" mới thoát → phù hợp chạy nền.

**Approach:** `tauri-plugin-autostart` (Win/macOS/Linux). Đăng ký với arg `--hidden` (khởi động vào tray, không bật cửa sổ). Toggle "Khởi động cùng Windows" trong settings modal Dashboard → `enable()`/`disable()`; đọc `isEnabled()` để phản ánh trạng thái. Desktop-only.

## Boundaries & Constraints

**Always:** Khởi động `--hidden` vào tray. Toggle phản ánh `isEnabled()` thực tế (OS persist, không tự đoán). Desktop-only (`#[cfg(desktop)]`).

**Ask First:** Nếu cần khởi động hiện cửa sổ (mặc định CHỐT vào tray ẩn).

**Never:** KHÔNG bật autostart mặc định mà không user chọn. KHÔNG đăng ký plugin trên mobile.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bật toggle | enable() | ghi registry Run; lần đăng nhập sau app tự chạy vào tray | enable Err → toast |
| Tắt toggle | disable() | gỡ entry Run | — |
| Mở settings | isEnabled() | toggle phản ánh trạng thái thực | — |
| Khởi động bởi OS | arg --hidden | app vào tray, không bật window | — |
| Mobile build | android/ios | plugin không đăng ký, không lỗi | cfg gate |

</frozen-after-approval>

## Code Map

- `src-tauri/Cargo.toml` — `tauri-plugin-autostart = "2"`.
- `package.json` — `@tauri-apps/plugin-autostart`.
- `src-tauri/src/lib.rs` — `run()` (`:679-690`) đăng ký plugin (`#[cfg(desktop)]`); xử lý arg `--hidden` (window khởi tạo ẩn nếu có flag).
- `src-tauri/capabilities/default.json` — `"autostart:default"`.
- `src/views/DashboardView.vue` — settings modal: toggle "Khởi động cùng Windows" + `onMounted` đọc `isEnabled()`.

## Tasks & Acceptance

**Execution:**
- [ ] `src-tauri/Cargo.toml` -- Thêm `tauri-plugin-autostart = "2"` vào `[dependencies]`.
- [ ] `package.json` -- Thêm `"@tauri-apps/plugin-autostart": "^2"`; `pnpm install`.
- [ ] `src-tauri/src/lib.rs` -- Trong `run()` khối `#[cfg(desktop)]` (`:681-690`): `builder = builder.plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--hidden"])));`. Nếu app nhận arg `--hidden` lúc khởi động → window khởi tạo ẩn (hoặc hide ngay trong setup); tray vẫn lên.
- [ ] `src-tauri/capabilities/default.json` -- Thêm `"autostart:default"` vào `permissions`.
- [ ] `src/views/DashboardView.vue` -- Settings modal (`settingsOpen`): toggle "Khởi động cùng Windows". `onMounted`/khi mở settings: `const { isEnabled } = await import('@tauri-apps/plugin-autostart'); autostartOn.value = await isEnabled();`. Toggle change: `enable()`/`disable()` từ cùng module; catch → toast lỗi.

**Acceptance Criteria:**
- Given bật toggle, when đăng nhập Windows lại, then app tự chạy vào tray (không bật cửa sổ).
- Given mở settings, when xem toggle, then phản ánh `isEnabled()` thực.
- Given tắt toggle, then `disable()` gỡ autostart.
- Given mobile build, then plugin không đăng ký, build không lỗi.

## Design Notes

`--hidden` để khởi động vào tray — tận dụng hide-to-tray sẵn có. OS persist trạng thái (registry Run trên Windows) nên UI đọc `isEnabled()` thay vì tự lưu. macOS dùng LaunchAgent; Linux .desktop autostart (plugin tự xử lý) — khớp Epic 7 builds.

## Verification

**Commands:**
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: plugin resolve.
- `pnpm vue-tsc --noEmit` -- expected: sạch.

**Manual (Windows):** bật toggle → restart/đăng nhập lại → app trong tray; tắt toggle → không tự chạy.

## Suggested Review Order

- Đăng ký plugin + arg --hidden. [`lib.rs:681`](../../src-tauri/src/lib.rs#L681)
- capability autostart. [`capabilities/default.json`](../../src-tauri/capabilities/default.json)
- Dashboard toggle + isEnabled. [`DashboardView.vue`](../../src/views/DashboardView.vue)
