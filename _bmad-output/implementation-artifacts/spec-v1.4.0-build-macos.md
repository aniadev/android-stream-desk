---
title: 'v1.4.0 S-BUILD1 — CI: build macOS (.dmg, unsigned)'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `tauri.conf.json` `targets:"all"` nhưng CI (`release.yml`) chỉ build Windows + Android. macOS Companion đã hỗ trợ ở tầng code (enigo macOS, Accessibility prompt `lib.rs:477-490`) nhưng thiếu build pipeline + .dmg.

**Approach:** Thêm job `build-macos` (`runs-on: macos-latest`), build apple-darwin, bundle dmg, upload lên release. Bundle **unsigned** (chốt Ania) — hướng dẫn Gatekeeper ở S-BUILD3. Thêm flag `build_macos` + suffix tag `-mac`.

## Boundaries & Constraints

**Always:** Bundle unsigned (không cert). Tham gia release theo flag tag (full `v*` build cả macOS; `-mac` chỉ macOS). Tái dùng cấu trúc job hiện có (pnpm/Node/Rust/tauri-action).

**Ask First:** Nếu sau này có Apple Developer cert → thêm sign+notarize.

**Never:** KHÔNG chặn release nếu macOS job fail vì lý do hạ tầng (cân nhắc không-block các job khác). KHÔNG đụng code app.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tag `v1.4.0` | full release | build-macos chạy → .dmg lên release | — |
| Tag `v1.4.0-mac` | macOS only | chỉ build-macos | flag |
| Tag `v1.4.0-win`/`-apk` | không macOS | build-macos skip | flag |
| Universal vs arch | apple-darwin | aarch64 + x86_64 (hoặc universal) | — |

</frozen-after-approval>

## Code Map

- `.github/workflows/release.yml` — `create-release` outputs thêm `build_macos`; "Set build flags" (`:33-46`) thêm nhánh `-mac`; job `build-macos` mới (mirror `build-windows` `:59-133`, runs-on macos-latest, targets apple-darwin, `--bundles dmg`).

## Tasks & Acceptance

**Execution:**
- [ ] `.github/workflows/release.yml` -- `create-release` (`:17-57`): thêm output `build_macos`; trong "Set build flags from tag suffix" (`:33-46`) thêm: `-mac` → chỉ macOS; full `v*` (else) → `build_macos=true`; `-win`/`-apk` → `build_macos=false`.
- [ ] `.github/workflows/release.yml` -- Job mới `build-macos`: `needs: create-release`, `if: build_macos=='true'`, `runs-on: macos-latest`. Steps: checkout, pnpm, Node 20, Rust (targets `aarch64-apple-darwin,x86_64-apple-darwin`), cache cargo, `pnpm install --frozen-lockfile`, `tauri-apps/tauri-action@v0` với `args: --target universal-apple-darwin --bundles dmg` (hoặc build 2 arch), `releaseId`/`tagName` như build-windows. KHÔNG set signing secrets.

**Acceptance Criteria:**
- Given tag `v1.4.0`, when CI chạy, then build-macos sinh .dmg unsigned + upload lên release.
- Given tag `v1.4.0-mac`, when CI, then chỉ build macOS.
- Given tag `-win`/`-apk`, when CI, then build-macos skip.

## Design Notes

Unsigned vì chưa có Apple cert (chốt Ania) — user vượt Gatekeeper theo hướng dẫn S-BUILD3. `universal-apple-darwin` cho 1 artifact chạy cả Intel + Apple Silicon (cần cả 2 rust target). enigo macOS yêu cầu Accessibility — đã có prompt trong code.

## Verification

**Commands:** (CI) — kiểm workflow chạy khi push tag thử (vd `v1.4.0-mac` trên nhánh test).

**Manual:** sau release, tải .dmg trên Mac → cài → (S-BUILD3 hướng dẫn Gatekeeper) → macro chạy sau khi cấp Accessibility.

## Suggested Review Order

- build flags thêm `-mac`. [`release.yml:33`](../../.github/workflows/release.yml#L33)
- job build-macos. [`release.yml:59`](../../.github/workflows/release.yml#L59)
