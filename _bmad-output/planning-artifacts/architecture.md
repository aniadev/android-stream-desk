---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/briefs/brief-android-stream-desk-2026-05-23/brief.md
  - _bmad-output/planning-artifacts/prds/prd-android-stream-desk-2026-05-23/prd.md
workflowType: 'architecture'
project_name: 'android-stream-desk'
user_name: 'Ania'
date: '2026-05-23'
lastStep: 8
status: 'complete'
completedAt: '2026-05-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- **Local Connection Management**: Tương tác Client-Server nội bộ qua WebSocket. Client Android chủ động kết nối tới Server Windows bằng thủ công nhập IP/Port.
- **OS Automation Execution**: Khả năng giả lập phím, phím tắt hệ thống, điều khiển âm lượng, media, và khởi chạy tệp thực thi chương trình `.exe`.
- **Dynamic Configuration Sync**: Quản lý lưới giao diện động (hàng và cột tự chỉnh), cho phép cập nhật nhãn, màu sắc và hành động của từng nút bấm từ màn hình cấu hình Windows sang hiển thị trên Android trong thời gian thực.

**Non-Functional Requirements:**
- **Latency Budget**: Tổng độ trễ kích hoạt tác vụ cần đạt dưới 50ms (mục tiêu lý tưởng < 30ms).
- **Local-First & Offline**: Dữ liệu không đi qua bất kỳ server đám mây nào; thực thi hoàn toàn trong LAN nội bộ.
- **Resource Footprint**: Dung lượng cài đặt Windows cực nhỏ (<10MB) và mức chiếm dụng RAM cực thấp thừa hưởng từ thế mạnh Tauri v2 Rust.

**Scale & Complexity:**
- Primary domain: Cross-platform Desktop & Mobile (Tauri v2 + Vue 3)
- Complexity level: Medium
- Estimated architectural components: 3 (Android touchscreen client app, Windows tray running server companion, Windows settings admin dashboard)

### Technical Constraints & Dependencies
- **Tauri v2 dependencies**: Cần thiết lập đúng Android SDK / NDK cho biên dịch chéo sang Android (.apk) và Visual Studio build tools trên Windows cho (.msi/.exe).
- **Windows API calls**: Sử dụng các thư viện Rust đáng tin cậy như `enigo` hoặc `rdev` cho việc giả lập gõ phím hệ thống.
- **WebSocket Stability**: Kênh truyền socket Wi-Fi nội bộ dễ bị gián đoạn; cơ chế heartbeat và tự động kết nối lại (auto-reconnect) is bắt buộc.

### Cross-Cutting Concerns Identified
- **State Synchronization**: Đảm bảo trạng thái kết nối và bố cục Grid được đồng bộ đúng đắn giữa hai đầu thiết bị khi một bên tắt/mở đột ngột.
- **Battery Optimization**: Sử dụng cơ chế lắng nghe sự kiện tiết kiệm năng lượng trên Android, tránh vòng lặp CPU polling vô ích khi không có tương tác hoặc ứng dụng xuống nền (background).

## Starter Template Evaluation

### Primary Technology Domain
Cross-platform Desktop (Windows) & Mobile (Android) app dựa trên phân tích yêu cầu sản phẩm.

### Starter Options Considered
- **Option 1: Vite + Vue 3 + Tauri CLI (Manual)**: Khởi tạo Vite độc lập, sau đó cài thêm `@tauri-apps/cli`. Phù hợp cho dự án đã có sẵn web frontend.
- **Option 2: create-tauri-app (Vue + TypeScript)** *(Được khuyến nghị)*: Bộ khung tích hợp chính thức của Tauri, cấu hình sẵn cấu trúc `src-tauri` (Rust) và thư mục `src` (Vue + Vite). 

### Selected Starter: create-tauri-app (Vue + TypeScript)

**Rationale for Selection:**
- Tích hợp chuẩn hóa tốt nhất từ đội ngũ phát triển Tauri.
- Hỗ trợ đầy đủ TypeScript cho cả frontend (qua Vite) và backend Rust.
- Cấu hình sẵn tích hợp đa nền tảng Tauri v2 (sẵn sàng build cho Android thông qua cài đặt tauri-mobile).

