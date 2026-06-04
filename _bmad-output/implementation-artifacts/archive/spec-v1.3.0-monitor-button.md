---
title: 'v1.3.0 Monitor Button — Real-time CPU/RAM display'
type: 'feature'
created: '2026-05-25'
baseline_commit: '79033d6'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Macro pad hiện chỉ có "action button" (user nhấn → gửi lệnh). Không có cách nào hiển thị thông tin hệ thống (CPU%, RAM%) ngược lại từ Companion — user phải nhìn lên màn hình máy tính trong khi macro pad đang nằm trên bàn tay.

**Approach:** Thêm loại button mới `'monitor'` trong layout. Companion (desktop) thu thập CPU% và RAM% định kỳ qua `sysinfo` crate và broadcast `metric_update` WS message tới tất cả Client. Client render monitor button hiển thị số liệu real-time. Dashboard cho phép cấu hình metric type và update interval.

## Boundaries & Constraints

**Always:** `sysinfo` chỉ compile trên desktop target — không đưa vào Android build. `buttonKind` mặc định `'action'` khi thiếu để tương thích ngược. Monitor button không emit `press` event khi tap.

**Ask First:** Nếu cần thêm metric type khác ngoài `ram_percent` / `cpu_percent` trong v1.3.0.

**Never:** Không store `Enigo` hay bất kỳ `!Send` type trong metrics loop. Metrics loop chạy trong task riêng qua `tauri::async_runtime::spawn` — không block WS event loop.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Companion chạy, có monitor button | `intervalMs: 5000` | Broadcast `metric_update` mỗi 5s | tx.send Err → ignore, tiếp tục loop |
| Không có monitor button trong layout | layout không có `buttonKind: 'monitor'` | Metrics loop sleep 5s rồi re-check | — |
| Client nhận `metric_update` | `{ ram_percent: 72.3, cpu_percent: 45.1 }` | `currentMetrics.value` update, GridButton re-render | — |
| Monitor button tap | `button.buttonKind === 'monitor'` | Không emit press, không gửi WS | — |
| `intervalMs < 1000` trong layout | User input `0.5` giây | Clamp to 1000ms trong sanitizeLayout | — |
| Companion tắt | Client còn kết nối WS | Monitor button hiển thị giá trị cuối cùng (stale), không crash | — |

</frozen-after-approval>

## Code Map

