# Story 10.5 (S-UX2): Settings information architecture cleanup

Status: done

## Story

As a Companion user,
I want settings được nhóm rõ ràng,
so that tôi tìm cấu hình nhanh, không thấy các tính năng bị nhồi chung một màn hình.

## Acceptance Criteria

1. **Given** settings modal,
   **When** sắp xếp lại,
   **Then** chia nhóm: `General`, `Network`, `Client & QR`, `Permissions`, `Updates`, `Import/Export`, `About/Support`.
2. **Given** các tính năng hiện có,
   **When** phân nhóm,
   **Then** autostart, restart/network config, Web Client URL/QR, Accessibility, updater, donation/support về đúng nhóm.
3. **Given** action nguy hiểm (relaunch/restart),
   **When** hiển thị,
   **Then** ở khu vực có mô tả trạng thái + disabled state rõ.
4. **Given** màn hình thấp,
   **When** scroll,
   **Then** header/footer action không che nội dung; không lồng card trong card.

## Tasks / Subtasks

- [x] Task 1: Định nghĩa nhóm IA (AC: 1, 2)
  - [x] `settingsGroups` array với 7 mục (id, label, icon) trong `src/views/DashboardView.vue`.
  - [x] Mỗi nhóm wrap trong `<section :id="settings-group-<id>">` với `scroll-mt-4` để scrollIntoView hoạt động khi click rail.
  - [x] Theme + Autostart → General.
  - [x] WS Port + Web Port toggle → Network.
  - [x] Web Client URL + QR (move từ Network) → Client & QR.
  - [x] Accessibility button mới → Permissions (chỉ hiện trên macOS qua `v-if="isMac"`).
  - [x] Updater → Updates.
  - [x] Export/Import layout → Import/Export.
  - [x] App Info + Donate → About/Support.
  - [x] Left rail nav (sticky 160px) với 7 nút, highlight nhóm đang xem qua `onSettingsScroll()` scroll-spy.
  - [x] Modal width tăng từ 620px → 840px để chứa rail + content.
- [x] Task 2: Action nguy hiểm (AC: 3)
  - [x] `canSaveServerConfig` computed: chỉ enable khi `!saving && !validationError && hasPendingServerChanges` (liên kết S-REL2).
  - [x] `serverConfigSaveHint` computed: 4 trạng thái (saving / error / pending / no-change) với icon + màu tương ứng.
  - [x] Button có `:aria-disabled` + `:title` cho keyboard/screen reader.
- [x] Task 3: Responsive scroll (AC: 4)
  - [x] Sticky header trên cùng (title + close button inline) — không che content khi scroll.
  - [x] Sticky left rail ngoài content scroll container, không cuộn theo content.
  - [x] Content scroll vùng riêng (`overflow-y-auto`).
  - [x] Bỏ lồng card trong card: Web Client URL/QR tách khỏi cyber-inset của Network (chuyển sang Client & QR section).
  - [x] Donate callout (gradient) là hero block, không phải card → giữ nguyên theo design system.

### Review Findings

- [x] [Review][Patch] Rail Settings luôn hiện `Permissions` dù section bị ẩn trên non-macOS [src/views/DashboardView.vue:136]
- [x] [Review][Patch] Nút lưu/relaunch có thể bật lại khi restart dialog đang pending [src/views/DashboardView.vue:172]
- [x] [Review][Patch] About/Support vẫn có bordered donate/QR blocks lồng trong `cyber-inset`, trái với no card-in-card [src/views/DashboardView.vue:3079]

## Dev Agent Record

### Implementation Plan
Refactor modal settings thành 7 group bands có section header. Thêm left rail sticky với scroll-spy để scan nhanh. Tách Web Client URL/QR ra khỏi Network. Thêm Permissions group cho macOS. Action nguy hiểm (relaunch) có 4-state status hint + icon + disabled-when-no-changes.

### File List
- `src/views/DashboardView.vue` (script: `settingsGroups`, `activeSettingsGroup`, `scrollToSettingsGroup`, `onSettingsScroll`, `canSaveServerConfig`, `serverConfigSaveHint`; template: refactor modal to 2-col rail + content)

### Change Log
- Thêm 6 reactive refs/computed cho settings IA + scroll-spy + save state machine.
- Settings modal 620px → 840px; sticky header + sticky left rail.
- 6 section cũ → 7 section mới theo IA target.
- Network section: ẩn QR/URL (chuyển sang Client & QR), thêm status hint cho relaunch button, disable khi không có pending change.
- Thêm Permissions group (mac only) với button mở System Settings Accessibility.

## Dev Notes

- Phụ thuộc: trước S-CLIENT1 (fit mode setting cần chỗ trong nhóm Client & QR), trước S-QRX2 (QR layout nằm trong Client & QR). Cả 3 đều `review`/`ready-for-dev`.
- Pre-existing chunk-size warning không liên quan thay đổi này.

### References

- [Source: src/views/DashboardView.vue]
- [Source: src/lib/typography.ts] (S-UX1 token được dùng cho các label)
- [Breakdown: planning-artifacts/breakdown-v1.5.1.md §3]