**Initialization Command:**
```bash
pnpm create tauri-app android-stream-desk --template vue-ts --manager pnpm
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- Frontend: TypeScript 5.x+, Vue 3 (Composition API).
- Backend: Rust 1.75+ (Tauri v2 Core cargo dependency).

**Styling Solution:**
- Tailwind CSS 3/4 sẽ được thêm thủ công sau khi khởi tạo thành công dự án để xây dựng CSS tối giản.

**Build Tooling:**
- Vite 5.x+ (Bundler tốc độ cao cho môi trường phát triển front-end).
- Cargo (Hệ thống quản lý dependency và build cho mã nguồn Rust).

**Testing Framework:**
- Vitest bổ sung sau cho các Unit Test logic Vue.
- Mã kiểm thử API Rust được viết trong thư mục test mặc định của Cargo.

**Code Organization:**
- `src-tauri`: Chứa mã nguồn Rust (Server WebSocket, logic tray system trên Windows).
- `src`: Chứa mã nguồn Vue 3 (Trình soạn lưới Button, Client nhận WebSocket, các view).

**Development Experience:**
- Hot module reloading (HMR) thời gian thực thông qua `pnpm tauri dev`.
- `pnpm tauri android dev` cho việc chạy thử trực tiếp trên điện thoại/máy ảo Android.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- **WebSocket Protocol Architecture**: Chọn mô hình WebSocket Server trên Windows Companion và WebSocket Client trên Android. Sử dụng thư viện `tokio-tungstenite` ở phía server và API `WebSocket` có sẵn của nền tài nguyên web phía client để đảm bảo độ trễ truyền dữ liệu dưới 30ms.
- **OS Input Virtualization Wrapper**: Sử dụng crate Rust `enigo` (v0.3.0) làm nhân xử lý giả lập phím, chuột và tổ hợp phím hệ thống phía Windows.
- **Tauri Auto-Updater Integration**: Tích hợp plugin `@tauri-apps/plugin-updater` chính thức của Tauri v2 giúp tự động tải xuống và cập nhật phiên bản ứng dụng chạy trên Windows không cần cài đặt lại từ đầu. Kế thừa nguyên mẫu cấu hình và quy trình tự động cập nhật qua GitHub Actions (Git release workflow) từ dự án `mdview` của cùng tài khoản người dùng tại `/Users/ania/codespace/2026/mdview`.

**Important Decisions (Shape Architecture):**
- **Data Persistence (Local)**:
  - Cấu hình layout (dạng JSON) được lưu trữ local trên Windows Companion bằng thư mục AppData ứng dụng (sử dụng thư viện `serde_json`).
  - Phía Android client lưu trữ trạng thái layout nhận được trong bộ nhớ tạm `localStorage` hoặc qua `tauri-plugin-store` cho tính năng offline.
- **Security Check Mechanism**: MVP chấp nhận kết nối Wi-Fi nội bộ tự do không mật khẩu giữa các IP cùng lớp mạng LAN (ví dụ: `192.168.1.N`). Hoãn xác thực mã PIN.

**Deferred Decisions (Post-MVP):**
- Cơ chế auto-discovery (mDNS) và xác thực ghép đôi thiết bị bằng mã PIN/QR-code sẽ dời lại sau.

### Data Architecture
- **Format**: Cấu hình lưới bố cục được định nghĩa hoàn toàn bằng một Schema JSON duy nhất đại diện cho tọa độ lưới, nhãn, màu sắc và kiểu hành động (Keyboard Shortcut / Application Launcher / System Volume).
- **Storage**: Đọc/Ghi qua module file hệ thống cục bộ phía Rust sử dụng thư viện file mặc định Rust `std::fs`.

### Authentication & Security
- **Security Group**: Mức tin cậy dựa trên ranh giới mạng LAN Wi-Fi nội bộ.

### API & Communication Patterns
- **Protocol**: WebSocket (WS) không mã hóa (chạy local) truyền payload JSON sự kiện.
- **Format**:
  - Gửi hành động: `{"type": "press", "buttonId": "btn_uuid"}`
  - Đồng bộ Layout: `{"type": "sync_layout", "layout": {...}}`
  - Heartbeat: `{"type": "ping"}` / `{"type": "pong"}` nhằm giữ kết nối socket.

### Frontend Architecture
- **State Management**: Sử dụng thư viện nhẹ Pinia trên Vue 3 để quản lý cấu hình lưới phím bấm và trạng thái kết nối mạng của Client.
- **UI Render**: Kế thừa CSS Grid thuần của Tailwind CSS để dựng cấu trúc lưới linh hoạt trên cả điện thoại (Grid 3x3) và tablet (Grid 5x6).

### Infrastructure & Deployment
- **Tauri Automatic Update Config**:
  - Trong `src-tauri/tauri.conf.json`, kích hoạt plugin `updater` với điểm cuối manifest: `https://raw.githubusercontent.com/aniadev/android-stream-desk/main/download/latest.json`.
  - Cấu hình chữ ký cập nhật bảo mật sử dụng khóa công khai `pubkey` sinh từ `minisign` tương tự thiết lập của `mdview`.
