---
title: 'v1.4.0 S-BUILD3 — Tài liệu cài đặt macOS/Linux + tag conventions'
type: 'docs'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sau khi có bản macOS (unsigned) + Linux, user mới cần hướng dẫn vượt Gatekeeper (macOS) và deps/Wayland (Linux). Tag conventions trong `release.yml` chưa nhắc `-mac`/`-linux`.

**Approach:** README thêm mục cài macOS (bỏ qua Gatekeeper) + Linux (deps, caveat Wayland). Cập nhật comment tag conventions đầu `release.yml` (`:3-6`). (Tùy chọn) mở rộng `update-manifest` (`:227-266`) cho darwin/linux.

## Boundaries & Constraints

**Always:** Hướng dẫn macOS unsigned rõ ràng (lệnh + GUI). Linux ghi caveat Wayland. Phụ thuộc S-BUILD1/S-BUILD2 (artifact tồn tại).

**Ask First:** Có làm updater manifest cho darwin/linux không (mặc định để tùy chọn, có thể bỏ qua v1.4.0).

**Never:** KHÔNG hứa app đã ký macOS. KHÔNG bỏ caveat Wayland.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| User macOS mở .dmg | unsigned → Gatekeeper chặn | README: `xattr -dr com.apple.quarantine /Applications/...app` hoặc "Open Anyway" | — |
| User Linux .AppImage | thiếu deps | README liệt kê deps + chmod +x | — |
| Wayland | enigo hạn chế | README ghi rõ + gợi ý X11 | — |
| Maintainer tag | chọn scope | comment tag conventions cập nhật | — |

</frozen-after-approval>

## Code Map

- `README.md` — mục cài macOS (Gatekeeper) + Linux (deps, Wayland).
- `.github/workflows/release.yml` — comment tag conventions (`:3-6`) thêm `-mac`/`-linux`; (tùy chọn) `update-manifest` (`:227-266`) thêm platform darwin/linux.

## Tasks & Acceptance

**Execution:**
- [ ] `README.md` -- Mục "Cài đặt macOS": bản unsigned → vượt Gatekeeper bằng `xattr -dr com.apple.quarantine "/Applications/Android Stream Desk.app"` hoặc System Settings → Privacy & Security → "Open Anyway"; rồi cấp Accessibility (System Settings → Privacy & Security → Accessibility) để macro chạy.
- [ ] `README.md` -- Mục "Cài đặt Linux": `.deb` (`sudo dpkg -i ...` + `apt -f install`) hoặc `.AppImage` (`chmod +x` + chạy); liệt kê runtime deps; **caveat Wayland**: macro (enigo) hoạt động tốt trên X11, hạn chế trên Wayland — khuyến nghị phiên X11.
- [ ] `.github/workflows/release.yml` -- Cập nhật comment tag conventions (`:3-6`): thêm `v*-mac` (macOS only), `v*-linux` (Linux only); full `v*` build tất cả.
- [ ] `.github/workflows/release.yml` -- (Tùy chọn) `update-manifest` (`:227-266`): thêm platform `darwin-aarch64`/`darwin-x86_64`/`linux-x86_64` vào `latest.json` nếu bật updater đa nền tảng (có thể defer).

**Acceptance Criteria:**
- Given user macOS tải .dmg, when đọc README, then biết cách vượt Gatekeeper + cấp Accessibility.
- Given user Linux, when đọc README, then biết deps + cách chạy + caveat Wayland.
- Given maintainer xem release.yml, then comment tag conventions gồm `-mac`/`-linux`.

## Design Notes

Docs-only (+ comment CI). Updater đa nền tảng để tùy chọn vì updater hiện chỉ wiring Windows (CLAUDE.md: updater chưa init đầy đủ). Phụ thuộc S-BUILD1/2 để hướng dẫn khớp artifact thật.

## Verification

**Manual:** đọc README theo bước trên Mac/Linux sạch → cài chạy được.

## Suggested Review Order

- README macOS Gatekeeper + Accessibility. [`README.md`](../../README.md)
- README Linux deps + Wayland caveat. [`README.md`](../../README.md)
- tag conventions comment. [`release.yml:3`](../../.github/workflows/release.yml#L3)
