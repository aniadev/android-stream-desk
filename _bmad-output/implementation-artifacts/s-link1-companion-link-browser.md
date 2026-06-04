# Story 12.2 (S-LINK1): Companion link button opens default browser

Status: ready-for-dev

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

- [ ] Task 1: Types + sanitizer (AC: 1)
  - [ ] `src/types/index.ts` thêm `'link'` + `linkUrl`; `src/stores/layout.ts` sanitize/import field.
- [ ] Task 2: Dashboard editor (AC: 2)
  - [ ] Tab `Link` validate scheme + preview.
- [ ] Task 3: Backend open_link (AC: 3, 4)
  - [ ] `ButtonConfig` nhận `linkUrl` với `#[serde(rename = "linkUrl")]`.
  - [ ] `execute_logic` route `link` → `open_link`, URL as argument; toast lỗi.
- [ ] Task 4: Test
  - [ ] Parser/sanitizer test link URL; manual QA bấm từ APK/Web Client.

## Dev Notes

- **Security:** không dùng shell raw command cho link thường — giảm quoting bug + injection. URL luôn là argument riêng.
- Backend `app` path flow hiện check path tồn tại trước spawn → fail với URL. Đó là root cause.
- Liên quan S-RUST3 gate.

### References

- [Source: src/types/index.ts:1] - action model `shortcut|media|app|command`.
- [Source: src-tauri/src/lib.rs:903] - app path flow check tồn tại.
- [Source: src/stores/layout.ts] - sanitize/import.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §5]
