---
title: "Android Stream Desk v1.3.0 — Feature Breakdown"
version: 1.3.0
created: 2026-05-25
status: planning
---

# v1.3.0 Feature Breakdown

Đợt cập nhật v1.3.0 tập trung vào trải nghiệm trực quan và thông tin: bổ sung brand icons (Simple Icons) kèm cải tiến icon picker, hệ thống multi-theme đồng bộ hai chiều giữa Dashboard và Client, loại button mới Monitor hiển thị thông tin hệ thống thời gian thực từ Companion, tính năng chống tắt màn hình trên Android Client. Đồng thời sửa lỗi APK release chưa gắn version vào tên file.

---

## 1. FEATURE 1: Mở rộng bộ Icons — Brand Pack & Icon Picker nâng cao

### 1.1 Phân tích gốc rễ

Hệ thống icon hiện tại (`src/config/icons.ts` + `icons-bundle.ts`) đã có 3 pack offline (mdi, lucide, material-symbols) với ~295 icon được curate thủ công. Tuy nhiên có hai hạn chế thực tế:

1. **Thiếu brand icons:** Macro pad thường được dùng để trigger các app cụ thể như Discord, Spotify, Steam, Telegram, GitHub, OBS… Không có `simple-icons` nên user phải dùng icon generic thay thế — mất nhận diện thị giác nhanh khi nhìn vào layout.
2. **Icon picker chưa có search cross-pack:** `filteredIcons` trong `DashboardView.vue` chỉ search trong danh sách curate (~295 icon), bỏ qua hoàn toàn hàng nghìn icon đã được tải offline qua `@iconify/json`. User phải biết tên chính xác hoặc cuộn qua từng tab.

Ghi chú: `@iconify/json` (~200k icons) **đã có trong `devDependencies`** nhưng chỉ dùng để generate bundle lúc build; `@iconify-json/mdi` (7,200+ icons), `@iconify-json/lucide` (1,500+ icons), `@iconify-json/material-symbols` (3,200+ icons) đã được register offline — chỉ cần tháo rào cản search để tận dụng.

### 1.2 Giải pháp & Bản thiết kế

* Bổ sung **`simple-icons`** pack: thêm `@iconify-json/simple-icons` vào `dependencies` (production bundle), register trong `icons-bundle.ts`, thêm tab "Brands" trong picker. Curate ~80 brand icon phổ biến trong `src/config/icons.ts` để tab "Brands" có sẵn khi chưa search.
* Nâng cấp **icon picker search**: khi user gõ query vào ô tìm kiếm, nếu không còn hiển thị curated tab → chuyển sang **full-pack search** sử dụng `getIconList()` từ `@iconify/vue` (trả về toàn bộ icon đã register trong pack hiện tại). Fuzzy match substring đơn giản là đủ vì icon name có cấu trúc rõ.
* **Virtual scroll** cho kết quả search: khi list > 100 item (xảy ra khi search mdi full-pack) — dùng `@tanstack/vue-virtual` hoặc plain `CSS contain: strict` với lazy render chunk 50.
* **Category tabs mới:** bổ sung tab "Brands" vào `ICON_GROUPS` trong `src/config/icons.ts`; mỗi tab vẫn hiển thị curated trước, search mở rộng ra full pack.

### 1.3 Stories

#### S-ICON1 — Thêm Simple Icons pack + expand curated brand list
* **Goal:** Brand icon pack có sẵn offline; ~80 brand icon xuất hiện trong tab "Brands" mà không cần search.
* **Scope:**
  - Thêm `@iconify-json/simple-icons` vào `dependencies` (không phải devDeps — cần ở runtime bundle).
  - Register trong `icons-bundle.ts`:
    ```ts
    import siIcons from '@iconify-json/simple-icons/icons.json';
    addCollection(siIcons as any);
    ```
  - Thêm `type IconGroup = ... | 'si'` và entry `{ key: 'si', label: 'Brands' }` vào `ICON_GROUPS` trong `src/config/icons.ts`.
  - Curate mảng `siIcons: string[]` ~80 brand: Discord, Spotify, Steam, GitHub, OBS, Twitch, YouTube, Telegram, WhatsApp, Slack, VS Code, Firefox, Chrome, Figma, Notion, Trello, Docker, Linux, Windows, Apple, Adobe, Netflix, Twitter/X, TikTok, Instagram, Reddit…
  - Cập nhật `DashboardView.vue`: `activeIconGroup` switch thêm case `'si'`, `filteredIcons` pool thêm `siIcons`.
* **Complexity:** Thấp

