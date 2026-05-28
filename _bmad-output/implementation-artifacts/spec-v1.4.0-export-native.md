---
title: 'v1.4.0 S-EXP1 — Export native qua Tauri dialog (fix bug 6a chọn path + 6b drag-drop chết sau export)'
type: 'bugfix'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `exportLayout` (`src/stores/layout.ts:231-243`) dùng hack download của browser — tạo `Blob`, `<a download>`, `appendChild(a)` → `a.click()` → `removeChild(a)`. Hai bug cùng một gốc rễ:
- **Bug 6a:** `a.download` đẩy file thẳng về thư mục Downloads mặc định — KHÔNG có hộp thoại chọn nơi lưu.
- **Bug 6b:** Sau khi export, kéo-thả button trong grid editor Dashboard chết. Giả thuyết: chèn `<a>` + `a.click()` (download lập trình) trong WebView làm gián đoạn trạng thái pointer/listener mà `vue-draggable-plus` (Sortable) bám vào ở `DashboardView.vue:1344`.

**Approach:** Trên context desktop (Companion), thay hack DOM-anchor bằng **save dialog native của Tauri** (`tauri-plugin-dialog` → `save()` lấy đường dẫn user chọn) + một **Tauri command Rust mới** `export_layout_to_path` ghi file atomic (tmp → rename, mirror `save_layout_config` `:62-88`). Loại bỏ hoàn toàn việc chèn `<a>` ⇒ fix 6a (có path picker) VÀ 6b (không còn DOM mutation phá Sortable) cùng lúc. Context web (không Tauri) giữ fallback blob+anchor cũ.

**Không dùng `tauri-plugin-fs`:** ghi file trong Rust (std/tokio `fs`) tránh hẳn cấu hình scope fs cho đường dẫn tùy ý user chọn — vừa atomic, vừa nhất quán với `save_layout_config` sẵn có. Chỉ cần `tauri-plugin-dialog` cho path picker.

## Boundaries & Constraints

**Always:** Ghi file atomic (stage `.tmp` → rename) như `save_layout_config`. `exportLayout` phải báo được "user hủy dialog" để KHÔNG hiện toast "đã xuất". Đường dẫn ghi là do user chọn qua native save dialog (trusted input).

**Ask First:** Nếu cần export thêm định dạng ngoài JSON, hoặc cần ghi qua `tauri-plugin-fs` thay vì Rust command.

**Never:** KHÔNG bỏ nhánh fallback blob+anchor cho context web (không `window.__TAURI_INTERNALS__`). KHÔNG đổi format JSON export (vẫn `JSON.stringify(layout, null, 2)`). KHÔNG đụng `importLayout`. KHÔNG ghi đè `save_layout_config` (đó là layout.json runtime, khác với file export user chọn).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Export trên Companion (desktop) | User bấm Export → chọn path `D:\backup\layout.json` | Native dialog mở; ghi file atomic vào path đã chọn; toast "Đã xuất cấu hình ra file JSON." | Lỗi ghi → command trả `Err` → toast `Export lỗi: ...` |
| User hủy save dialog | Bấm Cancel trong dialog | KHÔNG ghi file, KHÔNG toast success, không lỗi | `save()` trả `null` → `exportLayout` trả `false` |
| Drag-drop sau export (bug 6b) | Export xong → kéo button trong editor | Kéo-thả vẫn hoạt động bình thường (không còn `<a>` injection) | — |
| Export trên context web (không Tauri) | `window.__TAURI_INTERNALS__` undefined | Fallback blob+anchor cũ → tải về Downloads | catch → toast lỗi |
| Path trùng file đã tồn tại | User chọn đè file cũ | Native dialog tự cảnh báo overwrite; ghi đè atomic | — |
| layout rỗng/bình thường | bất kỳ layout hợp lệ | `JSON.stringify(layout, null, 2)` ghi đúng | — |

</frozen-after-approval>

## Code Map

- `src-tauri/Cargo.toml` — thêm `tauri-plugin-dialog = "2"` vào `[dependencies]`.
- `src-tauri/src/lib.rs` — đăng ký `tauri_plugin_dialog::init()` trong `run()`; thêm command `export_layout_to_path(path, layout)` (atomic write); thêm vào `generate_handler!`.
- `src-tauri/capabilities/default.json` — thêm permission `"dialog:default"`.
- `package.json` — thêm `@tauri-apps/plugin-dialog`.
- `src/stores/layout.ts` — `exportLayout` đổi sang `async`, trả `Promise<boolean>`: nhánh Tauri dùng `save()` + `invoke('export_layout_to_path')`; nhánh web giữ blob+anchor. Trả `false` khi user hủy.
- `src/views/DashboardView.vue` — `handleExport` (`:552-567`) đổi sang `async`, `await exportLayout()`, chỉ toast success khi trả `true`.

## Tasks & Acceptance

