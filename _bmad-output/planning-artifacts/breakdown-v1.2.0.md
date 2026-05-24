---
title: "Android Stream Desk v1.2.0 — Feature Breakdown"
version: 1.2.0
created: 2026-05-24
status: planning
---

# v1.2.0 Feature Breakdown

Đợt cập nhật v1.2.0 mở rộng năng lực macro (thêm action chạy lệnh shell tuỳ biến), tinh chỉnh UX cấu hình màu (cho phép nhập trực tiếp mã hex), và hoàn thiện quy trình phát hành Android (ký APK chính thức + build APK debug qua CI). Đồng thời sửa 3 lỗi hiện hữu trên Dashboard ảnh hưởng trải nghiệm chỉnh sửa: drag-drop sau khi resize lưới, độ chính xác màu neon, và click chọn GridButton không ổn định.

---

## 1. FEATURE 1: Button Action chạy Command Line (Shell Command Action)

### 1.1 Phân tích gốc rễ
Hiện `ButtonConfig.actionType` chỉ hỗ trợ 3 loại: `shortcut`, `media`, `app` (mở file thực thi). Người dùng power-user trên macOS/Windows thường cần chạy các lệnh phức tạp — ví dụ `open -a "/Applications/Google Chrome.app" "https://github.com/aniadev"` hoặc `osascript -e ...` — mà `app` action không xử lý được vì nó dùng `std::process::Command::new(appPath)` với đường dẫn cố định và không truyền argument.

* **Hạn chế:** Không thể mở URL trong app cụ thể, không thể chuỗi nhiều lệnh, không thể chạy script shell một dòng.

### 1.2 Giải pháp & Bản thiết kế
* Bổ sung action type mới `command` vào `ActionType` union (`src/types/index.ts`) và `execute_logic` (`src-tauri/src/lib.rs`).
* Thêm trường `commandValue?: string` trên `ButtonConfig` (serde rename `commandValue`) — chuỗi command thô do người dùng nhập.
* Trên Rust, thực thi qua `tokio::process::Command` với shell phù hợp platform:
  - macOS/Linux: `sh -c "<command>"`
  - Windows: `cmd /C <command>`
  Spawn detached (không block executor), bắt stderr → emit `action-error` toast nếu exit code khác 0.
* Trên Dashboard, thêm option "Command line" trong dropdown `actionType` của Edit Button modal cùng textarea `commandValue` với placeholder ví dụ thực tế.
* **Bảo mật:** Bổ sung warning UI khi người dùng nhập command — chuỗi này chạy với quyền user hiện tại. Không sanitize input (intentional — power user feature, LAN-only).

### 1.3 Stories

#### S-CMD1 — Types & Layout sanitization: thêm action `command`
* **Goal:** Mở rộng kiểu `ActionType` và đảm bảo `sanitizeLayout` chấp nhận giá trị mới.
* **Scope:**
  - Thêm `'command'` vào `ActionType` (`src/types/index.ts`).
  - Bổ sung field `commandValue?: string` trên `ButtonConfig`.
  - Cập nhật `validActions` trong `sanitizeLayout` (`src/stores/layout.ts`) thêm `'command'`.
  - Mirror struct `ButtonConfig` trong `src-tauri/src/lib.rs` với `#[serde(rename = "commandValue")]`.
* **Complexity:** Thấp

#### S-CMD2 — Rust: nhánh `execute_logic` cho action `command`
* **Goal:** Thực thi chuỗi shell command an toàn cross-platform, bắt lỗi để emit toast.
* **Scope:**
  - Trong `execute_logic` (`src-tauri/src/lib.rs`), thêm match arm `"command"` gọi helper mới `run_shell_command(cmd: &str) -> Result<(), String>`.
  - Helper detect platform: `cfg!(target_os = "windows")` → `cmd /C`; còn lại → `sh -c`.
  - Dùng `std::process::Command` (đồng bộ, gọi trong block async — async hóa nếu cần qua `tokio::task::spawn_blocking`).
  - Trả về `Err` chứa stderr khi exit code khác 0; thành công return `Ok(())`.
* **Complexity:** Trung bình

#### S-CMD3 — Dashboard UI: nhập command trong Edit Button modal
* **Goal:** Cho phép chọn action `command` và nhập chuỗi shell trong giao diện Dashboard.
* **Scope:**
  - Thêm option `"Command line"` vào select `actionType` trong `DashboardView.vue` Edit Button drawer/modal.
  - Conditional render `<textarea v-model="editingButton.commandValue">` khi `actionType === 'command'`.
  - Placeholder ví dụ: `open -a "Google Chrome" "https://github.com"`.
  - Hint label: `⚠ Lệnh chạy với quyền user hiện tại — chỉ dùng cho command bạn tin cậy.`
* **Complexity:** Thấp

---

## 2. FEATURE 2: Nhập mã màu Hex thủ công vào ColorPicker

### 2.1 Phân tích gốc rễ
Trên `DashboardView.vue` (xung quanh dòng 519, class `cyber-hex`) người dùng hiện chỉ chọn được màu thông qua `<input type="color">` native picker. Khi muốn dán mã hex từ design system, palette đã có, hay tinh chỉnh chính xác (`#FF00FF`), người dùng phải mò trong vòng picker hoặc copy-paste qua đường vòng (browser devtools, terminal `printf`...).

