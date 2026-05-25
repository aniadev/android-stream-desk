# Deferred Work — Android Stream Desk

Issues surfaced by the 2026-05-23 step-04 verify review that intentionally fall outside MVP scope. Source findings are referenced by reviewer code (BH = Blind Hunter, EC = Edge Case Hunter, AA = Acceptance Auditor).

## Post-MVP (security & hardening)

- **WS auth handshake (BH-1, BH-16, BH-18)** — Spec `Ask First` boundary and PRD Open Question #1 explicitly defer pairing/PIN auth to v2. MVP relies on LAN-trust posture. Track for v2: PIN/QR pairing + token in `auth` WSMessage (type already declared).
- **WS message size & rate limit (BH-14)** — No frame size cap on `tokio-tungstenite`, no rate-limit on `press`. DoS feasible from LAN but mitigated by LAN-trust scope. Add `WebSocketConfig::max_message_size` and per-connection token bucket post-MVP.

## Post-MVP (resilience)

- **Exponential reconnect backoff (EC-2)** — Spec AC-5 commits to fixed 3s reconnect. Leave as-is for MVP; revisit if user reports battery drain when server stays offline. Default upgrade: 1s → 2s → 4s → cap 30s, abort after N attempts.
- **Server-initiated ping (EC-4)** — Spec adopts client-initiated heartbeat. NAT idle-timeout edge case not covered; revisit if reports surface.
- **IPv6 / dual-stack bind (EC-13)** — `0.0.0.0` IPv4-only. Add `[::]:8089` dual-stack bind if a tester reports an IPv6-only LAN.
- **AppData write rollback UX (EC-11)** — When `app_config_dir()` is unwritable, Dashboard UI does not roll back the optimistic state. Acceptable for MVP; add inline error banner later.

## Post-MVP (release infrastructure)

- **Tauri updater plugin** — Cargo dep present and `release.yml` already targets the manifest at `download/latest.json`, but the plugin is not initialised at runtime yet because no minisign signing key exists. Once `pnpm tauri signer generate` produces `pubkey` + private key (matching mdview pattern), restore `.plugin(tauri_plugin_updater::Builder::new().build())` in `lib.rs::run`, re-add `"updater:default"` permission in `capabilities/default.json`, and populate `plugins.updater` in `tauri.conf.json`.

## Post-MVP (observability)

- **Latency instrumentation (AA-11)** — Architecture pipeline is feasible for <50ms but no measurement. Add round-trip timing log (Android `press` send timestamp → Windows ack) in v2.
- **HMR listener idempotency (EC-3, BH-6)** — `useLayoutStore` ws-message listener now guarded by module-level flag (P-13 patch). Verify nothing leaks under Vite HMR + Vitest before declaring this fully closed.

## v1.2.0 — split-off goals (2026-05-24)

**✅ Done in prior cycles:** F1 Shell Command, F2 Hex Input, B1 Drag-drop fix, B2 Neon color fix, B3 Click fix, DBG1 npm script.

**🔧 Current cycle (2026-05-24): App Picker Modal** (F5 — S-APP1/2/3). Spec: `spec-v1.2.0-app-picker.md`.

**⏳ Deferred:**

- **F3 — APK Signing CI** (S-SIGN1/2/3) — gradle `signingConfigs.release` reading `keystore.properties`, GitHub Actions step decoding base64 keystore from secrets, helper script `scripts/generate-keystore.sh` + `docs/release/signing-setup.md`. **Requires Ania to generate keystore and paste 4 GitHub secrets before workflow can sign.**
- **F4 Debug APK CI — DBG2** — `.github/workflows/android-debug.yml` (workflow_dispatch + push on `releases` branch), uploads artifact 14-day retention. DBG1 (npm script) already done.

Planning artifact full source: `_bmad-output/planning-artifacts/breakdown-v1.2.0.md`.

## v1.2.0 Sprint 1 — review surface (2026-05-24)

Surfaced during step-04 review of `spec-v1.2.0-sprint1-quickfixes.md`. Patch-level redundant-write was auto-fixed. Items below either pre-date this story or are explicit trade-offs accepted by the spec.

