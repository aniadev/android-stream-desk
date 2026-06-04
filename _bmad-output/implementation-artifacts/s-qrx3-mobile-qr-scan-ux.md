# Story 10.3 (S-QRX3): Mobile QR scan experience

Status: done

## Story

As a mobile Client user,
I want luồng quét QR chuyên biệt và dễ retry,
so that tôi kết nối nhanh thay vì nhập IP tay.

## Acceptance Criteria

1. **Given** chưa connected,
   **When** mở Client,
   **Then** panel/nút `Kết nối bằng QR` nổi bật trước manual IP form.
2. **Given** quét QR,
   **When** denied/cancel/invalid QR,
   **Then** mỗi trường hợp có state riêng (CTA mở app settings nếu plugin hỗ trợ).
3. **Given** scan thành công,
   **When** nhận endpoint,
   **Then** hiển thị `host:port` + trạng thái connecting, reset reconnect state, lưu endpoint và connect.
4. **Given** Android camera,
   **When** build,
   **Then** permission vẫn khai báo đúng manifest/capability.

## Tasks / Subtasks

- [x] Task 1: Scan panel (AC: 1)
  - [x] Tách panel scan nổi bật trước IP form trong `ClientView.vue`.
- [x] Task 2: Error states (AC: 2)
  - [x] State denied/cancel/invalid riêng + CTA settings.
- [x] Task 3: Success flow (AC: 3)
  - [x] Hiển thị endpoint, reset reconnect (liên kết S-REL3), connect.
- [x] Task 4: Verify permission (AC: 4)
  - [x] Check camera permission trong manifest/capability.

### Review Findings

- [x] [Review][Patch] Sau khi scan thành công, panel QR chưa hiển thị `host:port` kèm trạng thái connecting như AC3 yêu cầu [src/views/ClientView.vue:166]
- [x] [Review][Patch] Nếu view unmount khi scanner đang mở, `onUnmounted` chưa gọi `cancelScanQr` để đóng camera native [src/views/ClientView.vue:289]

## Dev Agent Record

### Implementation Plan
- Thiết kế Dashboard QR layout and Scanner panel ở ClientView.vue.
- Phân loại 4 nhánh scanner state trên UI: scanning, denied (hiển thị nút mở Cài đặt thiết bị), cancelled, invalid.
- Khi nhận payload hợp lệ: kết nối trực tiếp, hạ cờ reconnect của S-REL3.
- Kiểm tra AndroidManifest.xml và Android capabilities mobile.json bảo đảm có camera.

### File List
- `src/views/ClientView.vue`

### Change Log
- Cải thiện luồng kết nối QR trên ứng dụng Android Client.


## Dev Notes

- Phụ thuộc S-QRX1. Liên quan S-REL3 (reset reconnect).
- Nút `Quét QR từ Companion` hiện nằm trong modal kết nối chung.

### References

- [Source: src/views/ClientView.vue:134] - nút quét QR hiện tại.
- [Source: src/lib/apkConnectQr.test.mjs] - parser/payload coverage.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
