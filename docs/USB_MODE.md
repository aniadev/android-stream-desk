# USB mode (no Wi-Fi, no open network port)

By default the Companion listens on the LAN and the phone finds it over Wi-Fi. USB mode replaces that with a cable: the phone talks to the Companion through `adb reverse`, and the Companion listens on `127.0.0.1` only, so nothing on your network can reach it. Once set up it is plug-and-play: unplug, replug, swap USB ports, reboot — the link comes back on its own.

## How it works

`adb reverse tcp:8089 tcp:8089` tells the phone's adb daemon to forward the phone's own `localhost:8089` over the USB cable to the PC's `localhost:8089`. The Android app therefore dials `127.0.0.1:8089` — its own loopback — and lands on the Companion. Neither app needed protocol changes for this.

What makes it seamless is that the Companion manages that forward itself when it runs in **USB Only** mode:

1. Finds `adb` (your `server.json` `adbPath`, then `PATH`, then the usual Android SDK `platform-tools` folders).
2. Runs `adb start-server`.
3. Streams `adb track-devices`. The adb server pushes a new device list on every attach, detach and authorise event, so no polling and no OS hooks.
4. The moment a USB device reaches state `device`, runs `adb reverse` for it. When the device disappears and comes back, it does it again.
5. Checks the phone for the client app. If it is missing and an APK is available (`apkPath`, or `android-stream-desk.apk` next to the Companion, see [CONFIGURATION.md](CONFIGURATION.md)), installs it. Then wakes the screen and launches the app.

On the phone, the app turns the screen on and shows over the lock screen when launched, keeps the screen on while in the foreground, and on first run with no saved address probes `127.0.0.1` and adopts it if a Companion answers. So a phone with USB debugging authorised for this PC needs no typing at all: plug it in and the grid appears. Be aware the grid is then usable without unlocking the phone.

When the app's target is a loopback address it retries every 2 seconds without giving up (Wi-Fi targets keep the slower, capped retry policy), so after a replug the grid returns within a few seconds. The app also ignores the WebView's "offline" signal for loopback targets, so USB mode works with Wi-Fi and mobile data switched off, and it drops its Wi-Fi performance lock since the radio is not in use. The Companion's **Settings → Network** panel shows the live state (`Waiting for a phone on USB`, `USB linked: <serial>`, `Phone waiting for USB debugging approval`, `adb not found`).

Only cable transports are bridged. Devices attached via Wi-Fi debugging (`adb connect`, serials like `192.168.1.5:5555`) and emulators are ignored, so "USB Only" means exactly that.

## Setup, once

**PC**

1. Install Android platform-tools so `adb` exists. Linux: `sudo apt install adb` (Debian/Ubuntu) or your distro's `android-tools` package. macOS: `brew install android-platform-tools`. Windows: download platform-tools from developer.android.com and either put it on `PATH` or point `adbPath` at `adb.exe` (see [CONFIGURATION.md](CONFIGURATION.md)).
2. Start the Companion, open **Settings → Network**, switch **Listen Scope** to **USB Only**, click **Save and Restart**.
3. Optionally turn on **Autostart** in **Settings → General** so the Companion is already running in the tray when you plug in.

**Phone**

1. Settings → About phone → tap "Build number" seven times to unlock Developer options.
2. Developer options → enable **USB debugging**.
3. Plug the phone in. Accept the **"Allow USB debugging?"** prompt and tick **"Always allow from this computer"**. This is a one-time trust of this PC's adb key; it survives reboots and port changes.
4. Nothing else, if the Companion has an APK to install (above). Otherwise install the app yourself; on first launch it finds the Companion on `127.0.0.1` by itself. Only if the app already has a Wi-Fi address saved do you need to change it to `127.0.0.1` (or scan the connect QR, which encodes `127.0.0.1` in USB Only mode).

## Every time after that

Plug the phone in. Nothing else. The app keeps the screen on while it is in the foreground, so the phone will not lock or blank on the desk.

## Troubleshooting

**Status says `adb not found`.** Install platform-tools (above), or set `adbPath` in `server.json` to the full path of the binary and restart the Companion.

**Status says `Phone waiting for USB debugging approval`.** The RSA prompt is on the phone screen and has not been accepted, or the adb server was restarted after the phone was connected. Unplug/replug, or run `adb kill-server` and replug, then look at the phone.

**`adb devices` shows `no permissions` (Linux).** Your user cannot open the USB device. Install your distro's Android udev rules (`android-sdk-platform-tools-common` on Debian/Ubuntu, or [android-udev-rules](https://github.com/M0Rf30/android-udev-rules)) and replug.

**Phone connected but the app cannot connect.** Check the app's address really is `127.0.0.1` and the port matches `wsPort`. Then on the PC: `adb reverse --list` should show `tcp:8089 tcp:8089`.

**Wayland: shortcuts/media keys not simulating correctly.** An `enigo` limitation unrelated to USB mode; see the main README's Linux notes.

## Turning it off

Switch **Listen Scope** back to **LAN** and save. The Companion stops managing `adb reverse` and listens on all interfaces again. Existing reverse forwards on the phone are dropped the next time the cable is unplugged.
