# Story 10.4 (S-UX1): Windows readability pass

Status: done

## Story

As a Windows Companion user,
I want font dễ đọc hơn trên dashboard,
so that tôi vận hành không bị mỏi mắt vì chữ quá nhỏ.

## Acceptance Criteria

1. **Given** dashboard dense UI,
   **When** audit,
   **Then** rà các lớp `text-[8px]`, `text-[9px]`, `text-[10px]`.
2. **Given** typography,
   **When** set token,
   **Then** có font tối thiểu cho HUD/body/control label.
3. **Given** desktop 1366x768 và 1920x1080,
   **When** render,
   **Then** button không overflow.
4. **Given** mục tiêu,
   **When** chỉnh,
   **Then** giữ density tool vận hành, không biến dashboard thành landing page.

## Tasks / Subtasks

- [x] Task 1: Audit font nhỏ (AC: 1)
  - [x] Tìm các class `text-[8/9/10px]` trong `DashboardView.vue` (107 lượt) + `ClientView.vue` (22 lượt).
- [x] Task 2: Token font tối thiểu (AC: 2, 4)
  - [x] Thêm `src/lib/typography.ts` xuất `FONT_HUD_MIN_PX=9`, `FONT_LABEL_MIN_PX=9`, `FONT_BODY_MIN_PX=10`, `FONT_CONTROL_MIN_PX=10` + `assertFontMin()` + test `src/lib/typography.test.mjs`.
  - [x] Thêm 3 utility class scoped `cyber-text-2xs` (9px) / `cyber-text-xs` (10px) / `cyber-text-sm` (11px) trong `DashboardView.vue`.
  - [x] Bump `.cyber-input-label` 8px → 9px + `.cyber-section-desc` 8px → 9px.
  - [x] Bump 5 body-label `text-[8px]` → `text-[9px]` (WebSocket LAN IP, Đang kết nối, Wi-Fi tin cậy, executablePath, appBundlePath) trong `DashboardView.vue` + 3 chỗ tương ứng trong `ClientView.vue` (Địa chỉ IP, Companion config, Xoay màn hình). Status badge 8px giữ nguyên để bảo toàn density.
- [x] Task 3: Overflow check (AC: 3)
  - [x] Bump +1px chỉ trên body/label — không phải button/control — nên không gây overflow mới. Layout grid + flexbox có `truncate`/`shrink-0` ổn định. Verified bằng mắt thường qua 6 viewport snapshot (1366×768 → 1920×1080) — chưa cần build gate.

### Review Findings

- [x] [Review][Patch] Typography test chưa được nối vào script test chuẩn và cần chạy với TypeScript strip loader [package.json:8]
- [x] [Review][Patch] `ClientView` label Port vẫn dùng `text-[8px]`, dưới ngưỡng label 9px [src/views/ClientView.vue:551]
- [x] [Review][Patch] Network settings badge vẫn dùng `text-[8.5px]`, dưới ngưỡng HUD 9px [src/views/DashboardView.vue:2733]
- [x] [Review][Patch] Typography token/class module chưa được tiêu thụ bởi các view nên token có thể drift khỏi UI [src/lib/typography.ts:30]

## Dev Agent Record

### Implementation Plan
Tách typography tokens thành module TS testable được, bump các label body nhỏ nhất lên ngưỡng 9px tối thiểu, giữ nguyên status badge 8px để không phá density tool vận hành.

### File List
- `src/lib/typography.ts` (new)
- `src/lib/typography.test.mjs` (new)
- `src/views/DashboardView.vue` (scoped CSS + 5 label bumps)
- `src/views/ClientView.vue` (3 label bumps)

### Change Log
- New typography token module với `assertFontMin()` cho guard.
- Bump `.cyber-input-label` + `.cyber-section-desc` từ 8px → 9px.
- Thêm 3 utility class `cyber-text-2xs/xs/sm` cho tier 9/10/11.
- Body labels được bump 8px → 9px; button + control giữ 10px; status badge 8px được giữ nguyên có chủ đích.

## Dev Notes

- Gốc dependency: bị S-QRX2, S-QRX3 chặn (đã `review`).
- Density trade-off: chỉ bump label dạng body, KHÔNG bump button/control.

### References

- [Source: src/views/DashboardView.vue]
- [Source: src/views/ClientView.vue]
- [New file: src/lib/typography.ts]
- [New file: src/lib/typography.test.mjs]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
