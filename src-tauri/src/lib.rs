#[cfg(desktop)]
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::{IpAddr, UdpSocket};
#[cfg(desktop)]
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Listener, Manager};

pub mod websocket;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub mod metrics;

pub const WS_PORT: u16 = 8089;

// Serialises all key/media calls so concurrent presses cannot interleave
// modifier state across tasks. Enigo is not Send on macOS, so we hold a
// lock around a per-call Enigo instance instead of storing one statically.
#[cfg(desktop)]
lazy_static::lazy_static! {
    static ref ENIGO_LOCK: Mutex<()> = Mutex::new(());
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ButtonConfig {
    id: String,
    label: String,
    emoji: Option<String>,
    icon: Option<String>,
    #[serde(rename = "backgroundColor")]
    background_color: String,
    #[serde(rename = "actionType")]
    action_type: String,
    #[serde(rename = "shortcutValue")]
    shortcut_value: Option<String>,
    #[serde(rename = "mediaAction")]
    media_action: Option<String>,
    #[serde(rename = "appPath")]
    app_path: Option<String>,
    #[serde(rename = "commandValue")]
    command_value: Option<String>,
    #[serde(rename = "buttonKind")]
    button_kind: Option<String>,
    #[serde(rename = "monitorConfig")]
    monitor_config: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Layout {
    pub rows: u32,
    pub cols: u32,
    pub buttons: Vec<ButtonConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub theme: Option<String>,
}

// -------------------------------------------------------------
// Tauri IPC Commands
// -------------------------------------------------------------

#[tauri::command]
async fn save_layout_config(app_handle: AppHandle, layout: Value) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve AppConfig: {}", e))?;

    tokio::fs::create_dir_all(&app_dir)
        .await
        .map_err(|e| format!("Failed creating directory: {}", e))?;

    let serialized = serde_json::to_string_pretty(&layout).map_err(|e| e.to_string())?;
    let final_path = app_dir.join("layout.json");
    let tmp_path = app_dir.join("layout.json.tmp");

    // Atomic write: stage to a temp file then rename — no partial layout
    // survives a crash mid-write.
    tokio::fs::write(&tmp_path, serialized)
        .await
        .map_err(|e| format!("Failed staging layout file: {}", e))?;
    tokio::fs::rename(&tmp_path, &final_path)
        .await
        .map_err(|e| format!("Failed committing layout file: {}", e))?;

    websocket::broadcast_layout_to_clients(layout).await;

    Ok(())
}

#[tauri::command]
async fn execute_button_action(
    app_handle: AppHandle,
    button: ButtonConfig,
) -> Result<(), String> {
    execute_logic(app_handle, button).await
}

#[derive(Serialize, Clone, Debug)]
pub struct ServerInfo {
    pub ip: String,
    pub port: u16,
}

#[tauri::command]
fn get_server_info() -> ServerInfo {
    ServerInfo {
        ip: detect_local_ipv4().unwrap_or_else(|| "127.0.0.1".to_string()),
        port: WS_PORT,
    }
}

// Orientation is enforced via AndroidManifest `screenOrientation` at build time.
// Runtime control through JNI requires a proper Tauri Android plugin (Kotlin
// shim + plugin-handle Activity access). Until that lands, this stub keeps the
// IPC surface stable so the frontend invoke does not throw.
#[tauri::command]
fn set_android_orientation(_mode: i32) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|e| format!("Mở System Settings thất bại: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Chỉ hỗ trợ macOS".to_string())
    }
}

fn detect_local_ipv4() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    // No packet is actually sent — connect() only triggers the kernel
    // routing table lookup so local_addr() returns the LAN-facing IPv4.
    socket.connect("192.0.2.1:1").ok()?;
    match socket.local_addr().ok()?.ip() {
        IpAddr::V4(v4) if !v4.is_loopback() && !v4.is_unspecified() => Some(v4.to_string()),
        _ => None,
    }
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
    pub publisher: Option<String>,
}

