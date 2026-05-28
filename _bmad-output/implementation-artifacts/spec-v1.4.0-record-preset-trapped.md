---
title: 'v1.4.0 S-REC3 — UX preset cho combo bị OS chặn'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'ready-for-dev'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Combo bị OS chặn (Win+Shift+S → Snipping Tool, Win+S) không tới WebView nên không live-record được. Workaround đã có (modifier toggle + manual key + "Áp dụng" `applyManualKey` `:304-313`) nhưng khó phát hiện. User cần cách gán nhanh các combo này.

**Approach:** Bổ sung dropdown preset nhóm "Phím hệ thống (không record được)" cạnh `applyPreset` (`:232-237`); thêm chú thích ở khối manual entry. Thực thi các combo này backend đã chạy được (Win+Shift+S là button mặc định). Story này thuần UX.

## Boundaries & Constraints

**Always:** Preset chỉ set `shortcutValue` rồi `saveButtonSettings` (như `applyPreset`). Giữ manual entry path.

**Ask First:** Nếu cần thêm combo OS-trapped ngoài danh sách đề xuất.

**Never:** KHÔNG cố live-record các combo OS-trapped (vô ích — OS chặn). KHÔNG đụng backend.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chọn preset Win+Shift+S | dropdown | `shortcutValue="Win+Shift+S"`, lưu | — |
| Chọn PrintScreen preset | dropdown | `shortcutValue="PrintScreen"`, lưu | — |
| Manual entry | bật mods + nhập key + Áp dụng | giữ nguyên hành vi | — |

</frozen-after-approval>

## Code Map

- `src/views/DashboardView.vue` — mở rộng danh sách preset (gần `:53-` quanh `applyPreset`) thêm nhóm "phím hệ thống"; chú thích khối manual (`:1122-1181`).

## Tasks & Acceptance

**Execution:**
- [ ] `src/views/DashboardView.vue` -- Thêm nhóm preset "Phím hệ thống (không record được)" vào danh sách presets (cấu trúc `{ label, value }` như `:54-55`): `Win+Shift+S` (Chụp vùng), `Win+S` (Tìm kiếm), `Win+L` (Khóa máy), `PrintScreen`, `Alt+PrintScreen`. Render trong cùng dropdown/area dùng `applyPreset` (`:232-237`).
- [ ] `src/views/DashboardView.vue` -- Thêm chú thích ở khối manual entry (`:1122-1181`): "Combo bị Windows chặn (không thu được)? Chọn preset bên trên hoặc bật modifier + chọn phím rồi bấm Áp dụng."

**Acceptance Criteria:**
- Given dropdown preset, when chọn Win+Shift+S, then `shortcutValue="Win+Shift+S"` và lưu.
- Given dropdown preset, when chọn PrintScreen, then `shortcutValue="PrintScreen"` và lưu.
- Given khối manual entry, when xem, then có chú thích hướng dẫn cho combo OS-trapped.

## Design Notes

Backend thực thi các combo này đã hoạt động (enigo gửi được; PrintScreen thêm ở S-REC1). Đây thuần UX khả-phát-hiện. Phụ thuộc S-REC1 (PrintScreen parse) để preset PrintScreen chạy.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: sạch.

**Manual (Companion):** chọn preset Win+Shift+S → bấm button → mở Snipping Tool; chọn PrintScreen → chụp màn hình.

## Suggested Review Order

- Preset nhóm "phím hệ thống" + applyPreset. [`DashboardView.vue:232`](../../src/views/DashboardView.vue#L232)
- Chú thích manual entry. [`DashboardView.vue:1122`](../../src/views/DashboardView.vue#L1122)
