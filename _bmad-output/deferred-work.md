# Deferred Work

## From: v1.2.0 Android Release Pipeline

- **Partial secrets mis-config**: Nếu ANDROID_KEYSTORE_BASE64 được set nhưng ANDROID_KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD không set → Gradle signing fail với cryptic error. Có thể fix bằng cách check tất cả 4 secrets trong if condition. Hiện tại nằm ngoài spec (spec chỉ cover case BASE64 hoàn toàn vắng mặt).

- **Keystore integrity check trên CI**: Không verify fingerprint của keystore sau khi decode base64. Keystore bị corrupt/poisoned sẽ fail ở build step thay vì ngay sau decode. Low priority — CI runner ephemeral.

- **Plaintext passwords trong keystore.properties trên CI runner**: Standard pattern với ephemeral runner. Có thể giảm thiểu bằng cách xóa keystore.properties sau build step nếu cần.
