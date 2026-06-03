# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Android Stream Desk: a self-hosted, LAN-only macro pad. One Tauri v2 codebase ships **two roles** from the same binary, switched purely by Vue route:

- `/dashboard` → Windows/macOS **Companion** (server): runs a Tokio WebSocket server on port `8089`, executes macros via `enigo`, persists layout JSON to `app_config_dir()`.
- `/` → Android **Client**: connects to the companion over LAN, renders the grid, sends button presses.

There is no separate Android source tree — the same Vue app is loaded on both sides; behavior diverges by route and by `window.__TAURI_INTERNALS__` presence checks.

Read `AGENTS.md` before touching Rust — it documents non-obvious compile failures the original author hit.

## Common commands

```bash
pnpm install                  # frontend deps (Node 18+, pnpm required)
pnpm tauri dev                # run Companion (desktop) with Vue HMR — opens window AND http://localhost:1420
pnpm tauri android dev        # run Client on Android emulator/device
pnpm build                    # vue-tsc -b && vite build (frontend type-check + bundle)
pnpm tauri build              # Windows/macOS installer → src-tauri/target/release/bundle/
pnpm tauri android build      # APK → src-tauri/gen/android/app/build/outputs/apk/release/
cargo check --manifest-path src-tauri/Cargo.toml   # fast Rust type-check without launching app
```

Dev server runs on **fixed** port 1420 (`strictPort: true` in `vite.config.ts`) with HMR on 1421, bound to `0.0.0.0` so an Android dev build can reach the host. The WebSocket server is a **separate** port (`8089`) started by Rust in `setup()`.

There is no test suite, lint config, or CI runner currently committed — don't claim "tests pass"; there are none to run.

## Architecture

### Two-process message flow

```
Android Client ──ws──> Companion :8089 ──tauri::Emitter──> "trigger-macro" listener ──> execute_logic ──> enigo
                                            │
Dashboard (same app) ──invoke("save_layout_config")──> writes layout.json ──> broadcast_layout_to_clients ──> all WS subscribers
```

- WS message envelope: `{ type: "ping"|"pong"|"press"|"sync_layout"|"toast", payload }`. Defined as `WSMessage` in both `src-tauri/src/websocket.rs` and `src/types/`.
- New WS clients are immediately seeded with current layout via `send_current_layout` (reads `layout.json` or falls back to `default_layout`).
- Layout writes are **atomic**: stage to `layout.json.tmp`, then rename — see `save_layout_config` in `src-tauri/src/lib.rs`. Don't replace with a direct write.
- Broadcast channel uses a `tokio::sync::broadcast` with capacity 256; on `Lagged`, the per-client loop resyncs the full layout rather than dropping.

### Frontend state

- Pinia stores in `src/stores/`:
  - `connection.ts` — owns the `WebSocket`, heartbeat (ping every 5s, dead if no traffic between ticks), auto-reconnect every 3s. Note the `socket.value !== ws` stale-close guard in `onclose` — preserve it; without it a superseded socket's async close resets a freshly-opened one's status.
  - `layout.ts` — single source of truth for the grid. The `ws-message` `CustomEvent` bridge is the path WS payloads take into Pinia; `wsListenerAttached` module flag prevents duplicate listeners across HMR.
- `layout.ts` branches on `window.__TAURI_INTERNALS__` to decide between IPC (`invoke('save_layout_config')` / `invoke('execute_button_action')`) and pure-WS paths — the same component runs in both companion and client contexts.
- `lastToast` in the layout store is how server-side action errors surface in the UI (see `broadcast_toast` in Rust).

### Rust entry

- `src-tauri/src/main.rs` calls `android_stream_desk::run()` — note the underscore (Cargo converts dashes in the crate name). Don't try `android_stream_desk_lib::run()`.
- `lib.rs::run()` is `#[cfg_attr(mobile, tauri::mobile_entry_point)]`, so the same function is the mobile entry point.
- Desktop-only features (tray, single-instance, close-to-tray) are gated by `#[cfg(desktop)]`. The main window's close button **hides** to tray; only the tray "Thoát" menu actually exits.
- `tauri-plugin-updater` is declared in `Cargo.toml` and capabilities but **not initialised** in `run()` — wiring requires a minisign pubkey + endpoint in `tauri.conf.json`. Don't enable it until the key lands.

## Critical Rust gotchas (will fail compile if violated)

These are from `AGENTS.md` — please re-read that file when changing `enigo`, `Manager`, icons, or Cargo metadata.

1. **`Enigo` is not `Send` on macOS.** Never store an `Enigo` in a `Mutex`/`lazy_static`/`OnceCell`. Always instantiate **inside** the function that uses it. The repo holds a `Mutex<()>` named `ENIGO_LOCK` purely for **serialisation**; the lock guard is `_guard` and the `Enigo` is created fresh under it. Preserve this pattern.
2. **Modifier press/release symmetry.** `simulate_shortcut` is hand-written to release modifiers in reverse order under both success and failure paths — without this you get stuck `Ctrl`/`Shift` system-wide after any click failure. Do not "simplify" this with `?`.
3. **Import `tauri::Manager`** in any file that calls `.path()` on an `AppHandle` / `App` — error message is misleading (`no method named path`).
4. **Icons must be valid RGBA PNGs.** `tauri::generate_context!()` panics at compile time on 0-byte or non-RGBA icons under `src-tauri/icons/`.

## CodeGraph

`.codegraph/` is initialised in this repo. Per the global instructions, prefer `codegraph_context` / `codegraph_search` / `codegraph_callers` over grep + read loops for structural questions — the index covers both the Rust and Vue/TS code.

## File map worth knowing

| Path | Role |
|---|---|
| `src-tauri/src/lib.rs` | All Tauri commands, macro execution, shortcut parser, tray, run() |
| `src-tauri/src/websocket.rs` | Tokio WS server, broadcast channel, per-client loop, layout seeding |
| `src-tauri/capabilities/default.json` | ACL — only `core:default` today; add capabilities here, not in `tauri.conf.json` |
| `src/main.ts` | Router setup — the **only** place routes are declared |
| `src/stores/connection.ts` | WS client + heartbeat + reconnect |
| `src/stores/layout.ts` | Grid state, IPC↔WS bridge, toast surface |
| `src/views/ClientView.vue` | Android-facing macro pad |
| `src/views/DashboardView.vue` | Companion-facing editor |
| `_bmad-output/` | BMad planning/spec artifacts — context, not source; don't edit as part of feature work |

## Conventions observed in this repo

- Vietnamese in user-facing strings, comments, and tray menu labels is intentional — keep it when editing those strings, don't translate to English.
- `serde` field renames use `#[serde(rename = "camelCase")]` to keep the wire format camelCase while Rust stays snake_case. Match this when adding fields to `ButtonConfig` / `WSMessage`.
- The WS port (`8089`) is exposed as `pub const WS_PORT` in `lib.rs` — reference the constant, don't hardcode.
- Khi edit markdown file, không tự ý ngắt dòng nếu chưa kết thúc câu.
- LUÔN LUÔN MỞ ĐẦU CÂU TRẢ LỜI BẰNG "Hey Ania", TRẢ LỜI TRONG CHAT BẰNG TIẾNG VIỆT, EDIT FILE MARKDOWN BẰNG TIẾNG VIỆT TRỪ KHI CÓ YÊU CẦU VIẾT BẰNG TIẾNG ANH
