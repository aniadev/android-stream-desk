# Story 13.2 (S-APK2): Web asset diet để APK xuống dưới 20MB

Status: ready-for-dev

## Story

As an Android user,
I want APK nhẹ dưới 20MB,
so that tải/cài nhanh và đỡ tốn dung lượng máy.

> **Quan trọng:** frontend được Tauri **nhúng thẳng vào mỗi `.so` per-ABI** (không phải asset APK riêng). Mỗi MB cắt khỏi frontend được nhân với số ABI ship. Đây là đòn bẩy size lớn nhất sau khi cắt ABI (S-APK1). Frontend nhúng đã phình 13→32MB/.so giữa v1.4.0→v1.5.0 (+19MB).

## Acceptance Criteria

1. **Given** frontend nhúng ~19MB (`index-*.js` 11MB + logo 8MB),
   **When** build,
   **Then** chunk `index-*.js` (11MB) giảm đáng kể bằng lazy-load/code-split phần icon pack nặng (dynamic import, không nhồi toàn bộ icon vào main chunk).
2. **Given** logo PNG,
   **When** tối ưu,
   **Then** resize/nén logo xuống dưới 200KB, dùng một logo, bỏ `logo-1.png` trùng.
3. **Given** bundle,
   **When** build,
   **Then** `.DS_Store` không lọt vào output.
4. **Given** đã split ABI (S-APK1) + diet,
   **When** đo,
   **Then** mỗi APK ABI dưới 20MB; Web Client vẫn chạy đúng sau code-split.

## Tasks / Subtasks

- [ ] Task 1: Code-split icon pack (AC: 1, 4)
  - [ ] Dynamic import phần icon pack nặng (icon picker/fullpack) thay vì static import vào main bundle.
  - [ ] Verify Web Client + icon picker hoạt động sau split.
- [ ] Task 2: Logo + rác (AC: 2, 3)
  - [ ] Nén/resize logo <200KB; xóa `logo-1.png` trùng.
  - [ ] Bỏ `.DS_Store` khỏi bundle (`.gitignore`/publicDir cleanup).
- [ ] Task 3: Đo lại (AC: 4)
  - [ ] Đo `dist-client` + APK ABI, xác nhận <20MB, ghi checklist.

## Dev Notes

- 11MB JS nghi do icon pack từ v1.4.0 (fullpack-search) inline — xác định module nặng bằng `vite build` rollup output / visualizer trước khi split.
- Logo hiện: `dist-client/logo.png` 4.1MB + `logo-1.png` 4.1MB = 8.2MB.
- Phụ thuộc kết quả chung với S-APK1 để chốt size cuối; gate trước `git tag v1.5.1`.

### References

- [Source: dist-client/assets/index-*.js] - main bundle 11MB.
- [Source: dist-client/logo.png, dist-client/logo-1.png] - logo oversize.
- [Source: vite.config.ts] - build config / publicDir.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §7]
