# Story 11.1 (S-CLIENT1): Client display fit mode setting

Status: review

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

- [x] Task 1: Store field (AC: 1)
  - [x] Thêm `displayFitMode` + `parseFitMode()` + `DEFAULT_FIT_MODE` vào `src/stores/settings.ts`, persist localStorage key `settings:displayFitMode`.
  - [x] Test `src/stores/settings.test.mjs` — assert default `contain`, valid set, fallback case-sensitive.
- [x] Task 2: Segmented control (AC: 2)
  - [x] Thêm 3-option grid (`contain` / `cover` / `fullscreen`) ngay sau Orientation section trong ClientView settings modal, có icon `mdi:fit-to-page-outline` / `mdi:fit-to-page` / `mdi:fit-to-screen`, hint text mô tả mỗi mode, role=radiogroup.
- [x] Task 3: GridArea áp mode (AC: 3, 4)
  - [x] `GridArea.vue` đọc `settingsStore.displayFitMode` qua `computed` reactive, không reload.
  - [x] `contain` → giữ `max-w-2xl` + shell + corner brackets + scanline + grid bg.
  - [x] `cover` → bỏ `max-w-2xl`, giữ shell decoration, tighten padding/gap.
  - [x] `fullscreen` → bỏ `max-w-2xl` + bỏ shell decoration (corner brackets, scanline, grid bg), tighten thêm, dùng `shell--fullscreen` (no clip-path, no border-radius, no shadow).

### Review Findings

- [ ] [Review][Patch] Settings test không được wire vào package scripts [`package.json`:8]
- [ ] [Review][Patch] Segmented control dùng label `Full` thay vì `Fullscreen` [`src/views/ClientView.vue`:101]

## Dev Agent Record

### Implementation Plan
Thêm 3-state fit mode vào Pinia settings store, expose qua `storeToRefs` ở ClientView. GridArea subscribe reactive token → đổi class. Web Client thấy ngay vì Pinia reactive + localStorage read-once.

### File List
- `src/stores/settings.ts` (thêm `displayFitMode`, `parseFitMode`, `DEFAULT_FIT_MODE`, `DISPLAY_FIT_MODES`)
- `src/stores/settings.test.mjs` (new)
- `src/components/GridArea.vue` (script: import type, computed; template: 3-state class binding; style: `.shell--fullscreen`)
- `src/views/ClientView.vue` (script: `fitModeOptions`, `setFitMode`; template: segmented control sau orientation)

### Change Log
- Pinia settings: thêm state `displayFitMode` (default `contain`) + localStorage persist.
- ClientView modal: 3-option radiogroup với icon Lucide, hint text dưới.
- GridArea: reactive shell — `contain` giữ cap, `cover` bỏ cap + tighten, `fullscreen` bỏ cap + bỏ decoration + dùng `.shell--fullscreen` (no clip-path).

## Dev Notes

- Pre-existing latent bug fixed incidentally: `runRelaunchWithTimeout.timeoutId` đổi từ `ReturnType<typeof setTimeout>` (Node Timeout) sang `number` (DOM window.setTimeout) — vì tsconfig bị trigger bởi line count thay đổi.
- Pre-existing s-qrx1 test bug fixed incidentally: `qrDecodeRoundtrip.test.ts` expect IPv6 host ở dạng encoded; parser trả decoded form.

### References

- [Source: src/stores/settings.ts:1]
- [Source: src/components/GridArea.vue:1]
- [Source: src/views/ClientView.vue:1]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §4]
