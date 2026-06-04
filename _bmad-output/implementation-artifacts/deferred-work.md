# Deferred Work

## Deferred from: code review of s-mac1-native-accessibility-diagnostics (2026-06-04)

- `recommend_action` mislabel khi `trusted=false` + `enigo_probe_ok=true`: nhánh untrusted bỏ qua `enigo_probe_ok`, nên trạng thái "AX báo untrusted nhưng enigo inject được" vẫn báo thiếu quyền. Edge case hiếm/gần unreachable (AX và CGEvent path lệch nhau). [src-tauri/src/accessibility.rs:59] — deferred, edge case hiếm
