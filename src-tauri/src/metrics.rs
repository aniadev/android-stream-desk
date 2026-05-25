#![cfg(not(any(target_os = "android", target_os = "ios")))]

use std::path::{Path, PathBuf};
use std::time::Duration;
use sysinfo::System;
use tokio::time;

use crate::websocket::broadcast_metrics;

pub fn collect_metrics(sys: &mut System) -> (f32, f32) {
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    let cpu = sys.global_cpu_usage();
    let ram = if sys.total_memory() > 0 {
        sys.used_memory() as f32 / sys.total_memory() as f32 * 100.0
    } else {
        0.0
    };
    (cpu, ram)
}

pub async fn metrics_loop(config_dir: PathBuf) {
    let mut sys = System::new_all();

    // First CPU refresh; sleep so next refresh has a meaningful delta.
    sys.refresh_cpu_usage();
    time::sleep(Duration::from_millis(200)).await;

    let mut tick_count: u32 = 0;
    let mut interval_ms = compute_interval_ms(&config_dir).await;
    let mut ticker = time::interval(Duration::from_millis(interval_ms));
    ticker.set_missed_tick_behavior(time::MissedTickBehavior::Delay);

    loop {
        ticker.tick().await;

        let (cpu, ram) = collect_metrics(&mut sys);
        broadcast_metrics(cpu, ram).await;

        tick_count += 1;
        if tick_count >= 30 {
            tick_count = 0;
            let new_interval = compute_interval_ms(&config_dir).await;
            if new_interval != interval_ms {
                interval_ms = new_interval;
                ticker = time::interval(Duration::from_millis(interval_ms));
                ticker.set_missed_tick_behavior(time::MissedTickBehavior::Delay);
                ticker.tick().await; // consume instant first tick to avoid double-broadcast
            }
        }
    }
}

async fn compute_interval_ms(config_dir: &Path) -> u64 {
    let default = 5000u64;
    let layout_path = config_dir.join("layout.json");
    let content = match tokio::fs::read_to_string(&layout_path).await {
        Ok(c) => c,
        Err(_) => return default,
    };
    let val: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return default,
    };
    let buttons = match val.get("buttons").and_then(|b| b.as_array()) {
        Some(b) => b.clone(),
        None => return default,
    };
    let min = buttons
        .iter()
        .filter(|b| b.get("buttonKind").and_then(|k| k.as_str()) == Some("monitor"))
        .filter_map(|b| {
            b.get("monitorConfig")
                .and_then(|mc| mc.get("intervalMs"))
                .and_then(|v| v.as_u64())
        })
        .min();

    match min {
        Some(ms) => ms.max(1000),
        None => default,
    }
}