#### S-ICON2 — Full-pack search + virtual scroll trong Icon Picker
* **Goal:** Gõ "disc" tìm được `simple-icons:discord`; gõ "mic" tìm được toàn bộ mic icon trong mdi — không bị giới hạn curated list.
* **Scope:**
  - Trong `DashboardView.vue`, sửa `filteredIcons` computed:
    - Khi `searchQuery === ''` → hành vi cũ (trả về curated pool của tab hiện tại).
    - Khi `searchQuery !== ''` → lấy full list của pack hiện tại bằng `getIconList(prefix)` từ `@iconify/vue` (trả về `string[]` tên icon không có prefix), filter substring case-insensitive, prepend prefix, giới hạn 200 kết quả.
    - `getIconList` ví dụ: `getIconList('mdi')` → `['play', 'pause', 'memory', ...]`; kết quả filter map về `'mdi:memory'` format.
  - **Virtual scroll:** bọc `<ul>` icon grid trong container `max-h-64 overflow-y-auto` với CSS `contain: strict`. Nếu `filteredIcons.length > 120` → render chunked: `visibleIcons` computed = slice(0, offset) với IntersectionObserver tăng offset khi scroll gần đáy (sentinel element).
  - Hiển thị badge `"Đang tìm trong toàn bộ [Pack] (N kết quả)"` khi đang ở full-search mode để user biết đang search rộng.
* **Complexity:** Trung bình

---

## 2. FEATURE 2: Multi Themes — Bổ sung theme & Đồng bộ Dashboard ↔ Client

### 2.1 Phân tích gốc rễ

Toàn bộ giao diện hiện tại hardcode palette "Cyber" — màu nền `#020614` (navy cực tối), accent cyan neon `#00d4ff`, viền neon — trực tiếp trong CSS/inline style. Không có abstraction cho theme. Hai hạn chế thực tế:

1. **Không tùy chỉnh được:** User nào muốn macro pad màu tối ấm (amber/orange) hay accent tím thay vì cyan đều phải fork CSS thủ công.
2. **Dashboard và Client không đồng bộ:** Hiện tại không có cơ chế nào để thay đổi theme trên Dashboard và tự động áp dụng cho Client Android đang hiển thị.

### 2.2 Giải pháp & Bản thiết kế

**Kiến trúc theme:**
* Định nghĩa theme qua CSS custom properties trên `:root[data-theme="..."]` — không thay đổi class-based logic hiện tại, chỉ thêm một lớp variable.
* `src/lib/themes.ts`: registry `Record<ThemeName, ThemeTokens>` với các token: `--bg-base`, `--bg-card`, `--accent`, `--accent-dim`, `--text-primary`, `--text-secondary`, `--neon-glow`.
* 3 themes v1.3.0:
  | Theme | Nền | Accent | Đặc điểm |
  |-------|-----|--------|----------|
  | `cyber` | `#020614` | `#00d4ff` (cyan) | Mặc định hiện tại |
  | `midnight` | `#0a0012` | `#a855f7` (purple) | Tối, violet neon |
  | `ember` | `#100804` | `#f97316` (orange) | Ấm, retro terminal |
* `applyTheme(name: ThemeName)`: set `document.documentElement.setAttribute('data-theme', name)`.

**Đồng bộ qua Layout (không cần WS message type mới):**
* Thêm field `theme?: string` vào interface `Layout` (`src/types/index.ts`) và Rust struct `Layout` (`src-tauri/src/lib.rs`).
* Khi Dashboard thay đổi theme → `layoutStore.setTheme(name)` → gọi `invoke('save_layout_config')` với layout đã cập nhật → Rust lưu file + broadcast full layout tới tất cả clients → Client nhận `sync_layout` payload chứa `theme` → `layoutStore` watch `layout.theme` → `applyTheme(theme)`.
* **Seeding client mới:** Hoàn toàn tự động — client kết nối nhận `sync_layout` từ file `layout.json` vốn đã có `theme` → áp dụng ngay.
* **Fallback:** Client không nhận được sync → đọc `localStorage.getItem('theme')` → mặc định `'cyber'`.

### 2.3 Stories

#### S-THEME1 — Theme registry + CSS variables + applyTheme helper
* **Goal:** Hệ thống theme có thể switch runtime; CSS variables override palette toàn cục.
* **Scope:**
  - Tạo `src/lib/themes.ts`:
    ```ts
    export type ThemeName = 'cyber' | 'midnight' | 'ember';
    export interface ThemeTokens { bgBase: string; bgCard: string; accent: string; accentDim: string; textPrimary: string; textSecondary: string; neonGlow: string; }
    export const THEMES: Record<ThemeName, ThemeTokens> = { cyber: {...}, midnight: {...}, ember: {...} };
    export const THEME_LABELS: Record<ThemeName, string> = { cyber: 'Cyber', midnight: 'Midnight', ember: 'Ember' };
    export function applyTheme(name: ThemeName): void { document.documentElement.setAttribute('data-theme', name); localStorage.setItem('theme', name); }
    ```
  - Trong `src/assets/` (hoặc `App.vue` `<style>`), bổ sung CSS blocks:
    ```css
    :root[data-theme="cyber"]    { --accent: #00d4ff; --bg-base: #020614; ... }
    :root[data-theme="midnight"] { --accent: #a855f7; --bg-base: #0a0012; ... }
    :root[data-theme="ember"]    { --accent: #f97316; --bg-base: #100804; ... }
    ```
  - Migrate các hardcode màu quan trọng nhất trong `GridButton.vue`, `GridArea.vue`, `DashboardView.vue` về dùng `var(--accent)` / `var(--bg-base)` / `var(--bg-card)`. **Không cần migrate 100% trong S-THEME1** — chỉ các màu tạo visual identity của theme (background chính, accent border, neon glow). Phần còn lại migrate dần.
  - `App.vue` `onMounted`: đọc `localStorage.getItem('theme')` → `applyTheme(theme ?? 'cyber')`.