* **Hạn chế:** Không có ô text input nhận hex; không validate; không sync 2 chiều giữa text input và `<input type="color">`.

### 2.2 Giải pháp & Bản thiết kế
* Thêm `<input type="text">` cạnh swatch picker, đồng bộ hai chiều với `editingButton.backgroundColor`.
* Validate dạng `^#?[0-9a-fA-F]{6}$` hoặc `^#?[0-9a-fA-F]{3}$` (cả 3-char shorthand). Normalize về `#RRGGBB` lowercase trước khi gán vào model.
* Khi text input không match regex → border đỏ + giữ giá trị cũ trên `<input type="color">` (không commit lỗi vào store).
* On blur hoặc Enter → commit & emit save. On invalid → revert hiển thị từ model.

### 2.3 Stories

#### S-HEX1 — Validator & normalizer hex
* **Goal:** Util chuyển đổi text → hex hợp lệ chuẩn hóa.
* **Scope:**
  - Thêm helper `normalizeHex(input: string): string | null` trong `src/lib/utils.ts` (hoặc tạo `src/lib/color.ts`).
  - Logic: trim → strip leading `#` → chấp nhận 3 hoặc 6 ký tự hex → expand 3-char (`f0a` → `ff00aa`) → return `#rrggbb` lowercase. Sai format → `null`.
  - Export đi kèm unit-test scaffold (chưa cần test runner — comment các case ví dụ làm tài liệu).
* **Complexity:** Thấp

#### S-HEX2 — Dashboard: input hex + sync với color picker
* **Goal:** Người dùng gõ hex hoặc dùng picker, cả hai đồng bộ trạng thái.
* **Scope:**
  - Trong block hex edit của `DashboardView.vue`, thêm `<input type="text" v-model="hexDraft" @blur="commitHex" @keyup.enter="commitHex" />` bên cạnh `<input type="color">`.
  - `hexDraft` là local ref đồng bộ từ `editingButton.backgroundColor` qua watcher.
  - `commitHex()`: gọi `normalizeHex(hexDraft.value)` — nếu hợp lệ → cập nhật `editingButton.backgroundColor`; nếu không → revert `hexDraft` về giá trị model.
  - Visual feedback: border đỏ + tooltip khi giá trị tạm thời sai.
* **Complexity:** Trung bình

---

## 3. FEATURE 3: Cấu hình Sign APK + GitHub Actions Flow

### 3.1 Phân tích gốc rễ
File `.github/workflows/release.yml` hiện build APK Android xong upload file `app-universal-release-unsigned.apk` — file này không cài được trên thiết bị Android thật (Android refuse install unsigned APK trừ debug profile). Người dùng cuối phải tự sign bằng `apksigner` thủ công — hoặc phải build local có keystore — bất tiện cho phân phối qua GitHub Releases.

* **Hạn chế:** Không có keystore lưu trong CI; gradle build không biết keystore alias/password; release APK luôn unsigned.

### 3.2 Giải pháp & Bản thiết kế
* Tạo keystore local một lần với `keytool` (RSA-2048, valid 25 năm) → encode base64 → lưu vào GitHub Actions secret `ANDROID_KEYSTORE_BASE64`.
* Bổ sung các secret: `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
* Sửa `src-tauri/gen/android/app/build.gradle.kts` thêm `signingConfigs { release { ... } }` đọc properties từ `keystore.properties` (file tạo runtime trên CI, không commit).
* Update step "Build Android APK" trong `release.yml`:
  1. Tạo `keystore.properties` từ secrets.
  2. Decode base64 keystore → `release.keystore` trong `src-tauri/gen/android/app/`.
  3. Chạy `pnpm tauri android build --apk` — gradle sẽ tự sign vì config release đã có signingConfig.
  4. Upload file `app-universal-release.apk` (không còn `-unsigned`).
* Cập nhật `.gitignore` để loại trừ `keystore.properties` và `*.keystore`.
* Tạo file `docs/release/signing-setup.md` hướng dẫn các bước tạo keystore và setup secrets — yêu cầu mới phát hành lần đầu mới làm.

### 3.3 Stories

#### S-SIGN1 — Gradle signing config + keystore.properties loader
* **Goal:** Gradle release build đọc keystore credential từ properties file.
* **Scope:**
  - Sửa `src-tauri/gen/android/app/build.gradle.kts`: thêm block đọc `../keystore.properties` (hoặc `keystore.properties` cùng cấp), parse `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.
  - Thêm `signingConfigs { release { storeFile = ...; storePassword = ...; ... } }`.
  - Áp `signingConfig = signingConfigs.getByName("release")` vào `buildTypes { release { ... } }`.
  - Fallback an toàn: nếu không có `keystore.properties` → bỏ qua signingConfig (build local dev không cần keystore).
* **Complexity:** Trung bình

