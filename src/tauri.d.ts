// Tauri injects this onto window at runtime; presence indicates a Tauri context.
interface Window {
  __TAURI_INTERNALS__?: unknown;
}
