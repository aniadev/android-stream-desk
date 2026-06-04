#[cfg(desktop)]
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::{IpAddr, UdpSocket};
use std::path::Path;
#[cfg(desktop)]
use std::sync::Mutex;
#[cfg(desktop)]
use tauri::Emitter;
use tauri::{AppHandle, Listener, Manager};

pub mod accessibility;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub mod metrics;
pub mod webserver;
pub mod websocket;

pub const WS_PORT: u16 = 8089;
pub const WEB_PORT: u16 = 8090;
const SERVER_CONFIG_FILE: &str = "server.json";
const MIN_USER_PORT: u16 = 1024;
const MAX_USER_PORT: u16 = 65535;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    pub ws_port: u16,
    pub web_enabled: bool,
    pub web_port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            ws_port: WS_PORT,
            web_enabled: false,
            web_port: WEB_PORT,
        }
    }
}

fn validate_port(name: &str, port: u16) -> Result<(), String> {
    if (MIN_USER_PORT..=MAX_USER_PORT).contains(&port) {
        Ok(())
    } else {
        Err(format!(
            "{} must be in range {}..={}",
            name, MIN_USER_PORT, MAX_USER_PORT
        ))
    }
}

fn validate_server_config(config: &ServerConfig) -> Result<(), String> {
    validate_port("wsPort", config.ws_port)?;
    validate_port("webPort", config.web_port)?;

    if config.web_enabled && config.ws_port == config.web_port {
        return Err("wsPort and webPort must be different when webEnabled is true".to_string());
    }

    Ok(())
}

async fn load_server_config_from_dir(app_dir: &Path) -> ServerConfig {
    let config_path = app_dir.join(SERVER_CONFIG_FILE);
    let content = match tokio::fs::read_to_string(config_path).await {
        Ok(content) => content,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let default_config = ServerConfig::default();
            let _ = save_server_config_to_dir(app_dir, &default_config).await;
            return default_config;
        }
        Err(_) => return ServerConfig::default(),
    };
    let Ok(config) = serde_json::from_str::<ServerConfig>(&content) else {
        return ServerConfig::default();
    };

    if validate_server_config(&config).is_ok() {
        config
    } else {
        ServerConfig::default()
    }
}

async fn save_server_config_to_dir(app_dir: &Path, config: &ServerConfig) -> Result<(), String> {
    validate_server_config(config)?;

    tokio::fs::create_dir_all(app_dir)
        .await
        .map_err(|e| format!("Failed creating directory: {}", e))?;

    let serialized = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    let final_path = app_dir.join(SERVER_CONFIG_FILE);
    let tmp_path = app_dir.join(format!("{}.tmp", SERVER_CONFIG_FILE));

    tokio::fs::write(&tmp_path, serialized)
        .await
        .map_err(|e| format!("Failed staging server config: {}", e))?;
    tokio::fs::rename(&tmp_path, &final_path)
        .await
        .map_err(|e| format!("Failed committing server config: {}", e))?;

    Ok(())
}

