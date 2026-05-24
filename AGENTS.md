# Android Stream Desk - Hướng dẫn cho Developer Agents 📲🤖

Tài liệu này chứa các quy tắc kiến trúc và bài học xương máu **bắt buộc phải biết** để tránh làm lỗi và crash trình biên dịch trên dự án Tauri v2 + Vue 3 này.

---

## ⚠️ BÀI HỌC XƯƠNG MÁU (CRITICAL RUST BACKEND GOTCHAS)

### 1. Enigo Thread Safety trên macOS
*   **Vấn đề:** Khai báo `Enigo` (công cụ giả lập phím) thông qua `lazy_static!` hoặc lưu trữ tĩnh trong `Mutex<Enigo>` sẽ gây lỗi biên dịch nghiêm trọng: `NonNull<CGEventSource> cannot be sent between threads safely`. Thư viện `enigo` trên macOS không an toàn luồng (`Send`/`Sync`).
*   **Quy tắc:** **KHÔNG** chia sẻ hoặc lưu instance `Enigo` toàn cục. **Bắt buộc** khởi tạo động (Dynamic Instantiation) trực tiếp ngay bên trong luồng (thread) xử lý sự kiện cục bộ cần dùng:
    ```rust
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to initialize Enigo: {}", e))?;
    ```

### 2. Import Manager Trait khi truy cập Path
*   **Vấn đề:** Cầm tham chiếu `AppHandle` hoặc `App` để gọi `.path().app_config_dir()` sẽ báo lỗi: `no method named path found`.
*   **Quy tắc:** Đảm bảo **bắt buộc** có import trait `tauri::Manager` ở đầu tệp tin Rust đang gọi (ví dụ trong `websocket.rs` hay `lib.rs`).

### 3. Quy chuẩn Icon đóng gói (Tauri v2 Context Macro)
*   **Vấn đề:** `tauri::generate_context!()` giải nén và kiểm tra ảnh tại compile-time. Nếu các tệp tin icon (`src-tauri/icons/*`) là file rỗng (0-byte) hoặc sai định dạng chữ ký PNG, trình biên dịch sẽ panic lập tức (`unexpected end of file / is not RGBA`).
*   **Quy tắc:** Các tệp tin ảnh dummy tại `src-tauri/icons/` bắt buộc phải là ảnh PNG chuẩn hóa hệ màu **RGBA (color type 6)**. Sử dụng script python sinh ảnh RGBA tối giản (1x1 pixel) nếu cần tạo ảnh giả lập.

### 4. Tên liên kết Library Crate (Dấu gạch ngang vs Gạch dưới)
*   **Vấn đề:** Trong `Cargo.toml`, gói thư viện được đặt tên `"android-stream-desk"`. Khi liên kết gọi hàm tại `src-tauri/src/main.rs`, trình biên dịch Rust tự động chuyển dấu gạch ngang thành gạch dưới. 
*   **Quy tắc:** Gọi `android_stream_desk::run()` thay vì đoán mò `android_stream_desk_lib::run()`.

### 5. MSVC Linker bắt buộc trên Windows (tránh lỗi export ordinal)
*   **Vấn đề:** Nếu `PATH` có chứa `mingw64` (GNU toolchain), `cc` crate sẽ dùng `ld.exe` từ mingw64 để link, gây lỗi `error: export ordinal too large: 114XXX` — vì GNU ld có giới hạn export ordinal ~65535, trong khi Rust standard library export rất nhiều symbols.
*   **Quy tắc:** Trên Windows **bắt buộc** dùng MSVC linker:
    *   Cài **Visual Studio 2022 Build Tools** với workload `Desktop development with C++`:
        ```powershell
        winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
        ```
    *   File `src-tauri/.cargo/config.toml` đã được cấu hình sẵn với MSVC linker + CC/CXX/AR. **Không xóa file này.**
    *   Chạy ứng dụng bằng script `dev.ps1` (tự động load MSVC env):
        ```powershell
        .\dev.ps1
        ```
    *   Hoặc chạy từ **Developer PowerShell for VS 2022** > `pnpm tauri dev`.

---

## 🛠️ LỆNH PHÁT TRIỂN & CHẠY THỬ NHANH

- **Chạy song song Companion Server (Windows/macOS) & Vue Frontend:**
  ```bash
  .\dev.ps1
  ```
  Hoặc (trên macOS / Developer PowerShell for VS 2022):
  ```bash
  pnpm tauri dev
  ```
- **Chạy ứng dụng Android Client giả lập/thiết bị thật:**
  ```bash
  pnpm tauri android dev
  ```
- **Kiểm thử tĩnh nhanh phía Rust Backend:**
  ```bash
  cargo check --manifest-path src-tauri/Cargo.toml
  ```
  (Trên Windows, chạy trong **Developer PowerShell for VS 2022** hoặc dùng `.\dev.ps1`)

---

## 🧬 KIẾN TRÚC & PHÂN VÙNG DỮ LIỆU

- **WebSocket Connection:** WebSocket Server nội bộ lắng nghe cổng mặc định `8089` (Wi-Fi LAN). Frontend Client tự động Ping/Pong giữ nhịp mỗi 5 giây, reconnect mỗi 3 giây nếu offline.
- **Lưu trữ Cấu hình Lưới:** Client lưu layout nhận được tại `localStorage`. Windows Companion lưu layout JSON tại `AppConfig` directory (sắp xếp serde qua tệp `layout.json`).

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol named X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me Y's signature / source / docstring" | `codegraph_node` |
| "Give me focused context for a task/area" | `codegraph_context` |
| "See several related symbols' source at once" | `codegraph_explore` |
| "What files exist under path/" | `codegraph_files` |
| "Is the index healthy?" | `codegraph_status` |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work" / architecture / trace questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->
