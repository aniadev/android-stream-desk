# Story 13.2 (S-APK2): Web asset diet để APK xuống dưới 20MB

Status: review (logo done -7.2MB; icon bundle 11MB HOÃN → deferred-work.md)

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

- [~] Task 1: Icon pack 11MB (AC: 1, 4) — **HOÃN sang version sau** (quyết định 2026-06-04)
  - [ ] `src/icons-bundle.ts` import full mdi(3MB)+material-symbols(7.6MB)+lucide(0.5MB) qua `main.ts`, embed vào `.so`. Cả 3 set đang dùng → không bỏ được set nào.
  - [ ] Hướng tương lai: client fetch icon từ Companion qua LAN + cache, hoặc subset + lazy. Đã ghi `_bmad-output/deferred-work.md`.
- [x] Task 2: Logo + rác (AC: 2, 3)
  - [x] `public/logo.png` 3.7MB (1920px) → 123KB (256px) bằng `sips -Z 256`.
  - [x] Giữ hi-res làm nguồn gen app icon: `branding/logo-source.png`; `package.json` `icons` trỏ tới đó.
  - [x] Xóa `public/logo-1.png` (3.5MB, không ref) + `public/logo.bk.png` (89KB, không ref).
- [x] Task 3: Đo lại (AC: 4)
  - [x] **Đo thật sau logo fix: arm64 = 21MB, arm = 20MB** (từ 35MB). Logo PNG không nén được nên gỡ khỏi `.so` ăn gần trọn 14MB.
  - [x] arm (armeabi-v7a) ĐẠT ≤20MB; arm64 còn ~21MB (dư ~1MB), về <20MB khi làm icon (Task 1, version sau).

## Dev Notes

- **11MB JS = icon offline bundle**, KHÔNG phải icon picker code. `src/icons-bundle.ts` → `addCollection` cho mdi/material-symbols/lucide, load qua `main.ts` cho cả 2 role để render icon offline. APK frontendDist = `../dist` (không phải dist-client).
- Logo dùng ở favicon/apple-touch-icon (`index.html`) + UI 32-36px (`DashboardView.vue:1305,2253`) + nguồn `tauri icon`. 256px đủ cho mọi chỗ; nguồn hi-res tách ra `branding/`.
- **Trạng thái:** logo done → đo thật arm64 21MB / arm 20MB (từ 35MB). arm đạt; arm64 dư ~1MB. Icon 11MB hoãn version sau theo quyết định user; làm icon sẽ đưa cả hai về ~15MB.

### References

- [Source: src/icons-bundle.ts] - import full mdi/material-symbols/lucide (icon 11MB, HOÃN).
- [Source: src/main.ts:5] - `initOfflineIcons()` load icon cho cả 2 role.
- [Source: public/logo.png] - đã optimize 3.7MB→123KB.
- [Source: branding/logo-source.png] - nguồn hi-res gen app icon.
- [Defer: _bmad-output/deferred-work.md] - icon bundle hoãn version sau.
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §7]
