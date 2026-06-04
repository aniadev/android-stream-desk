# Story 10.1 (S-QRX1): QR renderer chuẩn và test scannability

Status: done

## Story

As a user kết nối mobile,
I want QR sinh từ payload APK/Web quét được ổn định bằng điện thoại phổ biến,
so that tôi không bị mất QR im lặng hoặc quét hoài không ra.

## Acceptance Criteria

1. **Given** payload APK/Web (LAN IP/port, có thể >78 bytes),
   **When** sinh QR,
   **Then** auto chọn version/error correction (tối thiểu M/Q), không fixed Version 4.
2. **Given** QR sinh ra,
   **When** decode roundtrip bằng decoder chuẩn trong test,
   **Then** payload khớp đầu vào.
3. **Given** payload vượt giới hạn cũ,
   **When** render,
   **Then** không trả chuỗi rỗng im lặng — báo lỗi rõ.
4. **Given** test,
   **When** chạy `pnpm test:qr`,
   **Then** không gọi cloud API.

## Tasks / Subtasks

- [x] Task 1: Thay/nâng encoder (AC: 1, 3)
  - [x] Thay `src/lib/qrSvg.ts` bằng implementation chuẩn hoặc dependency nhỏ.
  - [x] Bỏ `safeCreateQrSvg` trả rỗng im lặng — surface lỗi.
- [x] Task 2: Roundtrip test (AC: 2, 4)
  - [x] New `src/lib/qrDecodeRoundtrip.test.ts`: `buildApkConnectPayload` + QR decode.
  - [x] Mở rộng `src/lib/apkConnectQr.test.mjs` cho payload dài.

### Review Findings

- [x] [Review][Patch] Roundtrip test chưa render SVG artifact thực tế trước khi decode [src/lib/qrDecodeRoundtrip.test.ts:20]
- [x] [Review][Patch] `jsqr` đang nằm trong runtime dependencies dù chỉ dùng cho test [package.json:33]

## Dev Agent Record

### Implementation Plan
Sử dụng thư viện `qrcode` chuẩn thay thế cho encoder tự vẽ trước đó, cấu hình tự động chọn version/sizing, độ sửa sai (EC) mặc định là 'M'.
Viết test giải mã QR hoàn chỉnh `qrDecodeRoundtrip.test.ts` dùng `jsqr` để quét ngược từ SVG, chạy không cần Canvas/Cloud API.

### File List
- `src/lib/qrSvg.ts`
- `src/lib/apkConnectQr.test.mjs`
- `src/lib/qrDecodeRoundtrip.test.ts`
- `package.json`

### Change Log
- Nâng cấp `qrSvg.ts` dùng `qrcode` package.
- Cập nhật test cũ và thêm test roundtrip chạy thành công qua `pnpm test:qr`.


## Dev Notes

- Gốc dependency: chặn S-QRX2, S-QRX3.
- Encoder hiện: fixed Version 4, `SIZE=33`, `MAX_BYTE_LENGTH=78`.

### References

- [Source: src/lib/qrSvg.ts:1] - encoder tự viết.
- [Source: src/lib/qrSvg.ts:247] - `safeCreateQrSvg` trả rỗng + console.warn.
- [New file: src/lib/qrDecodeRoundtrip.test.mjs]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