* **Complexity:** Trung bình

#### S-THEME2 — Rust: thêm `theme` vào Layout struct + save/broadcast
* **Goal:** `layout.json` lưu theme; client mới kết nối nhận đúng theme qua `sync_layout` sẵn có.
* **Scope:**
  - `src/types/index.ts`: thêm `theme?: string` vào `Layout`.
  - `src-tauri/src/lib.rs`: thêm `theme: Option<String>` vào `Layout` struct với `#[serde(skip_serializing_if = "Option::is_none")]`.
  - `sanitizeLayout` trong `src/stores/layout.ts`: nếu `layout.theme` không nằm trong danh sách theme hợp lệ → reset về `'cyber'`.
  - Không cần thay đổi `save_layout_config`, `broadcast_layout_to_clients`, hay `websocket.rs` — cơ chế đã đủ.
* **Complexity:** Thấp

#### S-THEME3 — Dashboard UI: theme selector
* **Goal:** Người dùng Dashboard chọn theme → thấy ngay trên Dashboard + tự động sync Client.
* **Scope:**
  - Thêm section "Giao diện" trong DashboardView (ví dụ: dưới header hoặc trong drawer cài đặt nếu có).
  - Render 3 theme card nhỏ có preview swatch màu accent + tên; card đang active highlight border.
  - Click theme card → `layoutStore.layout.theme = name` → `applyTheme(name)` → `debouncedSaveLayout()` (dùng cơ chế debounce save đã có, tránh gọi invoke quá nhiều khi preview).
  - Sau khi save → `broadcast_layout_to_clients` tự động gửi layout mới (bao gồm theme) tới tất cả Client.
* **Complexity:** Thấp

#### S-THEME4 — Client: nhận và áp dụng theme từ sync_layout
* **Goal:** Client Android tự động đổi theme khi Companion thay đổi; khởi động sau khi mất kết nối vẫn giữ theme cũ.
* **Scope:**
  - `src/stores/layout.ts`: trong handler `sync_layout` WS message, sau khi update `layout`, kiểm tra `layout.theme`:
    ```ts
    if (data.theme && isValidTheme(data.theme)) applyTheme(data.theme as ThemeName);
    ```
  - `isValidTheme`: check `Object.keys(THEMES).includes(name)`.
  - `ClientView.vue` `onMounted`: trước khi kết nối WS, đọc `localStorage.getItem('theme')` → `applyTheme` nếu có → đảm bảo theme cũ restore ngay lập tức, không bị flash trắng/mặc định trong lúc chờ WS.
* **Complexity:** Thấp

---

## 3. FEATURE 3: Monitor Button — Button hiển thị thông tin hệ thống thời gian thực

### 3.1 Phân tích gốc rễ

Hiện tại **tất cả** button trong layout đều là "action button" — nhận input từ user, gửi lệnh lên Companion. Macro pad vật lý truyền thống thường có thêm loại **display button** hiển thị thông tin ngược lại (CPU%, RAM%, nhiệt độ, số notification…).

Thiếu loại button này hạn chế tính năng "ambient monitoring": user phải nhìn lên màn hình máy tính để biết tải CPU trong khi đang gaming — trong khi macro pad trên bàn tay có thể hiển thị thông tin đó real-time.

Companion (Desktop) là nơi duy nhất trong hệ thống có quyền đọc thông tin phần cứng (RAM, CPU). Flow tự nhiên:
```
Companion → thu thập metrics → broadcast qua WS → Client render trên button
```

Trong v1.3.0, scope gồm **2 loại metric**: `ram_percent` và `cpu_percent`. Kiểu hiển thị cố định: **giá trị + icon cố định theo metric + label nhỏ bên dưới**.

### 3.2 Giải pháp & Bản thiết kế

**Mô hình dữ liệu:**
* Thêm `buttonKind: 'action' | 'monitor'` vào `ButtonConfig` (mặc định `'action'` để tương thích ngược — `sanitizeLayout` backfill nếu thiếu).
* Thêm `monitorConfig?: { metricType: 'ram_percent' | 'cpu_percent', intervalMs: number }` trên `ButtonConfig`.
* **Monitor button không có `actionType`** — khi `buttonKind === 'monitor'`, `actionType` bị bỏ qua hoàn toàn.