- `src/types/index.ts` — thêm `MetricType`, `MonitorConfig`, `buttonKind?`, `monitorConfig?` vào `ButtonConfig`; thêm `'metric_update'` vào `WSMessage.type`.
- `src-tauri/Cargo.toml` — thêm `sysinfo = "0.33"` vào desktop-only target deps.
- `src-tauri/src/metrics.rs` — NEW (desktop-only): `collect_metrics()`, `metrics_loop()`.
- `src-tauri/src/lib.rs` — thêm `button_kind`, `monitor_config` vào `ButtonConfig` struct; `pub mod metrics;`; spawn `metrics_loop` trong `setup()`.
- `src-tauri/src/websocket.rs` — thêm `broadcast_metrics(ram: f32, cpu: f32)` fn.
- `src/stores/layout.ts` — thêm `currentMetrics` ref; handle `metric_update` WS message; sanitize `buttonKind` + `monitorConfig.intervalMs` trong `importLayout`.
- `src/components/GridButton.vue` — branch `v-if="button.buttonKind === 'monitor'"` cho render riêng; không emit press.
- `src/views/DashboardView.vue` — "Loại button" toggle trên action tabs; v-if monitor → metric type select + interval input; guard trong `saveButtonSettings`.

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- Thêm: `MetricType = 'ram_percent' | 'cpu_percent'`; `MonitorConfig = { metricType: MetricType; intervalMs: number }`; `buttonKind?: 'action' | 'monitor'` và `monitorConfig?: MonitorConfig` vào `ButtonConfig`; `'metric_update'` vào `WSMessage.type` union.
- [x] `src-tauri/Cargo.toml` -- Thêm vào `[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]`: `sysinfo = { version = "0.33", default-features = false, features = ["system"] }`.
- [x] `src-tauri/src/metrics.rs` -- Tạo mới với `#[cfg(desktop)]`: `pub fn collect_metrics(sys: &mut sysinfo::System) -> (f32, f32)` (returns `(cpu_percent, ram_percent)`). `pub async fn metrics_loop(config_dir: std::path::PathBuf)`: đọc layout.json → tìm monitor buttons → tính `min_interval_ms` (default 5000 nếu không có) → loop `tokio::time::interval(Duration::from_millis(min_interval_ms))` → mỗi tick: `collect_metrics` → `broadcast_metrics` → mỗi 30 tick re-read layout. Nếu `tx.send` err → không panic. `System` instance giữ qua các tick để CPU delta tính đúng; khởi tạo với `System::new_all()` + `thread::sleep(200ms)` trước vòng lặp chính.
- [x] `src-tauri/src/lib.rs` -- Thêm `button_kind: Option<String>` và `monitor_config: Option<serde_json::Value>` vào `ButtonConfig` struct (dùng `Value` cho monitor_config để tránh nested struct phức tạp). Thêm `#[cfg(desktop)] pub mod metrics;`. Trong `setup()` sau WS spawn: `#[cfg(desktop)] { let config_dir = app.path().app_config_dir()?; tauri::async_runtime::spawn(async move { metrics::metrics_loop(config_dir).await; }); }`.
- [x] `src-tauri/src/websocket.rs` -- Thêm `pub async fn broadcast_metrics(cpu_percent: f32, ram_percent: f32)` tương tự `broadcast_toast`: tạo `WSMessage { msg_type: "metric_update", payload: Some(json!({ "cpu_percent": cpu_percent, "ram_percent": ram_percent })) }` → broadcast qua `WS_MUTEX`.
- [x] `src/stores/layout.ts` -- Thêm `export const currentMetrics = ref<{ ram_percent: number; cpu_percent: number }>({ ram_percent: 0, cpu_percent: 0 })`. Trong WS handler: thêm case `metric_update` → `currentMetrics.value = { ...message.payload }`. Trong `importLayout` sanitized map: thêm `buttonKind: b?.buttonKind === 'monitor' ? 'monitor' : 'action'` và `monitorConfig: b?.buttonKind === 'monitor' && b?.monitorConfig ? { metricType: ['ram_percent','cpu_percent'].includes(b.monitorConfig.metricType) ? b.monitorConfig.metricType : 'cpu_percent', intervalMs: Math.max(1000, Number(b.monitorConfig?.intervalMs) || 5000) } : undefined`.
- [x] `src/components/GridButton.vue` -- Import `currentMetrics` từ layout store. Thêm `v-if/v-else` trên root `<button>`: khi `button.buttonKind === 'monitor'` render `<button class="cyber-btn ..." @click.prevent>` với inner monitor template (Icon `mdi:memory` hoặc `mdi:cpu-64-bit`, giá trị `Math.round(metricValue)%`, label nhỏ); khi action → render template hiện tại. `metricValue` computed: `button.monitorConfig?.metricType === 'ram_percent' ? currentMetrics.ram_percent : currentMetrics.cpu_percent`. Monitor button có thêm CSS class `cyber-btn--monitor` (font value lớn hơn).
- [x] `src/views/DashboardView.vue` -- (1) Trên action tabs section, thêm "Loại button" radio row: 2 button `● Action` / `○ Monitor`. Click → set `selectedButton.buttonKind`. Khi switch → Action: reset `buttonKind = 'action'`, xóa `monitorConfig`; switch → Monitor: set `buttonKind = 'monitor'`, set default `monitorConfig = { metricType: 'cpu_percent', intervalMs: 5000 }` nếu chưa có. (2) `v-if="selectedButton.buttonKind !== 'monitor'"` wrap quanh action tabs + tab content. (3) `v-if="selectedButton.buttonKind === 'monitor'"` block với: select `metricType` (`ram_percent`/`cpu_percent`) và number input `intervalMs` (giây, nhân 1000 → ms khi save). (4) Trong `saveButtonSettings`: thêm guard `if (selectedButton.value.buttonKind !== 'monitor') selectedButton.value.actionType = activeTab.value`.

