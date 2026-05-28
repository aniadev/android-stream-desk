---
title: 'v1.4.0 S-CONN1 — Client reconnect ngầm + gate modal theo trạng thái'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Companion tắt sau khi đã connect → heartbeat chết (5s, `connection.ts:181-203`) → `triggerAutoReconnect` thử 3×3s (`MAX_RECONNECT_ATTEMPTS=3` `:6`, `:212-234`) → `status='error'` (`:214`). `ClientView.vue` hiện modal mỗi khi không `connected` (grid `v-if status==='connected'` `:176`), sau 3 fail hiện block lỗi (`:225-236`). UX kém: rớt tạm thời bật full modal + lỗi.

**Approach:** Thêm `hasConnectedOnce` (set ở `ws.onopen` `:109-116`). Phân biệt: chưa-từng-connect/chủ-động-ngắt → modal (cũ); đã-connect-rồi-rớt → KHÔNG modal/lỗi, giữ grid, đổi status icon, auto-reconnect 30s không giới hạn.

## Boundaries & Constraints

**Always:** Reconnect ngầm 30s, không cap, không set `error` khi `hasConnectedOnce`. Modal hiện khi `!hasConnectedOnce || userDisconnected`. Giữ stale-close guard (`:141-144`) và heartbeat.

**Ask First:** Nếu muốn interval ngầm khác 30s.

**Never:** KHÔNG hiện modal/lỗi khi reconnect ngầm. KHÔNG reset `hasConnectedOnce` khi rớt (chỉ reset khi user chủ động ngắt — về luồng modal lần đầu). KHÔNG phá `userDisconnected` semantics (`:162-173`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Đã connect → Companion tắt | hasConnectedOnce=true, !userDisconnected | giữ grid, status icon "reconnecting", reconnect mỗi 30s vô hạn, KHÔNG modal/lỗi | tx fail → tiếp tục |
| Chưa từng connect, sai IP | hasConnectedOnce=false | modal connect + thử 3×3s → lỗi (cũ) | giữ |
| Chủ động Ngắt kết nối | userDisconnected=true | modal connect | — |
| Reconnect ngầm thành công | Companion bật lại | onopen → connected, icon "connected" | reset attempts |
| Mạng LAN mất hẳn | !isOnline | banner offline (giữ `:189`) | — |

</frozen-after-approval>

## Code Map

- `src/stores/connection.ts` — `hasConnectedOnce` ref (set ở `ws.onopen` `:109`); `triggerAutoReconnect` (`:212-234`) hai chế độ (30s/unlimited khi hasConnectedOnce, không set error); reset hasConnectedOnce trong `disconnect` (`:162`); export `hasConnectedOnce`.
- `src/views/ClientView.vue` — `showConnectModal` computed; giữ grid + status icon khi reconnect ngầm; ẩn block lỗi (`:225-236`) trong chế độ ngầm; HUD pill (`:340-342`) thêm biến thể.

## Tasks & Acceptance

**Execution:**
- [x] `src/stores/connection.ts` -- Thêm `const hasConnectedOnce = ref(false)`; set `true` trong `ws.onopen` (`:109-116`). Trong `disconnect` (`:162-173`): set `hasConnectedOnce.value = false` (user chủ động ngắt → quay về luồng modal lần đầu).
- [x] `src/stores/connection.ts` -- `triggerAutoReconnect` (`:212-234`): nếu `hasConnectedOnce.value` → dùng interval `30000ms`, BỎ kiểm `MAX_RECONNECT_ATTEMPTS`, KHÔNG set `status='error'` (giữ `'disconnected'`/`'connecting'`); else → giữ logic 3×3s + error. Export `hasConnectedOnce`.
- [x] `src/views/ClientView.vue` -- Thêm `const showConnectModal = computed(() => !connectionStore.hasConnectedOnce && connectionStore.status !== 'connected')`. `disconnect()` reset `hasConnectedOnce=false` cover userDisconnected case. Đổi block modal (`:182`) `v-else` → `v-else-if="showConnectModal"`; grid hiển thị khi `connected` HOẶC (`hasConnectedOnce && !showConnectModal`).
- [x] `src/views/ClientView.vue` -- HUD pill (`:340-342`): biến thể 3 trạng thái connected/reconnecting/disconnected (màu khác); khi reconnect ngầm hiện "reconnecting". Block lỗi "sau N lần thử" nằm trong modal — ẩn tự động khi `showConnectModal=false`.

**Acceptance Criteria:**
- Given đã connect rồi Companion tắt, when mất kết nối, then grid vẫn hiện, icon "reconnecting", KHÔNG modal/lỗi, reconnect mỗi 30s.
- Given chưa từng connect hoặc chủ động ngắt, when không connected, then modal connect hiện.
- Given reconnect ngầm, when Companion bật lại (≤30s sau), then tự connect, icon "connected".
- Given mạng LAN mất hẳn, then banner offline (giữ).

## Design Notes

`hasConnectedOnce` reset khi user chủ động Ngắt — vì khi đó user muốn nhập lại IP (luồng modal). Rớt ngoài ý muốn KHÔNG reset → ở chế độ ngầm. Interval 30s (chốt Ania) đủ tiết kiệm pin + bắt lại nhanh khi Companion bật.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: sạch.

**Manual (Client + Companion):** connect → tắt Companion → grid giữ, icon đổi, không modal/lỗi → bật lại Companion → tự reconnect ≤30s. Bấm Ngắt kết nối → modal hiện.

## File List

- `src/stores/connection.ts` — thêm `hasConnectedOnce` ref, 30s silent reconnect branch
- `src/views/ClientView.vue` — `showConnectModal` computed, grid v-if, modal v-else-if, HUD pill 3 trạng thái

## Dev Agent Record

### Completion Notes

Toàn bộ implementation đã có trong working tree trước khi chạy dev-story. Verified:
- `pnpm vue-tsc --noEmit` sạch
- `showConnectModal` = `!hasConnectedOnce && status !== 'connected'`; `disconnect()` reset `hasConnectedOnce=false` cover luồng userDisconnected — không cần expose `userDisconnected` riêng
- Error block "sau N lần thử" ẩn tự động (nằm trong modal gated `showConnectModal`)

### Change Log

- 2026-05-28: Implement S-CONN1 — hasConnectedOnce + triggerAutoReconnect 30s + showConnectModal gate + HUD pill 3 trạng thái

## Suggested Review Order

- `hasConnectedOnce` + `triggerAutoReconnect` hai chế độ. [`connection.ts:212`](../../src/stores/connection.ts#L212)
- `showConnectModal` gate + giữ grid. [`ClientView.vue:182`](../../src/views/ClientView.vue#L182)
- HUD pill 3 trạng thái. [`ClientView.vue:340`](../../src/views/ClientView.vue#L340)
