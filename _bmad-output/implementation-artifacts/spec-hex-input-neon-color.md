---
title: 'Hex color input + neon color resolution fix'
type: 'feature'
created: '2026-05-24'
status: 'done'
baseline_commit: 'b9f5b5335697ee5125435e9680976b0c7a6e4624'
context:
  - '{project-root}/_bmad-output/planning-artifacts/breakdown-v1.2.0.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dashboard color picker only exposes the native `<input type="color">` swatch — no way to paste/type a hex code from design tokens, no 3-char shorthand support. The neon glow code in `GridButton.vue` also drops hex shorthand (`#f0a`) silently to a cyan fallback and hardcodes saturation 90% / lightness 58% on every color, so pastel and dark colors all glow the same overbright neon.

**Approach:** Extract a shared `normalizeHex` helper into `src/lib/color.ts` accepting 3-char and 6-char hex with/without `#`. Add a text input next to the swatch in Dashboard, two-way synced through a local draft ref with validation feedback. Re-point `GridButton.vue`'s `hexToRgb` through the new helper and clamp neon HSL: `s = max(60, s)`, `l = clamp(l, 45, 70)`.

## Boundaries & Constraints

**Always:**
- Wire format unchanged: `ButtonConfig.backgroundColor` stays a normalized `#rrggbb` lowercase string in the persisted layout.
- Native `<input type="color">` keeps working alongside the text input. Both must stay synced.
- Invalid hex never overwrites the model. Bad input shows visual error only; revert on blur if not corrected.

**Ask First:**
- Replacing the entire color editing UX with a third-party color picker library.
- Changing the on-disk shape of `backgroundColor` (e.g. storing rgba or HSL).

**Never:**
- Don't add named-color, `hsl()`, or `rgba()` parsing — out of scope for this cycle.
- Don't modify Rust side. `backgroundColor` is opaque to Rust.
- Don't introduce a unit-test runner — repo has none. Inline comment examples are enough.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 6-char hex with `#` | `#FF00FF` | Returns `#ff00ff` | N/A |
| 6-char hex no `#` | `ff00ff` | Returns `#ff00ff` | N/A |
| 3-char shorthand | `#f0a` | Returns `#ff00aa` | N/A |
| Mixed case | `#aBcDeF` | Returns `#abcdef` | N/A |
| Whitespace padding | `  #abc  ` | Returns `#aabbcc` | N/A |
| Invalid length (4/5/7) | `#abcd` | Returns `null` | Caller keeps prior value, marks input invalid |
| Non-hex chars | `#ggg` | Returns `null` | Same as above |
| Empty string | `` | Returns `null` | Same as above |
| Dashboard text input invalid | User types `#zzz` then blurs | Border red while typing; on blur revert `hexDraft` to `selectedButton.backgroundColor` | No store mutation |
| Dashboard text input valid commit | User types `#abc` then presses Enter or blurs | `selectedButton.backgroundColor = '#aabbcc'`, triggers `saveButtonSettings` | N/A |
| Picker change drives text | User picks `#ff0000` via swatch | `hexDraft` updates to `#ff0000` via watcher | N/A |
| GridButton dark color neon | `backgroundColor = '#1a1a1a'` (very dark) | Neon hue preserved, S ≥ 60, L clamped into [45, 70] — visible glow not overbright | N/A |
| GridButton pastel neon | `backgroundColor = '#ffd1dc'` (light pink) | Neon S floored at 60 (not original ~25), L clamped — readable glow | N/A |
| GridButton shorthand bg | `backgroundColor = '#f0a'` | Resolves through `normalizeHex` → neon based on `#ff00aa` instead of fallback cyan | N/A |

</frozen-after-approval>

## Code Map