#### S-SIGN2 — CI workflow: inject keystore từ secrets
* **Goal:** GitHub Actions tạo keystore + properties trước bước build APK.
* **Scope:**
  - Trong `.github/workflows/release.yml` job `build-android`, thêm step trước "Build Android APK":
    ```yaml
    - name: Decode keystore
      run: |
        echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > src-tauri/gen/android/app/release.keystore
    - name: Create keystore.properties
      run: |
        cat > src-tauri/gen/android/app/keystore.properties <<EOF
        storeFile=release.keystore
        storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
        keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
        keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
        EOF
    ```
  - Cập nhật step upload: file path đổi sang `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`.
  - Thêm guard: nếu secret thiếu → step echo cảnh báo và build vẫn ra unsigned (không fail toàn workflow).
* **Complexity:** Trung bình

#### S-SIGN3 — Helper script + Documentation
* **Goal:** Một câu lệnh duy nhất sinh keystore + in ra giá trị sẵn sàng paste vào GitHub secrets.
* **Scope:**
  - Tạo `scripts/generate-keystore.sh` (bash, chmod +x):
    1. Prompt interactive `read -sp` cho `STORE_PASSWORD`, `KEY_PASSWORD` (cho phép trùng), `KEY_ALIAS` (default `android-stream-desk`), `CN/OU/O/L/S/C` (DN fields).
    2. Chạy `keytool -genkeypair -keystore release.keystore -keyalg RSA -keysize 2048 -validity 9125 -alias "$KEY_ALIAS" -storepass "$STORE_PASSWORD" -keypass "$KEY_PASSWORD" -dname "CN=$CN, OU=$OU, O=$O, L=$L, S=$S, C=$C"`.
    3. Output 4 block định dạng sẵn:
       ```
       === ANDROID_KEYSTORE_BASE64 ===
       <base64 content>
       === ANDROID_KEYSTORE_PASSWORD ===
       <value>
       === ANDROID_KEY_ALIAS ===
       <value>
       === ANDROID_KEY_PASSWORD ===
       <value>
       ```
    4. Cuối script: nhắc backup `release.keystore` offline + xoá khỏi `~/.bash_history`.
  - Verify file `release.keystore` đã trong `.gitignore` (tránh accidental commit).
  - Tạo `docs/release/signing-setup.md` gồm 4 phần:
    1. Chạy `./scripts/generate-keystore.sh` → trả lời prompt.
    2. Copy từng block in ra → paste vào GitHub Settings → Secrets and variables → Actions.
    3. Lưu ý backup `release.keystore` offline (USB, password manager) — mất keystore = không update app cùng package identifier.
    4. Verify: push tag thử nghiệm `v0.0.0-signing-test`, kiểm tra APK build ra signed bằng `apksigner verify --print-certs app-universal-release.apk`.
  - Bổ sung `*.keystore`, `keystore.properties` vào `.gitignore` root + `src-tauri/gen/android/app/.gitignore`.
* **Complexity:** Thấp

---

## 4. FEATURE 4: Flow Build APK Debug Mode

### 4.1 Phân tích gốc rễ
Khi cần test trên thiết bị Android thật mà chưa muốn release tag, hiện chỉ có `pnpm tauri android dev` (yêu cầu USB debugging + máy build). Không có flow CI build sẵn APK debug để QA tải về cài thẳng — debug APK Android tự sign bằng debug keystore mặc định nên không cần secret release.

* **Hạn chế:** Không có workflow CI sinh APK debug; không có script local rút gọn.

### 4.2 Giải pháp & Bản thiết kế
* Thêm script npm `android:build:debug` chạy `pnpm tauri android build --apk --debug` (Tauri CLI hỗ trợ flag này — tạo debug APK đã ký bằng debug keystore của Android SDK).
* Tạo workflow `.github/workflows/android-debug.yml` riêng:
  - Trigger thủ công (`workflow_dispatch`) + tự động trên push branch `develop` (tuỳ chọn — confirm với user).
  - Build steps tương tự `release.yml` job android nhưng dùng `--debug`.
  - Upload APK debug làm GitHub Actions artifact (lưu 7 ngày — không tạo release).
* Tên file output: `app-universal-debug.apk` — chia sẻ qua link artifact, không cần Play Console.

### 4.3 Stories

#### S-DBG1 — npm script `android:build:debug`
* **Goal:** Lệnh local rút gọn build APK debug.
* **Scope:**
  - Thêm `"android:build:debug": "tauri android build --apk --debug"` vào `package.json` scripts.
  - Verify CLI flag bằng `pnpm tauri android build --help` trước khi commit (ghi chú trong commit message).
* **Complexity:** Thấp

#### S-DBG2 — CI workflow `android-debug.yml`
* **Goal:** Build APK debug từ GitHub Actions, upload artifact tải về cài máy thật.
* **Scope:**
  - Tạo `.github/workflows/android-debug.yml` clone từ job `build-android` của `release.yml`:
    - `on:` gồm `workflow_dispatch` (manual trigger) và `push: branches: [releases]` (auto build mỗi khi merge vào nhánh `releases`).
    - Đổi `pnpm tauri android build --apk` → `pnpm tauri android build --apk --debug`.
    - Bỏ step upload to release; thay bằng `actions/upload-artifact@v4` với `path: src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`, `name: android-debug-apk-${{ github.sha }}`, `retention-days: 14`.
* **Complexity:** Thấp

---

## 5. BUG FIX 1: Drag-drop hỏng sau khi tăng/giảm rows/cols