- **`updateLayout` reassign anti-pattern still in `reorderButtons` + WS `sync_layout` path** — `src/stores/layout.ts:153` (`reorderButtons` does `[...layout.value.buttons]` then `updateLayout({...layout.value, buttons})`) and the WS sync handler at line 188 (`updateLayout(synced, true)`) both swap the buttons array reference. Spec intentionally scoped fix to resize only (`Never: thay reference layout.value trong các luồng khác`), but reorder may also snap-back if vue-draggable-plus rebinds — verify in manual test; if it does, factor `reorderButtons` to use a `splice`-based in-place reorder too.
- **`resizeGrid` ↔ WS `sync_layout` race** — If a remote client pushes `sync_layout` between local user's resize click and `broadcastSync()` fire (very narrow window — single-tick JS), the inbound `updateLayout(synced, true)` reassigns `layout.value`, orphaning the resized buttons array vue-draggable-plus just bound to. In practice only triggers when two editors collide — same posture as concurrent-edit anywhere in the layout.
- **`touchStartThreshold: 5` + `delay: 100` dead-zone on touch** — Tap with finger drift 6–10px within 100ms cancels both drag prepare AND swallows click. Spec marks this Ask-First if it surfaces ("hỏi Ania trước khi điều chỉnh thông số"). Needs Android device validation; lower delay or raise threshold if reports come in.
- **`resizeGrid` validation guards** — No assertion that `rows >= 2`, `cols >= 2`, or `newButtons.length === rows * cols`. Current single caller (`updateGridDimensions`) clamps + pre-sizes correctly, but the store API is unguarded for future callers (importLayout WS path, programmatic test, etc.).
- **`Date.now()` id collision in `updateGridDimensions`** — `src/views/DashboardView.vue:390` uses `btn_${Date.now()}_${i}` to mint new button ids when expanding the grid. Rapid sequential resize within same ms (plausible: tap +rows then +cols quickly) can produce duplicate ids → Vue `:key` collision warnings + possible Sortable confusion. Pre-existing; replace with `crypto.randomUUID()` or a monotonic counter when touching this function next.

## v1.2.0 F1 Shell Command — hardening backlog (2026-05-24)

Surfaced during step-04 review of `spec-shell-command-action.md`. Accepted under current LAN-trust + power-user-feature posture; revisit when adding WS auth (already deferred above).

- **Command execution timeout + output cap** — `run_shell_command` calls `.output()` with no timeout and no stdout/stderr size limit. A button saved as `sleep 600`, `yes`, `cat /dev/urandom`, or `tail -f` holds a tokio blocking-pool thread indefinitely and can OOM the companion. Mitigation: wrap in `tokio::time::timeout` (suggest 30s default) and stream output with byte cap (e.g. 64KB stderr buffer). Kill child on timeout via stored `Child` handle instead of `.output()`.
- **WS press shell-RCE surface** — Any LAN client connected to `:8089` can send `{type:"press", payload:{actionType:"command", commandValue:"..."}}` and execute arbitrary shell as the companion user, without needing the button to exist in the saved layout. Already covered conceptually by the deferred "WS auth handshake (BH-1, BH-16, BH-18)" item — re-flag here because v1.2.0 F1 widens the blast radius from "trigger known macros" to "arbitrary RCE".
- **Import-layout trust prompt** — `importLayout` now silently accepts `commandValue` from any JSON file. Importing a community-shared layout is equivalent to executing the author's shell scripts on first press. Add a per-button trust banner when importing layouts that contain `command` actions, or a one-time confirm-on-first-press for imported commands.
- **broadcast_toast stderr scrubbing** — Action errors are broadcast verbatim to every WS subscriber, including Android clients. Command stderr can contain secrets (token URLs from `git push`, `aws cli` creds). Truncate to first N chars + strip ANSI before fanout.
- **Debounce saveButtonSettings on textarea** — `@input="saveButtonSettings"` on the command textarea fires a full layout save + WS broadcast per keystroke. The existing `saveTimer` ref in `DashboardView.vue` is a dead variable. Wire it to gate the actual `updateLayout` call (proposed 200-300ms debounce). Same fix benefits shortcut/app text inputs.
- **commandValue length cap** — No upper bound on the string size. A pasted megabyte rides through every layout broadcast over WS. Cap at e.g. 4KB on the input + server-side validate.

## Won't fix (rejected)

- `serde_json::json!` with `vec![]` (BH-9) — works, no behavioural issue.
- Unused `computed` import in `App.vue` (BH-12) — tsc handles dead imports.
- Dead `'auth'` variant in `WSMessage` union (AA-25) — reserved for upcoming auth handshake, keep.
- `isAlive` closure sharing (BH-20) — superseded by reconnect detach (P-7 patch).

## S-ICON2 deferred (2026-05-25)

- **Debounce searchQuery in icon picker**: Each keypress triggers `listIcons(undefined, prefix)` + filter over 7000+ icons synchronously. Consider debouncing `searchQuery` by ~150ms for smoother typing on slow devices.
- **Module-level `iconObserver` HMR issue**: `iconObserver` is declared at module scope — in Vite HMR dev mode, the reference persists across hot-reloads, holding a stale IntersectionObserver. Refactor to component scope (`ref`) if HMR issues arise.