**WS message mới — `metric_update`:**
```
{ type: "metric_update", payload: { ram_percent: number, cpu_percent: number } }
```
* Thêm vào `WSMessage` union ở cả TypeScript (`src/types/index.ts`) và Rust (`websocket.rs`).
* Companion broadcast type này định kỳ tới tất cả client đang kết nối.

**Rust — metrics collector:**
* Thêm `sysinfo = "0.33"` vào `src-tauri/Cargo.toml` (target-independent, Windows + macOS cần).
* Tạo background task trong `run()` (gọi từ `setup()` qua `app.handle().clone()`):
  ```rust
  tokio::spawn(async move { metrics_broadcast_loop(tx, app_handle).await; });
  ```
* `metrics_broadcast_loop`: tính `min_interval_ms` từ layout (đọc `layout.json`, filter các button có `buttonKind == "monitor"`, lấy min `intervalMs`). Nếu không có monitor button → wait 5s rồi re-check. Nếu có → collect metrics mỗi `min_interval_ms`, broadcast `metric_update` payload.
* Re-check layout sau mỗi 30 tick.
* `collect_metrics()`: dùng `sysinfo::System`, refresh `MEMORY | CPU` (không refresh toàn bộ vì `PROCESSES` tốn kém), trả về `{ ram_percent: f32, cpu_percent: f32 }`.
* **Không block WS event loop:** metrics loop chạy trong task riêng, broadcast qua `tx: broadcast::Sender<WSMessage>` đã có.

**Client — render Monitor Button:**
* `GridButton.vue`: branch theo `button.buttonKind === 'monitor'`:
  - Render template riêng: icon lớn cố định (`mdi:memory` cho RAM, `mdi:cpu-64-bit` cho CPU), giá trị % ở giữa (font lớn), label nhỏ bên dưới (từ `button.label`).
  - `metricValue` ref: cập nhật khi nhận `metric_update` WS event từ layout store.
  - Không emit `press` event khi click (monitor button không là action).
* `layout.ts` store: trong `ws-message` handler, thêm case `metric_update` → lưu vào `currentMetrics: ref<Record<string, number>>` (key: `metricType`, value: số liệu mới nhất) → `GridButton` đọc từ đây.

**Dashboard — cấu hình Monitor Button:**
* Trong Edit Button modal, thêm toggle "Loại button":
  ```
  ● Action  ○ Monitor
  ```
* Khi chọn Monitor: ẩn toàn bộ action fields (actionType, shortcut, app path…), hiện ra:
  - Dropdown "Dữ liệu hiển thị": RAM Usage (%), CPU Usage (%)
  - Input số "Cập nhật mỗi (giây)": min 1, default 5
* Khi chọn Action: hiện lại action fields như cũ.

### 3.3 Stories

#### S-MON1 — Types: `buttonKind`, `monitorConfig`, `metric_update` WS message
* **Goal:** Kiểu dữ liệu đầy đủ cho cả TS và Rust; `sanitizeLayout` xử lý migration.
* **Scope:**
  - `src/types/index.ts`:
    - Thêm `MetricType = 'ram_percent' | 'cpu_percent'`.
    - Thêm `MonitorConfig = { metricType: MetricType; intervalMs: number }`.
    - Thêm `buttonKind?: 'action' | 'monitor'` và `monitorConfig?: MonitorConfig` vào `ButtonConfig`.
    - Thêm `'metric_update'` vào `WSMessage.type` union.
  - `src-tauri/src/lib.rs`:
    - Thêm `button_kind: Option<String>` và `monitor_config: Option<MonitorConfig>` vào `ButtonConfig` struct.
    - Thêm `MonitorConfig` struct: `#[serde(rename_all = "camelCase")] struct MonitorConfig { metric_type: String, interval_ms: u64 }`.
  - `src-tauri/src/websocket.rs`: thêm variant `MetricUpdate { ram_percent: f32, cpu_percent: f32 }` vào `WsPayload` enum (hoặc dùng `serde_json::Value` nếu payload đã là generic).
  - `src/stores/layout.ts` → `sanitizeLayout`: backfill `buttonKind: 'action'` nếu thiếu; validate `monitorConfig.intervalMs >= 1000` (minimum 1s, clamp nếu thấp hơn).
* **Complexity:** Thấp

