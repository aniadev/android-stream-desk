---
title: 'Shell command action type'
type: 'feature'
created: '2026-05-24'
status: 'done'
baseline_commit: 'e43a913cbc088de08c5e28401e06287b3ae14a93'
context:
  - '{project-root}/_bmad-output/planning-artifacts/breakdown-v1.2.0.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ButtonConfig.actionType` supports only `shortcut`, `media`, `app`. The `app` arm calls `Command::new(appPath)` with a single executable path and no argument forwarding, so power users cannot open a URL in a specific browser (`open -a "Google Chrome" "https://..."`), chain commands, or run a one-line shell script. Currently the only workaround is to wrap each macro in a hand-crafted launcher app or batch file.

**Approach:** Add a fourth action type `command`. Frontend stores the raw shell string as `ButtonConfig.commandValue`. Rust executes it through the platform shell (`sh -c "<cmd>"` on Unix, `cmd /C <cmd>` on Windows), wrapped in `tokio::task::spawn_blocking` to keep the async executor responsive. Non-zero exit returns the captured stderr as the action error, surfacing through the existing `action-error` / `broadcast_toast` pipeline. No sanitization — feature is intentionally trust-the-user, LAN-only.

## Boundaries & Constraints

**Always:**
- Wire format camelCase: new field `commandValue?: string` on `ButtonConfig`, mirrored in Rust with `#[serde(rename = "commandValue")]`.
- Update `sanitizeLayout` (`src/stores/layout.ts:233`) so imported layouts with `actionType: "command"` survive the round-trip; also pass `commandValue` through.
- Mobile build stays compiling — the existing `#[cfg(mobile)]` stub of `execute_logic` already returns the unsupported error and covers the new arm by virtue of being a catch-all.
- Warning UI inside the Command panel: explicit Vietnamese line explaining the command runs with current user privileges.

**Ask First:**
- Adding any allow-list, deny-list, or shell-escaping. Spec position: do not add. If the user later wants safety, that is a new spec.
- Switching from `tokio::task::spawn_blocking` to `tokio::process::Command` (async, detached). Current spec uses blocking + output capture so we get stderr / exit code; async detached loses both.

**Never:**
- Do not introduce a confirmation modal before executing — every existing action type fires immediately on press; consistency matters more than friction.
- Do not log command strings anywhere persistent (no `info!`/`println!` outside the existing `eprintln!("Action failed (...)")` path on error). The command string can contain secrets if the user pastes one.
- Do not parse or split the command string in JS/TS before sending to Rust — the shell handles quoting.
- Do not extend `app` action to absorb this; keep them distinct so users can still use `app` for the simple "launch path" case.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path Unix | `commandValue = 'echo hi'`, macOS | `sh -c "echo hi"` runs, exit 0 | N/A |
| Happy path Windows | `commandValue = 'echo hi'`, Windows | `cmd /C echo hi` runs, exit 0 | N/A |
| Open URL in app (macOS) | `open -a "Google Chrome" "https://github.com"` | Chrome opens URL | N/A |
| Chained commands | `cd /tmp && ls > out.txt` | Shell handles `&&` and redirection | N/A |
| Empty command string | `commandValue = ''` or whitespace-only | Rust returns `Err("Command value is empty")` | Toast surfaces "Command value is empty" |
| Missing `commandValue` field | action_type=command, no field | Rust returns `Err("Missing command value")` | Toast surfaces error |
| Non-zero exit | `commandValue = 'false'` | Rust returns `Err(stderr or "Exit code: 1")` | Toast surfaces error |
| Command stderr only | `commandValue = 'ls /nonexistent'` | Captured stderr returned as error | Toast surfaces stderr text |
| Long-running command | `commandValue = 'sleep 30'` | Blocks the spawn_blocking thread until exit; press still acks on completion. UI shows toast on failure only. | Other presses unaffected (different tokio task) |
| Sanitize layout import | Imported JSON has `actionType: 'command'` and `commandValue: 'osascript -e ...'` | Survives `sanitizeLayout`, renders in Command panel | If `commandValue` missing/non-string → field stays undefined, executor errors on press |
| Mobile build | `cfg(mobile)` execute_logic called | Returns `Err("Macro execution unsupported on mobile client")` (existing behavior) | N/A |

