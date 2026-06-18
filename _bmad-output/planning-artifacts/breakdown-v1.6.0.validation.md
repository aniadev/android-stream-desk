# Validation Report — breakdown-v1.6.0.md

**Document:** `_bmad-output/planning-artifacts/breakdown-v1.6.0.md`  
**Validated on:** 2026-06-18  
**Validator:** Paige / BMad Technical Writer  
**Decision:** Requires revision before sprint-planning handoff.

## Summary

Breakdown v1.6.0 is a usable draft: it has clear release intent, decomposes the work into coherent story pairs, and matches several verified code facts in the current repo. It is not yet implementation-ready because release gates are incomplete, acceptance criteria are mostly implicit, and the document does not account for unfinished review-state work already present in `sprint-status.yaml`.

## P0 — Must Fix Before Handoff

### 1. Add missing release-version target for Dashboard app version

The release section lists version bumps for `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, but the repo release guide also requires `src/views/DashboardView.vue` to update `const appVersion = ref<string>('x.y.z');`. Current code still has `1.5.2`, so release instructions in the breakdown would produce an inconsistent About/Support UI.

**Action:** Add `src/views/DashboardView.vue` to both “Modified Files Expected” and “Version Bumps”.

### 2. Restore the canonical release verification gate

The template and `docs/release/release.md` include `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`, but the v1.6.0 breakdown omits it and adds `cargo test`. `cargo test` is useful, but it should not replace clippy in the release gate.

**Action:** Update pre-release verification to include:

```bash
pnpm vue-tsc --noEmit
pnpm test
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

### 3. Resolve open sprint-state dependency before opening v1.6.0 work

`sprint-status.yaml` still has Epic 11, Epic 12, and Epic 13 in `in-progress` with stories in `review`. The breakdown presents v1.6.0 as the next release scope without saying whether these review-state stories are part of the baseline, must close first, or are intentionally deferred.

**Action:** Add a “Baseline & Scope Decision” section before Feature 1 that states:

* current repo version is `1.5.2`;
* Epic 11-13 review items must be closed or explicitly deferred before v1.6.0 sprint planning;
* v1.6.0 starts from the post-v1.5.2 codebase after those decisions.

## P1 — Should Fix For Implementation Quality

### 4. Add acceptance criteria per story

The stories currently have goals, scope, and complexity, but no pass/fail criteria. This makes handoff fragile because several items are UI behavior rather than pure code changes.

**Action:** For every story, add an `Acceptance Criteria` block. Minimum criteria should cover:

* S-THM1: `anime` persists in layout JSON, validates via `isValidTheme`, syncs to Client, and old layouts without theme still fallback to `cyber`.
* S-THM2: Dashboard and Client both render anime theme; non-anime themes remain visually unchanged.
* S-ROT1/S-ROT2: rotate portrait to landscape and back on Android WebView without clipped buttons, stale scroll snap, or inaccessible settings HUD.
* S-CPY1/S-CPY2: copy, paste over existing button, paste into empty button, duplicate into first empty slot, and no duplicate `id`.
* S-MON1/S-MON2: threshold colors at 69/70/90/91 percent and progress indicator remains legible in compact mode.

### 5. Split “frontend-only” from release-impact language

The impact matrix marks all stories “Front-end Only? Yes”, but the release touches Android Client behavior, Companion UI, persisted layout schema, release version files, docs, and landing-page type definitions. It may not require Rust runtime changes, but it is not frontend-only in release impact.

**Action:** Rename the column to “Rust Backend Change?” or “Runtime Surface” and use values such as `No Rust`, `Client + Companion`, `Release docs`, `Landing page type sync`.

### 6. Clarify theme font strategy to avoid adding a runtime dependency accidentally

The document says “Nhúng font chữ tròn trịa” and mentions `Nunito`, but it does not say whether the font is bundled, loaded remotely, or just a system fallback. Remote font loading would be a product and offline behavior decision.

**Action:** Specify one of:

* use system fallback only, no new asset;
* bundle local font asset and list it under New Files Expected;
* explicitly defer custom font asset and use CSS variable for future replacement.

### 7. Tighten the rotation technical plan around existing GridArea behavior

Current `GridArea.vue` already listens to `resize` for scroll-snap realignment, while the breakdown frames resize/orientation handling as absent. The actual gap is not just event listening; it is viewport-size-driven layout recalculation and Android WebView height handling.

**Action:** Reword the root cause to acknowledge existing `resize` handling, then define the missing behavior: debounced viewport token, `--vh` fallback, `visualViewport` where available, and forced scroll-snap realignment after orientation settles.

### 8. Define store clipboard semantics precisely

`copiedButton` is described as “không bao gồm id”, but paste/duplicate behavior is underspecified for monitor buttons, page boundaries, button order, and layout persistence.

**Action:** Add rules:

* copy includes `buttonKind` and `monitorConfig`;
* paste preserves all sanitized fields except `id`;
* duplicate searches only the current page unless explicitly changed;
* paste/duplicate calls `updateLayout` and broadcasts sync;
* clipboard is in-memory only unless explicitly persisted.

## P2 — Nice To Fix For Reader Usability

### 9. Add a concise “Risks & Mitigations” section

The release has several UI risks: anime theme can regress non-anime themes, orientation fixes are device-sensitive, and keyboard shortcuts for copy/paste can conflict with text inputs.

**Action:** Add a short table with `Risk`, `Mitigation`, and `Verification`.

### 10. Replace generic file-list entries with story-specific notes

The Modified Files section is useful, but some entries are too broad. For example, `ClientView.vue` is listed for “Switch theme di động” even though theme selection may currently live in settings/dashboard flows and Client settings may need a separate control decision.

**Action:** For each file, list exact intended change and story ID. If a file is speculative, mark it `candidate` instead of expected.

### 11. Include post-release tag choice

The document says `git tag v1.6.0`, which is probably correct because both Companion and Android Client are affected, but the release guide supports `-win` and `-apk` suffixes.

**Action:** Add one sentence explaining why v1.6.0 uses the full-release tag: theme, Client rotation, and monitor UX affect both desktop Companion and Android/Web Client surfaces.

## Verified Good

* The breakdown follows the version-breakdown template structure well enough to be readable.
* The story dependency graph is clear and acyclic.
* Current code facts support the main feature claims: theme list is limited to three names, monitor button is text/icon based, and layout store has no button-config clipboard API.
* The proposed story grouping is reasonable: theme/copy work can start independently from rotation/monitor work.

## Recommended Next Edit Order

1. Add Baseline & Scope Decision.
2. Fix release gates and version bump list.
3. Add acceptance criteria to all eight stories.
4. Clarify the rotation, clipboard, and font decisions.
5. Re-run `VD` after edits, then move to `SP` sprint planning in a fresh context.