### 5.1 Phân tích gốc rễ
`GridArea.vue` dòng 37 truyền `layoutStore.layout.buttons` trực tiếp vào directive `v-draggable`. Khi người dùng thay đổi `rows`/`cols`, store thực hiện gán mảng mới (`buttons = [...]`) — vue-draggable-plus init một lần lúc mount với reference cũ; reference thay → Sortable instance trỏ vào array stale, drop event không update mảng hiển thị.

* **Triệu chứng:** Sau resize, kéo nút bị "snap back" về vị trí cũ hoặc DOM order khác state.

### 5.2 Giải pháp & Bản thiết kế
* **Phương án A (ưu tiên):** Mutate in-place thay vì reassign khi resize grid — `buttons.splice(...)` thay cho `buttons = newArray`. Giữ nguyên array reference, Sortable không cần re-bind.
* **Phương án B (fallback):** Bind `:key="layout.rows + '-' + layout.cols"` lên container draggable để force re-mount Sortable khi grid thay đổi.
* Chọn A vì rẻ + giữ animation, fallback B nếu A vẫn lệch sau test.

### 5.3 Stories

#### S-FIX1 — Layout store: in-place mutate `buttons` khi resize grid
* **Goal:** Giữ reference array `buttons` ổn định qua mọi thay đổi rows/cols.
* **Scope:**
  - Trong `src/stores/layout.ts`, tìm các action set `rows`/`cols` (hoặc resize handler). Mọi gán mới (`buttons = ...`) đổi thành `buttons.splice(0, buttons.length, ...newButtons)`.
  - Audit thêm các điểm reset/load layout (sync từ WS, load từ disk) — nếu cần thay reference thì áp `:key` fallback.
  - Verify bằng test thủ công: tăng cols, kéo nút, kiểm tra state khớp UI sau drop.
* **Complexity:** Trung bình

---

## 6. BUG FIX 2: Neon color resolution không chính xác

### 6.1 Phân tích gốc rễ
`GridButton.vue` dòng 18 — `hexToRgb` regex chỉ chấp nhận đúng 6 ký tự hex (`#RRGGBB`). Khi `backgroundColor` chứa 3-char shorthand (`#f0a`) hoặc giá trị không hex (named color, hsl, rgba) → trả `null` → fallback cyan mặc định.

Thêm nữa, `neonColor` ở dòng 44–49 chỉ lấy hue `h` từ HSL của bgColor, hardcode S=90%, L=58% — mọi màu chỉ tạo ra cùng độ bão hòa và độ sáng, nên màu pastel (low saturation) hay màu tối (low lightness) đều bị bóp thành neon rực rỡ y hệt → mất chính xác cảm nhận màu.

### 6.2 Giải pháp & Bản thiết kế
* Mở rộng `hexToRgb` chấp nhận cả 3-char shorthand (`#abc` → `#aabbcc`) — gọi `normalizeHex` từ S-HEX1.
* Điều chỉnh `neonColor` tôn trọng saturation gốc:
  - Saturation: `max(60, originalS)` — sàn 60% để vẫn glow, nhưng không ép tất cả lên 90%.
  - Lightness: `clamp(originalL, 45, 70)` — giữ vùng sáng để glow nhìn rõ, không quá tối hoặc cháy.
* Thêm test cases tham khảo (dạng comment hoặc dev-only console.assert):
  - `#ff0000` (đỏ thuần) → neon `hsl(0, 100%, 58%)` đỏ neon.
  - `#8b4513` (saddle brown) → neon giữ hue 25°, S≥60, L bounded — không thành cam neon chói.
  - `#abc` (shorthand) → resolve thay vì fallback cyan.

### 6.3 Stories

#### S-FIX2 — Refactor `hexToRgb` + neon HSL clamp
* **Goal:** Resolve hex chính xác hơn, neon phản ánh tính chất màu gốc.
* **Scope:**
  - Trong `src/components/GridButton.vue`, thay regex `hexToRgb` bằng pipeline qua `normalizeHex` (từ S-HEX1) → nếu null thì fallback `#1e293b`.
  - Sửa `neonColor`: lấy cả `s` và `l` từ `rgbToHsl`, áp `Math.max(60, s)` và `Math.min(70, Math.max(45, l))`.
  - Sửa `neonGlow` tương tự — giữ alpha 0.5 nhưng S/L từ giá trị mới.
  - Tận dụng helper chung: nếu tách `src/lib/color.ts` thì `rgbToHsl`/`hslToString` cũng chuyển vào module để dùng lại.
* **Complexity:** Trung bình

---

## 7. BUG FIX 3: Click GridButton đôi khi không chọn được

### 7.1 Phân tích gốc rễ
Trong context Dashboard, `GridButton` được bọc trong `v-draggable` container — Sortable.js gán `mousedown`/`touchstart` listener để chuẩn bị drag. Trên khoảng `delay`/`dragoverBubble` mặc định, đôi khi sự kiện `mousedown` bị consume nhưng `click` không fire (hoặc preventDefault) — đặc biệt khi user click nhanh sau khi vừa drag xong, Sortable còn ở trạng thái `dragging` ngắn.

Ngoài ra, `GridButton.vue` hiện không phân biệt click "press macro" trên `ClientView` với click "select để edit" trên `DashboardView` — `@press` event được emit như nhau, parent `DashboardView` mới chuyển sang select. Nếu Sortable nuốt click → select không bao giờ trigger.

