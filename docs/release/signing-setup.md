# Android APK Signing — Hướng dẫn thiết lập

Chỉ cần làm một lần trước lần phát hành đầu tiên. Sau khi hoàn thành, CI tự động ký APK mỗi khi push tag `v*`.

---

## 1. Tạo keystore

Chạy script helper (yêu cầu JDK trong PATH):

```bash
./scripts/generate-keystore.sh
```

Script sẽ hỏi mật khẩu, key alias, và thông tin DN rồi tạo `release.keystore` tại thư mục hiện tại. Cuối script sẽ in ra 4 block giá trị sẵn sàng để paste.

---

## 2. Thêm secrets vào GitHub

Vào **Settings → Secrets and variables → Actions → New repository secret** và thêm lần lượt 4 secret:

| Secret name | Giá trị |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Block base64 từ script |
| `ANDROID_KEYSTORE_PASSWORD` | Mật khẩu store |
| `ANDROID_KEY_ALIAS` | Key alias (mặc định: `android-stream-desk`) |
| `ANDROID_KEY_PASSWORD` | Mật khẩu key |

---

## 3. Backup keystore offline

> **Mất keystore = không thể cập nhật app cùng package ID (`com.ania.android.stream.desk`) trên Play Store.**

Lưu `release.keystore` vào:
- USB drive offline
- Password manager (Bitwarden, 1Password, …) dưới dạng file đính kèm

File này **không được commit** vào git (đã thêm vào `.gitignore`).

---

## 4. Xác nhận signing hoạt động

Sau khi set secrets, push một tag thử nghiệm:

```bash
git tag v0.0.0-signing-test
git push origin v0.0.0-signing-test
```

Khi CI xong, download `app-universal-release.apk` từ GitHub Release và kiểm tra:

```bash
# Yêu cầu Android SDK build-tools trong PATH
apksigner verify --print-certs app-universal-release.apk
```

APK hợp lệ sẽ in ra thông tin certificate. Nếu thấy `Verified using v2 scheme` hoặc `v3 scheme` là thành công.

Sau khi xác nhận, xóa tag thử nghiệm:

```bash
git push origin --delete v0.0.0-signing-test
```