#[cfg(target_os = "windows")]
fn list_installed_apps_windows() -> Vec<InstalledApp> {
    use std::collections::HashMap;
    use winreg::enums::*;
    use winreg::RegKey;

    let hives: &[(RegKey, &str)] = &[
        (RegKey::predef(HKEY_LOCAL_MACHINE), r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (RegKey::predef(HKEY_LOCAL_MACHINE), r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (RegKey::predef(HKEY_CURRENT_USER), r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ];

    let mut apps: Vec<InstalledApp> = Vec::new();

    for (hive, path) in hives {
        let uninstall_key = match hive.open_subkey_with_flags(path, KEY_READ) {
            Ok(k) => k,
            Err(_) => continue,
        };
        for name in uninstall_key.enum_keys().filter_map(|n| n.ok()) {
            let subkey = match uninstall_key.open_subkey_with_flags(&name, KEY_READ) {
                Ok(k) => k,
                Err(_) => continue,
            };

            let display_name: Option<String> = subkey.get_value("DisplayName").ok();
            let display_icon: Option<String> = subkey.get_value("DisplayIcon").ok();
            let install_location: Option<String> = subkey.get_value("InstallLocation").ok();
            let publisher: Option<String> = subkey.get_value("Publisher").ok();
            let system_component: Option<u32> = subkey.get_value("SystemComponent").ok();

            let dn = match display_name {
                Some(ref s) if !s.trim().is_empty() => s,
                _ => continue,
            };

            if system_component == Some(1) {
                continue;
            }

            let dn_lower = dn.to_lowercase();
            let is_junk = dn_lower.contains("update for")
                || dn_lower.contains("hotfix")
                || dn_lower.contains("security update")
                || dn_lower.contains("redistributable")
                || (dn_lower.starts_with("kb") && dn[2..].chars().next().is_some_and(|c| c.is_ascii_digit()));
            if is_junk {
                continue;
            }

            let exe_path = resolve_exe_path(display_icon.as_deref(), install_location.as_deref());
            let path = match exe_path {
                Some(p) => p,
                None => continue,
            };

            let icon = display_icon.map(|s| {
                let stripped = s.rsplit_once(',').map(|(base, _)| base).unwrap_or(&s);
                let lower = stripped.to_lowercase();
                if lower.ends_with(".exe") || lower.ends_with(".ico") {
                    stripped.to_string()
                } else {
                    path.clone()
                }
            });

            apps.push(InstalledApp {
                name: dn.clone(),
                path,
                icon,
                publisher,
            });
        }
    }

    let mut seen: HashMap<String, InstalledApp> = HashMap::new();
    for app in apps {
        let key = app.path.to_lowercase();
        seen.entry(key)
            .and_modify(|existing| {
                if existing.publisher.is_none() && app.publisher.is_some() {
                    existing.publisher = app.publisher.clone();
                }
            })
            .or_insert(app);
    }

    let mut result: Vec<InstalledApp> = seen.into_values().collect();
    result.sort_by_key(|a| a.name.to_lowercase());
    result
}

#[cfg(target_os = "windows")]
fn resolve_exe_path(display_icon: Option<&str>, install_location: Option<&str>) -> Option<String> {
    use std::path::Path;

    if let Some(icon) = display_icon {
        let stripped = icon.rsplit_once(',').map(|(base, _)| base).unwrap_or(icon);
        let path = Path::new(stripped);
        let lower = stripped.to_lowercase();
        if lower.ends_with(".exe") && path.exists() {
            return Some(stripped.to_string());
        }
    }

    if let Some(loc) = install_location {
        let dir = Path::new(loc.trim());
        if !dir.exists() || !dir.is_dir() {
            return None;
        }
        let mut best: Option<(String, u64)> = None;
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let fpath = entry.path();
                let fname = fpath.to_string_lossy().to_lowercase();
                if fname.ends_with(".exe") {
                    let size = std::fs::metadata(&fpath).map(|m| m.len()).unwrap_or(0);
                    if best.as_ref().is_none_or(|(_, s)| size > *s) {
                        best = Some((fpath.to_string_lossy().to_string(), size));
                    }
                }
            }
        }
        return best.map(|(p, _)| p);
    }

    None
}

#[tauri::command]
fn list_installed_apps() -> Vec<InstalledApp> {
    #[cfg(target_os = "windows")]
    {
        list_installed_apps_windows()
    }
    #[cfg(not(target_os = "windows"))]
    {
        eprintln!("list_installed_apps: not supported on this platform");
        Vec::new()
    }
}

// -------------------------------------------------------------
// Core Macro Action Execution (Enigo / Media / App Exec)
// -------------------------------------------------------------

#[cfg(desktop)]
async fn execute_logic(app_handle: AppHandle, button: ButtonConfig) -> Result<(), String> {
    if button.button_kind.as_deref() == Some("monitor") {
        return Ok(());
    }
    let result = match button.action_type.as_str() {
        "shortcut" => {
            let shortcut = button
                .shortcut_value
                .as_deref()
                .ok_or_else(|| "Missing shortcut value".to_string())?;
            simulate_shortcut(shortcut)
        }
        "media" => {
            let media = button
                .media_action
                .as_deref()
                .ok_or_else(|| "Missing media action".to_string())?;
            simulate_media(media)
        }
        "app" => {
            let path = button
                .app_path
                .as_deref()
                .ok_or_else(|| "Missing application path".to_string())?;
            launch_application(path)
        }
        "command" => {
            let cmd = button
                .command_value
                .as_deref()
                .ok_or_else(|| "Missing command value".to_string())?;
            run_shell_command(cmd).await
        }
        other => Err(format!("Unsupported action type: {}", other)),
    };

    if let Err(ref msg) = result {
        eprintln!("Action failed ({}): {}", button.action_type, msg);
        let payload = serde_json::json!({
            "buttonId": button.id,
            "kind": "error",
            "error": msg,
        });
        let _ = app_handle.emit("action-error", payload.clone());
        websocket::broadcast_toast(payload).await;
    }
    result
}

// Android/iOS clients only send button presses to the Companion over WS —
// macros are executed server-side, never on-device. Stub keeps the IPC
// command compiling on mobile without dragging X11/enigo into the build.
#[cfg(mobile)]
async fn execute_logic(_app_handle: AppHandle, _button: ButtonConfig) -> Result<(), String> {
    Err("Macro execution unsupported on mobile client".to_string())
}

#[cfg(desktop)]
fn parse_modifier(token: &str) -> Option<Key> {
    match token.to_lowercase().as_str() {
        "ctrl" | "control" => Some(Key::Control),
        "shift" => Some(Key::Shift),
        "alt" | "option" => Some(Key::Alt),
        "meta" | "win" | "super" | "command" | "cmd" => Some(Key::Meta),
        _ => None,
    }
}

#[cfg(desktop)]
fn parse_key(token: &str) -> Option<Key> {
    match token.to_lowercase().as_str() {
        "f1" => Some(Key::F1),
        "f2" => Some(Key::F2),
        "f3" => Some(Key::F3),
        "f4" => Some(Key::F4),
        "f5" => Some(Key::F5),
        "f6" => Some(Key::F6),
        "f7" => Some(Key::F7),
        "f8" => Some(Key::F8),
        "f9" => Some(Key::F9),
        "f10" => Some(Key::F10),
        "f11" => Some(Key::F11),
        "f12" => Some(Key::F12),
        "space" => Some(Key::Space),
        "enter" | "return" => Some(Key::Return),
        "tab" => Some(Key::Tab),
        "escape" | "esc" => Some(Key::Escape),
        "backspace" => Some(Key::Backspace),
        "delete" | "del" => Some(Key::Delete),
        "pgup" | "pageup" => Some(Key::PageUp),
        "pgdn" | "pgdown" | "pagedown" => Some(Key::PageDown),
        "home" => Some(Key::Home),
        "end" => Some(Key::End),
        "up" | "arrowup" => Some(Key::UpArrow),
        "down" | "arrowdown" => Some(Key::DownArrow),
        "left" | "arrowleft" => Some(Key::LeftArrow),
        "right" | "arrowright" => Some(Key::RightArrow),
        other if other.chars().count() == 1 => other.chars().next().map(Key::Unicode),
        _ => None,
    }
}

#[cfg(desktop)]
fn parse_shortcut(shortcut: &str) -> Result<(Vec<Key>, Key), String> {
    let parts: Vec<&str> = shortcut
        .split('+')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();
    if parts.is_empty() {
        return Err(format!("Empty shortcut: '{}'", shortcut));
    }
    let mut modifiers: Vec<Key> = Vec::new();
    let mut base: Option<Key> = None;
    for part in parts {
        if let Some(m) = parse_modifier(part) {
            modifiers.push(m);
        } else if let Some(k) = parse_key(part) {
            if base.is_some() {
                return Err(format!(
                    "Shortcut '{}' has multiple base keys",
                    shortcut
                ));
            }
            base = Some(k);
        } else {
            return Err(format!("Unrecognized key token: '{}'", part));
        }
    }
    let base = base.ok_or_else(|| {
        format!("Shortcut '{}' has only modifiers and no base key", shortcut)
    })?;
    Ok((modifiers, base))
}

#[cfg(desktop)]
fn enigo_init_err(e: impl std::fmt::Display) -> String {
    #[cfg(target_os = "macos")]
    {
        format!(
            "Không khởi tạo được Enigo: {}. macOS yêu cầu Accessibility permission. Mở System Settings → Privacy & Security → Accessibility. Nếu vừa build lại app, XOÁ entry cũ \"Android Stream Desk\" trong danh sách rồi kéo app mới vào và bật lại (chữ ký thay đổi sau mỗi build).",
            e
        )
    }
    #[cfg(not(target_os = "macos"))]
    {
        format!("Không khởi tạo được Enigo: {}", e)
    }
}

#[tauri::command]
fn probe_input_permission() -> bool {
    #[cfg(desktop)]
    {
        let Ok(_guard) = ENIGO_LOCK.lock() else {
            return false;
        };
        Enigo::new(&Settings::default()).is_ok()
    }
    #[cfg(not(desktop))]
    {
        true
    }
}

#[cfg(desktop)]
fn simulate_shortcut(shortcut: &str) -> Result<(), String> {
    let (modifiers, base_key) = parse_shortcut(shortcut)?;
    let _guard = ENIGO_LOCK
        .lock()
        .map_err(|e| format!("Enigo lock poisoned: {}", e))?;

    let settings = Settings::default();
    let mut enigo = Enigo::new(&settings).map_err(enigo_init_err)?;

    // Press modifiers; on first failure release ones already pressed and bail.
    for (idx, m) in modifiers.iter().enumerate() {
        if let Err(e) = enigo.key(*m, Direction::Press) {
            for already in modifiers[..idx].iter().rev() {
                let _ = enigo.key(*already, Direction::Release);
            }
            return Err(format!("Modifier press failed ({:?}): {}", m, e));
        }
    }

    let click_result = enigo
        .key(base_key, Direction::Click)
        .map_err(|e| format!("Key click failed ({:?}): {}", base_key, e));

    // Always release modifiers — never leave Ctrl/Shift held down.
    for m in modifiers.iter().rev() {
        let _ = enigo.key(*m, Direction::Release);
    }

    click_result
}

#[cfg(desktop)]
fn simulate_media(action: &str) -> Result<(), String> {
    let key = match action {
        "play_pause" => Key::MediaPlayPause,
        "volume_up" => Key::VolumeUp,
        "volume_down" => Key::VolumeDown,
        "mute" => Key::VolumeMute,
        "next" => Key::MediaNextTrack,
        "prev" => Key::MediaPrevTrack,
        _ => return Err(format!("Unsupported media key: {}", action)),
    };

    let _guard = ENIGO_LOCK
        .lock()
        .map_err(|e| format!("Enigo lock poisoned: {}", e))?;
    let mut enigo = Enigo::new(&Settings::default()).map_err(enigo_init_err)?;
    enigo
        .key(key, Direction::Click)
        .map_err(|e| format!("Media key failed: {}", e))
}

#[cfg(desktop)]
fn launch_application(path: &str) -> Result<(), String> {
    use std::path::Path;
    use std::process::Command;

    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Application path is empty".to_string());
    }
    let target = Path::new(trimmed);
    if !target.exists() {
        return Err(format!("Application path does not exist: {}", trimmed));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new(trimmed)
            .spawn()
            .map_err(|e| format!("Failed to spawn App process: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("--")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Failed to spawn macOS process: {}", e))?;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg("--")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Failed to spawn process: {}", e))?;
    }

    Ok(())
}