#### S-MON2 — Rust: `sysinfo` integration + `collect_metrics()`
* **Goal:** Thu thập CPU% và RAM% an toàn cross-platform (Windows + macOS).
* **Scope:**
  - Thêm vào `src-tauri/Cargo.toml`:
    ```toml
    [dependencies]
    sysinfo = "0.33"
    ```
  - Trong `src-tauri/src/lib.rs` (hoặc tách `src-tauri/src/metrics.rs`):
    ```rust
    use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

    pub fn collect_metrics() -> (f32, f32) {
        let mut sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::new().with_cpu_usage())
                .with_memory(MemoryRefreshKind::new().with_ram()),
        );
        sys.refresh_specifics(RefreshKind::new()
            .with_cpu(CpuRefreshKind::new().with_cpu_usage())
            .with_memory(MemoryRefreshKind::new().with_ram()));
        let cpu = sys.global_cpu_usage();
        let ram = if sys.total_memory() > 0 {
            sys.used_memory() as f32 / sys.total_memory() as f32 * 100.0
        } else { 0.0 };
        (cpu, ram)
    }
    ```
  - **Lưu ý `sysinfo` CPU:** Lần đọc đầu tiên `global_cpu_usage()` trả về 0 (cần 2 lần refresh cách nhau ít nhất 200ms để có delta). Trong metrics loop, refresh trước → sleep 200ms → refresh lại → đọc giá trị.
* **Complexity:** Trung bình

#### S-MON3 — Rust: metrics broadcast loop + layout re-read khi config thay đổi
* **Goal:** Companion tự động broadcast metrics theo interval từ layout; dừng khi không còn monitor button.
* **Scope:**
  - Trong `run()` của `src-tauri/src/lib.rs`, sau khi setup WS server, thêm:
    ```rust
    let tx_metrics = tx.clone();
    let config_dir = app.path().app_config_dir().unwrap();
    tokio::spawn(async move { metrics_loop(tx_metrics, config_dir).await; });
    ```
  - Hàm `metrics_loop(tx: Sender<WsMessage>, config_dir: PathBuf)`:
    1. Đọc layout từ `layout.json` → tìm monitor buttons → tính `min_interval_ms` (default 5000 nếu không có).
    2. `tokio::time::interval(Duration::from_millis(min_interval_ms))` loop.
    3. Mỗi tick: `collect_metrics()` → broadcast `{ type: "metric_update", payload: { ram_percent, cpu_percent } }` qua `tx.send()`.
    4. Mỗi 30 tick: re-read layout → recalculate interval → nếu interval thay đổi thì tạo lại `tokio::time::interval`.
    5. Nếu `tx.send()` returns `Err` (không có receiver) → không panic, tiếp tục loop.
  - Không cần signal channel riêng cho v1.3.0 — re-check định kỳ đủ đơn giản và ổn định.
* **Complexity:** Cao

#### S-MON4 — Dashboard UI: cấu hình Monitor Button trong Edit modal
* **Goal:** Người dùng có thể switch button từ Action sang Monitor, chọn metric và interval.
* **Scope:**
  - Trong `DashboardView.vue`, trong Edit Button drawer/modal:
    - Thêm radio group "Loại button": `● Action  ○ Monitor`.
    - v-if `buttonKind === 'monitor'`:
      - `<select v-model="editingButton.monitorConfig.metricType">` với options: `ram_percent → "RAM Usage (%)"`, `cpu_percent → "CPU Usage (%)"`
      - `<input type="number" v-model.number="editingButton.monitorConfig.intervalMs" min="1" step="1" />` + label "Cập nhật mỗi (giây)" (Note: giá trị nhập là giây, store nhân 1000 → ms).
    - v-else: hiển thị action fields như hiện tại.
  - Khi switch từ `action` → `monitor`: set `monitorConfig = { metricType: 'cpu_percent', intervalMs: 5000 }` (default).
  - Khi switch từ `monitor` → `action`: xóa `monitorConfig`, set `actionType = 'shortcut'` (default).
* **Complexity:** Thấp

#### S-MON5 — Client: render Monitor Button + nhận metric_update
* **Goal:** Monitor button hiển thị số liệu thời gian thực, cập nhật khi nhận WS event.
* **Scope:**
  - `src/stores/layout.ts`: thêm `currentMetrics: ref<{ ram_percent: number; cpu_percent: number }>({ ram_percent: 0, cpu_percent: 0 })`. Handler `metric_update` trong WS event: update `currentMetrics.value`.
  - Export `currentMetrics` từ layout store.
  - `src/components/GridButton.vue`:
    - Prop `button: ButtonConfig` đã có — branch `v-if="button.buttonKind === 'monitor'"`:
      ```html
      <div class="monitor-display">
        <Icon :icon="metricIcon" class="monitor-icon" />
        <span class="monitor-value">{{ metricValue }}%</span>
        <span class="monitor-label">{{ button.label }}</span>
      </div>
      ```
    - `metricIcon` computed: `button.monitorConfig.metricType === 'ram_percent' ? 'mdi:memory' : 'mdi:cpu-64-bit'`
    - `metricValue` computed: `Math.round(currentMetrics[button.monitorConfig.metricType])` (từ store).
    - Không emit `press` event; CSS class riêng `cyber-btn--monitor` để phân biệt với action button.
  - CSS `cyber-btn--monitor`: font value lớn hơn (1.4rem), icon trung tâm, label nhỏ (0.65rem) opacity 0.7.
