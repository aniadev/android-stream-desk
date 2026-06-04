---
title: 'v1.3.0 Screen Wake Lock — Chống tắt màn hình Android'
type: 'feature'
created: '2026-05-25'
baseline_commit: '6ce0805'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Android tắt màn hình sau 1–5 phút không tương tác — bất tiện khi macro pad đặt cố định trên bàn, user định kỳ nhìn sang nhấn button mà không muốn mở khóa màn hình trước.

**Approach:** Thêm tính năng "Luôn bật màn hình" dùng Screen Wake Lock API (W3C chuẩn, Chrome 84+ / Android WebView 84+). Toggle nằm trong settings panel đã có sẵn trong ClientView. Setting persist qua localStorage. Khi app vào background, wake lock tự release theo spec — tự re-acquire khi trở về foreground.

## Boundaries & Constraints

**Always:** Kiểm tra `'wakeLock' in navigator` trước khi gọi — iOS WKWebView không hỗ trợ API này; phải fail silently.

**Ask First:** Nếu cần thêm wake lock vào màn hình kết nối (trước khi connect) thay vì chỉ khi đã connected.

**Never:** Dùng Tauri native plugin hay `WAKE_LOCK` Android manifest permission — Web API đủ và không cần permission.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bật toggle | `keepScreenOn = false → true` | `acquireWakeLock()` gọi ngay; màn hình không tắt | Nếu browser từ chối: log warn, toggle ở trạng thái on nhưng wake lock không active |
| Tắt toggle | `keepScreenOn = true → false` | `releaseWakeLock()` gọi ngay; màn hình tắt bình thường | — |
| App vào background | `keepScreenOn = true`, tab hidden | Wake lock tự release (theo spec W3C) | — |
| App về foreground | `keepScreenOn = true`, `visibilityState === 'visible'` | `acquireWakeLock()` tự gọi lại | Fail silently nếu bị từ chối |
| App mount lần đầu | `keepScreenOn = true` (từ localStorage) | `acquireWakeLock()` gọi trong `onMounted` | Fail silently |
| iOS / unsupported | `'wakeLock' not in navigator` | Không crash; toggle hiển thị bình thường nhưng vô hiệu | Console warn một lần |

</frozen-after-approval>

## Code Map

- `src/stores/settings.ts` — NEW: Pinia store cho app-level settings (`keepScreenOn`), persist localStorage.
- `src/lib/wakelock.ts` — NEW: module export `acquireWakeLock()`, `releaseWakeLock()`, `isWakeLockActive()`.
- `src/views/ClientView.vue` — thêm toggle UI vào settings panel hiện có (dưới "Xoay màn hình", trên "Ngắt kết nối"); lifecycle hooks acquire/release; visibilitychange handler.

## Tasks & Acceptance

**Execution:**
- [x] `src/stores/settings.ts` -- Tạo mới Pinia store `useSettingsStore` với `keepScreenOn: ref<boolean>` khởi tạo từ `localStorage.getItem('settings:keepScreenOn')` (parse JSON, default `false`). Watch để persist khi thay đổi. Export store.
- [x] `src/lib/wakelock.ts` -- Tạo mới module: `let sentinel: WakeLockSentinel | null = null`. Export `acquireWakeLock()` (guard: `if (!('wakeLock' in navigator)) return`; try/catch với console.warn khi fail), `releaseWakeLock()` (gọi `sentinel?.release()`, set null), `isWakeLockActive()` (return `sentinel !== null && !sentinel.released`).
- [x] `src/views/ClientView.vue` -- (1) Import `useSettingsStore`, `acquireWakeLock`, `releaseWakeLock`. (2) `onMounted`: nếu `keepScreenOn.value` → call `acquireWakeLock()`; thêm `visibilitychange` handler (khi visible + keepScreenOn → acquire lại). (3) `onUnmounted`: `releaseWakeLock()` + remove listener. (4) Watch `keepScreenOn`: true → acquire, false → release. (5) Template: thêm toggle block vào settings panel (sau orientation section, trước nút Ngắt kết nối) — label "Luôn bật màn hình", toggle button đổi `keepScreenOn`.

**Acceptance Criteria:**
- Given ClientView mounted với `keepScreenOn = true`, when app idle 5+ phút trên Android, then màn hình không tắt.
- Given `keepScreenOn = true`, when app vào background rồi trở về foreground, then wake lock được re-acquired (không crash, không flash).
- Given user tắt toggle, when idle, then màn hình tắt bình thường theo system setting.
- Given reload app sau khi bật toggle, when ClientView mount, then `keepScreenOn` vẫn là `true` (persist localStorage).
- Given iOS hoặc browser không support wake lock, when bật toggle, then app không crash; console.warn xuất hiện một lần.

## Design Notes

Settings store dùng key prefix `settings:keepScreenOn` để phân biệt với `local_layout` và `asd.orientation` đã có.

Toggle UI trong settings panel: dùng cùng pattern Tailwind của orientation buttons — `bg-violet-600` khi active, `bg-slate-900` khi inactive.

Wake lock chỉ cần được acquire sau khi user connect (ClientView mounted khi đã trên trang `/`). Không cần acquire ở màn hình connect form.

## Verification

**Commands:**
- `pnpm tsc --noEmit` -- expected: TypeScript compile không lỗi, `WakeLockSentinel` type recognized (available trong `lib.dom.d.ts` TypeScript ≥ 4.4).

## Suggested Review Order

**Wake Lock Core**

- Module-level state: `sentinel` + `acquiring` flag prevent concurrent requests and stale refs.
  [`wakelock.ts:1`](../../src/lib/wakelock.ts#L1)

- Acquire: browser-support guard, idempotency, `release` event listener auto-nulls sentinel.
  [`wakelock.ts:5`](../../src/lib/wakelock.ts#L5)

- Release: guard against calling `.release()` on already-released sentinel.
  [`wakelock.ts:22`](../../src/lib/wakelock.ts#L22)

**Settings Persistence**

- Store init: try/catch on `JSON.parse` prevents crash on corrupted localStorage.
  [`settings.ts:1`](../../src/stores/settings.ts#L1)

**Component Integration**

- `visibilitychange` handler: re-acquire only when not already active (guard against stale state).
  [`ClientView.vue:118`](../../src/views/ClientView.vue#L118)

- Watch `keepScreenOn`: acquire or release immediately on toggle.
  [`ClientView.vue:124`](../../src/views/ClientView.vue#L124)

- `onMounted`: initial acquire + register visibility listener.
  [`ClientView.vue:135`](../../src/views/ClientView.vue#L135)

- `onUnmounted`: `.catch()` swallows unhandled rejection from async release in sync context.
  [`ClientView.vue:163`](../../src/views/ClientView.vue#L163)

- Toggle UI: row in settings panel, consistent Tailwind active/inactive pattern.
  [`ClientView.vue:414`](../../src/views/ClientView.vue#L414)
