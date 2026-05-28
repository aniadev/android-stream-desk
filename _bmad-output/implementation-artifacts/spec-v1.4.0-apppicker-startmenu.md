---
title: 'v1.4.0 S-APP1 — App Picker quét Start Menu (hỗ trợ launcher/args, vd League of Legends)'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `list_installed_apps_windows` (`src-tauri/src/lib.rs:158-248`) đọc `DisplayIcon`/`InstallLocation` từ registry Uninstall → một `.exe` trần, KHÔNG kèm launcher + args. App cần launcher (League of Legends = `RiotClientServices.exe --launch-product=league_of_legends --launch-patchline=live`) chạy thẳng exe sẽ lỗi.

**Approach:** App Picker quét thêm **shortcut Start Menu** (`%ProgramData%\Microsoft\Windows\Start Menu\Programs` + `%AppData%\...`). `.lnk` mang `TargetPath + Arguments` đúng — resolve qua `resolve_shortcut` (`:304-335`, đã trả `"$t $a"` `:316`). Merge/dedupe với registry, ưu tiên entry có args. `appPath` chứa args sẵn hỗ trợ (`parse_exe_and_args` `:561`).

## Boundaries & Constraints

**Always:** Dedupe theo target exe; khi trùng, ưu tiên entry CÓ args (Start Menu) hơn registry trần. `appPath` full command (target + args). Windows-only.

**Ask First:** Nếu quét `.lnk` quá chậm (PowerShell COM mỗi shortcut) → cân nhắc cache/giới hạn.

**Never:** KHÔNG bỏ nguồn registry (vẫn bổ sung app không có shortcut). KHÔNG chạy launcher khi quét (chỉ đọc `.lnk`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Quét Start Menu | có LoL shortcut | InstalledApp.path = RiotClientServices.exe + args | resolve fail → skip shortcut đó |
| App có cả registry + shortcut | trùng target | giữ entry có args (shortcut) | dedupe |
| App chỉ registry | không shortcut | giữ registry entry | — |
| Chọn LoL → lưu | appPath full command | launch_application chạy đúng (parse_exe_and_args tách args) | — |
| Nhiều shortcut | quét chậm | vẫn xong (cân nhắc batch) | — |

</frozen-after-approval>

## Code Map

- `src-tauri/src/lib.rs` — hàm enumerate `.lnk` Start Menu (ProgramData + AppData) → resolve → `InstalledApp { name, path(target+args), icon }`; merge/dedupe vào `list_installed_apps_windows` (`:158-248`); kiểm `launch_application`/`parse_exe_and_args` (`:561`) xử lý args đúng.
- `src/components/AppPickerModal.vue` — hiển thị (tùy chọn) nguồn; chọn → `appPath` = full command.

## Tasks & Acceptance

**Execution:**
- [ ] `src-tauri/src/lib.rs` -- Hàm `#[cfg(target_os="windows")] fn scan_start_menu_shortcuts() -> Vec<InstalledApp>`: enumerate `*.lnk` đệ quy trong `%ProgramData%\Microsoft\Windows\Start Menu\Programs` + `%AppData%\Microsoft\Windows\Start Menu\Programs`; mỗi `.lnk` → `resolve_shortcut(lnk)` → `InstalledApp { name: file_stem, path: resolved (target+args), icon: target_exe }`. Resolve fail → skip.
- [ ] `src-tauri/src/lib.rs` -- Trong `list_installed_apps_windows`: merge `scan_start_menu_shortcuts()` vào `apps`; dedupe HashMap (`:233-243`) đổi key về **target exe** (tách phần trước `.exe` của path) và ưu tiên entry CÓ args khi trùng.
- [ ] `src-tauri/src/lib.rs` -- Xác nhận `launch_application` dùng `parse_exe_and_args` (`:561`) để tách `exe + args` từ `appPath` full command (nếu chưa, đảm bảo path có args được spawn đúng).
- [ ] `src/components/AppPickerModal.vue` -- Chọn app → `selectedButton.appPath` = `app.path` (full command). (Tùy chọn) badge nguồn "Start Menu".

**Acceptance Criteria:**
- Given App Picker, when liệt kê, then có app từ Start Menu mang target+args (vd LoL), dedupe với registry (ưu tiên có args).
- Given chọn League of Legends, when lưu + bấm button, then chạy `RiotClientServices.exe --launch-product=league_of_legends --launch-patchline=live` → vào game.
- Given app chỉ có registry, then vẫn xuất hiện.

## Design Notes

`resolve_shortcut` đã trả `"$t $a"` nên args có sẵn; chỉ cần đổi nguồn quét. `appPath` full-command + `parse_exe_and_args` (`.exe` boundary split) đã đủ launch với args. Cảnh báo hiệu năng: resolve nhiều `.lnk` qua PowerShell COM chậm — nếu cần, cache theo phiên hoặc batch một script PowerShell.

## Verification

**Commands:**
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: compile.

**Manual (Windows có LoL):** App Picker → chọn League of Legends → button mở game vào đúng client.

## Suggested Review Order

- `scan_start_menu_shortcuts` enumerate + resolve. [`lib.rs:158`](../../src-tauri/src/lib.rs#L158)
- dedupe ưu tiên args. [`lib.rs:233`](../../src-tauri/src/lib.rs#L233)
- launch với args (`parse_exe_and_args`). [`lib.rs:561`](../../src-tauri/src/lib.rs#L561)
