# Android Stream Desk - Landing Page

Dự án Landing Page tĩnh giới thiệu phần mềm Android Stream Desk, được xây dựng độc lập với Vue 3 + Tailwind CSS + Vite (không phụ thuộc vào Tauri API của dự án chính).

---

## ⚡ Triển khai lên Vercel

Dự án này đã được tối ưu hóa để triển khai tĩnh lên Vercel. Hãy thực hiện theo các bước sau để phát hành trang:

### Cách 1: Triển khai tự động qua Github dashboard (Khuyên dùng)
1. Truy cập vào dashboard [Vercel](https://vercel.com).
2. Tạo dự án mới và chọn Repository của dự án này.
3. Thiết lập thông số cấu hình bản dựng chuẩn:
   - **Root Directory**: `landing-page`
   - **Framework Preset**: `Vite`
   - **Build Command**: `pnpm build` hoặc `npm run build`
   - **Output Directory**: `dist`
4. Nhấn **Deploy** để kích hoạt quá trình tự động cập nhật mỗi khi push code lên Git.

### Cách 2: Triển khai bằng Vercel CLI
Nếu bạn muốn đẩy lên trực tiếp mà không qua Git branch:
```bash
# Di chuyển vào thư mục landing-page
cd landing-page

# Cài đặt hoặc chạy vercel CLI
pnpm dlx vercel
```
Lần chạy đầu tiên sẽ yêu cầu bạn liên kết tài khoản Vercel và tự động nhận diện cấu hình của cấu trúc Vite.

---

## 📈 Tối ưu hóa SEO (SEO Optimization)

Trang web đã được cấu hình tối giản phục vụ việc index trên công cụ tìm kiếm:

1. **Meta Tags chuẩn**:
   - `description` thân thiện.
   - Các từ khóa (`keywords`) chính: `android stream desk`, `stream desk`, `macro pad`, ...
   - Thiết lập chặn/cho phép bot thu thập qua thẻ `robots`.

2. **Open Graph & Twitter Cards**:
   - Hỗ trợ hiển thị rich media (ảnh xem trước, tiêu đề và tóm tắt giới thiệu) khi bạn chia sẻ link trên Facebook, Zalo, Discord, hay Twitter (X).
   - Thẻ `og:image` và `twitter:image` trỏ tới `/logo.png`.

3. **Cấu hình Tên miền tùy biến (Custom Domain)**:
   - Sau khi deploy thành công lên Vercel, bạn có thể vào **Project Settings** > **Domains** để gắn tên miền độc lập cá nhân.
