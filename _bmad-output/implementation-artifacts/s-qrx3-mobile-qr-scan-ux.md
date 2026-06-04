# Story 10.3 (S-QRX3): Mobile QR scan experience

Status: ready-for-dev

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

- [ ] Task 1: Scan panel (AC: 1)
  - [ ] Tách panel scan nổi bật trước IP form trong `ClientView.vue`.
- [ ] Task 2: Error states (AC: 2)
  - [ ] State denied/cancel/invalid riêng + CTA settings.
- [ ] Task 3: Success flow (AC: 3)
  - [ ] Hiển thị endpoint, reset reconnect (liên kết S-REL3), connect.
- [ ] Task 4: Verify permission (AC: 4)
  - [ ] Check camera permission trong manifest/capability.

## Dev Notes

- Phụ thuộc S-QRX1. Liên quan S-REL3 (reset reconnect).
- Nút `Quét QR từ Companion` hiện nằm trong modal kết nối chung.

### References

- [Source: src/views/ClientView.vue:134] - nút quét QR hiện tại.
- [Source: src/lib/apkConnectQr.test.mjs] - parser/payload coverage.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