**Execution:**
- [ ] `src-tauri/Cargo.toml` -- Thêm `tauri-plugin-dialog = "2"` vào block `[dependencies]` (sau `tauri-plugin-single-instance`, dòng ~19). Cross-platform — không cần gate target.
- [ ] `package.json` -- Thêm `"@tauri-apps/plugin-dialog": "^2"` vào `dependencies`; chạy `pnpm install`.
- [ ] `src-tauri/src/lib.rs` -- (1) Trong `run()` sau khối `#[cfg(desktop)]` single-instance (dòng ~690), thêm: `builder = builder.plugin(tauri_plugin_dialog::init());`. (2) Thêm command mới:
  ```rust
  #[tauri::command]
  async fn export_layout_to_path(path: String, layout: serde_json::Value) -> Result<(), String> {
      let serialized = serde_json::to_string_pretty(&layout).map_err(|e| e.to_string())?;
      let final_path = std::path::PathBuf::from(&path);
      let tmp_path = final_path.with_extension("json.tmp");
      tokio::fs::write(&tmp_path, serialized)
          .await
          .map_err(|e| format!("Failed staging export: {}", e))?;
      tokio::fs::rename(&tmp_path, &final_path)
          .await
          .map_err(|e| format!("Failed committing export: {}", e))?;
      Ok(())
  }
  ```
  (3) Thêm `export_layout_to_path` vào danh sách `tauri::generate_handler![...]` (`:693-702`).
- [ ] `src-tauri/capabilities/default.json` -- Thêm `"dialog:default"` vào mảng `permissions` (cạnh `"core:default"`).
- [ ] `src/stores/layout.ts` -- Đổi `exportLayout` thành `async (): Promise<boolean>`:
  ```ts
  const exportLayout = async (): Promise<boolean> => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultName = `stream-desk-layout-${ts}.json`;
    // @ts-ignore
    if (window.__TAURI_INTERNALS__) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path) return false; // user hủy
      await invoke('export_layout_to_path', { path, layout: layout.value });
      return true;
    }
    // web fallback: blob + anchor (GIỮ NGUYÊN)
    const json = JSON.stringify(layout.value, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  };
  ```
- [ ] `src/views/DashboardView.vue` -- Đổi `handleExport` (`:552-567`) sang `async`; `const ok = await layoutStore.exportLayout();` — chỉ set `lastToast` success khi `ok === true`; giữ `catch` cho toast lỗi.

**Acceptance Criteria:**
- Given Companion (desktop) đang chạy, when user bấm Export, then native save dialog mở cho chọn đường dẫn + tên file (default `stream-desk-layout-<ts>.json`).
- Given user chọn path và xác nhận, then file JSON ghi atomic vào đúng path đó + toast "Đã xuất cấu hình ra file JSON."
- Given user bấm Cancel trong save dialog, then không ghi file, không toast success, không lỗi.
- Given user vừa export xong, when kéo-thả button trong grid editor Dashboard, then thao tác kéo-thả hoạt động bình thường (regression cho bug 6b).
- Given context web (không Tauri), when export, then fallback blob+anchor tải file về Downloads như cũ.

## Design Notes

Ghi file trong Rust thay vì `tauri-plugin-fs`: đường dẫn user chọn nằm ngoài mọi scope fs mặc định; dùng `tauri-plugin-fs` sẽ phải mở rộng scope (rủi ro bảo mật + fiddly). Rust command là trusted surface sẵn có → ghi std/tokio `fs` đơn giản, atomic, nhất quán `save_layout_config`.

`with_extension("json.tmp")`: với path `…/layout.json` → tmp `…/layout.json.tmp` (giống pattern hiện tại). Trường hợp user chọn tên không có `.json` (filter ép `.json` nên hiếm) vẫn ra `<name>.json.tmp` hợp lệ.

`exportLayout` trả `boolean` (không phải void) là cần thiết để phân biệt "ghi thành công" vs "user hủy" — nếu không, toast sẽ báo success sai khi user Cancel.

Fix 6b là hệ quả gián tiếp: bug do `<a>`+`a.click()` injection; nhánh desktop mới không chèn DOM nên Sortable không bị phá. Cần verify thủ công (không có test tự động cho drag).

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: compile sạch; `exportLayout` async typed `Promise<boolean>`, `handleExport` async.
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: `tauri-plugin-dialog` resolve, `export_layout_to_path` compile, có trong generate_handler.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` -- expected: không warning mới.

**Manual (Companion desktop — bắt buộc cho bug 6b):**
- `pnpm tauri dev` → Dashboard → Export → chọn path → xác nhận file ghi đúng nơi.
- Sau export, kéo-thả button trong editor → xác nhận còn hoạt động.
- Export → Cancel → xác nhận không toast success.

## Suggested Review Order

**Rust export command + plugin**
- `export_layout_to_path`: atomic tmp→rename, mirror `save_layout_config`. [`lib.rs` — command mới gần `save_layout_config:62`](../../src-tauri/src/lib.rs#L62)
- Đăng ký `tauri_plugin_dialog::init()` + thêm vào `generate_handler!`. [`lib.rs:693`](../../src-tauri/src/lib.rs#L693)
- Capability `dialog:default`. [`capabilities/default.json`](../../src-tauri/capabilities/default.json)

**Frontend export path**
- `exportLayout` async + nhánh Tauri (`save()` + invoke) / fallback web. [`layout.ts:231`](../../src/stores/layout.ts#L231)
- `handleExport` async + toast theo kết quả (success chỉ khi `ok`). [`DashboardView.vue:552`](../../src/views/DashboardView.vue#L552)

**Regression (bug 6b)**
- Xác nhận grid editor draggable (`v-draggable`) còn hoạt động sau export. [`DashboardView.vue:1344`](../../src/views/DashboardView.vue#L1344)
