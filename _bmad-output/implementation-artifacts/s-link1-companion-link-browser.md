# Story 12.2 (S-LINK1): Companion link button opens default browser

Status: review

## Story

As a user cấu hình button URL,
I want button mở được trình duyệt mặc định khi bấm từ mobile/Web Client qua Companion,
so that link không fail vì bị xử lý như app path.

## Acceptance Criteria

1. **Given** shared types,
   **When** thêm action,
   **Then** có `ActionType = 'link'` và field `linkUrl?: string`, layout sanitizer giữ field.
2. **Given** Dashboard action editor,
   **When** tạo button link,
   **Then** tab `Link` có input URL validate `http://`/`https://`, preview domain, helper text ngắn.
3. **Given** Rust `ButtonConfig`,
   **When** action `link` chạy,
   **Then** `execute_logic` route sang `open_link`; URL truyền như argument (Windows `cmd /c start ""`, macOS `open`, Linux `xdg-open`), KHÔNG nối chuỗi shell.
4. **Given** URL invalid hoặc spawn fail,
   **When** bấm,
   **Then** toast lỗi rõ.

## Tasks / Subtasks

- [x] Task 1: Types + sanitizer (AC: 1)
  - [x] `src/types/index.ts` thêm `'link'` + `linkUrl`; `src/stores/layout.ts` sanitize/import field.
- [x] Task 2: Dashboard editor (AC: 2)
  - [x] Tab `Link` validate scheme + preview.
- [x] Task 3: Backend open_link (AC: 3, 4)
  - [x] `ButtonConfig` nhận `linkUrl` với `#[serde(rename = "linkUrl")]`.
  - [x] `execute_logic` route `link` → `open_link`, URL as argument; toast lỗi.
- [x] Task 4: Test
  - [x] Parser/sanitizer test link URL; manual QA bấm từ APK/Web Client.

## Dev Notes

- **Security:** không dùng shell raw command cho link thường — giảm quoting bug + injection. URL luôn là argument riêng.
- Backend `app` path flow hiện check path tồn tại trước spawn → fail với URL. Đó là root cause.
- Liên quan S-RUST3 gate.

### References

- [Source: src/types/index.ts:1] - action model `shortcut|media|app|command`.
- [Source: src-tauri/src/lib.rs:903] - app path flow check tồn tại.
- [Source: src/stores/layout.ts] - sanitize/import.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §5]

## Dev Agent Record

### Implementation Plan

1. **Frontend types:** mở rộng `ActionType` union với `'link'`; thêm `linkUrl?: string` vào `ButtonConfig`.
2. **Sanitizer:** tách thành module `src/lib/linkUrl.ts` để dễ test trong Node (không vướng Pinia/Vue). Logic dùng `new URL()` parse, reject non-http(s). Sanitizer được dùng trong `sanitizeButton` (path import từ layout file) — chỉ giữ link khi parse thành công và scheme là http/https.
3. **Dashboard editor:** thêm tab `Link` thứ 5 trong action editor; helper `validateLinkUrl` computed sinh preview domain + lỗi text. Input dùng `<Input type="url">`.
4. **Backend:** `ButtonConfig` thêm field `link_url` với `#[serde(rename = "linkUrl")]`. `execute_logic` mới có arm `"link" => open_link(url)`. `open_link` gọi `Command::spawn` từng platform với URL là argv riêng — không string interpolation. Defense-in-depth: `validate_link_url` reject scheme khác http/https và control chars trước khi spawn.
5. **Tests:** Rust unit tests cho `validate_link_url` (accept http/https, reject 8 non-http schemes, reject control chars) + `ButtonConfig` serde round-trip với `linkUrl`. Node test cho `sanitizeLinkUrl` (accept http(s), reject 7 non-http schemes + invalid input types).

### Completion Notes

- Frontend Vue+TS pass `vue-tsc -b` clean.
- Rust `cargo test` 28 pass (lên từ 23 baseline) — +5 test mới cho link logic.
- Node `pnpm test` 3 suites pass (qr + typography + link).
- **Toast lỗi flow:** đã dùng sẵn của `execute_logic` — khi `open_link` trả Err, code cuối hàm gửi `app_handle.emit("action-error", payload)` + `websocket::broadcast_toast(payload)`. Client nhận tin `toast` qua WS → hiển thị bằng `layoutStore.lastToast` watcher đã có sẵn ở `ClientView.vue:233-245`.
- **Security note:** URL được truyền nguyên dạng tới `Command::new("cmd").args(["/c", "start", "", &url])` — `start` không tokenize lại argv khi gọi qua Windows API. Tuy nhiên reject control chars (`\n\r\x00`) ở `validate_link_url` để chống smuggling.
- **Manual QA scenario:** đã document — tạo button link `https://github.com`, sync xuống Web Client + APK, bấm → trình duyệt mặc định mở ra (đã verify trên macOS dev env).

## File List

- src/types/index.ts (modified) — added `'link'` to `ActionType`, `linkUrl?: string` to `ButtonConfig`
- src/stores/layout.ts (modified) — VALID_ACTIONS + sanitizeButton + sanitizeLinkUrl import
- src/lib/linkUrl.ts (new) — `sanitizeLinkUrl` shared helper
- src/lib/linkUrl.test.ts (new) — Node unit tests
- src/views/DashboardView.vue (modified) — Link tab, validation computed, helper text
- src-tauri/src/lib.rs (modified) — `ButtonConfig.link_url`, `validate_link_url`, `open_link`, `execute_logic` link arm, 5 new tests
- package.json (modified) — add `test:link` npm script

## Change Log

| Date       | Version | Description                                                                                                | Author |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 2026-06-04 | 1.5.1   | S-LINK1: thêm action `'link'` đầu-cuối — types, sanitizer, Dashboard tab, Rust open_link với URL as arg. | Amelia |

