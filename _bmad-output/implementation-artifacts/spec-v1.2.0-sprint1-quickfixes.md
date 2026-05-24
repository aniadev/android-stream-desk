---
title: 'v1.2.0 Sprint 1 — Drag-drop fixes + Debug APK script'
type: 'bugfix'
created: '2026-05-24'
status: 'done'
baseline_commit: 'dc31ca7df44fc38b6b4eedd948f742cdd136c9c6'
context:
  - '{project-root}/_bmad-output/planning-artifacts/breakdown-v1.2.0.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dashboard có 2 lỗi UX kéo-thả khó chịu (B1, B3 trong breakdown v1.2.0): (1) sau khi tăng/giảm rows/cols qua nút +/-, kéo nút thường bị snap-back về vị trí cũ vì Sortable instance còn trỏ vào array `buttons` reference cũ (do `updateLayout` thay nguyên `layout.value`); (2) click chọn nút để edit đôi khi không kích hoạt vì Sortable nuốt mousedown — không phân biệt được click ngắn và drag. Song song, chưa có lệnh local rút gọn để build APK debug khi cần test nhanh trên thiết bị Android thật (S-DBG1).

**Approach:** (1) Thêm action `resizeGrid(rows, cols, newButtons)` vào layout store, mutate `layout.value.buttons` in-place qua `splice` để giữ stable array reference cho mọi Sortable instance binding. (2) Bổ sung options `delay: 100, delayOnTouchOnly: true, touchStartThreshold: 5` vào cả 2 `v-draggable` (`GridArea.vue` client + Dashboard inline grid) — Sortable phân biệt click ngắn (<100ms) khỏi drag, không nuốt sự kiện click. (3) Thêm npm script `android:build:debug` chạy `tauri android build --apk --debug`.

## Boundaries & Constraints

**Always:**
- Giữ nguyên cơ chế persist (`localStorage` + Tauri `save_layout_config`) và broadcast WS qua `broadcastSync` — chỉ thay đổi cơ chế update buttons array.
- Layout sync inbound từ WS (`updateLayout(synced, true)`) vẫn được phép thay reference toàn bộ layout (chỉ giải quyết riêng case resize grid local).
- TypeScript build (`pnpm build` = `vue-tsc -b && vite build`) phải pass không error.

**Ask First:**
- Nếu sau khi áp delay 100ms vẫn còn miss-click trên touch device hoặc cảm giác drag bị lag → trước khi điều chỉnh thông số hoặc đổi sang phương án Sortable `filter`, hỏi Ania xác nhận trade-off.

**Never:**
- Đụng vào `tokio` WS server, Rust `lib.rs`, hoặc bất kỳ logic backend nào — Sprint 1 thuần frontend + 1 dòng package.json.
- Thay reference `layout.value` trong các luồng khác (load disk, WS sync) — chỉ luồng resize grid mới dùng in-place.
- Tạo file Rust/Gradle/CI mới — F3/F4/F5 thuộc Sprint sau.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Resize tăng cols sau đó drag | User bấm `cols +1` (3→4), kéo button[2] sang vị trí [5] | Drop xong UI và state đều khớp; persist + broadcast đúng thứ tự mới | N/A |
| Resize giảm rows | 3 rows → 2 rows, layout còn 9 buttons → trim còn 6 | `layout.buttons.length === 6`, reference cùng array trước/sau | N/A |
| Click nhanh chọn button (Dashboard) | Mousedown + mouseup <100ms trên 1 nút | `selectButton(id)` được gọi, drawer Edit mở | N/A |
| Press + hold + di chuyển | Mousedown giữ >100ms rồi kéo | Sortable kích hoạt drag bình thường, ghostClass áp dụng | N/A |
| Touch tap nhanh (Client/Android) | Touchstart + touchend <100ms trên 1 nút | `pressButton` emit, macro chạy; KHÔNG kích hoạt drag | N/A |
| `pnpm android:build:debug` | Lệnh local chạy trong repo root | Tauri CLI build APK debug, output `.../debug/app-universal-debug.apk` | Lệnh thất bại → user thấy stderr CLI, không thay đổi gì khác |

</frozen-after-approval>

## Code Map

- `src/stores/layout.ts` -- Thêm action `resizeGrid(rows, cols, newButtons)` mutate in-place; export trong return; giữ nguyên `updateLayout` cho các luồng khác.
- `src/views/DashboardView.vue` -- `updateGridDimensions` (line 374-409) đổi sang gọi `layoutStore.resizeGrid(...)`; v-draggable inline (line 995-1001) thêm 3 options delay.
- `src/components/GridArea.vue` -- v-draggable options (line 37-41) thêm 3 options delay tương tự.
- `package.json` -- Thêm script `"android:build:debug": "tauri android build --apk --debug"` vào scripts block (line 6-16).

## Tasks & Acceptance

