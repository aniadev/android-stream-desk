# Story 11.1 (S-CLIENT1): Client display fit mode setting

Status: ready-for-dev

## Story

As a Client user (mobile/tablet/Web),
I want chọn được cách lưới chiếm màn hình theo thiết bị và use case,
so that layout không bị cắt hoặc nhỏ bất thường trên thiết bị lạ.

## Acceptance Criteria

1. **Given** settings store,
   **When** thêm setting,
   **Then** `displayFitMode: 'contain' | 'cover' | 'fullscreen'` lưu localStorage, default `contain`.
2. **Given** Client settings modal,
   **When** render,
   **Then** segmented control `Contain / Cover / Fullscreen` với icon rõ, đặt gần orientation.
3. **Given** `GridArea`,
   **When** nhận mode,
   **Then** áp class/layout token tương ứng.
4. **Given** Web Client,
   **When** đổi mode,
   **Then** không cần reconnect/reload.

## Tasks / Subtasks

- [ ] Task 1: Store field (AC: 1)
  - [ ] Thêm `displayFitMode` vào `src/stores/settings.ts`, persist localStorage.
- [ ] Task 2: Segmented control (AC: 2)
  - [ ] Thêm control trong Client settings, gần orientation.
- [ ] Task 3: GridArea áp mode (AC: 3, 4)
  - [ ] `GridArea.vue` đọc mode, đổi reactive không reload.

## Dev Notes

- Gốc dependency: chặn S-CLIENT2, S-UX2. Định nghĩa mode:
  - `contain`: giữ toàn bộ lưới trong viewport.
  - `cover`: lưới phủ tối đa, crop padding nhẹ.
  - `fullscreen`: bỏ shell/padding tối đa.

### References

- [Source: src/views/ClientView.vue:60] - orientation setting hiện tại.
- [Source: src/stores/settings.ts]
- [Source: src/components/GridArea.vue:108] - shell `max-w-2xl`.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §4]