</frozen-after-approval>

## Code Map

- `src/types/index.ts:1` -- Add `'command'` to `ActionType` union; add `commandValue?: string` to `ButtonConfig`.
- `src/stores/layout.ts:233` -- Extend `validActions` set and add `commandValue` passthrough in `sanitized` mapping inside `importLayout`.
- `src/views/DashboardView.vue:19` -- Widen `activeTab` ref type to include `'command'`. Around line 813, extend `v-for` tab list. Around line 947, add `<div v-else-if="activeTab === 'command'">` panel with `<textarea v-model="selectedButton.commandValue">` + warning hint.
- `src-tauri/src/lib.rs:22` -- Add `#[serde(rename = "commandValue")] command_value: Option<String>` to `ButtonConfig` struct.
- `src-tauri/src/lib.rs:137` -- Add `"command"` match arm in `execute_logic` calling new `run_shell_command(cmd).await`.
- `src-tauri/src/lib.rs:345` -- After `launch_application`, add `async fn run_shell_command(cmd: &str) -> Result<(), String>` using `tokio::task::spawn_blocking` + platform-specific `std::process::Command`.

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- Add `'command'` to `ActionType`; add `commandValue?: string` to `ButtonConfig`. Comment line documenting purpose stays minimal (one short line).
- [x] `src/stores/layout.ts` -- Inside `importLayout` sanitize loop, add `'command'` to `validActions`, and pass through `commandValue: typeof b?.commandValue === 'string' ? b.commandValue : undefined`.
- [x] `src-tauri/src/lib.rs` -- Add `command_value` field on `ButtonConfig` struct (serde rename `commandValue`). Add `"command"` arm in desktop `execute_logic` that fetches `command_value`, errors if missing/empty, then calls `run_shell_command(value).await`. Implement `async fn run_shell_command(cmd: &str) -> Result<(), String>` that spawns blocking task: trims `cmd`; on Windows uses `Command::new("cmd").args(["/C", cmd])`, otherwise `Command::new("sh").args(["-c", cmd])`; calls `.output()`; non-zero exit returns `Err(stderr_text_or_exitcode_fallback)`.
- [x] `src/views/DashboardView.vue` -- Widen `activeTab` ref to `'shortcut' | 'media' | 'app' | 'command'`. Extend tab `v-for` list to include `'command'`. After the `app` panel, add the `command` panel: `<textarea v-model="selectedButton.commandValue" rows="3" placeholder='e.g. open -a "Google Chrome" "https://github.com"' @input="saveButtonSettings" />` followed by warning text `⚠ Lệnh chạy với quyền user hiện tại — chỉ dùng cho command bạn tin cậy.` styled with the existing cyber-warning visual cues.

**Acceptance Criteria:**
- Given a button with `actionType: 'command'` and `commandValue: 'echo hi'`, when pressed from Dashboard or Android client on a desktop Companion, then the command runs through the platform shell and the press succeeds with no toast.
- Given a button with `actionType: 'command'` and empty/missing `commandValue`, when pressed, then `execute_logic` returns an error and a toast surfaces in the Dashboard.
- Given a layout exported with a Command button, when re-imported through the existing import flow, then the button keeps `actionType: 'command'` and `commandValue` survives the round-trip.
- Given the Dashboard with a button selected and the `Command` tab active, when the user types into the textarea, then `saveButtonSettings` debounces a layout write exactly like the other tabs, and a fresh broadcast reaches connected Android clients.
- Given a Windows Companion, when the user issues `commandValue: 'dir'`, then the command runs through `cmd /C` and exits 0.

