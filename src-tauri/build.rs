use std::path::PathBuf;

fn main() {
    preflight_dist_client();
    tauri_build::build();
}

/// S-RUST2: hard-fail the build if `dist-client/index.html` is missing.
///
/// `webserver.rs` includes the Vue client via `include_dir!("$CARGO_MANIFEST_DIR/../dist-client")`,
/// which the Rust compiler resolves at compile time. When the JS team forgets
/// to run `pnpm build:client` before `pnpm tauri build`, the macro silently
/// embeds an empty directory and the Companion ships without the Web Client.
/// This guard turns that silent regression into a loud, actionable error.
fn preflight_dist_client() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
        .expect("CARGO_MANIFEST_DIR must be set by cargo");
    let dist_dir = PathBuf::from(&manifest_dir).join("..").join("dist-client");
    let index_html = dist_dir.join("index.html");

    println!("cargo:rerun-if-changed={}", index_html.display());
    println!("cargo:rerun-if-changed={}", dist_dir.display());

    // A 0-byte index.html passes `.exists()` but still ships a broken Web
    // Client, so treat empty (or unreadable) as failure too.
    let index_empty = std::fs::metadata(&index_html)
        .map(|m| m.len() == 0)
        .unwrap_or(true);
    if !index_html.exists() || index_empty {
        panic!(
            "\n\n\
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\
            S-RUST2 preflight FAILED: dist-client/index.html missing or empty\n\
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n\
            Path checked: {}\n\n\
            The Companion HTTP web server embeds the Vue Web Client via\n\
            `include_dir!(\"$CARGO_MANIFEST_DIR/../dist-client\")`. Without\n\
            this directory the release ships without the Web Client and\n\
            mobile browsers will see 404 errors.\n\n\
            FIX: run the Vue client build before this Rust build:\n\n\
                pnpm install            # if you haven't already\n\
                pnpm build:client       # writes dist-client/\n\n\
            …then re-run `pnpm tauri build` (or `cargo build`).\n\n\
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
            index_html.display()
        );
    }
}
