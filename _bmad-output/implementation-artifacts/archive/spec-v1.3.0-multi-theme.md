---
title: 'v1.3.0 Multi-Theme System — Cyber / Midnight / Ember'
type: 'feature'
created: '2026-05-25'
baseline_commit: '907edae'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Giao diện hardcode palette "Cyber" (cyan neon trên nền `#0f172a`). User không thể thay đổi màu sắc, và Dashboard / Client luôn giống nhau bất kể preference.

**Approach:** Thêm 3 theme (Cyber, Midnight, Ember) dùng CSS custom properties. Theme được lưu trong `layout.json` và broadcast tới Client qua `sync_layout` đã có. Dashboard có selector để chọn và preview ngay.

## Boundaries & Constraints

**Always:** Cyber theme phải giữ đúng visual identity hiện tại (không visual regression). `currentAccentH` trong `themes.ts` phải được cập nhật đồng thời với CSS var khi `applyTheme()` được gọi để `GridButton` computed re-evaluate đúng.

**Ask First:** Nếu cần thêm theme thứ 4 trở lên trong v1.3.0.

**Never:** Không dùng class-based theming (thêm/bỏ CSS class trên body) — chỉ dùng `[data-theme]` attribute. Không replace neon color của từng button (per-button `backgroundColor` vẫn quyết định màu neon chính); theme chỉ ảnh hưởng fallback hue (button desaturated), shell background, và corner brackets.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Switch theme ở Dashboard | Click theme card | CSS vars đổi ngay, GridButton fallback hue đổi, layout broadcast tới Client | — |
| Client kết nối mới | `sync_layout` payload có `theme: "midnight"` | Client apply theme ngay khi nhận | Nếu theme không hợp lệ → fallback `'cyber'` |
| Reload app | `localStorage("theme")` = `"ember"` | Theme apply trước khi user thấy UI (App.vue onMounted) | Nếu missing/invalid → default `'cyber'` |
| `layout.json` cũ không có `theme` | `layout.theme === undefined` | `sanitizeLayout` bỏ qua, fallback `'cyber'` | — |

</frozen-after-approval>

## Code Map

