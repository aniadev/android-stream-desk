# Changelog

All notable changes to the **Android Stream Desk** project will be documented in this file.

---

## [1.3.0] - 2026-05-25

### Added
- **Monitor Button (Ambient Monitoring)**: A new display-only button type visually showing system hardware metrics (CPU / RAM percentage) using real-time information streamed from the Companion app via WebSockets.
- **Brand Icons (Simple Icons)**: Expand offline curations with `@iconify-json/simple-icons`, supplying over 80 pre-selected apps including popular brand assets such as Discord, Steam, Spotify, and GitHub.
- **Full-Pack Icon Search & Virtual Scroll**: Lifted search constraints beyond the manually curated list. Enter text, and it pulls icons from the entire @iconify collection using `getIconList()`. Incorporates lazy loaded DOM elements handling grids mapping over 7000 items seamlessly. Search input is now cleanly positioned below the pack tabs for better UX.
- **Multi-Theme Engine**: Introduced 3 custom themes globally applied & synchronized seamlessly from Desktop to Client via layout JSON config. Includes the default 'Cyber', 'Midnight' (Violet Neon), and 'Ember' (Warm Orange Retro).
- **Android Screen Wake Lock**: Utilizes the modern `navigator.wakeLock` Web API to intercept auto-sleep cycles natively for the Client WebView, seamlessly regaining active sessions upon returning to the foreground tab without asking for device app permissions.
- **Dynamic CI Build Iterations**: Github Actions now explicitly attach semantic build numbers (e.g. `android-stream-desk-v1_3_0.apk`) onto APK names during the universal generation cycle ensuring output clarity.

### Changed
- **Branding Update**: App icon has been redesigned and replaced, bringing a fresh identity look across Android & Desktop deployments.

### Fixed
- **Windows MSVC CI Stability**: Improved dependency resolutions bridging native MSVC integrations via junction fallbacks tracking `cc-rs` variables. Fixed linking fatal crashes (`cc-rs spaces-in-path crash`). The deployment CI flow now correctly detects Visual Build Tools directories.

---

## [1.2.0] - 2026-05-24

### Added
- **Shell Command Action**: New button action type `command` executes arbitrary shell commands — `sh -c` on macOS/Linux, `cmd /C` on Windows. Power users can now run scripts, open URLs in specific apps, or chain multiple commands from a single macro button. Includes a security warning in the UI.
- **Hex Color Input for Button Background**: A text input alongside the native color picker allows directly typing or pasting hex codes (`#RRGGBB` or 3-char shorthand `#RGB`). Two-way sync between text input and color swatch; invalid input reverts on blur.
- **App Picker Modal (Windows)**: Browse all installed applications from a searchable modal instead of manually typing exe paths. Features fuzzy search (Fuse.js), recently-used section, keyboard navigation (↑↓ Enter Esc), matched-character highlighting, and stale-while-revalidate caching for instant re-open.
- **Android Release APK Signing**: CI now produces a signed `app-universal-release.apk` using a keystore stored in GitHub Actions secrets. Gradle signing config reads from `keystore.properties` at runtime with a safe fallback to unsigned when secrets are absent. Includes `scripts/generate-keystore.sh` helper and `docs/release/signing-setup.md` guide.
- **Android Debug APK CI Workflow**: New `android-debug.yml` GitHub Actions workflow builds a debug APK on `workflow_dispatch` or push to the `releases` branch, uploading it as an artifact (14-day retention) — no tag or release required.

### Fixed
- **Drag-and-Drop Breaks After Grid Resize**: Buttons snapped back to old positions after changing row/column count because `vue-draggable-plus` held a stale array reference. Layout store now mutates the buttons array in-place (`splice`) instead of replacing it, preserving Sortable's reference identity.
- **Neon Glow Color Inaccuracy**: `hexToRgb` rejected 3-character hex shorthand (`#RGB`), falling back to cyan for all shorthand colors. Additionally, neon HSL was hardcoded to 90% saturation/58% lightness regardless of the original color. Now resolves shorthand via `normalizeHex` and clamps lightness to 45–70% / saturation to ≥60% while respecting the source hue.
- **GridButton Click Unreliable in Dashboard**: Sortable.js occasionally consumed fast clicks as drag-start events. Added `delay: 100ms` + `delayOnTouchOnly: true` + `touchStartThreshold: 5` to the draggable config, disambiguating taps from drags without affecting drag UX.

---

## [1.1.0] - 2026-05-24

### Added
- **Drag-and-Drop Grid Layout Reordering**: Integrated `vue-draggable-plus` to organize the button matrix through direct drag-and-drop actions.
- **Atomic Layout Serialization & Synchronization**: Fully implemented server-side live-saving (`layout.json`) with an atomic write mechanism (staged through a temporary file then renamed) to prevent layout corruption during unexpected crashes.
- **Instant Layout Import & Export**: Users can easily transfer layout matrices via backup JSON files through the desktop dashboard.
- **Improved macOS System Accessibility Permission Checker**:
  - Added backend probe capabilities (`probe_input_permission`) to detect `enigo` simulation access.
  - Implemented macOS Systems Accessibility Settings link helper (`open_accessibility_settings`) to guide users on granting permissions.
- **Cyberpunk Futuristic Styling Elements**: Custom stylized headers, active cyberpunk-styled custom scrollbars, glowing active states, and custom colors on grid matrices.

### Changed
- **Optimized Dynamic App Path Mapping**: Restructured preset shortcuts dynamically based on the Host OS (macOS paths vs. Windows executable binary pathways).
- **WebSocket Broadcast Robustness**: Handled client lagging recovery in WebSocket connection thread loops by resyning the layout payload automatically if client lag is detected.

---

## [1.0.0] - 2026-05-18

### Added
- **Companion WebSocket Server**: Lightweight, low-overhead TCP server running on port `8089` handling asynchronous client inputs, keeping real-time device connection alive.
- **Multi-protocol Action Execution Engine**:
  - **Keystroke / Hotkey Simulation**: Thread-safe hotkey emulation using the `enigo` library with an overarching concurrency lock (`ENIGO_LOCK`) preventing interleaved modifier states.
  - **System Media Keys Control**: Quick-actions simulating standard media playback keys (Play/Pause, Next/Prev Track, Vol Up/Down, Mute).
  - **Launch Applications**: Cross-platform system processes spawning supporting macOS (`open --`), Windows, and Linux (`xdg-open`).
- **Intelligent Local IP Discovery**: Leverages active UDP socket routing lookup without dispatching actual packets to safely discover local LAN IPv4 addresses.
- **Dashboard Configuration Editor UI**: Vue 3 + Tailwind framework layout builder, enabling labels, emojis, active custom icons (`Lucide`, `MDI`, `Material Icons` via `@iconify/vue`), and background colors customization on any key button.
- **Intuitive Modifier Hold Pre-Arm Mode**: Enables users to manually arm mod keys (`Ctrl` + `Shift` + `Alt` + `Meta`) inside the recorder interface to record shortcuts without triggering localized OS hotkey traps (Cmd+Q/Alt+F4).
- **Graceful Window Close Behavior & System Tray Integration**:
  - Implemented desktop menu-bar integration featuring "Mở Dashboard" and "Thoát".
  - Prevented window termination on clicking standard exit buttons; instead, minimizes to system tray silently preserving active server threads.
  - Added Single Instance Locking using `tauri-plugin-single-instance`.
