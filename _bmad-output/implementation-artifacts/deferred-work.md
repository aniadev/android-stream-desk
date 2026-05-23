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

## Won't fix (rejected)

- `serde_json::json!` with `vec![]` (BH-9) — works, no behavioural issue.
- Unused `computed` import in `App.vue` (BH-12) — tsc handles dead imports.
- Dead `'auth'` variant in `WSMessage` union (AA-25) — reserved for upcoming auth handshake, keep.
- `isAlive` closure sharing (BH-20) — superseded by reconnect detach (P-7 patch).
