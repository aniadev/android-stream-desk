---
title: 'v1.4.0 S-BUILD2 — CI: build Linux (.deb/.AppImage)'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Linux là nền tảng mới hoàn toàn — chưa từng build. CI không có job Linux. enigo cần X11/libxdo; `tauri build` cần gói hệ thống. Wayland: enigo hỗ trợ hạn chế.

**Approach:** Thêm job `build-linux` (`runs-on: ubuntu-latest`), cài apt deps, bundle `.deb` + `.AppImage`, upload lên release. Flag `build_linux` + suffix tag `-linux`. Đây là rủi ro cao nhất đợt (deps/enigo) — verify compile + chạy macro X11.

## Boundaries & Constraints

**Always:** Cài đủ apt deps trước build. Ghi caveat Wayland (S-BUILD3 docs). Theo flag tag.

**Ask First:** Nếu enigo không compile/chạy trên Linux → cần feature flag hoặc rdev thay thế (ghi AGENTS.md).

**Never:** KHÔNG giả định enigo chạy Wayland. KHÔNG block các job khác nếu Linux fail hạ tầng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tag `v1.4.0` | full | build-linux → .deb + .AppImage lên release | — |
| Tag `v1.4.0-linux` | linux only | chỉ build-linux | flag |
| Thiếu apt deps | build | fail rõ ràng | cài deps step trước |
| enigo X11 | runtime | macro chạy | — |
| Wayland | runtime | hạn chế (doc caveat) | — |

</frozen-after-approval>

## Code Map

- `.github/workflows/release.yml` — `create-release` outputs thêm `build_linux`; "Set build flags" (`:33-46`) thêm `-linux`; job `build-linux` mới (ubuntu, apt deps, `--bundles deb,appimage`).
- `src-tauri/AGENTS.md` (nếu enigo cần feature flag Linux) — ghi gotcha.

## Tasks & Acceptance

**Execution:**
- [ ] `.github/workflows/release.yml` -- `create-release`: thêm output `build_linux`; "Set build flags" (`:33-46`): `-linux` → chỉ Linux; full `v*` → `build_linux=true`; `-win`/`-apk`/`-mac` → false.
- [ ] `.github/workflows/release.yml` -- Job `build-linux`: `runs-on: ubuntu-latest`, `if: build_linux=='true'`. Step cài deps: `sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libxdo-dev libappindicator3-dev librsvg2-dev patchelf`. Rồi pnpm/Node/Rust/cache/install + `tauri-action` `args: --bundles deb,appimage`, upload release.
- [ ] `src-tauri/AGENTS.md` -- Nếu enigo cần feature/flag riêng cho Linux X11 (vd `enigo` features), ghi lại gotcha + caveat Wayland.

**Acceptance Criteria:**
- Given tag `v1.4.0`, when CI, then build-linux sinh .deb + .AppImage + upload.
- Given Linux X11, when chạy macro, then enigo thực thi được.
- Given thiếu deps, when build, then step apt cài trước nên build qua.
- Given tag `-linux`, when CI, then chỉ build Linux.

## Design Notes

Rủi ro cao nhất v1.4.0: deps webkit2gtk version (4.1 vs 4.0 theo Tauri v2), enigo X11 (libxdo). Wayland: enigo dùng XTEST/libxdo → hạn chế trên Wayland thuần; khuyến nghị phiên X11 (doc S-BUILD3). Verify enigo compile sớm — nếu vỡ, đánh giá rdev/feature flag.

## Verification

**Commands:** (CI) — push tag thử `v1.4.0-linux` trên nhánh test; kiểm artifact .deb/.AppImage.

**Manual:** cài .deb/.AppImage trên Ubuntu X11 → macro chạy; thử Wayland → ghi nhận hạn chế.

## Suggested Review Order

- apt deps step. [`release.yml`](../../.github/workflows/release.yml)
- build flags `-linux`. [`release.yml:33`](../../.github/workflows/release.yml#L33)
- job build-linux + bundles. [`release.yml`](../../.github/workflows/release.yml)
