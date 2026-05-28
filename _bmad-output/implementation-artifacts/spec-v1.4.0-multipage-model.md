---
title: 'v1.4.0 S-PAGE1 — Multi-page data model + migration + metrics scan'
type: 'feature'
created: '2026-05-28'
baseline_commit: 'd68a193'
status: 'review'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `Layout` hiện phẳng — một lưới duy nhất `{ rows, cols, buttons[], theme? }` (`src/types/index.ts:28-33`, Rust struct trong `lib.rs`). Không có khái niệm trang → user nhiều macro chạm trần một lưới. Cần nền tảng dữ liệu multi-page trước khi làm UI (S-PAGE2/3/4).

**Approach:** Thêm `Page { id, name?, buttons }` và `pages: Page[]` vào `Layout`. `rows`/`cols` dùng chung mọi trang. Layout cũ chỉ có `buttons[]` tự migrate → `pages: [{ id, buttons }]`. Đọc cả hai dạng (graceful). Metrics loop (v1.3.0) phải quét monitor button trên TẤT CẢ trang.

## Boundaries & Constraints

**Always:** Migration không phá dữ liệu — layout cũ mở lên không mất button. `buttonKind` thiếu → backfill `'action'`. Giữ `theme` field.

**Ask First:** Nếu muốn `rows`/`cols` riêng từng trang (hiện CHỐT dùng chung).

**Never:** KHÔNG xóa field `buttons` khỏi khả năng đọc (legacy input). KHÔNG đổi wire format camelCase (`#[serde(rename)]`). KHÔNG đụng UI trong story này (chỉ data + migration + metrics).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Layout cũ single-page | `{ rows, cols, buttons:[...] }` không `pages` | Migrate → `pages:[{id:'page_1', buttons}]`, drop `buttons` top-level | — |
| Layout mới multi-page | `{ rows, cols, pages:[...] }` | Dùng nguyên, không migrate lại | — |
| Monitor button ở trang 2 | layout 2 trang, monitor ở trang 2 | metrics loop tính min interval gồm cả trang 2 | — |
| Button thiếu buttonKind | `{...}` không `buttonKind` | backfill `'action'` ở mọi trang | — |
| layout.json hỏng | JSON lỗi | catch → default_layout, không crash | try/catch sẵn có |

</frozen-after-approval>

## Code Map

- `src/types/index.ts` — thêm `interface Page`; đổi `Layout.buttons` → `pages: Page[]` (giữ `buttons?` legacy).
- `src/stores/layout.ts` — `migrateLayout()` helper; áp trong localStorage parse (`:114-128`) và `sync_layout` handler (`:184-194`); `default_layout` bọc vào `pages`.
- `src-tauri/src/lib.rs` — struct `Page`; field `pages: Option<Vec<Page>>` + giữ `buttons: Option<Vec<ButtonConfig>>` trong `Layout`; `save_layout_config` ghi `pages`.
- `src-tauri/src/metrics.rs` — bước tìm monitor button đổi sang flatten `pages[].buttons`.

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- Thêm `export interface Page { id: string; name?: string; buttons: ButtonConfig[] }`. Trong `Layout`: thêm `pages?: Page[]` (optional bridge; S-PAGE2 flip required), giữ `buttons: ButtonConfig[]` required để tránh TS lỗi ở DashboardView/ClientView không nằm trong scope story này. Migration luôn set `buttons` = `pages[0].buttons`.
- [x] `src/stores/layout.ts` -- Thêm `backfillButton` + `migrateLayout` helper: nếu `raw.pages` mảng → dùng; else → bọc `raw.buttons` thành `pages:[{id:'page_1',buttons}]`. Backfill `buttonKind`+`emoji→icon` trong mọi trang. Áp tại: (1) localStorage parse, (2) `sync_layout` handler. `defaultLayout()` trả thêm `pages:[{id:'page_1',buttons}]`.
- [x] `src-tauri/src/lib.rs` -- Thêm `struct Page { id, name?, buttons }`. Trong `Layout`: thêm `pages: Option<Vec<Page>>` với `#[serde(default, skip_serializing_if="Option::is_none")]`. Giữ `buttons: Vec<ButtonConfig>`.
- [x] `src-tauri/src/metrics.rs` -- `compute_interval_ms`: flatten `pages[].buttons` nếu có, fallback sang `buttons` legacy.

**Acceptance Criteria:**
- Given layout.json cũ chỉ có `buttons`, when nạp, then thành `pages:[{id:'page_1',...}]`, không mất button, không crash.
- Given layout mới có `pages`, when nạp, then giữ nguyên, không migrate lại.
- Given monitor button ở trang 2, when metrics loop chạy, then interval tính gồm button trang 2.
- Given build, when `pnpm vue-tsc --noEmit` + `cargo check`, then sạch với `Page`/`pages`.

## Design Notes

`rows`/`cols` dùng chung mọi trang — đơn giản render + tương thích layout cũ. Migration idempotent: layout đã có `pages` không bị bọc lại. Đây là story nền — KHÔNG UI; S-PAGE2 thêm page state, S-PAGE3/4 thêm UI.

## Verification

**Commands:**
- `pnpm vue-tsc --noEmit` -- expected: `Page`/`pages` typed sạch.
- `cargo check --manifest-path src-tauri/Cargo.toml` -- expected: `Page` struct compile, metrics quét pages.

**Manual:** Mở app với layout.json cũ → không mất button; thêm monitor button trang 2 → metric vẫn broadcast.

## File List

- `src/types/index.ts` — thêm `Page` interface, `pages?` vào `Layout`
- `src/stores/layout.ts` — `backfillButton`, `migrateLayout`, update `defaultLayout`, áp tại 2 điểm nạp
- `src-tauri/src/lib.rs` — `Page` struct, `pages: Option<Vec<Page>>` trong `Layout`
- `src-tauri/src/metrics.rs` — flatten pages khi tính monitor interval

## Dev Agent Record

### Completion Notes

`pages` thêm optional (`pages?: Page[]`) để không phá existing code dùng `layout.buttons`. `migrateLayout` bridge: luôn set cả `pages` và `buttons` (pages[0].buttons). S-PAGE2 sẽ flip primary sang `pages`, xóa bridge. `vue-tsc` + `cargo check` sạch.

### Change Log

- 2026-05-28: Implement S-PAGE1 — Page type, migrateLayout, defaultLayout pages, metrics flatten

## Suggested Review Order

- `migrateLayout` idempotent + áp ở 2 điểm nạp. [`layout.ts:114`](../../src/stores/layout.ts#L114)
- `Page`/`pages` type. [`types/index.ts:28`](../../src/types/index.ts#L28)
- metrics flatten pages. [`metrics.rs`](../../src-tauri/src/metrics.rs)
