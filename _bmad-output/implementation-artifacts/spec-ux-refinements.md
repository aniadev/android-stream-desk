---
title: 'Android Stream Desk UI/UX Refinements'
type: 'feature'
created: '2026-05-24'
status: 'in-progress'
baseline_commit: 'dda653c5b09d28a0a57fc9d519efa603a0ed784d'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Giao diện Dashboard và Client của Stream Desk v1 hoạt động được nhưng gặp một số bất tiện nghiêm trọng về UI/UX:
- Tiêu đề HUD Header trên Dashboard chiếm quá nhiều diện tích dọc, làm hẹp không gian xem trực quan Grid.
- Khi lưới Grid mật độ cao (ví dụ 5x6, 6x8), nhãn chữ trên các nút bị cắt ngang hoặc tràn ra ngoài gây mất thẩm mỹ.
- Bộ Icon chọn lọc MDI, Lucide, Material khá nghèo nàn, thứ tự chưa được phân nhóm khoa học.
- Sự kiện nhập file chạy ứng dụng chỉ hiển thị ".exe" giả định Windows, gây bối rối cho người dùng macOS.
- Thanh HUD kết nối trên màn hình Client di động quá to, lấn át không gian bấm nút. Khi chưa kết nối thì không có gợi ý nổi bật, còn khi kết nối rồi vẫn hiện lù lù thanh IP Input không cần thiết.

**Approach:** 
Tách bạch và tinh chỉnh giao diện người dùng đồng bộ:
1. **Dashboard View Refinements**:
   - Thu hẹp padding dọc và cỡ chữ HUD Header trên máy tính xuống mức siêu gọn (`py-2.5 px-4` và text nhỏ).
   - Tối ưu CSS của nhãn chữ nút bấm (`GridButton` và Dashboard preview): đổi sang dạng `line-clamp-2`, `leading-tight`, `text-[9px]`, tự động ngắt dòng thông minh (`break-all` + `hyphens-auto`) để hiển thị trọn vẹn chữ khi thu nhỏ.
   - Mở rộng kho Iconify Picker lên trên 24 icon kinh điển cho mỗi nhóm (MDI, Lucide, Material Symbols), phân loại theo mục đích sử dụng (Media, System, Browsers, Dev, Tools) khoa học.
   - Tự động thay đổi nhãn hướng dẫn và Placeholder nhập File chạy ứng dụng dựa theo OS máy khách (ví dụ hiển thị ".app" cho macOS và ".exe" cho Windows).
2. **Client View Refinements**:
   - Nếu Client ở trạng thái "Chưa kết nối": Ẩn toàn bộ không gian Grid trống, mở một Popup kính mờ (Connection Modal Popup) nổi bật ngay chính giữa màn hình yêu cầu nhập IP/Port để Kết nối.
   - Khi "Đã kết nối thành công": Ẩn hoàn toàn Popup và thanh nhập IP. Grid nút bấm sẽ chiếm 98% diện tích toàn màn hình. Ở góc phải chỉ hiển thị một HUD nổi siêu nhỏ bao gồm: Đèn báo trạng thái (`bg-emerald-500`) kèm nút bánh răng Settings (`mdi:cog`).
   - Khi bấm nút settings này, một màn hình Modal kết nối nhỏ sẽ mở lên cho phép kiểm tra IP đang bắt hoặc bấm "Ngắt kết nối" để về trạng thái ban đầu.

## Boundaries & Constraints

**Always:**
- Giữ nguyên các module truyền tải WebSocket và Pinia logic hiện có.
- Aspect ratio của Grid preview trên Dashboard và Client Area phải được bảo toàn đồng nhất, không méo mó grid.
- Giữ nguyên cơ chế tương tác Key Recorder thu phím tắt.
- TypeScript compiler phải pass 100% không warning/error.

