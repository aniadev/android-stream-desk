# Story 7.1: Tự động bật/tắt Screen Wake Lock theo trạng thái hoạt động của socket kết nối

Status: done

## Story

As a macro client user,
I want tính năng chống tắt màn hình (Wake Lock) tự hủy khi tắt Companion hoặc mất kết nối,
so that thiết bị di động của tôi tự động ngủ tiết kiệm pin khi tôi không ngồi máy tính.

## Acceptance Criteria

1. **Given** cài đặt "Luôn bật màn hình" (`keepScreenOn: true`) được kích hoạt trong store,
   **When** trạng thái WebSocket `connectionStore.status` chuyển thành `'connected'`,
   **Then** hệ thống gọi API trình duyệt `navigator.wakeLock.request('screen')` để bắt đầu chặn tự động ngủ màn hình.
2. **Given** trạng thái WebSocket ngắt kết nối (`disconnected`, `error`, hoặc khi Companion Windows tắt),
   **When** socket đổi trạng thái,
   **Then** tự động giải phóng (release) sentinel của Wake Lock hiện tại, đưa thiết bị về chế độ tiết kiệm năng lượng ngủ tự động bình thường theo cài đặt OS.
3. **Given** thiết bị Client chạy trong nền tảng không hỗ trợ API Wake Lock (ví dụ một số WKWebView trên iOS),
   **When** gọi,
   **Then** bỏ qua việc gọi API an toàn (`'wakeLock' in navigator` check) mà không gây treo hay crash giao diện client.

## Tasks / Subtasks

- [x] Task 1: Thay đổi logic kích hoạt Wake Lock (AC: 1, 2)
  - [x] Sửa đổi watcher trong `ClientView.vue` to trigger `acquireWakeLock` dựa trên tổ hợp `keepScreenOn` và trạng thái `connectionStore.status === 'connected'`.
  - [x] Thêm watcher theo dõi `connectionStore.status`, nếu khác `'connected'` và sentinel đang tồn tại, gọi `releaseWakeLock()`.
- [x] Task 2: Kiểm thử fallback an toàn và rò rùi (AC: 3)
  - [x] Implement guard check `'wakeLock' in navigator` tại root file `src/lib/wakelock.ts`.
  - [x] Đăng ký hàm hủy release trên `onUnmounted` của Vue để tránh leak.

## Dev Notes

- **Browser restriction rules**: API Wake Lock chỉ hoạt động trên active tab (visible). Nếu tab bị minimize/background, browser sẽ tự hủy và ném event `release` – handler trong `visibilitychange` của vue phải kích hoạt lại đúng điều kiện connected.

### References

- [Source: src/lib/wakelock.ts] - Hiện hữu cấu trúc API Wake Lock wrapper.
- [Source: src/views/ClientView.vue#123] - Nơi nạp/hủy event visibilitychange.