* **Complexity:** Trung bình

---

## 4. FEATURE 4: Keep Screen On — Chống tắt màn hình (Client Android)

### 4.1 Phân tích gốc rễ

Android tắt màn hình sau 1-5 phút không tương tác — đây là hành vi mặc định hợp lý cho điện thoại dùng thông thường, nhưng lại bất tiện với macro pad: người dùng đặt điện thoại trên bàn làm key phụ, định kỳ nhìn sang nhấn button mà không muốn phải mở khóa màn hình trước.

Cách tiếp cận phù hợp nhất: **Screen Wake Lock API** (Web API chuẩn W3C, Chrome 84+ / Android WebView 84+). Không cần Tauri plugin native — WebView trên Android đã hỗ trợ `navigator.wakeLock.request('screen')`. Đây là cách tiếp cận nhẹ nhất, không cần quyền `WAKE_LOCK` manifest (Web API tự xử lý), không rò rỉ resource nếu release đúng cách.

Hạn chế của Web Wake Lock: tự động release khi tab/app vào background (document bị hidden). Phải re-acquire khi app trở về foreground — đây là behavior bắt buộc theo spec, cần xử lý trong code.

### 4.2 Giải pháp & Bản thiết kế

* **Settings store (`src/stores/settings.ts`):** Tạo Pinia store mới, key `keepScreenOn: boolean`, persist vào `localStorage`.
* **Wake Lock service (`src/lib/wakelock.ts`):** Module quản lý lifecycle:
  - `wakeLockSentinel: Ref<WakeLockSentinel | null>`
  - `acquire()`: gọi `navigator.wakeLock.request('screen')`, lưu sentinel.
  - `release()`: gọi `sentinel.release()`, set null.
  - `onVisibilityChange()`: khi `document.visibilityState === 'visible'` và `keepScreenOn.value === true` → `acquire()` lại.
  - Fallback graceful: nếu browser không support `navigator.wakeLock` → log warn, không crash.
* **ClientView.vue:**
  - `onMounted`: nếu `keepScreenOn.value` → `acquire()`.
  - `onUnmounted`: `release()`.
  - `document.addEventListener('visibilitychange', onVisibilityChange)` trong `onMounted`, remove trong `onUnmounted`.
* **Settings UI trong ClientView:**
  - Thêm floating settings button (icon gear) → tap mở overlay nhỏ với toggle:
    ```
    ☀ Luôn bật màn hình  [●]
    ```
  - Toggle change: update `keepScreenOn` store → nếu bật → `acquire()`; nếu tắt → `release()`.

### 4.3 Stories

#### S-WAKE1 — Settings store + toggle UI trong ClientView
* **Goal:** Cài đặt "Keep Screen On" có thể bật/tắt, persist qua restart app.
* **Scope:**
  - Tạo `src/stores/settings.ts`:
    ```ts
    export const useSettingsStore = defineStore('settings', () => {
      const keepScreenOn = ref(JSON.parse(localStorage.getItem('settings:keepScreenOn') ?? 'false'));
      watch(keepScreenOn, val => localStorage.setItem('settings:keepScreenOn', JSON.stringify(val)));
      return { keepScreenOn };
    });
    ```
  - `ClientView.vue`: thêm floating settings toggle ở góc (bottom-right, icon `lucide:settings` nhỏ).
  - Khi tap icon → hiện overlay nhỏ gồm toggle "Luôn bật màn hình" + label giải thích ngắn.
  - Style phù hợp cyber theme (semi-transparent bg, border neon dim).
* **Complexity:** Thấp

#### S-WAKE2 — Screen Wake Lock API implementation
* **Goal:** Màn hình không tắt khi cài đặt bật; tự re-acquire sau khi app trở lại foreground.
* **Scope:**
  - Tạo `src/lib/wakelock.ts`:
    ```ts
    let sentinel: WakeLockSentinel | null = null;

    export async function acquireWakeLock(): Promise<void> {
      if (!('wakeLock' in navigator)) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch (e) { console.warn('WakeLock acquire failed:', e); }
    }

    export async function releaseWakeLock(): Promise<void> {
      await sentinel?.release();
      sentinel = null;
    }

    export function isWakeLockActive(): boolean {
      return sentinel !== null && !sentinel.released;
    }
    ```
  - `ClientView.vue` `onMounted`:
    ```ts
    const { keepScreenOn } = useSettingsStore();
    if (keepScreenOn) await acquireWakeLock();

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && keepScreenOn) await acquireWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    onUnmounted(() => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibility);
    });
    ```
  - Watch `keepScreenOn` trong ClientView: khi change true → `acquireWakeLock()`; khi change false → `releaseWakeLock()`.
  - **Test thủ công:** Bật setting → để thiết bị idle 5 phút → màn hình không tắt. Tắt setting → idle → màn hình tắt bình thường.