**Acceptance Criteria:**
- Given Companion running với monitor button `cpu_percent` interval 5s, when 5s passes, then Android Client thấy giá trị CPU% cập nhật trên button.
- Given user tap monitor button trên Client, then không có WS press message gửi đi.
- Given user switch button từ Action → Monitor trong Dashboard, then action fields ẩn, metric selector hiện; switch lại → action fields hiện.
- Given layout.json không có `buttonKind` (cũ), when load layout, then tất cả button `buttonKind = 'action'` (backward compat, không crash).
- Given Companion tắt khi Client đang hiển thị monitor button, then button hiển thị giá trị cuối, không crash.

## Design Notes

`monitor_config` trong Rust dùng `Option<serde_json::Value>` thay vì typed struct riêng — layout đã pass-through as raw JSON, typed Rust struct chỉ để documentation. Consistent với cách `Layout.theme` đã implement.

`currentMetrics` là module-level `ref` được export từ layout store — không cần Pinia state vì chỉ có một source và không cần persistence.

`System` instance trong metrics_loop giữ alive qua các tick để CPU delta calculation đúng. Khởi tạo một lần + sleep 200ms trước vòng lặp = lần đọc CPU đầu tiên trong loop đã có delta đủ tốt.

## Verification

**Commands:**
- `pnpm tsc --noEmit` -- expected: compile sạch với `MetricType`, `MonitorConfig`, `currentMetrics` typed correctly.
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: sysinfo dep resolve, `metrics.rs` compile trên desktop target.

## Suggested Review Order

**Rust metrics engine**

- `metrics_loop`: bootstrap sleep, ticker lifecycle, interval re-read every 30 ticks.
  [`metrics.rs:22`](../../src-tauri/src/metrics.rs#L22)

- `collect_metrics`: sysinfo CPU+RAM refresh pattern (delta between ticks, not per-call sleep).
  [`metrics.rs:10`](../../src-tauri/src/metrics.rs#L10)

- `compute_interval_ms` (async): reads layout.json async → finds min intervalMs across monitor buttons.
  [`metrics.rs:54`](../../src-tauri/src/metrics.rs#L54)

- `broadcast_metrics`: thin wrapper over existing broadcast_message infrastructure.
  [`websocket.rs:72`](../../src-tauri/src/websocket.rs#L72)

- Spawn in setup() desktop-only + early return in execute_logic for monitor buttons.
  [`lib.rs:643`](../../src-tauri/src/lib.rs#L643)

**TypeScript data layer**

- `currentMetrics` module-level ref + `metric_update` WS handler.
  [`layout.ts:7`](../../src/stores/layout.ts#L7)

- `buttonKind` defaulting to `'action'` in both local_layout parse and sync_layout handler.
  [`layout.ts:115`](../../src/stores/layout.ts#L115)

- `buttonKind` + `monitorConfig` sanitization in importLayout.
  [`layout.ts:262`](../../src/stores/layout.ts#L262)

**GridButton monitor render**

- `isMonitor`, `monitorIcon`, `metricValue` computeds — `--` fallback when no monitorConfig.
  [`GridButton.vue:46`](../../src/components/GridButton.vue#L46)

- `handleClick` guard + monitor template branch.
  [`GridButton.vue:60`](../../src/components/GridButton.vue#L60)

**Dashboard config UI**

- `setButtonKind`: sets kind, defaults monitorConfig, guards actionType in saveButtonSettings.
  [`DashboardView.vue:444`](../../src/views/DashboardView.vue#L444)

- Monitor config panel: metric type select + interval input (seconds → ms conversion).
  [`DashboardView.vue:924`](../../src/views/DashboardView.vue#L924)