- **Git Release Workflow**:
  - Triển khai tệp `.github/workflows/release.yml` để tự động kích hoạt build đa nền tảng (Windows/Rust/Node) khi có thẻ tag (ví dụ: `v1.0.0`) được push lên.
  - Sử dụng `tauri-apps/tauri-action` để build ra các gói cài đặt Windows (`.msi`, `.exe`) và Android `.apk`.
  - Quy trình phụ (Job `update-manifest`) sẽ tải các tệp chữ ký cập nhật từ Release, tạo file `download/latest.json` tương thích và tự động commit/push trực tiếp vào nhánh `main` để Client tự quét kiểm tra.
- **Windows Packaging**: Bản phân phối chạy độc lập đóng gói thành tệp `.msi` cài đặt sẵn tray app qua Tauri target release build.
- **Android Compilation**: Biên dịch qua Android NDK tạo file `.apk` cài đặt trực tiếp.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
android-stream-desk/
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Workflow kiểm thử tích hợp liên tục
│       └── release.yml                     # Workflow tự động phát hành phiên bản và chữ ký minisign
├── download/
│   └── latest.json                         # File manifest cập nhật của Tauri Updater
├── src-tauri/
│   ├── Cargo.toml                          # Cấu hình dependency cho module Rust (Tauri + enigo v0.3.0 + tokio-tungstenite v0.29.0)
│   ├── tauri.conf.json                     # File cấu hình chính của Tauri v2 (kích hoạt tray, window desktop + mobile, plugin updater)
│   ├── capabilities/
│   │   └── default.json                    # Cấu hình quyền truy cập (ACL) trong Tauri v2
│   ├── icons/
│   │   ├── icon.ico
│   │   └── icon.png
│   └── src/
│       ├── main.rs                         # File entry point chạy tiến trình Tauri
│       ├── lib.rs                          # Chứa logic backend (Khởi chạy WebSocket Server, gọi enigo giả lập phím, app tray setup)
│       └── websocket.rs                    # Module quản lý WebSocket connection bằng tokio-tungstenite
├── src/
│   ├── main.ts                             # Điểm khởi đầu của Frontend Vue 3
│   ├── App.vue                             # Giao diện chính phân vùng router hiển thị
│   ├── assets/
│   │   └── tailwind.css                    # Định dạng style CSS toàn cục
│   ├── components/
│   │   ├── GridArea.vue                    # Lưới các nút macro điều khiển
│   │   ├── GridButton.vue                  # Component nút macro tùy biến (nhãn, emoji, màu nền)
│   │   └── ConnectionStatus.vue            # Thanh hiển thị trạng thái kết nối tới Server
│   ├── views/
│   │   ├── ClientView.vue                  # Giao diện chính hiển thị trên thiết bị Android (chạm để thực thi)
│   │   └── DashboardView.vue               # Giao diện cấu hình chỉnh sửa lưới nút chạy trên Windows Server
│   ├── stores/
│   │   ├── connection.ts                   # Store quản lý kết nối WebSocket và trạng thái IP
│   │   └── layout.ts                       # Store xử lý cấu hình layout lưới nút bấm
│   └── types/
│       └── index.ts                        # File định nghĩa kiểu dữ liệu TypeScript (Layout, ButtonConfig, ActionType, WSMessage)
└── tests/
    └── client.spec.ts                      # File kiểm thử phía Client Vue/Vite
