---
title: 'v1.3.0 Icon Packs Update: Brand Icons (S-ICON1)'
type: 'feature'
created: '2026-05-25'
baseline_commit: '307401f'
status: 'in-review'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users often use the Macro Pad to trigger specific applications (e.g. Discord, Spotify, Steam, OBS), but currently there are no clear "Brand" icons. Users must fall back to generic icons, reducing quick visual recognition.

**Approach:** Bring `@iconify-json/simple-icons` into the curated offline icon pool. We will curate a list of ~80 popular brand icons to be displayed natively in the "Brands" tab of the `DashboardView.vue` icon picker component, without requiring search initially.

## Boundaries & Constraints

**Always:** Use the strict "si" key for referencing the simple-icons pack internally in code.
**Ask First:** If changing the order of the curated `siIcons` array in a manner counter to the grouping semantics (Socials, Gaming, OS, etc.).
**Never:** Treat `@iconify-json/simple-icons` as an uninstalled dependency; it is already installed successfully to `./package.json` and loaded within `./src/icons-bundle.ts`.

</frozen-after-approval>

## Code Map

- `src/config/icons.ts` -- Central registry mapping groups and hardcoded popular icons arrays.
- `src/views/DashboardView.vue` -- Dashboard view with the icon picker implementing category filtering.

## Tasks & Acceptance

**Execution:**
- [x] `src/config/icons.ts` -- Add `'si'` to `IconGroup` type. Add `{ key: 'si', label: 'Brands' }` to `ICON_GROUPS`. Note: The `siIcons` array is already exported with 80+ brands in the file, confirm the array logic.
- [x] `src/views/DashboardView.vue` -- Under `filteredIcons` computed variable, add a return logic for `siIcons` when `activeIconGroup.value === 'si'`. Change the default active state label or fuzzy search references so it explicitly supports `si`.

**Acceptance Criteria:**
- Given opening the icon picker in Dashboard, when selecting the "Brands" tab, then it displays the curated brand icons correctly without crashing.

## Spec Change Log

## Design Notes

We discovered `icons-bundle.ts` and `package.json` already have `@iconify-json/simple-icons` imported, and `siIcons` already populated in `src/config/icons.ts` (probably by a pre-commit). Thus, the main focus is just bridging the front-end components.

## Verification

**Commands:**
- `pnpm tsc --noEmit` -- expected: `src/views/DashboardView.vue` compiles TypeScript logic without error.