---
title: 'v1.2.0 Android Release Pipeline (APK Signing + Debug CI)'
type: 'chore'
created: '2026-05-24'
status: 'done'
baseline_commit: '019975c72d707d00defe922dddcb90cb76455aae'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Release APK build bằng CI luôn ra `unsigned` vì Gradle không có keystore credential — Android từ chối cài trên thiết bị thật. Đồng thời không có CI workflow để build APK debug cho QA test nhanh mà không cần push tag release.

**Approach:** Thêm Gradle `signingConfigs` đọc từ `keystore.properties` runtime (tạo trên CI từ GitHub secrets, không commit), cập nhật `release.yml` inject keystore, tạo script helper sinh keystore và docs hướng dẫn, tạo `android-debug.yml` CI workflow riêng upload artifact debug APK.

## Boundaries & Constraints

**Always:**
- `keystore.properties` và `*.keystore` KHÔNG BAO GIỜ commit vào git — bổ sung vào cả `.gitignore` root và `src-tauri/gen/android/app/.gitignore`.
- Gradle fallback an toàn: nếu `keystore.properties` không tồn tại → bỏ qua signingConfig, build vẫn thành công (dev local không cần keystore).
- Release workflow vẫn tiếp tục khi secrets bị thiếu (emit warning, build unsigned như trước — không fail toàn workflow).
- `generate-keystore.sh` chỉ in ra format sẵn sàng paste vào GitHub secrets, không tự upload.

**Ask First:**
- Nếu `build.gradle.kts` có cấu trúc khác với spec (vd: đã có signingConfigs từ nguồn khác) → HALT báo cáo trước khi ghi đè.
- Trigger `android-debug.yml` trên push nhánh nào ngoài `releases` → hỏi trước khi thêm.

**Never:**
- Không extract hoặc embed binary icon trong bước signing.
- Không hardcode password/alias trong bất kỳ file nào commit được.
- Không dùng `apksigner` thủ công trong workflow — để Gradle tự sign.
- MS Store (UWP) nằm ngoài scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Signing thành công | Secrets đủ 4 fields, keystore hợp lệ | `app-universal-release.apk` signed, upload lên Release | N/A |
| Secrets thiếu | Một hoặc nhiều secret rỗng | Build tiếp, upload `app-universal-release-unsigned.apk`, step echo warning | Không fail job |
| `keystore.properties` vắng (local dev) | File không tồn tại | Gradle skip signingConfig, build unsigned bình thường | N/A |
| generate-keystore.sh chạy | User nhập đủ prompt | In 4 block secret sẵn sàng paste | Kiểm tra keytool có trong PATH trước |
| Debug APK CI | Push to `releases` branch hoặc workflow_dispatch | Artifact `android-debug-apk-{sha}` upload, retention 14 ngày | N/A |

</frozen-after-approval>

## Code Map

- `src-tauri/gen/android/app/build.gradle.kts` — Gradle config release build; thêm signingConfigs block
- `src-tauri/gen/android/app/.gitignore` — thêm `keystore.properties`, `*.keystore`
- `.gitignore` (root) — thêm `*.keystore`, `keystore.properties`
- `.github/workflows/release.yml` — build-android job; thêm steps decode+create keystore, đổi upload path
- `.github/workflows/android-debug.yml` — file mới; workflow debug APK
- `scripts/generate-keystore.sh` — file mới; keytool wrapper + formatted output
- `docs/release/signing-setup.md` — file mới; hướng dẫn 4 phần

## Tasks & Acceptance

**Execution:**
- [x] `src-tauri/gen/android/app/build.gradle.kts` -- Thêm `Properties` loader đọc `keystore.properties` (cùng thư mục với gradle file). Nếu file tồn tại: thêm `signingConfigs { release { storeFile = file(props["storeFile"]); storePassword = props["storePassword"]; keyAlias = props["keyAlias"]; keyPassword = props["keyPassword"] } }`. Apply `signingConfig = signingConfigs.getByName("release")` vào `buildTypes { release { ... } }`. Wrap toàn bộ bằng `if (keystorePropsFile.exists())` guard.
- [x] `src-tauri/gen/android/app/.gitignore` -- Append 2 dòng: `keystore.properties` và `*.keystore`
- [x] `.gitignore` -- Append `*.keystore` và `keystore.properties` (nếu chưa có)
- [x] `.github/workflows/release.yml` -- Trong job `build-android`, thêm 2 steps TRƯỚC "Build Android APK": (1) "Decode keystore" guard bằng `if: secrets.ANDROID_KEYSTORE_BASE64 != ''`, decode base64 → `src-tauri/gen/android/app/release.keystore`; (2) "Create keystore.properties" guard tương tự, ghi file 4 dòng properties. Đổi path upload từ `app-universal-release-unsigned.apk` → `app-universal-release.apk`.
- [x] `.github/workflows/android-debug.yml` -- Tạo mới. Clone cấu trúc job `build-android` từ `release.yml`. `on:` gồm `workflow_dispatch` và `push: branches: [releases]`. Đổi build command → `pnpm tauri android build --apk --debug`. Thay step upload release bằng `actions/upload-artifact@v4`: path `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`, name `android-debug-apk-${{ github.sha }}`, retention-days `14`.
- [x] `scripts/generate-keystore.sh` -- Tạo mới (chmod +x). Check `keytool` in PATH. Prompt `read -sp` cho `STORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS` (default: `android-stream-desk`), và DN fields (`CN`, `OU`, `O`, `L`, `S`, `C`). Chạy `keytool -genkeypair`. In 4 block: `=== ANDROID_KEYSTORE_BASE64 ===`, `=== ANDROID_KEYSTORE_PASSWORD ===`, `=== ANDROID_KEY_ALIAS ===`, `=== ANDROID_KEY_PASSWORD ===`. Nhắc backup offline + xóa history.
- [x] `docs/release/signing-setup.md` -- Tạo mới. 4 phần: (1) Chạy `./scripts/generate-keystore.sh`; (2) Paste 4 block vào GitHub Settings → Secrets and variables → Actions; (3) Backup `release.keystore` offline; (4) Verify bằng `apksigner verify --print-certs app-universal-release.apk`.