**Execution:**
- [x] `src/stores/layout.ts` -- Thêm `resizeGrid(rows, cols, newButtons)`: set `layout.value.rows`, `layout.value.cols`, gọi `layout.value.buttons.splice(0, layout.value.buttons.length, ...newButtons)`, sau đó `localStorage.setItem` + `broadcastSync()`. Export trong object return.
- [x] `src/views/DashboardView.vue` -- Trong `updateGridDimensions` (line 400-404), đổi `layoutStore.updateLayout({ rows: newRows, cols: newCols, buttons: newButtons })` thành `layoutStore.resizeGrid(newRows, newCols, newButtons)`. Trong v-draggable inline (line 995-1001), thêm `delay: 100, delayOnTouchOnly: true, touchStartThreshold: 5` vào options object.
- [x] `src/components/GridArea.vue` -- Trong v-draggable options (line 37-41), thêm cùng 3 options delay.
- [x] `package.json` -- Thêm dòng `"android:build:debug": "tauri android build --apk --debug",` vào scripts block (đặt cạnh `android:build`).

**Acceptance Criteria:**
- **AC-1 (B1):** Given Dashboard có 3x3 grid, when user bấm `cols +1` để thành 3x4 rồi kéo nút thứ 2 sang vị trí thứ 7, then sau drop UI hiển thị nút ở vị trí mới VÀ `layoutStore.layout.buttons` thứ tự khớp với UI (kiểm tra qua console hoặc reload trang vẫn giữ thứ tự).
- **AC-2 (B3 Dashboard):** Given Dashboard mở, when user click nhanh (<100ms) một nút bất kỳ trong grid, then `selectedButtonId` được set sang nút đó và drawer Edit Button mở ra; drag (giữ + kéo) vẫn hoạt động bình thường khi mousedown >100ms.
- **AC-3 (B3 Client):** Given Android Client đã kết nối server, when user tap nhanh (<100ms) một nút, then macro WS press được gửi đi (xác minh server console hoặc UI đích); long-press + di chuyển vẫn kích hoạt drag (mặc dù client không dùng drag để reorder, hành vi không được lỗi).
- **AC-4 (S-DBG1):** Given user chạy `pnpm android:build:debug` trong repo root với Android SDK cấu hình sẵn, when build hoàn tất, then file APK debug xuất hiện tại `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` và lệnh exit code 0.

## Design Notes

**Tại sao splice thay vì gán mảng mới:** `vue-draggable-plus` (Sortable.js wrapper) bind directive 1 lần lúc mount, lưu lại reference array gốc. Khi `layout.value = { ...oldLayout, buttons: newArr }`, Vue reactivity re-render UI nhưng Sortable vẫn trỏ vào `oldArr`. Drop event mutate `oldArr` (đã bị orphan), nên UI snap-back về state mới nhất từ `newArr` (vốn không biết gì về drop). `splice` giữ identity → Sortable luôn mutate đúng array đang được render.

**Tại sao delay 100ms thay vì 0:** Mặc định Sortable bind cả mousedown/touchstart để chuẩn bị drag. Trong Sprint 1, mục tiêu giữ thao tác click rõ rệt: <100ms = click, ≥100ms = drag intent. `delayOnTouchOnly: true` giữ click trên desktop instant (chỉ chậm trên touch để bù cho ngón tay), `touchStartThreshold: 5` cho phép run-finger 5px trước khi cancel click — chống tap-jitter trên màn cảm ứng.

## Verification

**Commands:**
- `pnpm build` -- expected: vue-tsc + vite build pass không error/warning mới.
- `pnpm tauri dev` -- expected: Dashboard chạy, manual test theo AC-1 và AC-2.

**Manual checks:**
- **AC-1:** Mở Dashboard, click `cols +1` từ 3x3 → 3x4. Kéo nút "Paste" từ ô #2 sang ô #7. Sau drop, refresh trang (Ctrl+R). Nút "Paste" vẫn ở ô #7.
- **AC-2:** Mở Dashboard. Click nhanh nút bất kỳ. Drawer Edit phải mở. Sau đó nhấn giữ + kéo nút khác — drag bình thường.
- **AC-3 (cần Android device):** Build debug APK qua AC-4, cài lên thiết bị, kết nối tới companion. Tap nhanh nút trên client — macro chạy trên companion.
- **AC-4:** Chạy `pnpm android:build:debug` trên máy đã cài Android SDK. Kiểm tra file APK output và exit code.

## Suggested Review Order

**B1 — Drag-drop after resize (in-place mutation)**

- Entry point: design intent for the new action — splice giữ array reference cho Sortable.
  [`layout.ts:136`](../../src/stores/layout.ts#L136)

- Call-site swap: `updateLayout(...)` → `resizeGrid(...)` chỉ ở luồng resize, các luồng khác giữ nguyên reference-swap.
  [`DashboardView.vue:400`](../../src/views/DashboardView.vue#L400)

- Public API export — confirm `resizeGrid` lộ ra ngoài store.
  [`layout.ts:267`](../../src/stores/layout.ts#L267)

**B3 — Sortable click reliability**

- Dashboard inline grid: delay 100ms phân biệt click ngắn khỏi drag (desktop instant nhờ `delayOnTouchOnly`).
  [`DashboardView.vue:996`](../../src/views/DashboardView.vue#L996)

- Client grid: cùng 3 options, đảm bảo tap macro trên Android không bị Sortable nuốt.
  [`GridArea.vue:40`](../../src/components/GridArea.vue#L40)

**S-DBG1 — Debug APK build script**

- 1-line npm script chạy `tauri android build --apk --debug`.
  [`package.json:10`](../../package.json#L10)
