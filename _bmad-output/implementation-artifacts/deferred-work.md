# Deferred Work

## Deferred from: code review of s-mac1-native-accessibility-diagnostics (2026-06-04)

- `recommend_action` mislabel khi `trusted=false` + `enigo_probe_ok=true`: nhánh untrusted bỏ qua `enigo_probe_ok`, nên trạng thái "AX báo untrusted nhưng enigo inject được" vẫn báo thiếu quyền. Edge case hiếm/gần unreachable (AX và CGEvent path lệch nhau). [src-tauri/src/accessibility.rs:59] — deferred, edge case hiếm

## Deferred from: code review of uncommitted v1.5.1 changes (2026-06-04)

- Scan QR thành công chuyển sang state "đang kết nối" nhưng không có timeout/transition khi connect thất bại (host sai). Watcher chỉ phản ứng khi đạt `connected`, nên host sai để UI kẹt mãi ở màn xanh, không có lối thoát actionable. Cần thêm timeout + state fail. [src/views/ClientView.vue ~990] — deferred, cần thiết kế thêm UX timeout
- Phát hiện người dùng cancel scan dựa vào substring `cancel`/`dismiss` trong message lỗi đã localize của barcode-scanner plugin. Biến thể locale/SDK không khớp substring sẽ bị gán nhầm thành `invalid_qr` (toast lỗi sai). Nên match theo error code thay vì text. [src/views/ClientView.vue ~198] — deferred, cần xác định API error code của plugin
- `build.rs` chỉ `cargo:rerun-if-changed` trên `dist-client/index.html` + dir entry, không watch asset lồng (JS/CSS). Nếu `index.html` byte-identical nhưng asset đổi thì `include_dir!` embed bản stale. [src-tauri/build.rs:21-22] — deferred, chỉ ảnh hưởng dev caching, bypass bằng clean build
- Assertion throw trong `apkConnectQr.test.mjs` khớp regex `/too big|too long|too large|large/i` bám vào wording lỗi của lib `qrcode`. Hiện pass nhưng có thể vỡ khi bump version lib. Nên assert theo loại lỗi ổn định hơn. [src/lib/apkConnectQr.test.mjs:41-43] — deferred, rủi ro tương lai, hiện pass
