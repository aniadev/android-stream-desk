use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Listener, Manager};

pub mod websocket;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ButtonConfig {
    id: String,
    label: String,
    emoji: String,
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

    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).map_err(|e| format!("Failed creating directory: {}", e))?;
    }

    let config_path = app_dir.join("layout.json");
    let serialized = serde_json::to_string_pretty(&layout).map_err(|e| e.to_string())?;
    std::fs::write(config_path, serialized).map_err(|e| e.to_string())?;

    // Also broadcast layout to all WebSocket connected Android devices immediately in real-time
    websocket::broadcast_layout_to_clients(layout).await;

    Ok(())
}

#[tauri::command]
async fn execute_button_action(button: ButtonConfig) -> Result<(), String> {
    execute_logic(button).await
}

// -------------------------------------------------------------
// Core Macro Action Execution (Enigo / Media / App Exec)
// -------------------------------------------------------------

async fn execute_logic(button: ButtonConfig) -> Result<(), String> {
    println!("Executing action type: {}", button.action_type);
    match button.action_type.as_str() {
        "shortcut" => {
            if let Some(shortcut) = button.shortcut_value {
                simulate_shortcut(&shortcut)?;
            }
        }
        "media" => {
            if let Some(media) = button.media_action {
                simulate_media(&media)?;
            }
        }
        "app" => {
            if let Some(path) = button.app_path {
                launch_application(&path)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn simulate_shortcut(shortcut: &str) -> Result<(), String> {
    let parts: Vec<&str> = shortcut.split('+').map(|s| s.trim()).collect();
    let mut modifier_keys = Vec::new();
    let mut key_to_press = None;

    for part in parts {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => modifier_keys.push(Key::Control),
            "shift" => modifier_keys.push(Key::Shift),
            "alt" => modifier_keys.push(Key::Alt),
            "meta" | "win" | "super" | "command" => modifier_keys.push(Key::Meta),
            other => {
                key_to_press = match other {
                    "a" => Some(Key::Unicode('a')),
                    "b" => Some(Key::Unicode('b')),
                    "c" => Some(Key::Unicode('c')),
                    "d" => Some(Key::Unicode('d')),
                    "e" => Some(Key::Unicode('e')),
                    "f" => Some(Key::Unicode('f')),
                    "g" => Some(Key::Unicode('g')),
                    "h" => Some(Key::Unicode('h')),
                    "i" => Some(Key::Unicode('i')),
                    "j" => Some(Key::Unicode('j')),
                    "k" => Some(Key::Unicode('k')),
                    "l" => Some(Key::Unicode('l')),
                    "m" => Some(Key::Unicode('m')),
                    "n" => Some(Key::Unicode('n')),
                    "o" => Some(Key::Unicode('o')),
                    "p" => Some(Key::Unicode('p')),
                    "q" => Some(Key::Unicode('q')),
                    "r" => Some(Key::Unicode('r')),
                    "s" => Some(Key::Unicode('s')),
                    "t" => Some(Key::Unicode('t')),
                    "u" => Some(Key::Unicode('u')),
                    "v" => Some(Key::Unicode('v')),
                    "w" => Some(Key::Unicode('w')),
                    "x" => Some(Key::Unicode('x')),
                    "y" => Some(Key::Unicode('y')),
                    "z" => Some(Key::Unicode('z')),
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
                    chars if chars.len() == 1 => Some(Key::Unicode(chars.chars().next().unwrap())),
                    _ => None
                };
            }
        }
    }

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to initialize Enigo: {}", e))?;

    // 1. Hold all modifier keys down
    for modifier in &modifier_keys {
        let _ = enigo.key(*modifier, Direction::Press);
    }

    // 2. Perform keypress on targets
    if let Some(target) = key_to_press {
        let _ = enigo.key(target, Direction::Click);
    }

    // 3. Release modifier keys
    for modifier in &modifier_keys {
        let _ = enigo.key(*modifier, Direction::Release);
    }

    Ok(())
}

fn simulate_media(action: &str) -> Result<(), String> {
    let key = match action {
        "play_pause" => Key::MediaPlayPause,
        "volume_up" => Key::VolumeUp,
        "volume_down" => Key::VolumeDown,
        "mute" => Key::VolumeMute,
        "next" => Key::MediaNextTrack,
        "prev" => Key::MediaPrevTrack,
        _ => return Err(format!("Unsupported media key: {}", action))
    };

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to initialize Enigo: {}", e))?;
    let _ = enigo.key(key, Direction::Click);
    Ok(())
}

fn launch_application(path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("cmd")
            .args(&["/C", "start", "", path])
            .spawn()
            .map_err(|e| format!("Failed to spawn App process: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to spawn macOS process: {}", e))?;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to spawn process: {}", e))?;
    }

    Ok(())
}

// -------------------------------------------------------------
// Tauri Initializer Bridge entry
// -------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_layout_config,
            execute_button_action
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Spawn localized tokio WS thread pool on start
            tauri::async_runtime::spawn(async move {
                websocket::start_ws_server(8089, app_handle).await;
            });

            // Proxy listen event triggered from WS client loop
            app.listen("trigger-macro", |event| {
                if let Ok(button) = serde_json::from_str::<ButtonConfig>(event.payload()) {
                    tauri::async_runtime::spawn(async move {
                        let _ = execute_logic(button).await;
                    });
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