* **Complexity:** Thấp

---

## 5. BUG FIX: APK Release Filename thiếu version

### 5.1 Phân tích gốc rễ

Gradle build Android mặc định đặt tên output là `app-universal-release.apk` (hoặc `app-universal-release-unsigned.apk`). Tên generic gây khó phân biệt khi có nhiều version trong thư mục download, attach lên GitHub Release, hay chia sẻ qua link.

Kết quả mong muốn: `android-stream-desk-v1_3_0.apk` — gắn version từ `versionName` trong `tauri.properties` (được Tauri CLI cập nhật tự động khi build từ `tauri.conf.json`).

Đồng thời, `release.yml` upload path hiện hardcode `app-universal-release.apk` — khi đổi tên Gradle cũng phải cập nhật path upload.

### 5.2 Giải pháp & Bản thiết kế

* Trong `src-tauri/gen/android/app/build.gradle.kts`, thêm block `applicationVariants.all`:
  ```kotlin
  android.applicationVariants.all {
      val variant = this
      outputs.all {
          val out = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
          val ver = variant.versionName.replace('.', '_')
          out.outputFileName = "android-stream-desk-v${ver}.apk"
      }
  }
  ```
  Block này đọc `versionName` từ `defaultConfig` (đã được Tauri populate từ `tauri.properties`) và rename output theo pattern `v1_3_0`.
* Cập nhật upload path trong `release.yml` (job `build-android`): thay `app-universal-release.apk` → `android-stream-desk-v*.apk` (glob).
* Cập nhật upload path trong `android-debug.yml`: thay `app-universal-debug.apk` → `android-stream-desk-v*-debug.apk`.

### 5.3 Stories

#### S-APK1 — Gradle output filename + cập nhật CI upload paths
* **Goal:** APK build ra có tên gắn version; GitHub Release artifact và CI artifact có tên nhất quán.
* **Scope:**
  - `src-tauri/gen/android/app/build.gradle.kts`: thêm block `applicationVariants.all` như trên, đặt sau khối `buildTypes { ... }`, trước dấu đóng `android { }`.
  - `release.yml` job `build-android` — step "Upload signed APK to release":
    ```yaml
    files: src-tauri/gen/android/app/build/outputs/apk/universal/release/android-stream-desk-v*.apk
    ```
  - `release.yml` step "Upload unsigned APK" (fallback): cập nhật tương tự.
  - `android-debug.yml` step "Upload debug APK artifact":
    ```yaml
    path: src-tauri/gen/android/app/build/outputs/apk/universal/debug/android-stream-desk-v*-debug.apk
    ```
  - Verify: `versionName` trong `tauri.properties` là `1.3.0` → APK tên `android-stream-desk-v1_3_0.apk`.
* **Complexity:** Thấp

---

## 6. Tổng hợp Kế hoạch Triển khai v1.3.0

### Dependency Graph

```
Icons          ──> S-ICON1 ──> S-ICON2                        (Brand pack → Picker search nâng cao)

Themes         ──> S-THEME1 ──> S-THEME2 ──> S-THEME3         (Registry + CSS → Rust types → Dashboard UI)
                                         └──> S-THEME4         (Client apply — parallel với S-THEME3)

Monitor        ──> S-MON1 ──> S-MON2 ──> S-MON3               (Types → sysinfo → broadcast loop)
                         └──> S-MON4                           (Dashboard config UI — parallel với S-MON2/3)
                         └──────────────────> S-MON5           (Client render — cần S-MON1 + S-MON3)

Wake Lock      ──> S-WAKE1 ──> S-WAKE2                        (Settings store → WakeLock impl)

APK Fix        ──> S-APK1                                     (Standalone, không dependency)
```

### Complexity & Impact Matrix

| Story    | Feature                                              | Complexity  | Front-end Only? |
|----------|------------------------------------------------------|-------------|-----------------|
| S-ICON1  | Simple Icons pack + curated brand list               | Thấp        | ✅              |
| S-ICON2  | Full-pack search + virtual scroll trong picker       | Trung bình  | ✅              |
| S-THEME1 | Theme registry + CSS variables + applyTheme helper   | Trung bình  | ✅              |
| S-THEME2 | Rust: thêm `theme` vào Layout struct                 | Thấp        | ❌ (Rust + TS)  |
| S-THEME3 | Dashboard UI: theme selector                         | Thấp        | ✅              |
| S-THEME4 | Client: nhận và áp dụng theme từ sync_layout         | Thấp        | ✅              |
| S-MON1   | Types: `buttonKind`, `monitorConfig`, WS message     | Thấp        | ❌ (Rust + TS)  |
| S-MON2   | Rust: `sysinfo` + `collect_metrics()`                | Trung bình  | ❌ (Rust)       |
| S-MON3   | Rust: metrics broadcast loop                         | Cao         | ❌ (Rust)       |
| S-MON4   | Dashboard UI: cấu hình Monitor Button                | Thấp        | ✅              |
| S-MON5   | Client: render Monitor Button + nhận metric_update   | Trung bình  | ✅              |
| S-WAKE1  | Settings store + toggle UI trong ClientView          | Thấp        | ✅              |
| S-WAKE2  | Screen Wake Lock API implementation                  | Thấp        | ✅              |
| S-APK1   | Gradle output filename + CI upload paths             | Thấp        | ❌ (Gradle/CI)  |