async fn load_server_config_for_app(app_handle: &AppHandle) -> Result<ServerConfig, String> {
    let app_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve AppConfig: {}", e))?;

    Ok(load_server_config_from_dir(&app_dir).await)
}

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
    #[serde(rename = "linkUrl")]
    link_url: Option<String>,
    #[serde(rename = "buttonKind")]
    button_kind: Option<String>,
    #[serde(rename = "monitorConfig")]
    monitor_config: Option<serde_json::Value>,
    #[serde(rename = "iconSizing")]
    icon_sizing: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Page {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub buttons: Vec<ButtonConfig>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Layout {
    pub rows: u32,
    pub cols: u32,
    pub buttons: Vec<ButtonConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pages: Option<Vec<Page>>,
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
async fn get_server_config(app_handle: AppHandle) -> Result<ServerConfig, String> {
    load_server_config_for_app(&app_handle).await
}

#[tauri::command]
async fn save_server_config(app_handle: AppHandle, config: ServerConfig) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve AppConfig: {}", e))?;

    save_server_config_to_dir(&app_dir, &config).await
}

#[tauri::command]
async fn export_layout_to_path(path: String, layout: serde_json::Value) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(&layout).map_err(|e| e.to_string())?;
    let final_path = std::path::PathBuf::from(&path);
    let tmp_path = final_path.with_extension("json.tmp");
    tokio::fs::write(&tmp_path, serialized)
        .await
        .map_err(|e| format!("Failed staging export: {}", e))?;
    tokio::fs::rename(&tmp_path, &final_path)
        .await
        .map_err(|e| format!("Failed committing export: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn execute_button_action(app_handle: AppHandle, button: ButtonConfig) -> Result<(), String> {
    execute_logic(app_handle, button).await
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ListenerBindError {
    pub port: u16,
    pub error: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ListenerBindStatus {
    pub ready: bool,
    pub running_port: Option<u16>,
    pub bind_error: Option<ListenerBindError>,
}

impl ListenerBindStatus {
    pub fn ready(port: u16) -> Self {
        Self {
            ready: true,
            running_port: Some(port),
            bind_error: None,
        }
    }

    pub fn bind_error(port: u16, error: String) -> Self {
        Self {
            ready: false,
            running_port: None,
            bind_error: Some(ListenerBindError { port, error }),
        }
    }
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub ip: String,
    pub port: u16,
    pub configured_ws_port: u16,
    pub running_ws_port: Option<u16>,
    pub web_enabled: bool,
    pub web_port: u16,
    pub ws_ready: bool,
    pub ws_bind_error: Option<ListenerBindError>,
    pub web_ready: bool,
    pub web_bind_error: Option<ListenerBindError>,
}

impl ServerInfo {
    fn from_config_and_bind_status(
        ip: String,
        config: &ServerConfig,
        ws_status: ListenerBindStatus,
        web_status: ListenerBindStatus,
    ) -> Self {
        Self {
            ip,
            port: config.ws_port,
            configured_ws_port: config.ws_port,
            running_ws_port: ws_status.running_port,
            web_enabled: config.web_enabled,
            web_port: config.web_port,
            ws_ready: ws_status.ready,
            ws_bind_error: ws_status.bind_error,
            web_ready: config.web_enabled && web_status.ready,
            web_bind_error: if config.web_enabled {
                web_status.bind_error
            } else {
                None
            },
        }
    }
}

#[tauri::command]
async fn get_server_info(app_handle: AppHandle) -> ServerInfo {
    let config = load_server_config_for_app(&app_handle)
        .await
        .unwrap_or_else(|_| ServerConfig::default());

    ServerInfo::from_config_and_bind_status(
        detect_local_ipv4().unwrap_or_else(|| "127.0.0.1".to_string()),
        &config,
        websocket::current_ws_bind_status(),
        webserver::current_web_bind_status(),
    )
}

// Orientation is enforced via AndroidManifest `screenOrientation` at build time.
// Runtime control was attempted through ndk_context + JNI but panicked on the tao
// event-loop thread, and with `panic = "abort"` that took the whole process down
// (SIGABRT). Reverted to this no-op stub so the IPC surface stays stable; a proper
// runtime toggle needs a native MainActivity/Kotlin plugin, not Rust-side JNI.
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
fn scan_start_menu_shortcuts() -> Vec<InstalledApp> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut apps = Vec::new();

    // Resolve every .lnk under both Start Menu trees in a SINGLE PowerShell run.
    // Spawning one process per shortcut froze the App Picker for seconds on
    // machines with hundreds of shortcuts; one batched COM walk is ~1 process.
    // Each emitted line: "<BaseName>\t<resolved target (quoted) + args>".
    let script = r#"$ErrorActionPreference='SilentlyContinue';
$dirs=@();
if($env:ProgramData){$dirs+=Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'}
if($env:AppData){$dirs+=Join-Path $env:AppData 'Microsoft\Windows\Start Menu\Programs'}
$sh=New-Object -ComObject WScript.Shell;
foreach($d in $dirs){
  if(Test-Path $d){
    Get-ChildItem -Path $d -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
      $lnk=$sh.CreateShortcut($_.FullName);
      $t=$lnk.TargetPath;
      if($t){
        $a=$lnk.Arguments;
        if($a){$p="`"$t`" $a"}else{$p=$t}
        "$($_.BaseName)`t$p"
      }
    }
  }
}"#;

    let out = match Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        Ok(o) => o,
        Err(_) => return apps,
    };

    let stdout = String::from_utf8_lossy(&out.stdout);
    for line in stdout.lines() {
        let line = line.trim_end_matches('\r');
        if line.is_empty() {
            continue;
        }
        let mut parts = line.splitn(2, '\t');
        let name = parts.next().unwrap_or("").trim().to_string();
        let resolved = match parts.next() {
            Some(p) => p.trim().to_string(),
            None => continue,
        };
        if resolved.is_empty() {
            continue;
        }

        // Isolate the bare target exe (strip quotes/args) for the icon heuristic.
        let clean_exe_target = if resolved.starts_with('"') {
            resolved
                .split('"')
                .nth(1)
                .unwrap_or(&resolved)
                .trim()
                .to_string()
        } else {
            resolved
                .split_whitespace()
                .next()
                .unwrap_or(&resolved)
                .to_string()
        };

        let name = if name.is_empty() {
            "Unknown App".to_string()
        } else {
            name
        };

        apps.push(InstalledApp {
            name,
            path: resolved,
            icon: Some(clean_exe_target),
            publisher: Some("Start Menu".to_string()),
        });
    }

    apps
}

#[cfg(target_os = "windows")]
fn list_installed_apps_windows() -> Vec<InstalledApp> {
    use std::collections::HashMap;
    use winreg::enums::*;
    use winreg::RegKey;

    let hives: &[(RegKey, &str)] = &[
        (
            RegKey::predef(HKEY_LOCAL_MACHINE),
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        ),
        (
            RegKey::predef(HKEY_LOCAL_MACHINE),
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        ),
        (
            RegKey::predef(HKEY_CURRENT_USER),
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        ),
    ];

    let mut apps: Vec<InstalledApp> = Vec::new();

    // 1. Quét Start Menu Shortcuts (ưu tiên)
    apps.extend(scan_start_menu_shortcuts());

    // 2. Quét Registry Uninstall
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
                || (dn_lower.starts_with("kb")
                    && dn[2..].chars().next().is_some_and(|c| c.is_ascii_digit()));
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

    // Deduplicate: Trực quan hóa khóa theo TARGET EXE trần
    // Ví dụ: "riotclientservices.exe --launch-product=..." và "riotclientservices.exe"
    // Gộp chung và ưu tiên entry CÓ chứa arguments
    let mut seen: HashMap<String, InstalledApp> = HashMap::new();
    for app in apps {
        // Trích xuất tên exe trần làm khóa so khớp trùng
        let clean_exe_key = if app.path.starts_with('"') {
            app.path
                .split('"')
                .nth(1)
                .unwrap_or(&app.path)
                .trim()
                .to_lowercase()
        } else {
            app.path
                .split_whitespace()
                .next()
                .unwrap_or(&app.path)
                .to_lowercase()
        };

        seen.entry(clean_exe_key)
            .and_modify(|existing| {
                // Nếu entry mới có Arguments (độ dài chuỗi path dài hơn / chứa tham số) thì ưu tiên lưu đè
                let new_has_args = app.path.trim().contains(' ');
                let ext_has_args = existing.path.trim().contains(' ');

                if new_has_args && !ext_has_args {
                    *existing = app.clone();
                } else if !new_has_args && !ext_has_args {
                    // Nếu cả hai đều trần, ưu tiên Start Menu vì tên hiển thị đẹp hơn
                    if app.publisher.as_deref() == Some("Start Menu") {
                        *existing = app.clone();
                    }
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

#[tauri::command]
fn read_clipboard_files() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let script =
            "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); \
                      $clip = [System.Windows.Forms.Clipboard]::GetFileDropList(); \
                      if ($clip) { $clip } else { @() }";
        let out = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("PowerShell clipboard error: {}", e))?;
        let output_str = String::from_utf8_lossy(&out.stdout);
        let list: Vec<String> = output_str
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        Ok(list)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("read_clipboard_files only supported on Windows".to_string())
    }
}

// -------------------------------------------------------------
// Shortcut (.lnk) resolver — Windows only
// -------------------------------------------------------------

#[tauri::command]
fn resolve_shortcut(lnk_path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        // Use PowerShell WScript.Shell COM to read .lnk target + arguments
        let script = format!(
            "$sh = New-Object -ComObject WScript.Shell; \
             $lnk = $sh.CreateShortcut([System.IO.Path]::GetFullPath('{}')); \
             $t = $lnk.TargetPath; $a = $lnk.Arguments; \
             if ($a) {{ \"`\"$t`\" $a\" }} else {{ $t }}",
            lnk_path.replace('\'', "''")
        );
        let out = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("PowerShell error: {}", e))?;
        let result = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if result.is_empty() {
            return Err("Could not resolve shortcut target".to_string());
        }
        Ok(result)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = lnk_path;
        Err("resolve_shortcut only supported on Windows".to_string())
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
        "link" => {
            let url = button
                .link_url
                .as_deref()
                .ok_or_else(|| "Missing link URL".to_string())?;
            open_link(url)
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
        #[cfg(target_os = "windows")]
        "printscreen" | "prtsc" | "print" => Some(Key::PrintScr),
        #[cfg(target_os = "linux")]
        "printscreen" | "prtsc" | "print" => Some(Key::Print),
        // PrintScreen has no portable macOS keycode — fall through to None (Err on parse)
        other if other.chars().count() == 1 => other.chars().next().map(Key::Unicode),
        _ => None,
    }
}

#[cfg(desktop)]
fn parse_shortcut(shortcut: &str) -> Result<(Vec<Key>, Vec<Key>), String> {
    let parts: Vec<&str> = shortcut
        .split('+')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();
    if parts.is_empty() {
        return Err(format!("Empty shortcut: '{}'", shortcut));
    }
    let mut modifiers: Vec<Key> = Vec::new();
    let mut bases: Vec<Key> = Vec::new();
    for part in parts {
        if let Some(m) = parse_modifier(part) {
            modifiers.push(m);
        } else if let Some(k) = parse_key(part) {
            bases.push(k);
        } else {
            return Err(format!("Unrecognized key token: '{}'", part));
        }
    }
    if bases.is_empty() {
        return Err(format!(
            "Shortcut '{}' has only modifiers and no base key",
            shortcut
        ));
    }
    Ok((modifiers, bases))
}

#[cfg(desktop)]
fn enigo_settings() -> Settings {
    // KHÔNG để enigo tự bật prompt Accessibility của macOS. Mặc định enigo đặt
    // open_prompt_to_get_permissions = true, nên mỗi lần Enigo::new (kể cả lúc
    // poll diagnostics) sẽ bung dialog "Accessibility Access" liên tục.
    // App tự kiểm tra quyền qua native_input_trusted() và hướng dẫn user trong UI.
    Settings {
        open_prompt_to_get_permissions: false,
        ..Settings::default()
    }
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
        Enigo::new(&enigo_settings()).is_ok()
    }
    #[cfg(not(desktop))]
    {
        true
    }
}

#[tauri::command]
fn get_input_permission_diagnostics(
    app_handle: AppHandle,
) -> accessibility::InputPermissionDiagnostics {
    accessibility::get_input_permission_diagnostics(&app_handle)
}

#[cfg(desktop)]
fn simulate_shortcut(shortcut: &str) -> Result<(), String> {
    let (modifiers, base_keys) = parse_shortcut(shortcut)?;
    let _guard = ENIGO_LOCK
        .lock()
        .map_err(|e| format!("Enigo lock poisoned: {}", e))?;

    let settings = enigo_settings();
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

    // Press base keys; on first failure release already pressed base keys and modifiers, then bail.
    for (idx, b) in base_keys.iter().enumerate() {
        if let Err(e) = enigo.key(*b, Direction::Press) {
            // Release already pressed base keys in reverse order
            for already_b in base_keys[..idx].iter().rev() {
                let _ = enigo.key(*already_b, Direction::Release);
            }
            // Release all modifiers in reverse order
            for m in modifiers.iter().rev() {
                let _ = enigo.key(*m, Direction::Release);
            }
            return Err(format!("Base key press failed ({:?}): {}", b, e));
        }
    }

    // Release base keys in reverse order
    for b in base_keys.iter().rev() {
        let _ = enigo.key(*b, Direction::Release);
    }

    // Always release modifiers in reverse order
    for m in modifiers.iter().rev() {
        let _ = enigo.key(*m, Direction::Release);
    }

    Ok(())
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
    let mut enigo = Enigo::new(&enigo_settings()).map_err(enigo_init_err)?;
    enigo
        .key(key, Direction::Click)
        .map_err(|e| format!("Media key failed: {}", e))
}

#[cfg(desktop)]
fn parse_exe_and_args(input: &str) -> (&str, &str) {
    // Split on .exe boundary so callers can paste a full Windows shortcut target
    // e.g. "C:/foo/bar.exe --flag value" → ("C:/foo/bar.exe", "--flag value")
    let lower = input.to_lowercase();
    if let Some(idx) = lower.find(".exe") {
        let exe_end = idx + 4;
        (&input[..exe_end], input[exe_end..].trim())
    } else {
        (input, "")
    }
}

#[cfg(desktop)]
fn launch_application(path: &str) -> Result<(), String> {
    use std::path::Path;
    use std::process::Command;

    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Application path is empty".to_string());
    }

    let (exe, _args_str) = parse_exe_and_args(trimmed);
    if !Path::new(exe).exists() {
        return Err(format!("Application path does not exist: {}", exe));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let args: Vec<&str> = _args_str.split_whitespace().collect();
        match Command::new(exe).args(&args).spawn() {
            Ok(_) => {}
            // 740 = elevation required, 5 = access denied (protected exe, e.g. anti-cheat)
            // Both handled by delegating to the Windows shell via ShellExecute
            Err(e) if matches!(e.raw_os_error(), Some(740) | Some(5)) => {
                Command::new("cmd")
                    .args(["/c", "start", "", exe])
                    .args(&args)
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
                    .map_err(|e| format!("Failed to spawn App process: {}", e))?;
            }
            Err(e) => return Err(format!("Failed to spawn App process: {}", e)),
        }
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
// Link action (S-LINK1) — open URL via platform shell
// -------------------------------------------------------------

/// Reject anything that is not a syntactically valid http/https URL.
/// Defense-in-depth alongside the frontend sanitizer — a malicious WS
/// client could forge a press payload with a `file:` / `javascript:` /
/// `vbscript:` URL, so the backend must validate before spawning.
fn validate_link_url(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Link URL is empty".to_string());
    }
    if trimmed.len() > 2048 {
        return Err("Link URL too long".to_string());
    }
    let lower = trimmed.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err(format!(
            "Link URL must start with http:// or https:// (got: {})",
            trimmed
        ));
    }
    // Reject control chars / whitespace inside the URL — a newline would let an
    // attacker smuggle a second argument on platforms whose `start`/`open`/`xdg-open`
    // surprise-tokenises certain inputs.
    if trimmed.chars().any(|c| c.is_control() || c == '\n' || c == '\r') {
        return Err("Link URL contains control characters".to_string());
    }
    // Reject embedded credentials (`user:pass@host`) — mirror the frontend
    // sanitizer (defense in depth). The authority is everything between "://"
    // and the next '/', '?' or '#'; a '@' there means userinfo.
    if let Some(after_scheme) = trimmed.splitn(2, "://").nth(1) {
        let authority_end = after_scheme
            .find(['/', '?', '#'])
            .unwrap_or(after_scheme.len());
        let authority = &after_scheme[..authority_end];
        if authority.is_empty() {
            return Err("Link URL is missing a host".to_string());
        }
        if authority.contains('@') {
            return Err("Link URL must not contain credentials (user:pass@)".to_string());
        }
    }
    Ok(trimmed.to_string())
}

#[cfg(desktop)]
fn open_link(raw: &str) -> Result<(), String> {
    use std::process::Command;
    let url = validate_link_url(raw)?;

    #[cfg(target_os = "windows")]
    {
        // Avoid `cmd /c start` — cmd.exe re-parses its command line and treats
        // `&`, `^`, `%` (all common in URL query strings) as shell
        // metacharacters even when the URL is a discrete argv entry, truncating
        // or garbling the link. rundll32's FileProtocolHandler takes the URL as
        // a single argument with no shell involved, so it survives intact.
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut child = Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to open link via rundll32: {}", e))?;
        std::thread::spawn(move || {
            let _ = child.wait();
        });
    }

    #[cfg(target_os = "macos")]
    {
        let mut child = Command::new("open")
            .arg("--")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open link via macOS open: {}", e))?;
        std::thread::spawn(move || {
            let _ = child.wait();
        });
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        // xdg-open has no `--` end-of-options separator (it's a plain shell
        // script and some openers choke on it). The URL is already validated to
        // start with http(s):// and contain no control chars, and it's a
        // discrete argv entry, so no separator is needed.
        let mut child = Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open link via xdg-open: {}", e))?;
        std::thread::spawn(move || {
            let _ = child.wait();
        });
    }

    Ok(())
}

/// Mở URL ngoài bằng trình duyệt mặc định của OS. Dùng cho các link trong UI
/// (GitHub, Ko-Fi…) vì Tauri webview không tự mở `<a target="_blank">`.
/// Tái dùng validate + spawn của `open_link` (chỉ http/https, không credentials).
#[cfg(desktop)]
#[tauri::command]
fn open_external_link(url: String) -> Result<(), String> {
    open_link(&url)
}

#[cfg(mobile)]
#[tauri::command]
fn open_external_link(_url: String) -> Result<(), String> {
    Err("open_external_link unsupported on mobile".to_string())
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

    #[cfg(mobile)]
    {
        builder = builder.plugin(tauri_plugin_barcode_scanner::init());
    }

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
        builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ));
    }

    builder = builder.plugin(tauri_plugin_dialog::init());
    builder = builder.plugin(tauri_plugin_process::init());

    builder
        .invoke_handler(tauri::generate_handler![
            save_layout_config,
            get_server_config,
            save_server_config,
            export_layout_to_path,
            execute_button_action,
            get_server_info,
            set_android_orientation,
            open_accessibility_settings,
            probe_input_permission,
            get_input_permission_diagnostics,
            list_installed_apps,
            resolve_shortcut,
            read_clipboard_files,
            open_external_link
        ])
        .setup(|app| {
            let app_handle_ws = app.handle().clone();
            let app_handle_listener = app.handle().clone();

            #[cfg(desktop)]
            {
                setup_tray(app.handle())?;
                if std::env::args().any(|arg| arg == "--hidden") {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.hide();
                    }
                } else if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                }
            }

            // Spawn localized tokio WS thread pool on start
            tauri::async_runtime::spawn(async move {
                let server_config = load_server_config_for_app(&app_handle_ws)
                    .await
                    .unwrap_or_else(|e| {
                        eprintln!("Failed to load server config, using defaults: {}", e);
                        ServerConfig::default()
                    });
                if server_config.web_enabled {
                    let app_handle_web = app_handle_ws.clone();
                    let web_config = webserver::WebServerConfig {
                        web_port: server_config.web_port,
                        ws_port: server_config.ws_port,
                    };
                    tauri::async_runtime::spawn_blocking(move || {
                        webserver::start_web_server(web_config, app_handle_web);
                    });
                }
                websocket::start_ws_server(server_config.ws_port, app_handle_ws).await;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(test_name: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("android-stream-desk-{}-{}", test_name, nonce))
    }

    #[test]
    fn server_config_default_matches_story_fallback() {
        assert_eq!(
            ServerConfig::default(),
            ServerConfig {
                ws_port: 8089,
                web_enabled: false,
                web_port: 8090,
            }
        );
    }

    #[test]
    fn server_info_serializes_listener_health_contract_in_camel_case() {
        let info = ServerInfo::from_config_and_bind_status(
            "192.168.1.12".to_string(),
            &ServerConfig {
                ws_port: 18089,
                web_enabled: true,
                web_port: 18090,
            },
            ListenerBindStatus::ready(18089),
            ListenerBindStatus::bind_error(18090, "address already in use".to_string()),
        );

        let json = serde_json::to_value(info).unwrap();

        assert_eq!(
            json,
            serde_json::json!({
                "ip": "192.168.1.12",
                "port": 18089,
                "configuredWsPort": 18089,
                "runningWsPort": 18089,
                "webEnabled": true,
                "webPort": 18090,
                "wsReady": true,
                "wsBindError": null,
                "webReady": false,
                "webBindError": {
                    "port": 18090,
                    "error": "address already in use"
                }
            })
        );
    }

    #[test]
    fn validate_server_config_rejects_ports_below_user_range() {
        let config = ServerConfig {
            ws_port: 1023,
            web_enabled: false,
            web_port: 8090,
        };

        assert!(validate_server_config(&config).is_err());
    }

    #[test]
    fn validate_server_config_rejects_duplicate_ports_when_web_enabled() {
        let config = ServerConfig {
            ws_port: 8089,
            web_enabled: true,
            web_port: 8089,
        };

        assert!(validate_server_config(&config).is_err());
    }

    #[tokio::test]
    async fn load_server_config_returns_default_when_file_missing_or_invalid() {
        let dir = unique_temp_dir("missing-invalid");
        let missing = load_server_config_from_dir(&dir).await;
        assert_eq!(missing, ServerConfig::default());
        assert!(dir.join("server.json").exists());

        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("server.json"), "{ not json").unwrap();

        let invalid = load_server_config_from_dir(&dir).await;
        assert_eq!(invalid, ServerConfig::default());

        let _ = std::fs::remove_dir_all(dir);
    }

    #[tokio::test]
    async fn save_server_config_writes_atomically_and_rejects_invalid_overwrite() {
        let dir = unique_temp_dir("atomic");
        let valid = ServerConfig {
            ws_port: 18089,
            web_enabled: true,
            web_port: 18090,
        };

        save_server_config_to_dir(&dir, &valid).await.unwrap();
        let written = std::fs::read_to_string(dir.join("server.json")).unwrap();
        assert!(written.contains("\"wsPort\": 18089"));

        let invalid = ServerConfig {
            ws_port: 18089,
            web_enabled: true,
            web_port: 18089,
        };
        assert!(save_server_config_to_dir(&dir, &invalid).await.is_err());

        let after_rejected_save = load_server_config_from_dir(&dir).await;
        assert_eq!(after_rejected_save, valid);

        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn default_capability_allows_process_relaunch() {
        let capability: serde_json::Value =
            serde_json::from_str(include_str!("../capabilities/default.json")).unwrap();
        let permissions = capability
            .get("permissions")
            .and_then(|value| value.as_array())
            .unwrap();

        assert!(permissions
            .iter()
            .any(|permission| permission == "process:default"));
    }

    // --- S-LINK1: link action validation ---

    #[test]
    fn validate_link_url_accepts_http_and_https() {
        assert_eq!(
            validate_link_url("https://example.com/path?q=1").unwrap(),
            "https://example.com/path?q=1"
        );
        assert_eq!(
            validate_link_url("http://192.168.1.5:8080").unwrap(),
            "http://192.168.1.5:8080"
        );
        assert_eq!(
            validate_link_url("  https://github.com  ").unwrap(),
            "https://github.com"
        );
    }

    #[test]
    fn validate_link_url_rejects_non_http_schemes() {
        for bad in [
            "file:///etc/passwd",
            "javascript:alert(1)",
            "data:text/html,<script>alert(1)</script>",
            "ftp://example.com",
            "vbscript:msgbox",
            "example.com",
            "",
            "   ",
        ] {
            assert!(
                validate_link_url(bad).is_err(),
                "expected error for: {:?}",
                bad
            );
        }
    }

    #[test]
    fn validate_link_url_rejects_control_characters() {
        assert!(validate_link_url("https://example.com\n--evil").is_err());
        assert!(validate_link_url("https://example.com\rfoo").is_err());
        assert!(validate_link_url("https://example.com\x00bar").is_err());
    }

    #[test]
    fn validate_link_url_rejects_embedded_credentials() {
        assert!(validate_link_url("https://user:pass@example.com").is_err());
        assert!(validate_link_url("http://admin@192.168.1.5").is_err());
        assert!(validate_link_url("https://user@github.com/ania").is_err());
        // '@' in the path or query is fine — only userinfo is rejected.
        assert!(validate_link_url("https://example.com/u/@ania").is_ok());
        assert!(validate_link_url("https://example.com/?to=a@b.com").is_ok());
    }

    #[test]
    fn button_config_deserializes_link_url_field() {
        let json = serde_json::json!({
            "id": "btn_link_1",
            "label": "GitHub",
            "icon": "mdi:github",
            "backgroundColor": "#1e293b",
            "actionType": "link",
            "linkUrl": "https://github.com"
        });
        let button: ButtonConfig = serde_json::from_value(json).unwrap();
        assert_eq!(button.action_type, "link");
        assert_eq!(button.link_url.as_deref(), Some("https://github.com"));
    }

    #[test]
    fn button_config_link_url_round_trips_via_serde() {
        let original = ButtonConfig {
            id: "btn_x".to_string(),
            label: "X".to_string(),
            emoji: None,
            icon: Some("mdi:link".to_string()),
            background_color: "#000".to_string(),
            action_type: "link".to_string(),
            shortcut_value: None,
            media_action: None,
            app_path: None,
            command_value: None,
            link_url: Some("https://example.com/x".to_string()),
            button_kind: Some("action".to_string()),
            monitor_config: None,
            icon_sizing: None,
        };
        let json = serde_json::to_value(&original).unwrap();
        assert_eq!(json["linkUrl"], "https://example.com/x");
        let parsed: ButtonConfig = serde_json::from_value(json).unwrap();
        assert_eq!(parsed.link_url.as_deref(), Some("https://example.com/x"));
    }
}