- `src/lib/color.ts` -- NEW. Exports `normalizeHex(input: string): string | null`, `hexToRgb`, `rgbToHsl`, `hslToString`. Consolidates color math shared between Dashboard + GridButton.
- `src/views/DashboardView.vue` -- around line 696-715. Add `<input type="text" v-model="hexDraft">` next to `<input type="color">`. Add `hexDraft` ref + `watch(selectedButton.backgroundColor)` to sync from picker → draft. Add `commitHex()` handler. Replace the read-only `<span>` showing the hex with the editable input.
- `src/components/GridButton.vue` -- lines 16-56. Delete local `hexToRgb`, `rgbToHsl`, `hslToString`. Import from `src/lib/color.ts`. Update `neonColor` + `neonGlow` computed to clamp `s` and `l`.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/color.ts` -- Create module with `normalizeHex`, `hexToRgb`, `rgbToHsl`, `hslToString`. `hexToRgb` internally pipes through `normalizeHex` so 3-char shorthand resolves. Inline doc-comment examples covering each I/O matrix row (no test runner — comments are the test scaffold).
- [x] `src/views/DashboardView.vue` -- Add `hexDraft` ref, watcher syncing from `selectedButton.backgroundColor`, `commitHex()` handler calling `normalizeHex` then assigning + invoking `saveButtonSettings`. Replace static hex `<span>` (line ~704) with `<input type="text" v-model="hexDraft" @blur="commitHex" @keyup.enter="commitHex" />`. Add `:class="{ 'border-rose-500/70': !hexDraftValid }"` for invalid-state feedback. Keep existing `<input type="color">` block and copy button.
- [x] `src/components/GridButton.vue` -- Replace inline color helpers with imports from `src/lib/color.ts`. Update `neonColor` to `hslToString(h, Math.max(60, s), Math.min(70, Math.max(45, l)))`. Update `neonGlow` to use the same clamped S/L with alpha 0.5. Drop the regex-based `hexToRgb` definition entirely.

**Acceptance Criteria:**
- Given the Dashboard with a button selected, when the user types `#abc` into the hex text input and presses Enter, then the swatch updates to that color and the persisted layout stores `#aabbcc`.
- Given the Dashboard with a button selected, when the user types `garbage` into the hex input and tabs out, then the text input reverts to the prior committed hex and no store mutation occurs.
- Given a button with `backgroundColor: '#1a1a1a'`, when rendered in the grid, then the neon border/glow uses an HSL with lightness between 45 and 70 (not the raw ~10% lightness of the input).
- Given a button with `backgroundColor: '#f0a'`, when rendered in the grid, then the neon resolves from `#ff00aa` rather than falling back to the cyan default.
- Given the Dashboard swatch picker is used to choose a color, when the picker fires `input`, then the hex text input updates within one tick to the same normalized hex.

## Design Notes

`hexDraft` is intentionally a local string ref decoupled from the model, so an in-progress invalid value (`#a`, `#ab`) never crosses into Pinia. The picker is the authoritative writer to `backgroundColor` during normal use; the text input only writes through `normalizeHex` on blur/Enter. Watcher sync direction: model → draft (picker drives, text follows during partial typing).

Neon clamp rationale: original code lifted *every* hue to the same chromatic intensity, destroying the user's color intent. Floor S at 60 keeps minimum glow; ceiling L at 70 prevents pastel washout; floor L at 45 keeps dark colors visible. Hue is always preserved.

Example for `commitHex`:

```ts
function commitHex() {
  const out = normalizeHex(hexDraft.value);
  if (out) {
    selectedButton.value!.backgroundColor = out;
    hexDraft.value = out;
    saveButtonSettings();
  } else {
    hexDraft.value = selectedButton.value!.backgroundColor;
  }
}
```

## Verification

**Commands:**
- `pnpm build` -- expected: `vue-tsc -b && vite build` exits 0, no TS errors on the new module or updated components.
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: Rust untouched, still compiles clean.

**Manual checks:**
- Open `pnpm tauri dev`, select a button, type `#abc` + Enter → swatch and grid button reflect `#aabbcc`. Type `xxx` + Tab → text input reverts.
- Set a button's color via the swatch picker to a very dark color (`#0a0a0a`) → grid button still shows visible neon glow, not pitch black.
- Set a button to a pastel (`#ffd1dc`) → grid neon glow is readable, not washed out white.
- Set a button to grayscale (`#808080`) → glow is cyan-ish neutral, NOT red (grayscale guard).
- While typing in the hex input, trigger a remote `sync_layout` (e.g. press Sync on another client) → in-flight keystrokes are NOT overwritten.

## Suggested Review Order

**Color utility (entry point)**

- New shared module; `normalizeHex` is the contract every other change leans on.
  [`color.ts:15`](../../src/lib/color.ts#L15)

- `hexToRgb` now pipes through `normalizeHex` — root cause of the `#f0a` fallback bug.
  [`color.ts:30`](../../src/lib/color.ts#L30)

**Neon HSL clamp (visual fix)**

- `neonHsl` is the new single source for both color + glow. Note the grayscale guard (`s < 10`) that avoids red glow on `#808080`.
  [`GridButton.vue:19`](../../src/components/GridButton.vue#L19)

- `neonColor`/`neonGlow` collapse to thin wrappers over `neonHsl`.
  [`GridButton.vue:30`](../../src/components/GridButton.vue#L30)

**Dashboard hex input (sync logic)**

- Watcher with `hexInputFocused` guard — prevents async `sync_layout` from clobbering in-flight typing.
  [`DashboardView.vue:332`](../../src/views/DashboardView.vue#L332)

- `onHexDraftInput` debounces the invalid-border to length ≥ 3, so normal typing of `#a`, `#ab` doesn't flash red.
  [`DashboardView.vue:342`](../../src/views/DashboardView.vue#L342)

- `commitHex` is the only writer to the model; null branch reverts without mutating.
  [`DashboardView.vue:356`](../../src/views/DashboardView.vue#L356)

**Dashboard template binding (peripheral)**

- Text input wired with `@focus`/`@blur`/`@keyup.enter` next to the existing `<input type="color">`.
  [`DashboardView.vue:747`](../../src/views/DashboardView.vue#L747)
