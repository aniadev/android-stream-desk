---
title: 'v1.4.0 S-REC1 — Backend: chord đa base-key + PrintScreen'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `parse_shortcut` (`src-tauri/src/lib.rs:445-475`) từ chối nhiều base key — trả `Err("Shortcut '{}' has multiple base keys")` (`:461`). `simulate_shortcut` (`:507-537`) chỉ Press modifiers → Click MỘT base key. `parse_key` (`:411-441`) không có PrintScreen → "Unrecognized key token". Nên chord 3 phím (Alt+P+W) và PrintScreen không thực thi được.

**Approach:** Cho `parse_shortcut` trả nhiều base key `(Vec<Key> modifiers, Vec<Key> bases)`. `simulate_shortcut` thực thi **chord đồng thời**: Press modifiers → Press giữ tất cả base key → Release base key ngược → Release modifiers ngược. Thêm PrintScreen vào `parse_key`. Giữ pattern release-on-failure đối xứng cho cả base key.

## Boundaries & Constraints

**Always:** Release đối xứng — nếu Press phím thứ k fail, release các phím đã giữ trước đó theo thứ tự ngược rồi bail (không kẹt phím hệ thống). `Enigo` tạo trong hàm dưới `ENIGO_LOCK` (không Send trên macOS — giữ nguyên `:510-515`).

**Ask First:** Nếu cần shortcut tuần tự (sequence) thay vì chord — hiện CHỐT chord đồng thời.

**Never:** KHÔNG store `Enigo`. KHÔNG bỏ pattern release-modifier-reverse (`:531-534`). KHÔNG dùng `?` làm bỏ qua release ở nhánh fail.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chord 3 phím | `"Alt+P+W"` | Press Alt → Press P → Press W → Release W,P → Release Alt | Press fail giữa chừng → release ngược đã giữ → Err |
| PrintScreen | `"PrintScreen"` | parse `Key::Print`, click | — |
| Alt+PrintScreen | `"Alt+PrintScreen"` | Press Alt → Press/Release Print → Release Alt | — |
| Shortcut 1 base cũ | `"Ctrl+C"` | Vẫn chạy như cũ (bases.len()==1) | — |
| Chord rỗng base | `"Ctrl+Shift"` | Err "no base key" (giữ) | giữ `:471-473` |

</frozen-after-approval>

## Code Map

- `src-tauri/src/lib.rs` — `parse_key` thêm PrintScreen; `parse_shortcut` (`:445-475`) trả `(Vec<Key>, Vec<Key>)` (bỏ lỗi multiple base); `simulate_shortcut` (`:507-537`) Press-giữ-Release chord.

## Tasks & Acceptance

**Execution:**
- [ ] `src-tauri/src/lib.rs` -- `parse_key` (`:411-441`): thêm `"printscreen" | "prtsc" | "print" => Some(Key::Print)` (enigo `Key::Print`).
- [ ] `src-tauri/src/lib.rs` -- `parse_shortcut` (`:445-475`): đổi return `Result<(Vec<Key>, Vec<Key>), String>`; bỏ nhánh lỗi "multiple base keys" — gom mọi base key vào `bases: Vec<Key>`; giữ lỗi khi `bases.is_empty()`.
- [ ] `src-tauri/src/lib.rs` -- `simulate_shortcut` (`:507-537`): sau Press modifiers (giữ logic release-on-fail `:517-525`), thêm vòng Press giữ từng base key (fail → release các base đã giữ ngược + release modifiers ngược + Err); rồi Release base key theo thứ tự ngược; rồi Release modifiers ngược (giữ `:531-534`).
- [ ] (Nếu có callsite khác của `parse_shortcut`) -- cập nhật theo signature mới.

**Acceptance Criteria:**
- Given `"Alt+P+W"`, when thực thi, then giữ Alt+P+W đồng thời rồi nhả W,P,Alt.
- Given `"PrintScreen"`, when thực thi, then click `Key::Print`, không lỗi parse.
- Given `"Ctrl+C"` (1 base), when thực thi, then chạy như cũ.
- Given press 1 base fail, when lỗi, then các phím đã giữ được release ngược trước khi Err (không kẹt phím).
- Given build, when `cargo clippy -- -D warnings`, then không warning.

## Design Notes

Chord = tất cả phím giữ đồng thời rồi nhả ngược (giống cách OS nhận tổ hợp), khác click tuần tự. Đối xứng release tối quan trọng — `simulate_shortcut` hiện đã hand-written cho modifier; mở rộng cùng nguyên tắc cho base key. Không "simplify" bằng `?`.

## Verification

**Commands:**
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: signature mới compile, mọi callsite cập nhật.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` -- expected: sạch.

**Manual (Companion):** gán button `Alt+P+W` → app đích nhận chord; gán `PrintScreen` → chụp màn hình chạy.

## Suggested Review Order

- `simulate_shortcut` chord Press/Release đối xứng (cả base key khi fail). [`lib.rs:507`](../../src-tauri/src/lib.rs#L507)
- `parse_shortcut` đa base key. [`lib.rs:445`](../../src-tauri/src/lib.rs#L445)
- `parse_key` PrintScreen. [`lib.rs:411`](../../src-tauri/src/lib.rs#L411)