### 7.2 Giải pháp & Bản thiết kế
* **Bước 1:** Cấu hình `v-draggable` options thêm `delay: 100, delayOnTouchOnly: true, touchStartThreshold: 5` — Sortable phân biệt rõ giữa click ngắn (<100ms) và bắt đầu drag, không nuốt click ngắn.
* **Bước 2:** Đảm bảo `GridButton` button native nhận click bằng `@mousedown.stop` chỉ khi container không ở mode edit — hoặc dùng filter của Sortable (`filter: '.cyber-btn--no-drag'`) khi cần chặn drag từ button cụ thể. (Phương án nhẹ hơn: chỉ áp delay.)
* **Bước 3:** Trên `DashboardView`, đảm bảo handler `@press` từ `GridButton` chuyển thẳng sang select state (không có guard async nào chặn).

### 7.3 Stories

#### S-FIX3 — Sortable delay + click reliability
* **Goal:** Click GridButton trong Dashboard luôn select; drag vẫn hoạt động khi giữ + di chuyển.
* **Scope:**
  - Trong `src/components/GridArea.vue`, mở rộng options object của `v-draggable`:
    ```ts
    v-draggable="[layoutStore.layout.buttons, {
      ghostClass: 'cyber-ghost',
      animation: 200,
      delay: 100,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onUpdate,
    }]"
    ```
  - Verify tay: click nhanh select đúng button; giữ + kéo vẫn drag được; trên touch device không lag.
  - Nếu vẫn còn miss-click sau khi áp delay → bổ sung `filter` selector trên Sortable + `data-no-drag` attribute trên element cần ưu tiên click.
* **Complexity:** Trung bình

---

## 8. FEATURE 5: App Picker Modal — duyệt app cài đặt trên máy (Windows trước)

### 8.1 Phân tích gốc rễ
Hiện trên Dashboard, action `app` yêu cầu người dùng tự gõ tay đường dẫn đầy đủ tới file `.exe` (ví dụ `C:\\Program Files\\Mozilla Firefox\\firefox.exe`). Người dùng không nhớ chính xác path → phải mở Explorer mò → trải nghiệm kém. macOS có `/Applications/*.app` flat hơn nhưng Windows app phân tán nhiều thư mục (`Program Files`, `Program Files (x86)`, `AppData\Local\Programs`, MS Store apps...).

* **Hạn chế:** Không có cơ chế enumerate app cài đặt; user phải gõ thủ công; dễ sai path → command fail silently.

### 8.2 Giải pháp & Bản thiết kế

#### 8.2.1 Backend (Rust) — enumeration sạch + filter junk
* Bổ sung Tauri command `list_installed_apps() -> Vec<InstalledApp>` trả về `{ name, path, icon, publisher }` (tất cả String, `icon`/`publisher` Optional).
* **Windows (priority 1, scope duy nhất trong v1.2.0):** Đọc registry Uninstall keys:
  - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
  - `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`
  - `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
  
  Mỗi subkey đọc `DisplayName`, `DisplayIcon`, `InstallLocation`, `Publisher`, `SystemComponent`, `WindowsInstaller`.
* **Filter junk** (skip entry nếu match bất kỳ điều kiện):
  - `SystemComponent == 1` (Windows component, redistributables).
  - `DisplayName` chứa: `Update for`, `Hotfix`, `Security Update`, `Redistributable`, `KB[0-9]+`.
  - Không resolve được path `.exe` chính.
* **Resolve path** theo thứ tự ưu tiên:
  1. `DisplayIcon` → strip `,N` icon index → path file.
  2. Nếu `DisplayIcon` không phải `.exe` → fallback `InstallLocation` dò file `.exe` lớn nhất (heuristic loose, vẫn tốt hơn empty).
  3. Skip nếu cả 2 không cho `.exe`.
* **Icon (path thô):** Trả nguyên path file `.exe` hoặc `.ico` trong field `icon`. **Không extract binary icon trong v1.2.0** — frontend dùng generic `lucide:app-window` mặc định + cố gắng render `.ico` qua `convertFileSrc` nếu là `.ico` thuần (best-effort, không bắt buộc thành công).
* **MS Store (UWP/AppX): bỏ qua v1.2.0** — không enum `Get-AppxPackage`/PackageManager COM, scope sau.
* Sort: alphabetically theo `name` (case-insensitive locale-aware), dedupe theo `path` canonical lowercase.
* **macOS/Linux:** Stub trả empty Vec với log warning — scope v1.3+.

#### 8.2.2 Frontend (UX cải tiến)
Vấn đề UX cơ bản: danh sách Windows registry thường 80-200 entry — search substring đơn thuần kém tiện. Tăng UX bằng 6 cải tiến:

1. **Stale-while-revalidate cache:** Lần đầu mở modal → scan registry 1-2s, lưu `localStorage` key `app-picker:apps`. Mở lại → render cache **instant** + đồng thời gọi `invoke` background → khi response về, diff với cache, update reactive list nếu khác (subtle indicator "Updated" trong header 2s). Không TTL cứng — luôn fresh sau mỗi lần mở.
2. **Fuzzy search (Fuse.js):** Thêm dependency `fuse.js@^7` (~5KB gzipped). Config:
   ```ts
   new Fuse(apps, {
     keys: ['name', 'publisher'],
     threshold: 0.4,
     includeMatches: true,  // trả về indices cho highlight
     ignoreLocation: true,
   })
   ```
   Gõ `vsc` match `Visual Studio Code`, `chrm` match `Google Chrome`. `result.matches[].indices` dùng trực tiếp cho HighlightedText component.
3. **Recently used:** Lưu 5 app gần nhất được chọn vào `localStorage` (`app-picker:recents`). Khi mở modal không gõ gì → section "Recent" hiển thị trên cùng, dưới là "All apps".
4. **Highlight matched chars:** Trong tên app, bôi đậm hoặc đổi màu các ký tự khớp query (giúp user verify match đúng app mình tìm).
5. **Keyboard navigation:** `↑/↓` di chuyển highlight, `Enter` select, `Esc` đóng modal. Search input auto-focus khi mở.
6. **Publisher subtitle:** Hiển thị `publisher` (e.g. "Google LLC", "Microsoft Corporation") dưới `name` cỡ chữ nhỏ — giúp phân biệt khi có nhiều phiên bản cùng tên.

Layout modal:
```
┌─────────────────────────────────────────┐
│  🔍 Search apps...              [×] [↻]│
├─────────────────────────────────────────┤
│  Recent                                 │
│  ▸ Visual Studio Code  · Microsoft     │
│  ▸ Google Chrome       · Google LLC    │
├─────────────────────────────────────────┤
│  All apps (147)                         │
│  ▸ 1Password           · AgileBits     │
│  ▸ Adobe Acrobat       · Adobe Inc.    │
│  ▸ Audacity            · Audacity Team │
│  ...                                    │
└─────────────────────────────────────────┘
```

Hiệu năng: virtual scroll chỉ cần khi list > 300 entry. Đo trước — nếu thấp hơn dùng plain `v-for` + CSS `contain: strict`.

**Caching strategy (Stale-While-Revalidate):**
```
Open modal
   ├─ Cache exists? ─yes─> render instant ──┐
   │                                        ├─> invoke() background
   └─ no ─> spinner ────────────────────────┘
                                            ↓
                                     diff vs cache
                                            ↓
                                  update + flash "Updated" badge