```

### Architectural Boundaries

- **API Boundaries (WebSocket)**: Ranh giới giao tiếp qua mạng nội bộ được chuẩn hóa bằng schema WebSocket Json. Mọi dữ liệu trạng thái được tuần tự hóa (serializer) thông qua TypeScript ở Frontend và deserializer bằng `serde` ở Rust Backend.
- **Component Boundaries (Vue 3)**:
  - `ClientView`: Chỉ sử dụng kết nối đầu ra (Client) bằng API Websocket của Browser, thu nhận layout JSON để dựng lưới nút và gửi đi các action.
  - `DashboardView`: Dùng các Tauri Command (IPC invoke) gọi xuống Backend Rust để lưu cấu hình JSON trực tiếp vào phân vùng AppData trên Windows Server cũng như chỉnh sửa danh mục phím tắt.
- **Service Boundaries (Rust backend)**: Module `websocket.rs` chạy độc lập trên luồng thread nền của Tokio runtime, quản lý các client đầu cuối kết nối vào và chuyển tiếp sự kiện an toàn sang luồng chính Tauri (Tauri AppHandle) để gọi executor bấm phím.

### Requirements to Structure Mapping

- **Local Connection Management (FR-1, FR-2)**:
  - Xử lý mạng Server: `src-tauri/src/websocket.rs`
  - Quản lý trạng thái và ghép đôi: `src/stores/connection.ts` & `src/components/ConnectionStatus.vue`
- **OS Automation Execution (FR-3, FR-4, FR-5)**:
  - Triển khai giả lập phím enigo & launch ứng dụng: `src-tauri/src/lib.rs` (Tauri commands nhận event từ local websocket và invoke hệ thống).
- **Dynamic Configuration Sync (FR-6, FR-7, FR-8)**:
  - Thiết kế và lưu trữ trên Windows: `src/views/DashboardView.vue` & `src/stores/layout.ts`
  - Đồng bộ và Render lưới trên di động: `src/views/ClientView.vue` & `src/components/GridArea.vue`

### File Organization Patterns

- **Configuration Files**: Toàn bộ file thiết lập (Webpack/Vite, Tauri framework, TS compiler, Rust Cargo) đặt tại các thư mục tương ứng gốc hoặc submodule để AI agent dễ quét.
- **Asset Organization**: Toàn bộ file ảnh, favicon và icon hệ thống đặt tĩnh trong `src-tauri/icons` để phục vụ đóng gói ứng dụng. Giao diện ưu tiên hiển thị ký tự Emoji Unicode làm icon nút bấm cục bộ để tối ưu dung lượng đóng gói phiên bản MVP.

## Architecture Validation Results

### Coherence Validation ✅
Các quyết định về công nghệ, cấu trúc thư mục, và các mẫu xây dựng đều tương thích tuyệt đối:
- **Tauri v2 + Vue 3** hoạt động hài hòa dựa trên sự chia sẻ mã nguồn.
- **GitHub Actions (Release workflows)** đồng bộ tốt việc ký tự động updater bằng minisign và đẩy manifest lên repo.

### Requirements Coverage Validation ✅
Hỗ trợ toàn bộ 8 yêu cầu chức năng (FRs) và các NFR (Độ trễ thấp, Không Internet, Dung lượng nhẹ).

### Gap Analysis Results
- Không có bất kỳ khoảng trống kiến trúc (Gaps) nghiêm trọng nào ảnh hưởng đến việc lập trình MVP.

### Architecture Completeness Checklist

- [x] Phân tích hoàn chỉnh yêu cầu nghiệp vụ
- [x] Ước lượng quy mô và độ phức tạp
- [x] Xác định các ràng buộc kỹ thuật
- [x] Lập bản đồ các mối lo ngại chung
- [x] Lập sơ đồ cấu trúc thư mục chi tiết
- [x] Định vị ranh giới cấu trúc thành phần (Vue Frontend & Rust Backend)
- [x] Tích hợp Git Release workflows tự động và Tauri Updater (Mẫu từ `mdview`)
- [x] Đánh dấu tài liệu kiến trúc sẵn sàng triển khai code.

### Architecture Readiness Assessment

- **Overall Status**: **READY FOR IMPLEMENTATION** (16/16 Điểm kiểm duyệt hoàn thành tốt)
- **Confidence Level**: **High**
- **First Implementation Priority**: Khởi tạo cấu trúc nền tảng bằng Tauri CLI:
```bash
pnpm create tauri-app android-stream-desk --template vue-ts --manager pnpm
```
