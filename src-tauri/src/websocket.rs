use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio::sync::Mutex;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WSMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: Option<Value>,
}

lazy_static::lazy_static! {
    static ref WS_MUTEX: Arc<Mutex<Option<broadcast::Sender<String>>>> = Arc::new(Mutex::new(None));
}

/// Runs WebSocket server under tokio runtime listening port 8089
pub async fn start_ws_server(port: u16, app_handle: tauri::AppHandle) {
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind WebSocket TCP port {}: {}", port, e);
            return;
        }
    };
    println!("WebSocket server listening on ws://{}", addr);

    // TX/RX channel matching multiple connected Android clients broadcast events
    let (tx, _) = broadcast::channel::<String>(32);
    {
        let mut global_tx = WS_MUTEX.lock().await;
        *global_tx = Some(tx.clone());
    }

    while let Ok((stream, addr)) = listener.accept().await {
        let tx_clone = tx.clone();
        let app_handle_clone = app_handle.clone();
        
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, addr, tx_clone, app_handle_clone).await {
                eprintln!("Error handling connection from {}: {}", addr, e);
            }
        });
    }
}

/// Broadcast a message to all connected clients
pub async fn broadcast_layout_to_clients(layout_json: Value) {
    if let Some(ref tx) = *WS_MUTEX.lock().await {
        let msg = WSMessage {
            msg_type: "sync_layout".to_string(),
            payload: Some(layout_json),
        };
        if let Ok(serialized) = serde_json::to_string(&msg) {
            let _ = tx.send(serialized);
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    tx: broadcast::Sender<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws_stream = accept_async(stream).await?;
    println!("New WebSocket connection established from: {}", addr);

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let mut rx = tx.subscribe();

    // Broadcast current saved layout when a new connection opens
    if let Ok(layout_val) = get_cached_layout(&app_handle) {
        let sync_msg = WSMessage {
            msg_type: "sync_layout".to_string(),
            payload: Some(layout_val),
        };
        if let Ok(sync_str) = serde_json::to_string(&sync_msg) {
            let _ = ws_sender.send(Message::Text(sync_str)).await;
        }
    }

    let mut keep_running = true;

    while keep_running {
        tokio::select! {
            // Receive outgoing messages broadcast from other threads
            Ok(msg_str) = rx.recv() => {
                if ws_sender.send(Message::Text(msg_str)).await.is_err() {
                    break;
                }
            }
            // Read incoming frames from this client
            ws_msg = ws_receiver.next() => {
                match ws_msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(parsed_msg) = serde_json::from_str::<WSMessage>(&text) {
                            match parsed_msg.msg_type.as_str() {
                                "ping" => {
                                    let pong = WSMessage { msg_type: "pong".to_string(), payload: None };
                                    if let Ok(pong_str) = serde_json::to_string(&pong) {
                                        let _ = ws_sender.send(Message::Text(pong_str)).await;
                                    }
                                }
                                "press" => {
                                    // Trigger OS action on main threads via Tauri IPC Command channel proxy
                                    if let Some(payload_val) = parsed_msg.payload {
                                        use tauri::Emitter;
                                        let _ = app_handle.emit("trigger-macro", payload_val);
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        println!("WebSocket client connection closed: {}", addr);
                        keep_running = false;
                    }
                    Some(Err(e)) => {
                        eprintln!("WebSocket error on connection {}: {}", addr, e);
                        keep_running = false;
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(())
}

fn get_cached_layout(app_handle: &tauri::AppHandle) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    // Utility local storage helper reading synced AppData layout config to seed UI on connect
    let app_dir = app_handle.path().app_config_dir()?;
    let config_path = app_dir.join("layout.json");
    if config_path.exists() {
        let content = std::fs::read_to_string(config_path)?;
        let val: Value = serde_json::from_str(&content)?;
        Ok(val)
    } else {
        // Return default layout JSON schema representation
        let default_val = serde_json::json!({
            "rows": 3,
            "cols": 3,
            "buttons": vec![
                serde_json::json!({
                    "id": "btn_0",
                    "label": "Play/Pause",
                    "emoji": "⏯️",
                    "backgroundColor": "#1e293b",
                    "actionType": "media",
                    "mediaAction": "play_pause"
                })
            ]
        });
        Ok(default_val)
    }
}
