# Companion configuration (`server.json`)

The Companion keeps its listener settings in one small JSON file, `server.json`, in the per-user Tauri app-config directory. The Dashboard's **Settings → Network** panel reads and writes this same file, so there is no separate "UI config" versus "file config" — editing the file by hand and toggling the UI are two views of the same thing.

There is no config file inside the repository that the app reads. `docs/server.example.json` is a documented copy of the defaults you can paste from; the app never loads it.

## Location

The identifier in `src-tauri/tauri.conf.json` is `com.ania.android.stream.desk`, so Tauri's `app_config_dir()` resolves to:

| OS | Path |
|---|---|
| Linux | `~/.config/com.ania.android.stream.desk/server.json` |
| macOS | `~/Library/Application Support/com.ania.android.stream.desk/server.json` |
| Windows | `%APPDATA%\com.ania.android.stream.desk\server.json` |

The file is created with defaults on first launch if it does not exist.

## Keys

| Key | Type | Default | Meaning |
|---|---|---|---|
| `wsPort` | number | `8089` | TCP port of the WebSocket server the Android app connects to. |
| `webEnabled` | boolean | `false` | Also serve the browser-based client over HTTP. |
| `webPort` | number | `8090` | TCP port of that HTTP server. Ignored when `webEnabled` is `false`. |
| `loopbackOnly` | boolean | `false` | USB mode: bind both listeners to `127.0.0.1` and manage `adb reverse` automatically. See below. |
| `adbPath` | string | absent | Full path to the `adb` executable for USB mode. Absent = search `PATH` and known Android SDK folders. |
| `apkPath` | string | absent | Android client APK the USB bridge installs on phones that lack the app. Absent = use `android-stream-desk.apk` next to the Companion executable or in this config dir, if present. |

Keys are camelCase on disk (serde `rename_all = "camelCase"`). Unknown keys are ignored. A missing `loopbackOnly` is treated as `false`, so files written by older builds keep working unchanged.

### `loopbackOnly`

Default `false`: the Companion listens on all interfaces, which is what Wi-Fi / LAN use needs.

Set to `true` for **USB mode** (see [USB_MODE.md](USB_MODE.md)). Two things happen:

- Both listeners bind `127.0.0.1`, so no other machine on the network can open the WebSocket or HTTP port at all. The Dashboard shows `127.0.0.1` as the server address and the connect QR code encodes that address, which is what the phone must dial in USB mode.
- The Companion starts its USB bridge: it locates `adb`, watches `adb track-devices`, and runs `adb reverse tcp:<wsPort> tcp:<wsPort>` for every USB-attached phone as it appears. Replugging re-establishes the forward automatically.

The toggle for this is **Settings → Network → Listen Scope** (`LAN` / `USB Only`).

### `apkPath`

Only read when `loopbackOnly` is `true`. When a USB phone shows up without the client app, the bridge runs `adb install -r` with this APK, then launches the app. Without `apkPath`, the Companion looks for `android-stream-desk.apk` beside its own executable and then in this config directory. If none exists, auto-install is off and the status line says so. Phones that already have the app are only launched, never reinstalled.

### `adbPath`

Only read when `loopbackOnly` is `true`. Set it when `adb` is not on the Companion's `PATH` (common on Windows, or for a GUI-launched app on macOS whose `PATH` differs from your shell). Not exposed in the UI; edit the file and restart. Example: `"adbPath": "C:\\Android\\platform-tools\\adb.exe"`.

## Validation

Saving (via UI or on load from disk) enforces:

- `wsPort` and `webPort` must be in `1024..=65535`.
- `wsPort` and `webPort` must differ when `webEnabled` is `true`.

If the file is unreadable, not valid JSON, or fails validation, the Companion starts with all defaults (and does **not** overwrite your file). Fix the file and relaunch.

## Applying changes

Listeners bind once at startup. After editing `server.json` by hand, restart the Companion. Saving from the Dashboard writes the file atomically (`server.json.tmp` then rename) and relaunches the app for you.

## Example: USB-only Companion

```json
{
  "wsPort": 8089,
  "webEnabled": false,
  "webPort": 8090,
  "loopbackOnly": true,
  "adbPath": "/usr/bin/adb"
}
```

`adbPath` is optional; drop the line if `adb` is on `PATH`.