```
Lợi ích: UX instant từ lần thứ 2 trở đi; không bao giờ thấy data stale quá vài giây sau khi mở modal; user cài app mới ngoài flow vẫn thấy ngay lần mở kế tiếp.

### 8.3 Stories

#### S-APP1 — Rust command `list_installed_apps` (Windows registry + filter junk)
* **Goal:** Enumerate Windows app từ 3 registry hive, filter SystemComponent + KB update, dedupe, sort.
* **Scope:**
  - Thêm dependency `winreg = "0.52"` trong `src-tauri/Cargo.toml`:
    ```toml
    [target.'cfg(target_os = "windows")'.dependencies]
    winreg = "0.52"
    ```
  - Tạo struct với `#[derive(Serialize, Clone)]`:
    ```rust
    #[serde(rename_all = "camelCase")]
    struct InstalledApp {
        name: String,
        path: String,
        icon: Option<String>,
        publisher: Option<String>,
    }
    ```
  - Hàm `list_installed_apps_windows() -> Vec<InstalledApp>`:
    - Iterate 3 registry hive (`HKLM\Software\...\Uninstall`, `HKLM\Software\WOW6432Node\...\Uninstall`, `HKCU\Software\...\Uninstall`).
    - Đọc field: `DisplayName`, `DisplayIcon`, `InstallLocation`, `Publisher`, `SystemComponent` (DWORD).
    - **Skip rules:**
      - `SystemComponent == 1`.
      - `DisplayName` empty hoặc match regex `(?i)(update for|hotfix|security update|redistributable|^KB\d+)`.
      - Không resolve được `.exe` path qua `DisplayIcon` hay `InstallLocation`.
    - **Resolve path helper** `resolve_exe(display_icon: Option<&str>, install_loc: Option<&str>) -> Option<String>`:
      - Strip `,N` từ `DisplayIcon` (regex `,-?\d+$`).
      - Verify path endsWith `.exe` (case-insensitive) và file exists.
      - Fallback: nếu `InstallLocation` valid → `std::fs::read_dir` lọc `.exe`, chọn file lớn nhất theo bytes.
    - **Icon raw:** Giữ `DisplayIcon` (đã strip index) nếu là `.ico` hoặc `.exe`; nếu không match thì `None`. Không extract binary.
    - Dedupe: HashMap key = `path.to_lowercase()`, giữ entry có publisher nếu trùng.
    - Sort: `name.to_lowercase()` ascending.
  - Cross-platform `list_installed_apps()` Tauri command:
    - `#[cfg(target_os = "windows")]` → gọi windows impl.
    - `#[cfg(not(target_os = "windows"))]` → log warn + return `Vec::new()`.
  - Đăng ký `list_installed_apps` vào `invoke_handler!`.
* **Complexity:** Cao