**Acceptance Criteria:**
- Given `keystore.properties` vắng mặt, when `./gradlew assembleRelease` chạy local, then build thành công (unsigned) — không throw error về signingConfig.
- Given 4 secrets được set, when tag `v*` được push, then CI upload `app-universal-release.apk` (không có hậu tố `-unsigned`).
- Given secrets rỗng, when tag `v*` được push, then job `build-android` vẫn pass (green), echo warning, upload `unsigned` file.
- Given `workflow_dispatch` trigger, when `android-debug.yml` chạy, then artifact `android-debug-apk-{sha}` xuất hiện trong Actions tab, file là debug APK có thể cài được mà không cần sign key.
- Given `./scripts/generate-keystore.sh` được chạy với đủ input, then in ra 4 block có thể paste ngay vào GitHub secrets.
- Given `keystore.properties` hoặc `release.keystore` nằm trong repo, when `git status`, then file không xuất hiện (blocked bởi .gitignore).

## Design Notes

**Gradle keystore.properties pattern:**
```kotlin
val keystorePropsFile = rootProject.file("keystore.properties")
if (keystorePropsFile.exists()) {
    val props = Properties().apply { load(keystorePropsFile.inputStream()) }
    signingConfigs {
        create("release") {
            storeFile = file(props.getProperty("storeFile"))
            storePassword = props.getProperty("storePassword")
            keyAlias = props.getProperty("keyAlias")
            keyPassword = props.getProperty("keyPassword")
        }
    }
    buildTypes { release { signingConfig = signingConfigs.getByName("release") } }
}
```
Lưu ý: `rootProject.file("keystore.properties")` resolve từ `src-tauri/gen/android/` (parent của `app/`). Điều chỉnh path nếu cần để khớp với nơi CI tạo file.

**CI guard pattern:**
```yaml
- name: Decode keystore
  if: secrets.ANDROID_KEYSTORE_BASE64 != ''
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d \
      > src-tauri/gen/android/app/release.keystore
```

## Verification

**Manual checks (if no CLI):**
- Mở `src-tauri/gen/android/app/build.gradle.kts` — phải thấy `signingConfigs` block bọc trong `if (keystorePropsFile.exists())`.
- Mở `.github/workflows/release.yml` — phải thấy 2 steps keystore TRƯỚC "Build Android APK", upload path không còn `-unsigned`.
- Mở `.github/workflows/android-debug.yml` — phải thấy `upload-artifact` thay vì `action-gh-release`, build command có `--debug`.
- `git check-ignore -v release.keystore keystore.properties` — cả 2 phải bị ignore.
- `bash -n scripts/generate-keystore.sh` -- expected: exit 0 (bash syntax check)

## Suggested Review Order

**APK Signing — Gradle core**

- Signing guard: try-catch + null-check trước khi tạo signingConfig; fallback an toàn nếu file vắng/lỗi.
  [`build.gradle.kts:29`](../../src-tauri/gen/android/app/build.gradle.kts#L29)

- `findByName` thay `getByName` — không throw nếu signingConfig chưa được tạo.
  [`build.gradle.kts:73`](../../src-tauri/gen/android/app/build.gradle.kts#L73)

**APK Signing — CI workflow**

- Decode base64 keystore từ secret, guard bằng BASE64 secret, ghi `release.keystore`.
  [`release.yml:114`](../../.github/workflows/release.yml#L114)

- Tạo `keystore.properties` từ 4 secrets; heredoc YAML block scalar xử lý indent đúng.
  [`release.yml:120`](../../.github/workflows/release.yml#L120)

- Upload có điều kiện: signed APK nếu secrets đủ, unsigned fallback nếu không.
  [`release.yml:135`](../../.github/workflows/release.yml#L135)

**Debug APK CI**

- Workflow mới: trigger manual + push to `releases`; output artifact 14 ngày, không tạo Release.
  [`android-debug.yml:1`](../../.github/workflows/android-debug.yml#L1)

**Keystore generation helper**

- Script local: keytool wrapper + in 4 block sẵn paste vào GitHub secrets; `base64 <` portable.
  [`generate-keystore.sh:1`](../../scripts/generate-keystore.sh#L1)

**Docs & Safety**

- Hướng dẫn 4 phần: generate → paste secrets → backup → verify signed APK.
  [`signing-setup.md:1`](../../docs/release/signing-setup.md#L1)

- Keystore exclusions để tránh accidental commit.
  [`.gitignore:7`](../../src-tauri/gen/android/app/.gitignore#L7)