**Never:**
- Sử dụng thư viện UI bên ngoài khác ngoài các shadcn component cục bộ (`Button`, `Input`, `Card`).
- Giảm độ phân giải vẽ icon hay làm méo tỷ lệ Aspect Ratio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chưa kết nối (Client) | `status === 'disconnected'` | Hiển thị Popup Modal đăng nhập IP/Port nổi bật. Ẩn Grid nền. | Nếu IP trống, báo khung đỏ cảnh báo |
| Đã kết nối (Client) | `status === 'connected'` | Popup đóng hoàn toàn. Lưới nút bấm chiếm trọn màn hình. Chỉ hiện chấm xanh + bánh răng Settings nổi ở góc. | Nút settings click được để gọi ngắt kết nối bất cứ lúc nào |
| Đổi thiết lập App | Chạy trên macOS | Nhãn nhập sự kiện ứng dụng đổi thành "macOS App (.app)", placeholder gợi ý "/Applications/*" | Tương thích ngược đường dẫn cũ |
| Chữ phím gõ dài | Nhãn nút "VS Code Save All" | Chữ hiển thị trọn vẹn trên 2 dòng nhỏ, không bị trồi hoặc đè lên icon | Tự động hạ cỡ chữ về `text-[9px]` khi vượt 8 ký tự |

</frozen-after-approval>

## Code Map

- `src/components/ui/Input.vue` -- Sửa lỗi typescript binding nếu có
- `src/components/GridButton.vue` -- Nâng cấp CSS font chữ adaptivity cao theo mật độ grid
- `src/components/GridArea.vue` -- Tinh chỉnh wrapper bảo toàn aspect grid
- `src/views/ClientView.vue` -- Refactor logic Popup kết nối, HUD nổi góc, và thiết lập modal
- `src/views/DashboardView.vue` -- Thu gọn HUD Header, mở rộng iconify icon pool, và điều dạng nhãn tệp chạy theo hệ điều hành

## Tasks & Acceptance

**Execution:**
- [ ] Font Adaptivity -- Chỉnh sửa `src/components/GridButton.vue` hỗ trợ line-clamp, break-all, hyphens và auto scale-down cỡ chữ theo kích thước nút mang tính đồng nhất -- CSS phím bấm
- [ ] Platform Adaptive App Launcher Input -- Thay thế nhãn chữ và placeholder của Input sự kiện App launcher trên `src/views/DashboardView.vue` thích ứng động với macOS/Windows -- UX Dashboard
- [ ] Tight HUD Header -- Cơ cấu lại CSS của Top Header trên `src/views/DashboardView.vue` làm hẹp padding dọc, đưa layout về dạng inline siêu mỏng -- UI Dashboard
- [ ] Expanded Icon Pool -- Thay thế 3 dãy icons `mdi`, `lucide`, `material` trên `src/views/DashboardView.vue` bằng bộ pool 24 icon phân loại tốt -- Icons Dashboard
- [ ] Client Connection Popup & HUD -- Thiết kế và viết lại `src/views/ClientView.vue`: Thêm overlay Popup kính mờ trung tâm khi offline, ẩn ConnectionStatus khi online, thay thế bằng thanh HUD nổi siêu mini góc phải + Settings Modal -- UX Client

**Acceptance Criteria:**
- **AC-1:** Given Dashboard view chạy trên macOS, when chọn phím loại App, then nhãn nhập sự kiện hiển thị "Đường dẫn App macOS (.app):" và gợi ý "/Applications" làm placeholder.
- **AC-2:** Given phím bấm có nhãn "VS Code Save All", when Grid thu nhỏ mật độ cao, then toàn bộ nhãn chữ hiển thị trọn vẹn co giãn đều không bị đứt góc hoặc cắt chữ.
- **AC-3:** Given Client di động chưa kết nối, when ứng dụng vừa khởi chạy, then hiển thị Popup nhập IP kính mờ chuyên nghiệp và khóa tương tác phía dưới.
- **AC-4:** Given Client đã kết nối, when kết nối thành công, then Popup biến mất, Grid nút bấm căng tràn toàn bộ màn hình, ở góc chỉ hiện chấm xanh status lá cây + nút bánh răng settings.
- **AC-5:** Given online HUD ở góc, when click bánh răng settings, then hiển thị Modal nổi cung cấp tùy chọn "Ngắt kết nối" chính xác.

## Verification

**Commands:**
- `pnpm build` -- expected: Biên dịch thành công frontend không cảnh báo
- `pnpm tauri dev` -- expected: Chạy dashboard bình thường

**Manual checks (if no CLI):**
- Co giãn màn hình grid xem phím bấm có thích ứng và hiển thị đầy đủ tiêu đề hay không.
- Thử kết nối client và trải nghiệm Popup chuyển đổi.