#### S-APP2 — Modal cơ bản: render + click select + Dashboard integration
* **Goal:** Component modal hiển thị list app + search substring + click chọn — phiên bản tối giản chạy được end-to-end.
* **Scope:**
  - Tạo `src/components/AppPickerModal.vue`:
    - Props: `modelValue: boolean`. Emits: `update:modelValue`, `select: (path: string) => void`.
    - On open lần đầu: `invoke<InstalledApp[]>('list_installed_apps')` → store vào local ref.
    - Loading spinner trong lúc chờ.
    - Search input `v-model="query"` (auto-focus on open).
    - `filteredApps` computed: substring case-insensitive trên `name`.
    - Render `<ul>` row: icon generic `lucide:app-window`, `name` chính, `publisher` subtitle xám.
    - Click row → emit `select(row.path)` + đóng modal.
    - Styling cyber theme (border neon cyan, bg `rgba(2,6,14,0.95)`, backdrop blur).
  - Tích hợp `DashboardView.vue`:
    - Block render khi `editingButton.actionType === 'app'` thêm nút `Browse installed apps...` mở modal.
    - `<AppPickerModal v-model="appPickerOpen" @select="(p) => editingButton.appPath = p" />`.
    - Input `appPath` vẫn editable manual (không readonly).
* **Complexity:** Trung bình

#### S-APP3 — UX nâng cao: cache TTL, fuzzy search, recents, keyboard nav, highlight
* **Goal:** Modal mở instant lần 2+, search thông minh, navigate bằng phím, ưu tiên app dùng gần nhất.
* **Scope:**
  - **Stale-while-revalidate cache:**
    - `localStorage` key `app-picker:apps` lưu `InstalledApp[]` (không cần `cachedAt` — luôn revalidate).
    - On open:
      1. Đọc cache → nếu có, set ngay vào reactive `apps` ref (render instant).
      2. Đồng thời `invoke('list_installed_apps')` background.
      3. Khi response về: shallow compare (length + JSON.stringify hash hoặc map qua paths). Nếu khác → update `apps` + persist cache + hiển thị badge "Updated" trong header (auto-fade 2s).
    - Nút refresh ↻ trong header → force re-invoke ignoring cache + clear cache trước.
    - Lần đầu chưa có cache: skip step 1, hiển thị loading spinner cho đến khi response.
  - **Fuzzy search (Fuse.js):**
    - Thêm dep `fuse.js@^7` vào `package.json`.
    - Tạo Fuse instance trong computed (re-create khi `apps` thay đổi):
      ```ts
      const fuse = computed(() => new Fuse(apps.value, {
        keys: ['name', 'publisher'],
        threshold: 0.4,
        includeMatches: true,
        ignoreLocation: true,
        minMatchCharLength: 1,
      }))
      ```
    - `filteredApps` computed:
      - Nếu `query === ''` → return `apps.value` (raw, sort theo Rust đã sort).
      - Ngược lại → `fuse.value.search(query)` map về `{ app, matches }`.
    - Pass `matches[].indices` xuống `HighlightedText` để bôi đậm chars khớp.
  - **Recently used:**
    - `localStorage` key `app-picker:recents` lưu mảng `string[]` (paths), tối đa 5, MRU front.
    - On `select(path)` → unshift + dedupe + slice 5 + persist.
    - Modal UI: nếu `query === ''` → render section "Recent" trên đầu (map paths → app object từ cache), dưới section "All apps".
  - **Highlight matched chars:**
    - Render `name` bằng v-for char với class `text-cyan-400 font-bold` cho char ở `indices` trả về từ fuzzyMatch.
    - Tách helper `<HighlightedText :text :indices />` reusable.
  - **Keyboard nav:**
    - `selectedIndex: number` ref.
    - `@keydown.down.prevent` increment, `@keydown.up.prevent` decrement, clamp range.
    - `@keydown.enter.prevent` → emit select cho `filteredApps[selectedIndex]`.
    - `@keydown.esc.prevent` → close modal.
    - Scroll-into-view khi index thay đổi (`element.scrollIntoView({ block: 'nearest' })`).
    - Reset `selectedIndex = 0` khi `query` thay đổi.
* **Complexity:** Cao

---

## 9. Tổng hợp Kế hoạch Triển khai v1.2.0

### Dependency Graph

```
Types & Utils ──> S-CMD1 ──> S-CMD2 ──> S-CMD3       (Command Action)
                                                     
                  S-HEX1 ──> S-HEX2                  (Hex Input)
                       │
                       └────────> S-FIX2             (Neon Color Resolution — reuse normalizeHex)

App Picker     ──> S-APP1 ──> S-APP2 ──> S-APP3      (Win registry enum → modal+integration → UX cache/fuzzy/recent/keyboard)

CI/Build       ──> S-SIGN1 ──> S-SIGN2 ──> S-SIGN3   (APK Signing)
                                                     
                   S-DBG1 ──> S-DBG2                 (Debug APK)

Dashboard UX   ──> S-FIX1                            (Drag-drop after resize)
                   S-FIX3                            (Click reliability)
```

### Complexity & Impact Matrix