### New Files Expected

```
src/lib/themes.ts                                   (S-THEME1) - Theme registry, CSS token types, applyTheme()
src/lib/wakelock.ts                                 (S-WAKE2)  - Screen Wake Lock acquire/release/reacquire
src/stores/settings.ts                              (S-WAKE1)  - App-level settings store (keepScreenOn, v.v.)
src-tauri/src/metrics.rs (optional split)           (S-MON2/3) - sysinfo collect + broadcast loop
```

### Modified Files Expected

```
package.json                                        (S-ICON1 - thêm @iconify-json/simple-icons)
src/config/icons.ts                                 (S-ICON1 - thêm siIcons[], ICON_GROUPS entry 'si')
src/views/DashboardView.vue                         (S-ICON2, S-THEME3, S-MON4)
src/types/index.ts                                  (S-THEME2, S-MON1 - theme?, buttonKind, monitorConfig, metric_update)
src/stores/layout.ts                                (S-THEME4, S-MON1, S-MON5 - sanitizeLayout + currentMetrics)
src/components/GridButton.vue                       (S-MON5 - monitor branch render)
src/views/ClientView.vue                            (S-THEME4, S-WAKE1, S-WAKE2)
src-tauri/src/lib.rs                                (S-THEME2, S-MON1, S-MON2, S-MON3)
src-tauri/src/websocket.rs                          (S-MON1 - metric_update WS type)
src-tauri/Cargo.toml                                (S-MON2 - thêm sysinfo dep)
src-tauri/gen/android/app/build.gradle.kts          (S-APK1 - output filename)
.github/workflows/release.yml                       (S-APK1 - upload path)
.github/workflows/android-debug.yml                 (S-APK1 - artifact path)
```

### Phasing đề xuất

1. **Sprint 1 — Quick wins & Foundation** (2-3 ngày)
   - S-APK1 (standalone, 30 phút — fix trước để mọi build về sau đúng tên).
   - S-ICON1 (thêm simple-icons pack + curated list — nhanh, low risk).
   - S-THEME1 → S-THEME2 → S-THEME3 → S-THEME4 (chuỗi theme, S-THEME2 Rust đơn giản).
   - S-WAKE1 + S-WAKE2 (hai story nhỏ, hoàn toàn frontend, không ảnh hưởng backend).

2. **Sprint 2 — Icon Picker nâng cao + Monitor Button** (4-6 ngày)
   - S-ICON2 (full-pack search + virtual scroll).
   - S-MON1 (types — prerequisite cho tất cả MON stories).
   - S-MON2 + S-MON3 (Rust sysinfo + broadcast loop — làm tuần tự, MON3 phụ thuộc MON2).
   - S-MON4 (Dashboard config UI — có thể làm song song với MON2/MON3).
   - S-MON5 (Client render — cần MON1 + MON3 xong để test end-to-end).
   - Test thủ công E2E Monitor: Companion chạy Windows, thêm monitor button CPU → Android Client mở → thấy giá trị CPU cập nhật mỗi 5s.

3. **Sprint 3 — Polish & Release prep** (1-2 ngày)
   - Kiểm tra theme trên cả Dashboard (Windows) và Client (Android).
   - Verify Monitor Button khi Companion bị đóng → Client hiển thị giá trị cuối cùng (stale) không crash.
   - Bump `package.json` version + `src-tauri/tauri.conf.json` lên `1.3.0`.
   - Cập nhật `CHANGELOG.md`.
   - Tag `v1.3.0` → workflow `release.yml` tự build Windows MSI + APK signed tên `android-stream-desk-v1_3_0.apk`.

### Ghi chú phát hành

- `sysinfo` crate cần test kỹ trên Windows — CPU usage trong `sysinfo` đôi khi trả về 0% ở lần read đầu tiên do thiếu delta time (đã handle trong S-MON2 bằng double-refresh với sleep 200ms).
- Screen Wake Lock API không available trên iOS WebView (WKWebView không hỗ trợ) — tính năng S-WAKE2 chỉ hoạt động trên Android. Thêm check `if (!('wakeLock' in navigator))` để tránh crash.
- Theme migration: `layout.json` cũ không có `theme` field → `sanitizeLayout` trả về `undefined` → fallback `'cyber'` → không breaking change.
- APK rename (`S-APK1`) áp dụng ngay cả build local — developer cần cập nhật script hoặc hướng dẫn tìm APK ở path mới.