## Design Notes

Shell selection rationale: invoking `sh -c "<cmd>"` (and `cmd /C <cmd>` on Windows) is what shells like fish/bash/zsh do under the hood for `system()`-style calls. This gives the user pipes, redirects, glob expansion, env-var interpolation, and quoted argument handling for free. Trying to parse the command in Rust would re-implement a shell badly.

Why `spawn_blocking` instead of `tokio::process::Command`: short, ad-hoc shell calls (open Chrome with URL, run a one-off script) finish in well under a second. We want `.output()` so we can capture stderr and the exit code to surface a meaningful toast. Async detached would silently drop both. The cost is one blocking thread per press, which is bounded by tokio's blocking pool (default 512). Acceptable for a single-user LAN tool.

Example Rust skeleton:

```rust
#[cfg(desktop)]
async fn run_shell_command(cmd: &str) -> Result<(), String> {
    let trimmed = cmd.trim();
    if trimmed.is_empty() {
        return Err("Command value is empty".to_string());
    }
    let cmd_owned = trimmed.to_string();
    tokio::task::spawn_blocking(move || {
        use std::process::Command;
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd").args(["/C", &cmd_owned]).output()
        } else {
            Command::new("sh").args(["-c", &cmd_owned]).output()
        }
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;
        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let code = output.status.code().map(|c| c.to_string()).unwrap_or_else(|| "?".into());
            Err(if stderr.is_empty() { format!("Exit code: {}", code) } else { stderr })
        }
    })
    .await
    .map_err(|e| format!("Shell task join error: {}", e))?
}
```

## Verification

**Commands:**
- `pnpm build` -- expected: vue-tsc + vite build exit 0.
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: clean.
- `cargo check --manifest-path src-tauri/Cargo.toml --target aarch64-linux-android` -- if Android toolchain installed: confirms `cfg(mobile)` stub still satisfies the new arm. Skip if toolchain not present.

**Manual checks:**
- `pnpm tauri dev`, create a button, switch to `Command` tab, paste `osascript -e 'display notification "hi"'` (macOS) or `notepad` (Windows), press it from the grid → action fires.
- Press a button with empty `commandValue` → error toast appears in Dashboard.
- Press a button with `commandValue: 'ls /nonexistent'` → toast surfaces the stderr text from `ls`.

## Suggested Review Order

**Wire type (entry point)**

- Single-line union extension. Every other change keys off this.
  [`index.ts:1`](../../src/types/index.ts#L1)

- New optional field, matches Rust serde rename.
  [`index.ts:17`](../../src/types/index.ts#L17)

**Rust execution path**

- New struct field; `#[serde(rename = "commandValue")]` keeps the JSON wire camelCase.
  [`lib.rs:38`](../../src-tauri/src/lib.rs#L38)

- New `"command"` match arm in `execute_logic`; identical error-surface pattern as `app`/`shortcut`.
  [`lib.rs:162`](../../src-tauri/src/lib.rs#L162)

- The shell wrapper itself — note absolute `/bin/sh` and `%COMSPEC%` fallback (P2 patch), and `spawn_blocking` so the async runtime stays responsive.
  [`lib.rs:397`](../../src-tauri/src/lib.rs#L397)

**Dashboard UI**

- Tab type widened to include `'command'`.
  [`DashboardView.vue:19`](../../src/views/DashboardView.vue#L19)

- Tab list extension and panel ordering (panel appears AFTER `app` panel per spec).
  [`DashboardView.vue:813`](../../src/views/DashboardView.vue#L813)

- The command panel itself — textarea + warning. Warning text mentions `/bin/sh -c` to match the Rust impl.
  [`DashboardView.vue:950`](../../src/views/DashboardView.vue#L950)

**Layout sanitize (peripheral)**

- `'command'` added to `validActions` and `commandValue` round-trips through `importLayout`.
  [`layout.ts:233`](../../src/stores/layout.ts#L233)
