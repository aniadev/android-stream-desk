use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::Emitter;
use tauri::Manager;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio::sync::Mutex;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WSMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: Option<Value>,
}

lazy_static::lazy_static! {
    static ref WS_MUTEX: Arc<Mutex<Option<broadcast::Sender<String>>>> = Arc::new(Mutex::new(None));
}

const BROADCAST_CAPACITY: usize = 256;

pub async fn start_ws_server(port: u16, app_handle: tauri::AppHandle) {
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            let msg = format!("Failed to bind WebSocket TCP port {}: {}", port, e);
            eprintln!("{}", msg);
            let _ = app_handle.emit(
                "server-error",
                serde_json::json!({ "port": port, "error": msg }),
            );
            return;
        }
    };
    println!("WebSocket server listening on ws://{}", addr);
    let _ = app_handle.emit(
        "server-ready",
        serde_json::json!({ "port": port }),
    );

    let (tx, _) = broadcast::channel::<String>(BROADCAST_CAPACITY);
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

pub async fn broadcast_layout_to_clients(layout_json: Value) {
    broadcast_message("sync_layout", layout_json).await;
}

pub async fn broadcast_toast(payload: Value) {
    broadcast_message("toast", payload).await;
}

async fn broadcast_message(msg_type: &str, payload: Value) {
    if let Some(ref tx) = *WS_MUTEX.lock().await {
        let msg = WSMessage {
            msg_type: msg_type.to_string(),
            payload: Some(payload),
        };
        if let Ok(serialized) = serde_json::to_string(&msg) {
            let _ = tx.send(serialized);
        }
    }
}

async fn send_current_layout(
    ws_sender: &mut futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<TcpStream>,
        Message,
    >,
    app_handle: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let layout_val = get_cached_layout(app_handle).unwrap_or_else(|_| default_layout());
    let sync_msg = WSMessage {
        msg_type: "sync_layout".to_string(),
        payload: Some(layout_val),
    };
    let sync_str = serde_json::to_string(&sync_msg)?;
    ws_sender.send(Message::Text(sync_str)).await?;
    Ok(())
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

    // Seed the new client with the current layout, falling back to default.
    let _ = send_current_layout(&mut ws_sender, &app_handle).await;

    let mut keep_running = true;

    while keep_running {
        tokio::select! {
            recv_result = rx.recv() => {
                match recv_result {
                    Ok(msg_str) => {
                        if ws_sender.send(Message::Text(msg_str)).await.is_err() {
                            keep_running = false;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        eprintln!("Client {} lagged by {} messages — resyncing layout.", addr, skipped);
                        let _ = send_current_layout(&mut ws_sender, &app_handle).await;
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        keep_running = false;
                    }
                }
            }
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
                                    if let Some(payload_val) = parsed_msg.payload {
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
    let app_dir = app_handle.path().app_config_dir()?;
    let config_path = app_dir.join("layout.json");
    if config_path.exists() {
        let content = std::fs::read_to_string(config_path)?;
        let val: Value = serde_json::from_str(&content)?;
        Ok(val)
    } else {
        Ok(default_layout())
    }
}

fn default_layout() -> Value {
    let rows = 3u32;
    let cols = 3u32;
    let total = (rows * cols) as usize;
    let buttons: Vec<Value> = (0..total)
        .map(|i| {
            serde_json::json!({
                "id": format!("btn_{}", i),
                "label": format!("Button {}", i + 1),
                "emoji": "🎮",
                "backgroundColor": "#1e293b",
                "actionType": "shortcut",
                "shortcutValue": "Ctrl+Tab"
            })
        })
        .collect();
    serde_json::json!({
        "rows": rows,
        "cols": cols,
        "buttons": buttons,
    })
}
