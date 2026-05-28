---
title: 'v1.4.0 S-FB1 — Settings toggles + Vibration khi nhấn (Client)'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Client là macro pad cảm ứng không phản hồi xúc giác — user không chắc đã nhấn trúng. `GridArea.handlePress` gọi `pressButton` không có haptic.

**Approach:** Thêm `vibrateOnClick` + `soundOnClick` (cho S-FB2) vào settings store (pattern `keepScreenOn` `src/stores/settings.ts`). Toggle trong overlay settings ClientView. Vibration `navigator.vibrate(20)` trong `GridArea.handlePress` (Client-only) trước `pressButton`, guard `'vibrate' in navigator`.

## Boundaries & Constraints

**Always:** Guard `'vibrate' in navigator` (desktop/không hỗ trợ → bỏ qua). Persist toggle qua localStorage `settings:*` (pattern hiện có). Fire ở Client (GridArea), KHÔNG ở Dashboard editor.

**Ask First:** Nếu muốn cường độ/độ dài rung khác (mặc định ~20ms).

**Never:** KHÔNG fire vibration ở GridButton dùng trong Dashboard (click editor = select). KHÔNG crash khi API vắng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tap button, vibrateOnClick on, hỗ trợ | Android | `navigator.vibrate(20)` rồi pressButton | — |
| Tap, không hỗ trợ vibrate | desktop WebView | bỏ qua rung, vẫn press | guard |
| vibrateOnClick off | settings off | không rung | — |
| Toggle persist | reload app | giữ trạng thái | localStorage |
| Monitor button tap | buttonKind monitor | không press, không rung | guard sẵn |

</frozen-after-approval>

## Code Map

- `src/stores/settings.ts` — thêm `vibrateOnClick`, `soundOnClick` (ref + watch persist, default `true`).
- `src/views/ClientView.vue` — overlay settings: thêm 2 toggle "Rung khi nhấn" + "Âm thanh khi nhấn".
- `src/components/GridArea.vue` — `handlePress`: vibration trước `pressButton`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/stores/settings.ts` -- Thêm `vibrateOnClick` + `soundOnClick` theo đúng pattern `keepScreenOn`: đọc `localStorage.getItem('settings:vibrateOnClick' / ':soundOnClick')` default `'true'`, `ref`, `watch` persist. Export cả hai.
- [ ] `src/views/ClientView.vue` -- Trong overlay settings (cạnh toggle "Luôn bật màn hình"): thêm toggle "Rung khi nhấn" (`settings.vibrateOnClick`) + "Âm thanh khi nhấn" (`settings.soundOnClick`, dùng ở S-FB2).
- [ ] `src/components/GridArea.vue` -- Trong `handlePress(button)`: nếu `button.buttonKind==='monitor'` return (giữ); nếu `settings.vibrateOnClick && 'vibrate' in navigator` → `navigator.vibrate(20)`; rồi `layoutStore.pressButton(button)`. Import `useSettingsStore`.

**Acceptance Criteria:**
- Given vibrateOnClick on + Android, when tap button, then rung ~20ms rồi press.
- Given thiết bị không hỗ trợ vibrate, when tap, then không crash, vẫn press.
- Given vibrateOnClick off, when tap, then không rung.
- Given overlay settings, then có 2 toggle (rung + âm thanh), persist qua reload.

## Design Notes

Fire ở `GridArea.handlePress` (Client-only component, `ClientView:179`) → đúng thiết bị chạm. settings store mở rộng nhẹ theo pattern có sẵn. `soundOnClick` thêm ở đây để UI đủ 2 toggle; logic sound ở S-FB2.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: sạch.

**Manual (Android):** bật toggle → tap rung; tắt → không rung; reload giữ trạng thái.

## Suggested Review Order

- settings store 2 field mới. [`settings.ts`](../../src/stores/settings.ts)
- `handlePress` vibration guard. [`GridArea.vue`](../../src/components/GridArea.vue)
- ClientView toggles. [`ClientView.vue`](../../src/views/ClientView.vue)
