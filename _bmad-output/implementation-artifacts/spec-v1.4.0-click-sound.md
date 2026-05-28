---
title: 'v1.4.0 S-FB2 — Click sound khi nhấn (Client)'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sau S-FB1 có toggle `soundOnClick` + vibration; còn thiếu phản hồi âm thanh khi tap.

**Approach:** Module `src/lib/clicksound.ts` quản lý `AudioContext` (lazy init), `playClick()` (oscillator/buffer ngắn ~40ms), `unlockAudio()` (resume ở user-gesture đầu — autoplay policy). `GridArea.handlePress` gọi `playClick()` khi `soundOnClick`. ClientView gắn unlock ở touch đầu.

## Boundaries & Constraints

**Always:** Lazy init AudioContext (không tạo tới khi cần). Unlock (`resume()`) ở tương tác đầu. Guard Web Audio không hỗ trợ → no-op. Fire ở Client (GridArea).

**Ask First:** Nếu muốn dùng file âm thanh bundle thay vì synth (mặc định synth ngắn, không thêm asset).

**Never:** KHÔNG tạo AudioContext lúc load (bị suspend + cảnh báo autoplay). KHÔNG fire ở Dashboard. KHÔNG crash khi API vắng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tap, soundOnClick on, sau unlock | Android | playClick ngắn | — |
| Tap đầu tiên (chưa unlock) | AudioContext suspended | unlock resume + (tap sau phát) | — |
| soundOnClick off | settings off | không phát | — |
| Web Audio không hỗ trợ | cũ | no-op | guard |
| Tap liên tục nhanh | spam | mỗi tap 1 click ngắn, không chồng méo | tạo node mới mỗi lần |

</frozen-after-approval>

## Code Map

- `src/lib/clicksound.ts` — NEW: `playClick()`, `unlockAudio()` (lazy AudioContext).
- `src/views/ClientView.vue` — `onMounted` gắn one-shot listener unlock ở touch đầu; cleanup.
- `src/components/GridArea.vue` — `handlePress`: `playClick()` khi `settings.soundOnClick`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/clicksound.ts` -- NEW. `let ctx: AudioContext | null = null`. `getCtx()`: lazy `new (window.AudioContext||webkitAudioContext)()`; return null nếu không hỗ trợ. `unlockAudio()`: `getCtx()?.resume()`. `playClick()`: ctx = getCtx(); nếu null return; tạo `OscillatorNode` (square/sine ~1kHz) + `GainNode` envelope ngắn (~40ms, gain nhỏ ~0.05, ramp xuống) → start/stop; tạo node mới mỗi lần.
- [ ] `src/views/ClientView.vue` -- `onMounted`: `const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); }`; `window.addEventListener('pointerdown', unlock, { once: true })`. Cleanup trong `onUnmounted` (đề phòng chưa fire).
- [ ] `src/components/GridArea.vue` -- Trong `handlePress` (sau guard monitor): nếu `settings.soundOnClick` → `playClick()` (cùng chỗ vibration S-FB1).

**Acceptance Criteria:**
- Given soundOnClick on + đã unlock, when tap, then phát click ngắn.
- Given lần tap đầu, when chạm, then AudioContext resume (unlock), tap sau có tiếng.
- Given soundOnClick off, when tap, then không phát.
- Given Web Audio không hỗ trợ, when tap, then no-op, không crash.

## Design Notes

Synth oscillator thay vì file: không thêm asset, độ trễ thấp. Autoplay: AudioContext khởi tạo suspended tới user-gesture → unlock ở pointerdown đầu. Tạo node mới mỗi tap (node dùng-một-lần theo Web Audio). Phụ thuộc S-FB1 (toggle `soundOnClick` + import settings ở GridArea).

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: clicksound typed sạch.

**Manual (Android):** bật toggle → tap có tiếng click; tap đầu không lỗi autoplay; tắt → im.

## Suggested Review Order

- `clicksound.ts` lazy ctx + unlock + playClick. [`clicksound.ts`](../../src/lib/clicksound.ts)
- ClientView unlock pointerdown once. [`ClientView.vue`](../../src/views/ClientView.vue)
- `handlePress` playClick. [`GridArea.vue`](../../src/components/GridArea.vue)