| Story  | Feature                                       | Complexity   | Front-end Only? |
|--------|-----------------------------------------------|--------------|------------------|
| S-CMD1 | Types + sanitize cho action `command`         | Thấp         | ❌ (Rust + TS)   |
| S-CMD2 | Rust execute_logic nhánh `command`            | Trung bình   | ❌ (Rust)        |
| S-CMD3 | Dashboard UI nhập command                     | Thấp         | ✅               |
| S-HEX1 | normalizeHex util                             | Thấp         | ✅               |
| S-HEX2 | Hex input sync với color picker               | Trung bình   | ✅               |
| S-APP1 | Rust enum Windows registry + filter junk      | Cao          | ❌ (Rust)        |
| S-APP2 | Modal cơ bản + Dashboard integration          | Trung bình   | ✅               |
| S-APP3 | UX nâng cao (cache/fuzzy/recents/keyboard)    | Cao          | ✅               |
| S-SIGN1| Gradle signingConfig + properties loader      | Trung bình   | ❌ (Gradle)      |
| S-SIGN2| CI inject keystore từ secrets                 | Trung bình   | ❌ (CI/CD)       |
| S-SIGN3| Docs signing-setup.md                         | Thấp         | ❌ (Docs)        |
| S-DBG1 | npm script `android:build:debug`              | Thấp         | ❌ (Tooling)     |
| S-DBG2 | CI workflow android-debug.yml                 | Thấp         | ❌ (CI/CD)       |
| S-FIX1 | In-place mutate `buttons` qua resize          | Trung bình   | ✅               |
| S-FIX2 | hexToRgb shorthand + HSL clamp                | Trung bình   | ✅               |
| S-FIX3 | Sortable delay + click reliability            | Trung bình   | ✅               |

### New Files Expected

```
src/lib/color.ts                                   (S-HEX1, S-FIX2) - normalizeHex + HSL helpers
src/components/AppPickerModal.vue                  (S-APP2, S-APP3) - Modal duyệt app + UX nâng cao
src/components/HighlightedText.vue                 (S-APP3) - Render chars highlighted theo Fuse indices
.github/workflows/android-debug.yml                (S-DBG2) - Debug APK CI workflow
scripts/generate-keystore.sh                       (S-SIGN3) - Helper sinh keystore + in secret
docs/release/signing-setup.md                      (S-SIGN3) - Hướng dẫn setup keystore + secrets
src-tauri/gen/android/app/keystore.properties      (S-SIGN1, runtime-only, không commit)
```

### Modified Files Expected

```
package.json                                       (S-DBG1, S-APP3 - thêm fuse.js dep)
src/types/index.ts                                 (S-CMD1)
src/stores/layout.ts                               (S-CMD1, S-FIX1)
src/views/DashboardView.vue                        (S-CMD3, S-HEX2, S-APP2)
src/components/GridArea.vue                        (S-FIX3)
src/components/GridButton.vue                      (S-FIX2)
src-tauri/Cargo.toml                               (S-APP1) - thêm winreg dep
src-tauri/src/lib.rs                               (S-CMD1, S-CMD2, S-APP1)
src-tauri/gen/android/app/build.gradle.kts        (S-SIGN1)
src-tauri/gen/android/app/.gitignore               (S-SIGN3)
.gitignore                                         (S-SIGN3)
.github/workflows/release.yml                      (S-SIGN2)
```

### Phasing đề xuất

1. **Sprint 1 — Foundation & Quick fixes** (2-3 ngày)
   - S-HEX1 → S-HEX2 → S-FIX2 (chuỗi tận dụng `normalizeHex` chung).
   - S-FIX1, S-FIX3 (bug Dashboard độc lập, làm song song).
   - S-DBG1 (1-line script).

2. **Sprint 2 — Command Action + App Picker** (4-5 ngày)
   - S-CMD1 → S-CMD2 → S-CMD3.
   - S-APP1 → S-APP2 (MVP đầu — modal chạy được end-to-end, sortable junk-free).
   - Demo S-APP2 với Ania → confirm UX direction trước khi đầu tư S-APP3.
   - S-APP3 (cache + fuzzy + recents + keyboard — có thể tách commit nhỏ theo từng UX feature để dễ rollback nếu cần).
   - Test thủ công Windows: mở browse → tìm Chrome bằng `chrm` → keyboard ↓↓ Enter → verify path set vào `appPath`. Mở lại modal trong 10 phút → instant load từ cache. Verify Recent section hiển thị Chrome top.

3. **Sprint 3 — Android Release Pipeline** (2-3 ngày)
   - S-SIGN3 trước (script + docs để Ania chạy keystore).
   - Ania chạy `./scripts/generate-keystore.sh`, paste 4 secret vào GitHub.
   - S-SIGN1 (gradle config local dev test).
   - S-SIGN2 (kích hoạt CI signing).
   - S-DBG1 + S-DBG2 (clone từ release.yml job android, push lên nhánh `releases` để verify auto-trigger).

### Ghi chú phát hành

- Bump `package.json` version + `src-tauri/tauri.conf.json` version lên `1.2.0`.
- Cập nhật `CHANGELOG.md` theo format hiện tại (v1.1.0 entry làm template).
- Tag `v1.2.0` sau khi merge tất cả vào `main` → workflow `release.yml` tự build cả Windows MSI và Android APK signed.
- Sau release, kiểm tra `download/latest.json` được updater workflow refresh đúng (cơ chế đã có sẵn từ v1.1.0).
