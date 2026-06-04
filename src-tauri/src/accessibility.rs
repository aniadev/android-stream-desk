use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RecommendedAction {
    Allow,
    RemoveStaleEntry,
    RestartApp,
    OpenSettings,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InputPermissionDiagnostics {
    pub trusted: bool,
    pub bundle_identifier: String,
    pub executable_path: Option<String>,
    pub app_bundle_path: Option<String>,
    pub is_packaged_app: bool,
    pub recommended_action: RecommendedAction,
}

pub fn get_input_permission_diagnostics(app_handle: &AppHandle) -> InputPermissionDiagnostics {
    let executable_path = std::env::current_exe().ok();
    let app_bundle_path = executable_path.as_deref().and_then(resolve_app_bundle_path);
    let is_packaged_app = app_bundle_path.is_some();
    let trusted = native_input_trusted();
    let enigo_probe_ok = crate::probe_input_permission();

    InputPermissionDiagnostics {
        trusted,
        bundle_identifier: app_handle.config().identifier.clone(),
        executable_path: executable_path.as_ref().map(|path| path_to_string(path)),
        app_bundle_path: app_bundle_path.as_ref().map(|path| path_to_string(path)),
        is_packaged_app,
        recommended_action: recommend_action(trusted, enigo_probe_ok, is_packaged_app),
    }
}

pub fn resolve_app_bundle_path(executable_path: &Path) -> Option<PathBuf> {
    // Chỉ coi là packaged khi đúng layout `<Bundle>.app/Contents/MacOS/<exe>`.
    // Tránh false positive với thư mục cha tình cờ tên `*.app` (vd `/Users/foo.app/...`).
    let macos_dir = executable_path.parent()?;
    if macos_dir.file_name().and_then(|value| value.to_str()) != Some("MacOS") {
        return None;
    }
    let contents_dir = macos_dir.parent()?;
    if contents_dir.file_name().and_then(|value| value.to_str()) != Some("Contents") {
        return None;
    }
    let bundle_dir = contents_dir.parent()?;
    let name = bundle_dir.file_name().and_then(|value| value.to_str())?;
    if name.ends_with(".app") {
        Some(bundle_dir.to_path_buf())
    } else {
        None
    }
}

fn recommend_action(
    trusted: bool,
    enigo_probe_ok: bool,
    is_packaged_app: bool,
) -> RecommendedAction {
    if trusted && !enigo_probe_ok {
        RecommendedAction::RestartApp
    } else if trusted {
        RecommendedAction::Allow
    } else if is_packaged_app {
        // Packaged `.app`: rebuild đổi chữ ký → macOS coi là app khác,
        // entry TCC cũ vô dụng → cần xoá entry stale trước khi allow lại.
        RecommendedAction::RemoveStaleEntry
    } else {
        // Dev binary path `target/debug` ổn định → chỉ cần mở Settings allow.
        RecommendedAction::OpenSettings
    }
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(target_os = "macos")]
fn native_input_trusted() -> bool {
    macos_ax::process_trusted()
}

#[cfg(not(target_os = "macos"))]
fn native_input_trusted() -> bool {
    true
}

#[cfg(target_os = "macos")]
mod macos_ax {
    use std::ffi::c_void;
    use std::ptr;

    type Boolean = u8;
    type CFAllocatorRef = *const c_void;
    type CFDictionaryRef = *const c_void;
    type CFIndex = isize;
    type CFStringRef = *const c_void;
    type CFTypeRef = *const c_void;

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        static kAXTrustedCheckOptionPrompt: CFStringRef;
        fn AXIsProcessTrusted() -> Boolean;
        fn AXIsProcessTrustedWithOptions(options: CFDictionaryRef) -> Boolean;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        static kCFBooleanFalse: CFTypeRef;
        static kCFTypeDictionaryKeyCallBacks: c_void;
        static kCFTypeDictionaryValueCallBacks: c_void;
        fn CFDictionaryCreate(
            allocator: CFAllocatorRef,
            keys: *const *const c_void,
            values: *const *const c_void,
            num_values: CFIndex,
            key_callbacks: *const c_void,
            value_callbacks: *const c_void,
        ) -> CFDictionaryRef;
        fn CFRelease(cf: CFTypeRef);
    }

    pub fn process_trusted() -> bool {
        unsafe {
            let keys = [kAXTrustedCheckOptionPrompt];
            let values = [kCFBooleanFalse];
            let options = CFDictionaryCreate(
                ptr::null(),
                keys.as_ptr(),
                values.as_ptr(),
                1,
                &kCFTypeDictionaryKeyCallBacks as *const c_void,
                &kCFTypeDictionaryValueCallBacks as *const c_void,
            );

            if options.is_null() {
                return AXIsProcessTrusted() != 0;
            }

            let trusted = AXIsProcessTrustedWithOptions(options) != 0;
            CFRelease(options as CFTypeRef);
            trusted
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{recommend_action, resolve_app_bundle_path, RecommendedAction};
    use std::path::Path;

    #[test]
    fn resolve_app_bundle_path_returns_bundle_root_for_packaged_executable() {
        let executable =
            Path::new("/Applications/Android Stream Desk.app/Contents/MacOS/android-stream-desk");

        let bundle_path = resolve_app_bundle_path(executable);

        assert_eq!(
            bundle_path.as_deref(),
            Some(Path::new("/Applications/Android Stream Desk.app"))
        );
    }

    #[test]
    fn resolve_app_bundle_path_returns_none_for_dev_binary() {
        let executable = Path::new("/repo/src-tauri/target/debug/android-stream-desk");

        let bundle_path = resolve_app_bundle_path(executable);

        assert!(bundle_path.is_none());
    }

    #[test]
    fn resolve_app_bundle_path_ignores_app_named_ancestor_dir() {
        // Thư mục cha tình cờ tên `*.app` nhưng không phải bundle layout.
        let executable = Path::new("/Users/foo.app/dev/target/debug/android-stream-desk");

        let bundle_path = resolve_app_bundle_path(executable);

        assert!(bundle_path.is_none());
    }

    #[test]
    fn recommend_action_returns_restart_when_native_trusted_but_enigo_probe_fails() {
        let action = recommend_action(true, false, true);

        assert_eq!(action, RecommendedAction::RestartApp);
    }

    #[test]
    fn recommend_action_returns_remove_stale_entry_for_untrusted_packaged_app() {
        let action = recommend_action(false, false, true);

        assert_eq!(action, RecommendedAction::RemoveStaleEntry);
    }

    #[test]
    fn recommend_action_returns_open_settings_for_untrusted_dev_binary() {
        let action = recommend_action(false, false, false);

        assert_eq!(action, RecommendedAction::OpenSettings);
    }
}
