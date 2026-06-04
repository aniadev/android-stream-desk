# Story 10.2 (S-QRX2): Dashboard QR layout readable

Status: done

## Story

As a Companion user,
I want QR đủ lớn, rõ, có modal phóng to và fallback copy,
so that quét QR từ màn hình desktop dễ dàng.

## Acceptance Criteria

1. **Given** QR ở sidebar/settings,
   **When** render,
   **Then** kích thước tối thiểu 192px, tách rõ `Kết nối APK` và `Mở Web Client`.
2. **Given** con trỏ hover QR,
   **When** di vào,
   **Then** cursor `zoom-in`, có focus state rõ cho keyboard.
3. **Given** click QR,
   **When** mở modal,
   **Then** QR phóng to (320-420px), nền trắng không glow/filter, có copy payload/URL; `Esc`/backdrop/close đều đóng.
4. **Given** endpoint chưa ready hoặc bind error,
   **When** render,
   **Then** QR bị disable; layout không vỡ sidebar trên Windows.

## Tasks / Subtasks

- [x] Task 1: Sidebar QR (AC: 1, 4)
  - [x] Tăng ≥192px, tách APK/Web, disable theo `wsReady`/`wsBindError` (S-REL1).
- [x] Task 2: Hover/focus (AC: 2)
  - [x] cursor `zoom-in` + focus ring.
- [x] Task 3: Modal phóng to (AC: 3)
  - [x] Modal QR lớn, copy payload/URL, đóng bằng Esc/backdrop/close.

### Review Findings

- [x] [Review][Patch] Modal QR phóng to dùng `w-96 h-96` cố định nên có thể tràn viewport hẹp [src/views/DashboardView.vue:3061]
- [x] [Review][Patch] `runRelaunchWithTimeout` bị hạ type safety từ `ReturnType<typeof setTimeout>` xuống `any` [src/views/DashboardView.vue:329]

## Dev Agent Record

### Implementation Plan
- Tích hợp cụm chuyển đổi Tab switcher (APK vs Web client) ở sidebar của DashboardView.vue.
- Gắn các lớp css Tailwind `cursor-zoom-in` và focus states `focus-visible:ring-2` vào các cấu phần vẽ QR.
- Viết component/modal phóng to trực quan 384px cho QR khi nhấp chuột hoặc nhấn Enter vào mã QR.
- Hiện khung thông báo lỗi/trạng thái kết nối khi Server chưa sẵn sàng thay vì vỡ sidebar.

### File List
- `src/views/DashboardView.vue`

### Change Log
- Cập nhật Sidebar Layout và nâng cỡ QR lên 192px+, hỗ trợ modal phóng to kèm tính năng sao chép.


## Dev Notes

- Phụ thuộc S-QRX1 (renderer) + S-REL1 (disable state). Theo sau S-UX2 (settings IA).
- QR sidebar hiện chỉ 104px tại `DashboardView.vue:1464`.

### References

- [Source: src/views/DashboardView.vue:1464] - QR cột 104px.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
