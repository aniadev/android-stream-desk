# Deferred Work

## From: v1.2.0 Android Release Pipeline

- **Partial secrets mis-config**: Nếu ANDROID_KEYSTORE_BASE64 được set nhưng ANDROID_KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD không set → Gradle signing fail với cryptic error. Có thể fix bằng cách check tất cả 4 secrets trong if condition. Hiện tại nằm ngoài spec (spec chỉ cover case BASE64 hoàn toàn vắng mặt).

- **Keystore integrity check trên CI**: Không verify fingerprint của keystore sau khi decode base64. Keystore bị corrupt/poisoned sẽ fail ở build step thay vì ngay sau decode. Low priority — CI runner ephemeral.

- **Plaintext passwords trong keystore.properties trên CI runner**: Standard pattern với ephemeral runner. Có thể giảm thiểu bằng cách xóa keystore.properties sau build step nếu cần.

## Deferred from: code review of epic-8 reconnect (s-rel1/s-rel3) (2026-06-04)

- **Rust bind-status test dùng global lazy_static** (s-rel1): test trong `src-tauri/src/websocket.rs` + `src-tauri/src/webserver.rs` mutate global `WS_BIND_STATUS`/`WEB_BIND_STATUS`; cargo chạy test song song có thể race/flake. Hiện 17/17 pass. Đề xuất: serialize (vd `serial_test`) hoặc inject status thay vì global.
- **IPv6 host không bọc `[...]`** (s-rel3): `ws://${host}:${port}` tại `src/stores/connection.ts:98` không bracket IPv6 → URL hỏng nếu scan endpoint IPv6 (QR parser nhận host bất kỳ). LAN IPv4 thực tế nên hoãn.

## From: v1.5.1 APK Size (S-APK2)

- **Icon offline bundle 11MB nhồi vào APK**: `src/icons-bundle.ts` import full `icons.json` của mdi (3MB), material-symbols (7.6MB), lucide (0.5MB) qua `main.ts`, embed vào mỗi `.so` per-ABI nên arm64 APK còn ~21MB (arm ~20MB) — sát nhưng arm64 chưa <20MB. Cả 3 set đều đang dùng (lucide 187, mdi 127, material-symbols 98 refs) nên không bỏ set nào mà không vỡ icon. **Hoãn sang version sau** (quyết định 2026-06-04). Hướng đề xuất: client fetch icon collection từ Companion qua LAN (companion đã có sẵn data) + cache, để APK không bundle offline → ~15MB; hoặc subset icon hay dùng + lazy phần còn lại. Logo đã optimize riêng (3.7MB→123KB, bỏ logo-1.png/logo.bk.png rác) trong S-APK2 đợt này.
