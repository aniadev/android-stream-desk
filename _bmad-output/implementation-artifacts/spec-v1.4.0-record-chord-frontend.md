---
title: 'v1.4.0 S-REC2 — Frontend: record chord đồng thời + bắt PrintScreen keyup'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `handleKeyDown` (`DashboardView.vue:264-300`) chốt ngay khi gặp base key đầu tiên → chỉ ghi 1 base key, không biểu diễn chord (Alt+P+W). PrintScreen trên Windows thường chỉ phát `keyup`, không `keydown` → handler keydown không bắt được.

**Approach:** Theo dõi tập phím đang giữ đồng thời (`heldKeys: Set<string>`); keydown thêm phím (không chốt), keyup bắt đầu chốt — snapshot tổ hợp lớn nhất giữ cùng lúc → build `[...modifiers, ...heldBases].join('+')`. Đăng ký thêm `keyup` listener (cho chord-finalize + PrintScreen). Preview realtime chuỗi đang giữ. Phụ thuộc S-REC1 (backend nhận chord).

## Boundaries & Constraints

**Always:** `e.preventDefault()/stopPropagation()` khi recording (giữ `:266-267`). Remove cả keydown + keyup listener khi dừng record và trong `onUnmounted` (`:329-330`). Giữ live-sync modifier toggle (`:271-286`).

**Ask First:** Nếu cần giới hạn số base key trong chord (>3).

**Never:** KHÔNG phá đường manual entry / `applyManualKey` (`:304-313`) — vẫn cần cho combo bị OS chặn (S-REC3). KHÔNG chốt chord khi mới chỉ có modifier.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Giữ Alt+P+W rồi nhả | keydown Alt,P,W → keyup W | Ghi `"Alt+P+W"` (snapshot lớn nhất) | — |
| PrintScreen | chỉ phát keyup | Bắt ở keyup → ghi `PrintScreen` | — |
| Chỉ giữ modifier rồi nhả | Ctrl rồi nhả | Không chốt (chưa có base) | no-op |
| Đang record dừng tay | nhả phím đầu | chốt + lưu + tắt record | — |
| Recording rồi đổi button | unmount | remove keydown+keyup listener | onUnmounted |

</frozen-after-approval>

## Code Map

- `src/views/DashboardView.vue` — `handleKeyDown` (`:264-300`) tích lũy `heldKeys`; thêm `handleKeyUp`; `toggleRecording` (`:317-327`) đăng ký/gỡ cả hai; `onUnmounted` (`:329-330`) gỡ cả hai; preview state.

## Tasks & Acceptance

**Execution:**
- [ ] `src/views/DashboardView.vue` -- Thêm `const heldKeys = ref<Set<string>>(new Set())` (hoặc plain Set ngoài reactive + ref preview). Trong `handleKeyDown`: giữ live-sync modifier (`:271-286`); với base key (non-modifier) → normalize tên (giữ logic `:288-290`) → add vào heldKeys; cập nhật preview; KHÔNG chốt ngay.
- [ ] `src/views/DashboardView.vue` -- Thêm `handleKeyUp(e)`: nếu đang record và có ≥1 base trong heldKeys → snapshot `[...buildModifiers(), ...heldBases]` → `selectedButton.shortcutValue = parts.join('+')` → tắt record, reset pendingMods + heldKeys, gỡ listener, `saveButtonSettings()`. Riêng PrintScreen: nếu `e.key==='PrintScreen'` ở keyup → add rồi chốt.
- [ ] `src/views/DashboardView.vue` -- `toggleRecording` (`:317-327`): khi bật → `addEventListener('keydown', handleKeyDown, true)` + `addEventListener('keyup', handleKeyUp, true)`, reset heldKeys + preview; khi tắt → remove cả hai.
- [ ] `src/views/DashboardView.vue` -- `onUnmounted` (`:329-330`): remove cả keydown + keyup.
- [ ] `src/views/DashboardView.vue` -- Hiển thị preview chuỗi đang giữ realtime gần nút "Thu" (`:1111`/`:1116`).

**Acceptance Criteria:**
- Given đang record, when giữ Alt+P+W đồng thời rồi nhả, then ghi `"Alt+P+W"`.
- Given đang record, when nhấn PrintScreen, then bắt qua keyup, ghi `PrintScreen`.
- Given chỉ giữ modifier rồi nhả, then không chốt.
- Given đổi/unmount khi đang record, then không rò listener.

## Design Notes

Snapshot "tổ hợp lớn nhất khi phím đầu nhả" là heuristic chord ổn định: user nhấn dần các phím, khi bắt đầu nhả là tổ hợp đầy đủ. PrintScreen xử lý riêng vì keydown không phát. Manual entry (`applyManualKey`) giữ nguyên cho combo OS-trapped (S-REC3 mở rộng UX).

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: sạch.

**Manual (Companion):** record Alt+P+W → field hiện `Alt+P+W`; record PrintScreen → field hiện `PrintScreen`; mở/đóng record nhiều lần không rò listener.

## Suggested Review Order

- `handleKeyDown` tích lũy heldKeys (không chốt sớm). [`DashboardView.vue:264`](../../src/views/DashboardView.vue#L264)
- `handleKeyUp` snapshot chord + PrintScreen. [`DashboardView.vue`](../../src/views/DashboardView.vue)
- listener add/remove đối xứng. [`DashboardView.vue:317`](../../src/views/DashboardView.vue#L317)
