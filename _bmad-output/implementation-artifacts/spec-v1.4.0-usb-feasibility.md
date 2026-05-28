---
title: 'v1.4.0 S-USB1 — Spike: nghiên cứu khả thi kết nối qua cáp USB'
type: 'research'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Client kết nối `ws://<lan-ip>:8089` (`connection.ts`, `WS_PORT` `lib.rs`). Yêu cầu LAN — bất tiện khi không Wi-Fi hoặc AP isolation. User muốn đánh giá kết nối qua cáp USB.

**Approach:** SPIKE research — KHÔNG implement production. Thử nghiệm các hướng (ADB reverse / USB tethering / AOA), PoC tối thiểu, viết báo cáo khuyến nghị go/no-go cho version sau.

## Boundaries & Constraints

**Always:** Chỉ research + PoC throwaway. Deliverable là tài liệu `research-usb-connection.md`.

**Ask First:** Trước khi viết bất kỳ code production cho USB (ngoài phạm vi v1.4.0).

**Never:** KHÔNG sửa code production (`connection.ts`, server) trong story này (trừ PoC vứt-đi trên nhánh thử). KHÔNG thêm dependency mới vào main.

## I/O & Edge-Case Matrix

| Hướng | Cơ chế | Đánh giá |
|-------|--------|----------|
| ADB reverse | `adb reverse tcp:8089 tcp:8089` → Client connect `127.0.0.1:8089` | Khả thi nhất, ít sửa code; cần ADB + USB debugging |
| USB tethering (RNDIS) | Phone share mạng USB → PC có IP tether | Không sửa code; user bật tethering thủ công |
| AOA / raw USB | Transport USB native | Nặng, WebView/Tauri khó; không khuyến nghị |

</frozen-after-approval>

## Code Map

- `_bmad-output/planning-artifacts/research-usb-connection.md` — NEW: báo cáo feasibility.
- (PoC throwaway, không commit vào main) — thử `adb reverse` + Client connect `127.0.0.1`.

## Tasks & Acceptance

**Execution:**
- [ ] Thử nghiệm `adb reverse tcp:8089 tcp:8089` với thiết bị Android thật + Companion đang chạy; xác nhận Client kết nối `127.0.0.1:8089` thành công.
- [ ] Ghi `_bmad-output/planning-artifacts/research-usb-connection.md`: 3 hướng + cơ chế + rào cản (ADB, USB debugging, driver, tethering), kết quả PoC, **khuyến nghị go/no-go** + phác thảo thay đổi tối thiểu nếu go (vd toggle "Kết nối USB" đặt IP=`127.0.0.1` + script `adb reverse`).
- [ ] KHÔNG sửa code production trong main.

**Acceptance Criteria:**
- Given thiết bị thật, when chạy `adb reverse` + Client connect `127.0.0.1:8089`, then kết nối thành công (PoC chứng minh khả thi).
- Given spike xong, when kết thúc, then `research-usb-connection.md` tồn tại với các hướng, rào cản, khuyến nghị.
- Given main branch, when review, then không có code production USB mới.

## Design Notes

ADB reverse là hướng khả thi nhất với thay đổi code tối thiểu (Client chỉ cần dùng `127.0.0.1`). USB tethering là fallback không cần code. AOA loại (quá nặng cho WebView). Quyết định implement để version sau dựa trên báo cáo.

## Verification

**Manual:** PoC `adb reverse` chứng minh; review `research-usb-connection.md` đầy đủ 3 mục (hướng, rào cản, khuyến nghị).

## Suggested Review Order

- `research-usb-connection.md` — hướng + rào cản + khuyến nghị go/no-go. [`research-usb-connection.md`](../planning-artifacts/research-usb-connection.md)
