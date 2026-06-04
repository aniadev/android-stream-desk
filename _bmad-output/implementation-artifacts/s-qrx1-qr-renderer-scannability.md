# Story 10.1 (S-QRX1): QR renderer chuẩn và test scannability

Status: ready-for-dev

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

- [ ] Task 1: Thay/nâng encoder (AC: 1, 3)
  - [ ] Thay `src/lib/qrSvg.ts` bằng implementation chuẩn hoặc dependency nhỏ.
  - [ ] Bỏ `safeCreateQrSvg` trả rỗng im lặng — surface lỗi.
- [ ] Task 2: Roundtrip test (AC: 2, 4)
  - [ ] New `src/lib/qrDecodeRoundtrip.test.mjs`: `buildApkConnectPayload` + QR decode.
  - [ ] Mở rộng `src/lib/apkConnectQr.test.mjs` cho payload dài.

## Dev Notes

- Gốc dependency: chặn S-QRX2, S-QRX3.
- Encoder hiện: fixed Version 4, `SIZE=33`, `MAX_BYTE_LENGTH=78`.

### References

- [Source: src/lib/qrSvg.ts:1] - encoder tự viết.
- [Source: src/lib/qrSvg.ts:247] - `safeCreateQrSvg` trả rỗng + console.warn.
- [New file: src/lib/qrDecodeRoundtrip.test.mjs]
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
