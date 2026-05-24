---
title: 'App Picker Modal — v1.2.0 F5'
type: 'feature'
created: '2026-05-24'
status: 'in-progress'
baseline_commit: '08c946e'
context: ['_bmad-output/planning-artifacts/breakdown-v1.2.0.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Action `app` hiện yêu cầu người dùng tự gõ tay đường dẫn file `.exe` (ví dụ `C:\Program Files\Mozilla Firefox\firefox.exe`). Windows app phân tán nhiều thư mục — người dùng không nhớ chính xác path, phải mở Explorer mò, dễ sai → command fail silently. macOS/Linux chưa có enum (v1.3+).

**Approach:** Bổ sung Tauri command `list_installed_apps` duyệt Windows registry Uninstall keys (3 hive, filter junk, dedupe) + Vue modal `AppPickerModal` với search substring cơ bản → click chọn gán `appPath`. UX nâng cao: stale-while-revalidate cache, Fuse.js fuzzy search, recently used 5 app, highlight matched chars, keyboard nav ↑↓Enter Esc.

## Boundaries & Constraints

**Always:**
- `list_installed_apps` chỉ chạy trên Windows; macOS/Linux trả `Vec::new()` + log warn.
- Reserve EXE path qua `DisplayIcon` (strip `,N` index) → fallback `InstallLocation` dò file `.exe` lớn nhất.
- Filter junk: bỏ qua SystemComponent=1, DisplayName chứa pattern bảo trì/hotfix/KB, không resolve được EXE.
- Dedupe theo `path` canonical lowercase. Sort A-Z name.
- Modal mở → auto-focus search input. Esc đóng. Click/navigate Enter → emit `select(path)` + đóng.
- `localStorage` key `app-picker:apps` cho cache và `app-picker:recents` cho recently used.
- Trả path thô `.exe` hoặc `.ico` trong field `icon` (không extract binary trong v1.2.0).

**Ask First:**
- Thay đổi dependency `fuse.js` sang thư viện khác (fuzzysort, minisearch) nếu bundle size là vấn đề.
- Điều chỉnh threshold Fuse.js (mặc định 0.4) hoặc số lượng recents (mặc định 5).
- Bổ sung virtual scroll nếu danh sách >300 entry (đo thực tế trước).

**Never:**
- Không enum MS Store / UWP / AppX package (scope v1.3+).
- Không extract binary icon từ EXE (trả path thô, frontend dùng generic icon + best-effort `.ico`).
- Không làm picker riêng cho macOS/Linux (stub empty — scope v1.3+).
- Không render icon binary trong modal (dùng `lucide:app-window` mặc định).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Registry scan bình thường | 3 hive Uninstall có 150 entry | Vec<InstalledApp> ~100 sau filter, sort A-Z | N/A |
| Registry key thiếu DisplayName | Key có DisplayIcon nhưng DisplayName rỗng | Skip entry (DisplayName empty → bỏ qua) | Không crash; continue loop |
| DisplayIcon trỏ đến file không tồn tại | `C:\Program Files\OldApp\removed.exe` | Thử fallback InstallLocation → nếu vẫn không resolve `.exe` → skip entry | Không crash; continue loop |
| Hai entry trùng path khác display name | HKLM + HKCU cùng path | Giữ entry có publisher nếu trùng; dedupe theo path lowercase | N/A |
| Lần đầu mở modal (chưa cache) | `localStorage` trống | Hiển thị spinner → invoke `list_installed_apps` → render list | Hiển thị toast "Không tải được danh sách app" nếu invoke fail |
| Lần thứ hai mở modal (có cache) | Cache hợp lệ trong localStorage | Render cache instant + invoke background → diff → update nếu khác | Flash badge "Updated" 2s nếu khác |
| Gõ `chrm` trong search | Fuzzy Fuse.js threshold 0.4 | Match "Google Chrome" — highlight "Ch"+"r" và "m" | N/A |
| Nhấn Enter khi có 1 kết quả | selectedIndex=0 | Emit select(path) + đóng modal | N/A |
| Nhấn Enter khi không có kết quả | filteredApps.length=0 | Không làm gì | N/A |
| Click chọn app | Hành động select | Gán `editingButton.appPath = path` + lưu vào recents (max 5, MRU front) + đóng modal | N/A |

</frozen-after-approval>

## Code Map

- `src-tauri/Cargo.toml` — thêm `winreg` dep Windows-only
- `src-tauri/src/lib.rs` — `InstalledApp` struct + `list_installed_apps` Tauri command + `list_installed_apps_windows()` helper + register vào `generate_handler!`
- `src/types/index.ts` — `InstalledApp` interface
- `src/components/AppPickerModal.vue` — component modal mới (S-APP2 basic + S-APP3 UX)
- `src/components/HighlightedText.vue` — component render text với indices highlight
- `src/views/DashboardView.vue` — thêm nút "Browse installed apps..." trong tab `app` + import AppPickerModal
- `package.json` — thêm `fuse.js@^7` dependency

## Tasks & Acceptance

**Execution:**

- [x] `src-tauri/Cargo.toml` — thêm `winreg = "0.52"` vào `[target.'cfg(target_os = "windows")'.dependencies]` — cần để đọc Windows registry Uninstall keys
- [x] `src-tauri/src/lib.rs` — tạo struct `InstalledApp` (name, path, icon?, publisher?), impl `list_installed_apps_windows()` duyệt 3 registry hive + filter junk + resolve EXE path + dedupe + sort, tạo `#[tauri::command] fn list_installed_apps()` với cfg gate Windows/macOS-Linux stub, đăng ký vào `generate_handler![]` — core backend enumeration
- [x] `src/types/index.ts` — thêm `InstalledApp` interface mirror Rust struct — type safety cho frontend invoke
- [x] `package.json` — thêm `"fuse.js": "^7.1.0"` vào dependencies, chạy `pnpm install` — cần cho fuzzy search
- [x] `src/components/HighlightedText.vue` — tạo component nhận props `text: string, indices: [number, number][]`, render từng ký tự với class highlight cho index trong range — dùng chung cho tên app và publisher
- [x] `src/components/AppPickerModal.vue` — tạo modal với: cache stale-while-revalidate (localStorage `app-picker:apps`), Fuse.js fuzzy search (threshold 0.4, keys name+publisher), recently used (localStorage `app-picker:recents`, max 5, section "Recent"), keyboard nav (↑↓ Enter Esc), HighlightedText cho matched chars, publisher subtitle, refresh button, styling cyber theme, props `modelValue` + emit `select` — modal duyệt app hoàn chỉnh
- [x] `src/views/DashboardView.vue` — trong tab `app` của edit panel, thêm nút "Browse installed apps..." mở AppPickerModal, import component, handle `@select` gán `editingButton.appPath = path` — tích hợp Dashboard

**Acceptance Criteria:**

- Given Companion chạy trên Windows, when mở Dashboard → edit một button → tab "app" → click "Browse installed apps...", then modal mở ra với danh sách app sau ~1-2s loading
- Given modal đã mở, when gõ `vsc` vào search, then kết quả hiển thị "Visual Studio Code" và các ký tự khớp được highlight
- Given modal đã mở, when nhấn ↓↓ để chọn app thứ 3 rồi Enter, then `appPath` được gán đúng path → modal đóng → input hiển thị path mới
- Given đã chọn "Google Chrome" trước đó, when mở lại modal (không gõ gì), then section "Recent" hiển thị Google Chrome ở đầu, phía dưới "All apps"
- Given macOS/Linux, when invoke `list_installed_apps`, then trả về mảng rỗng + log warn — không crash, không treo

## Design Notes

**Registry hive path:**
```
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
```

**Junk filter regex:** `(?i)(update for|hotfix|security update|redistributable|^KB\d+)`

**EXE resolve priority:**
1. `DisplayIcon` → strip `,-?\d+$` regex → check endsWith `.exe` + file exists
2. Fallback: `InstallLocation` → `read_dir` filter `.exe` → pick file lớn nhất (bytes)
3. Skip nếu cả 2 không resolve được

**Fuse.js config (trong modal):**
```ts
new Fuse(apps.value, {
  keys: ['name', 'publisher'],
  threshold: 0.4,
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 1,
})
```

## Verification

**Commands:**
- `cargo check --manifest-path src-tauri/Cargo.toml` — expected: biên dịch thành công (Windows)
- `pnpm run build` — expected: build Vue frontend không lỗi
- `pnpm tauri dev` — expected: app chạy, Dashboard mở được, modal App Picker hoạt động

**Manual checks (nếu không có CLI):**
- Mở Dashboard → edit button → tab app → click "Browse installed apps..." → verify modal hiển thị danh sách app
- Gõ `chrm` → verify Google Chrome match + highlight
- Chọn một app qua Enter → verify `appPath` đúng trong input
- Mở lại modal → verify hiển thị instant từ cache
- Verify Recent section hiển thị app vừa chọn

## Spec Change Log

