# Release Process

This document outlines the release process for **Android Stream Desk**.

## Step-by-Step Release Guide

### 1. Preparation & Local Setup

1. Check current build, lint, and typechecks before releasing to ensure stability:
   ```bash
   pnpm vue-tsc --noEmit
   cargo check --manifest-path src-tauri/Cargo.toml
   cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
   ```

2. Update the version number in the following configuration files:
   - `package.json`: `"version": "x.y.z"`
   - `src-tauri/Cargo.toml`: `version = "x.y.z"`
   - `src-tauri/tauri.conf.json`: `"version": "x.y.z"`
   - `src/views/DashboardView.vue`: `const appVersion = ref<string>('x.y.z');`

3. Document the new version's additions, changes, and fixes in `CHANGELOG.md` under a new section matching the standard style:
   ```markdown
   ## [x.y.z] - YYYY-MM-DD

   ### Added
   - Feature details...

   ### Fixed
   - Bug fix details...
   ```

### 2. Commit and Tag

Once version configuration and the changelog have been updated, commit the changes:
```bash
git add .
git commit -m "chore: release vx.y.z"
```

Then tag with the appropriate suffix depending on what needs to be built (see [Tag Conventions](#tag-conventions)):
```bash
git tag vx.y.z          # full release — Windows + Android
git tag vx.y.z-win      # Windows only
git tag vx.y.z-apk      # Android only
```

### 3. Push and Trigger CI/CD Pipeline

Push the code and tag to GitHub to trigger the release pipeline (`.github/workflows/release.yml`):
```bash
git push origin main
git push origin <tag>
```

---

## Tag Conventions

The CI pipeline reads the tag suffix to decide which jobs to run:

| Tag | Windows (.msi/.exe) | Android (.apk) | updater manifest |
|-----|:-------------------:|:--------------:|:----------------:|
| `vx.y.z` | ✓ | ✓ | ✓ |
| `vx.y.z-win` | ✓ | — | ✓ |
| `vx.y.z-apk` | — | ✓ | — |

Use `-win` when only the Companion (desktop) changed.
Use `-apk` when only the Client (Android) changed.
Use bare `vx.y.z` for full releases that touch both sides.

---

## CI/CD Release Pipeline Details

The GitHub Actions workflow manages the builder pipeline automatically upon detecting a tag matching `v*`:

1. **`create-release`**:
   - Detects tag suffix and sets `build_windows` / `build_android` flags.
   - Generates a new GitHub Release draft/publication.

2. **`build-windows`** (skipped for `-apk` tags):
   - **Windows (windows-latest)**: Utilizing MSVC linker to generate `.exe`/`.msi` desktop installer companions.
   - Outputs the generated bundles and uploads them as release assets.

3. **`build-android`** (skipped for `-win` tags):
   - Compiles and generates Android APK for the frontend client.
   - If keystore secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, etc.) are provided, outputs a signed `android-stream-desk-v*.apk`.
   - If secrets are absent, falls back to building an unsigned APK (`app-universal-release-unsigned.apk`).
   - Uploads APK to the same GitHub Release.

4. **`update-manifest`** (only when Windows was built):
   - Downloads the `.msi.sig` from the release assets and writes `download/latest.json`.
   - Commits the manifest back to `main` for the auto-updater endpoint.
