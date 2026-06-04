use crate::ListenerBindStatus;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use tauri::Emitter;
use tauri::Manager;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio::sync::Mutex as TokioMutex;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WSMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: Option<Value>,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct WsServerReadyPayload {
    port: u16,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct WsServerErrorPayload {
    port: u16,
    error: String,
}

lazy_static::lazy_static! {
    static ref WS_MUTEX: Arc<TokioMutex<Option<broadcast::Sender<String>>>> = Arc::new(TokioMutex::new(None));
    static ref CLIENT_COUNT: Arc<AtomicUsize> = Arc::new(AtomicUsize::new(0));
    static ref WS_BIND_STATUS: StdMutex<ListenerBindStatus> = StdMutex::new(ListenerBindStatus::default());
}

const BROADCAST_CAPACITY: usize = 256;

pub fn current_ws_bind_status() -> ListenerBindStatus {
    WS_BIND_STATUS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

fn set_ws_bind_status(status: ListenerBindStatus) {
    *WS_BIND_STATUS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = status;
}

pub async fn start_ws_server(port: u16, app_handle: tauri::AppHandle) {
    set_ws_bind_status(ListenerBindStatus::default());
    let addr = format!("0.0.0.0:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            let msg = format!("Failed to bind WebSocket TCP port {}: {}", port, e);
            eprintln!("{}", msg);
            set_ws_bind_status(ListenerBindStatus::bind_error(port, msg.clone()));
            let _ = app_handle.emit("server-error", WsServerErrorPayload { port, error: msg });
            return;
        }
    };
    println!("WebSocket server listening on ws://{}", addr);
    set_ws_bind_status(ListenerBindStatus::ready(port));
    let _ = app_handle.emit("server-ready", WsServerReadyPayload { port });

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

pub async fn broadcast_metrics(cpu_percent: f32, ram_percent: f32) {
    broadcast_message(
        "metric_update",
        serde_json::json!({ "cpu_percent": cpu_percent, "ram_percent": ram_percent }),
    )
    .await;
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

struct ConnectionGuard {
    app_handle: tauri::AppHandle,
}

impl ConnectionGuard {
    fn new(app_handle: tauri::AppHandle) -> Self {
        let count = CLIENT_COUNT.fetch_add(1, Ordering::SeqCst) + 1;
        let _ = app_handle.emit(
            "client-count-changed",
            serde_json::json!({ "count": count }),
        );
        Self { app_handle }
    }
}

impl Drop for ConnectionGuard {
    fn drop(&mut self) {
        let count = CLIENT_COUNT.fetch_sub(1, Ordering::SeqCst) - 1;
        let _ = self.app_handle.emit(
            "client-count-changed",
            serde_json::json!({ "count": count }),
        );
    }
}

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    tx: broadcast::Sender<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let _guard = ConnectionGuard::new(app_handle.clone());
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

fn get_cached_layout(
    app_handle: &tauri::AppHandle,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ws_server_ready_payload_serializes_port() {
        let payload = WsServerReadyPayload { port: 18089 };

        assert_eq!(
            serde_json::to_value(payload).unwrap(),
            serde_json::json!({ "port": 18089 })
        );
    }

    #[test]
    fn ws_server_error_payload_serializes_port_and_error() {
        let payload = WsServerErrorPayload {
            port: 18089,
            error: "address already in use".to_string(),
        };

        assert_eq!(
            serde_json::to_value(payload).unwrap(),
            serde_json::json!({
                "port": 18089,
                "error": "address already in use"
            })
        );
    }

    #[test]
    fn ws_bind_status_can_store_ready_and_error_states() {
        set_ws_bind_status(ListenerBindStatus::ready(18089));
        assert_eq!(current_ws_bind_status(), ListenerBindStatus::ready(18089));

        set_ws_bind_status(ListenerBindStatus::bind_error(
            18090,
            "address already in use".to_string(),
        ));
        assert_eq!(
            current_ws_bind_status(),
            ListenerBindStatus::bind_error(18090, "address already in use".to_string())
        );
    }
}
