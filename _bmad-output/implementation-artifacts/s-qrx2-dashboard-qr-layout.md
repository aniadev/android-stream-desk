# Story 10.2 (S-QRX2): Dashboard QR layout readable

Status: ready-for-dev

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

- [ ] Task 1: Sidebar QR (AC: 1, 4)
  - [ ] Tăng ≥192px, tách APK/Web, disable theo `wsReady`/`wsBindError` (S-REL1).
- [ ] Task 2: Hover/focus (AC: 2)
  - [ ] cursor `zoom-in` + focus ring.
- [ ] Task 3: Modal phóng to (AC: 3)
  - [ ] Modal QR lớn, copy payload/URL, đóng bằng Esc/backdrop/close.

## Dev Notes

- Phụ thuộc S-QRX1 (renderer) + S-REL1 (disable state). Theo sau S-UX2 (settings IA).
- QR sidebar hiện chỉ 104px tại `DashboardView.vue:1464`.

### References

- [Source: src/views/DashboardView.vue:1464] - QR cột 104px.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
