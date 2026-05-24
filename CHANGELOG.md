# Changelog

All notable changes to the **Android Stream Desk** project will be documented in this file.

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