#[cfg(desktop)]
async fn run_shell_command(cmd: &str) -> Result<(), String> {
    let trimmed = cmd.trim();
    if trimmed.is_empty() {
        return Err("Command value is empty".to_string());
    }
    let cmd_owned = trimmed.to_string();
    tokio::task::spawn_blocking(move || {
        use std::process::Command;
        // Use absolute / env-resolved shell paths so a mutated PATH cannot
        // swap in a different shell than the user expects.
        let output = if cfg!(target_os = "windows") {
            let shell = std::env::var("ComSpec").unwrap_or_else(|_| "cmd.exe".to_string());
            Command::new(shell).args(["/C", &cmd_owned]).output()
        } else {
            Command::new("/bin/sh").args(["-c", &cmd_owned]).output()
        }
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;
        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let code = output
                .status
                .code()
                .map(|c| c.to_string())
                .unwrap_or_else(|| "?".to_string());
            Err(if stderr.is_empty() {
                format!("Exit code: {}", code)
            } else {
                stderr
            })
        }
    })
    .await
    .map_err(|e| format!("Shell task join error: {}", e))?
}

// -------------------------------------------------------------
// Tauri Initializer Bridge entry
// -------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // NOTE: tauri-plugin-updater is wired in Cargo + capability list but not
    // initialised here yet — it needs a signing pubkey + endpoint in
    // tauri.conf.json (generated via `pnpm tauri signer generate` during
    // release prep). Re-enable when minisign key lands.
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .invoke_handler(tauri::generate_handler![
            save_layout_config,
            execute_button_action,
            get_server_info,
            set_android_orientation,
            open_accessibility_settings,
            probe_input_permission,
            list_installed_apps
        ])
        .setup(|app| {
            let app_handle_ws = app.handle().clone();
            let app_handle_listener = app.handle().clone();

            #[cfg(desktop)]
            setup_tray(app.handle())?;

            // Spawn localized tokio WS thread pool on start
            tauri::async_runtime::spawn(async move {
                websocket::start_ws_server(WS_PORT, app_handle_ws).await;
            });

            // Spawn metrics broadcast loop (desktop only)
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let config_dir = app
                    .path()
                    .app_config_dir()
                    .map_err(|e| format!("Failed to resolve config dir: {}", e))?;
                tauri::async_runtime::spawn(async move {
                    metrics::metrics_loop(config_dir).await;
                });
            }

            // Proxy listen event triggered from WS client loop
            app.listen("trigger-macro", move |event| {
                if let Ok(button) = serde_json::from_str::<ButtonConfig>(event.payload()) {
                    let handle = app_handle_listener.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = execute_logic(handle, button).await;
                    });
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window hides it to tray instead of quitting.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(desktop)]
fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let show_item = MenuItem::with_id(app, "show", "Mở Dashboard", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Thoát", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("Android Stream Desk Companion")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => focus_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                focus_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

#[cfg(desktop)]
fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