- `src/lib/themes.ts` — NEW: `ThemeName`, `THEMES` registry (label, accentH, previewColor), `currentAccentH: Ref<number>`, `applyTheme()`, `isValidTheme()`.
- `src/assets/tailwind.css` — thêm CSS vars blocks: `:root` (cyber defaults) + 3 `[data-theme]` override blocks; `body { background-color: var(--theme-bg) }`.
- `src/App.vue` — thêm `onMounted` → read localStorage `theme` → `applyTheme`.
- `src/components/GridButton.vue` — import `currentAccentH`; dùng trong `neonHsl`/`neonColor`/`neonGlow` fallback; `backgroundColor: 'var(--theme-btn-bg)'` trong `:style`; scoped CSS dùng `var(--theme-btn-hover)`.
- `src/components/GridArea.vue` — corner brackets dùng `:style borderColor: var(--theme-corner-a/b)`; `.cyber-shell` scoped CSS dùng vars.
- `src/types/index.ts` — thêm `theme?: string` vào `Layout`.
- `src-tauri/src/lib.rs` — thêm `theme: Option<String>` vào `Layout` struct.
- `src/stores/layout.ts` — trong `sync_layout` handler: `applyTheme` nếu payload có theme hợp lệ. Trong `importLayout` sanitization: validate + reset nếu invalid.
- `src/views/DashboardView.vue` — thêm section "Giao diện" ở đầu settings modal body: 3 theme card nhỏ với swatch màu + label.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/themes.ts` -- Tạo mới: export `ThemeName = 'cyber' | 'midnight' | 'ember'`, `THEMES` (3 entries với label/accentH/previewColor), `currentAccentH = ref<number>(187)`, `applyTheme(name)` (set `data-theme` attr + localStorage + `currentAccentH.value`), `isValidTheme(s)`.
- [x] `src/assets/tailwind.css` -- Thêm `:root { --theme-bg: #0f172a; --theme-btn-bg: rgba(2,6,14,0.92); --theme-btn-hover: rgba(4,12,24,0.96); --theme-accent: #00d4ff; --theme-corner-a: rgba(0,200,255,0.6); --theme-corner-b: rgba(200,0,255,0.6); --theme-shell-top: rgba(0,240,255,0.04); --theme-shell-bottom: rgba(255,0,255,0.03); --theme-shell-border: rgba(0,240,255,0.08); }` + 3 `[data-theme]` override blocks (cyber = same as root defaults; midnight = purple; ember = orange); đổi `body { background-color }` sang `var(--theme-bg)`.
- [x] `src/App.vue` -- Thêm `<script setup>` với `onMounted`: import `applyTheme`, `isValidTheme`; read `localStorage.getItem('theme')` → `applyTheme(valid ? name : 'cyber')`.
- [x] `src/components/GridButton.vue` -- Import `currentAccentH` từ `../lib/themes`. Trong `neonHsl`: thay `h: 187` → `h: currentAccentH.value`. Trong `neonColor` fallback: thay `'hsl(187, 100%, 55%)'` → dùng `currentAccentH.value`. Trong `neonGlow` fallback: thay `'rgba(0,240,255,0.5)'` → dùng `currentAccentH.value`. `:style` `backgroundColor`: `'var(--theme-btn-bg)'`. Scoped CSS `.cyber-btn:hover`: `background-color: var(--theme-btn-hover) !important`.
- [x] `src/components/GridArea.vue` -- Corner bracket spans: bỏ Tailwind `border-cyan-500/60` / `border-fuchsia-500/60`, thêm `:style="{ borderColor: 'var(--theme-corner-a)' }"` (top-left, bottom-right) và `var(--theme-corner-b)` (top-right, bottom-left). Scoped CSS `.cyber-shell` background/border: thay hardcode rgba values → `var(--theme-shell-top)`, `var(--theme-shell-bottom)`, `var(--theme-shell-border)`.
- [x] `src/types/index.ts` -- Thêm `theme?: string` vào `Layout` interface.
- [x] `src-tauri/src/lib.rs` -- Thêm `#[serde(rename = "theme")] theme: Option<String>` vào `Layout` struct với `#[serde(skip_serializing_if = "Option::is_none")]`.
- [x] `src/stores/layout.ts` -- Trong `sync_layout` handler: sau `updateLayout(synced, true)`, thêm `if (synced.theme && isValidTheme(synced.theme)) applyTheme(synced.theme as ThemeName)`. Trong `importLayout`: trong sanitized object, validate `parsed.theme` — chỉ pass nếu `isValidTheme`, else undefined.
- [x] `src/views/DashboardView.vue` -- Trong settings modal body, thêm section "Giao diện" TRƯỚC "Thông tin ứng dụng": render 3 theme card (swatch `w-5 h-5 rounded-full` màu `previewColor` + label). Click card → `layoutStore.layout.theme = name; applyTheme(name); layoutStore.broadcastSync()`. Active card có `border-cyan-400` (hoặc neon) highlight; inactive có `border-slate-700`.

**Acceptance Criteria:**
- Given Dashboard, when click "Midnight" theme card, then UI đổi sang purple neon ngay (GridArea corner brackets, GridButton fallback neon, body bg).
- Given Client Android connected, when Dashboard switch theme, then Client tự đổi theme trong vài giây (qua sync_layout broadcast).
- Given app reload sau khi chọn "Ember", then Ember theme load ngay khi UI hiện ra.
- Given `layout.json` cũ không có `theme` field, then app không crash, default Cyber.
- Given Cyber theme (default), then visual không thay đổi so với trước (no regression).

## Design Notes

CSS var `--theme-btn-hover` dùng trong scoped CSS (không phải inline `:style`) vì `hover` state không thể set qua `:style` trong Vue.

`currentAccentH` là `ref` export từ module — không cần Pinia store. GridButton là leaf component dùng trực tiếp; theme ít thay đổi nên không cần provide/inject.

Cyber `[data-theme="cyber"]` block và `:root` default có cùng giá trị → backward compat khi `data-theme` chưa được set.

## Verification

**Commands:**
- `pnpm tsc --noEmit` -- expected: compile sạch, `Layout.theme` typed correctly, `currentAccentH` inferred as `Ref<number>`.
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: `Layout` struct compile với field `theme: Option<String>`.

## Suggested Review Order

**Theme core — entry point**

- Registry + `isValidTheme` type guard + `currentAccentH` init from localStorage (no flash).
  [`themes.ts:1`](../../src/lib/themes.ts#L1)

- `applyTheme`: sets `data-theme` attr, localStorage (try/catch), reactive ref — all three atomic.
  [`themes.ts:23`](../../src/lib/themes.ts#L23)

**No-flash init chain**

- Synchronous `data-theme` set before Vue mounts — prevents flash-of-cyber for saved themes.
  [`main.ts:13`](../../src/main.ts#L13)

- App.vue onMounted: secondary call to sync `currentAccentH` ref and localStorage on startup.
  [`App.vue:5`](../../src/App.vue#L5)

**CSS tokens**

- `:root` defaults + 3 `[data-theme]` blocks; `body` uses `var(--theme-bg)`.
  [`tailwind.css:5`](../../src/assets/tailwind.css#L5)

**Component token consumers**

- `GridButton`: `currentAccentH.value` in fallback neon hue — reactive when theme changes.
  [`GridButton.vue:23`](../../src/components/GridButton.vue#L23)

- `GridArea`: corner brackets + shell CSS vars.
  [`GridArea.vue:31`](../../src/components/GridArea.vue#L31)

- `ClientView`: root div uses `var(--theme-bg)` via inline style (not Tailwind class) so theme bg is visible.
  [`ClientView.vue:170`](../../src/views/ClientView.vue#L170)

**Data layer**

- `Layout.theme?: string` TS type; downstream `isValidTheme` guards all reads.
  [`index.ts:20`](../../src/types/index.ts#L20)

- `layout.ts` sync_layout: explicit `applyTheme` with `'cyber'` fallback when no theme in payload.
  [`layout.ts:187`](../../src/stores/layout.ts#L187)

- `layout.ts` localStorage init: sanitize `parsed.theme` before assigning.
  [`layout.ts:122`](../../src/stores/layout.ts#L122)

**Dashboard UI**

- Theme selector section: 3 card buttons, `setTheme` writes to layout + broadcasts.
  [`DashboardView.vue:1213`](../../src/views/DashboardView.vue#L1213)

**Rust**

- `Layout` struct with `theme: Option<String>` — type documentation only; layout passes as `Value` at runtime.
  [`lib.rs:42`](../../src-tauri/src/lib.rs#L42)
