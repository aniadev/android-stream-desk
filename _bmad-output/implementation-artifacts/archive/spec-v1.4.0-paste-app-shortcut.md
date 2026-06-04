---
title: 'v1.4.0 S-PASTE1 — Dán shortcut app đã copy (Windows) vào ô App path (fix bug 6c)'
type: 'bugfix'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Copy shortcut app trên Windows (chuột phải Chrome → Copy) đặt clipboard dạng **file-drop** (`CF_HDROP`), không phải text. `handleAppPathPaste` (`DashboardView.vue:120-147`) chỉ đọc `e.clipboardData.getData('text')` → rỗng hoặc tên hiển thị → nhánh `.lnk` (`:126`) và strip-quote (`:142`) không kích hoạt → paste no-op. `clipboardData.files[0]` cũng không cho đường dẫn tuyệt đối (WebView ẩn path).

**Approach:** Thêm Tauri command Rust `read_clipboard_files()` đọc file-drop list native (Windows `CF_HDROP`). Khi `getData('text')` không có path khả dụng → invoke command → lấy `.lnk`/`.exe` đầu → resolve qua `resolve_shortcut` (`:304-335`) đã có → set `appPath`.

## Boundaries & Constraints

**Always:** Giữ nhánh text hiện tại (paste path dạng text vẫn chạy). Command Windows-only; nền khác trả `Err` rõ ràng.

**Ask First:** Nếu muốn hỗ trợ drag-drop file `.lnk`/`.exe` vào ô (bonus, có thể tách story).

**Never:** KHÔNG bỏ App Picker (đường chính). KHÔNG đọc nội dung file bừa — chỉ lấy đường dẫn từ clipboard file-drop (trusted: user tự copy).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Copy shortcut Chrome → dán | clipboard CF_HDROP | read_clipboard_files → `Chrome.lnk` → resolve → appPath = chrome.exe | resolve Err → hint dùng App Picker |
| Dán path text `.lnk` | text `C:\..\x.lnk` | nhánh cũ resolve_shortcut (giữ `:126-139`) | — |
| Dán path .exe có quote | `"C:\..\x.exe"` | strip quote (giữ `:142-146`) | — |
| Clipboard rỗng/không file | text rỗng + no files | no-op + hint | — |
| Không phải Windows | macOS/Linux | command Err "not supported" → fallback hint | — |

</frozen-after-approval>

## Code Map

- `src-tauri/src/lib.rs` — command `read_clipboard_files() -> Result<Vec<String>, String>` (Windows CF_HDROP); thêm vào `generate_handler!` (`:693-702`).
- `src-tauri/Cargo.toml` — `clipboard-win` (windows target deps `:31`) HOẶC dùng PowerShell `Get-Clipboard -Format FileDropList` (không thêm crate).
- `src/views/DashboardView.vue` — `handleAppPathPaste` (`:120-147`) fallback invoke khi text không có path.

## Tasks & Acceptance

**Execution:**
- [ ] `src-tauri/Cargo.toml` -- (Tùy chọn A) thêm `clipboard-win = "5"` vào `[target.'cfg(target_os = "windows")'.dependencies]` (`:31`). (Tùy chọn B — không thêm crate) dùng PowerShell trong command.
- [ ] `src-tauri/src/lib.rs` -- Command `#[tauri::command] fn read_clipboard_files() -> Result<Vec<String>, String>`: `#[cfg(target_os="windows")]` đọc CF_HDROP (clipboard-win `get_clipboard(formats::FileList)`) hoặc PowerShell `Get-Clipboard -Format FileDropList` (CREATE_NO_WINDOW như `resolve_shortcut` `:309-321`), trả list path tuyệt đối. `#[cfg(not(windows))]` → `Err("read_clipboard_files only on Windows")`. Thêm vào `generate_handler!`.
- [ ] `src/views/DashboardView.vue` -- `handleAppPathPaste` (`:120-147`): sau khi `text` rỗng/không phải path (`!text.toLowerCase().endsWith('.lnk') && !text.includes('\\')`): `e.preventDefault()` → `const files = await invoke<string[]>('read_clipboard_files')` → lấy phần tử đầu kết thúc `.lnk`/`.exe` → nếu `.lnk` thì `resolve_shortcut` → set `appPath` + `saveButtonSettings()`; nếu rỗng → `appPathHint = '✗ Hãy dùng App Picker'`.

**Acceptance Criteria:**
- Given copy shortcut Chrome ở Windows, when dán vào ô App path, then đọc file-drop → resolve → appPath là chrome.exe đúng.
- Given dán path text `.lnk`/`.exe`, then nhánh cũ vẫn chạy.
- Given clipboard không có file, then no-op + hint dùng App Picker, không crash.
- Given không phải Windows, then command Err được nuốt gọn → hint, không vỡ UI.

## Design Notes

Đọc file-drop trong Rust vì WebView ẩn path tuyệt đối của `File`. CF_HDROP/`FileDropList` cho path thật. App Picker (S-APP1) vẫn là đường khuyến nghị; paste là tiện lợi bổ sung.

## Verification

**Commands:**
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: command compile (Windows path).
- `pnpm vue-tsc --noEmit` -- expected: invoke typed.

**Manual (Windows):** copy shortcut Chrome từ Start Menu → dán ô App path → ra chrome.exe.

## Suggested Review Order

- `read_clipboard_files` CF_HDROP/PowerShell. [`lib.rs`](../../src-tauri/src/lib.rs)
- `handleAppPathPaste` fallback. [`DashboardView.vue:120`](../../src/views/DashboardView.vue#L120)
