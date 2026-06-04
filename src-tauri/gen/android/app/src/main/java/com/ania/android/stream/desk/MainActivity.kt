package com.ania.android.stream.desk

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  private var wifiLock: WifiManager.WifiLock? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // Expose a native orientation toggle to the WebView. Runtime orientation can't
  // go through Rust JNI (it panicked on the tao event-loop thread and, with
  // panic=abort, crashed the process), so the frontend calls
  // window.AndroidOrientation.setOrientation(mode). `mode` is an
  // ActivityInfo.SCREEN_ORIENTATION_* constant matching ANDROID_ORIENTATION in
  // ClientView.vue (-1 unspecified, 0 landscape, 1 portrait, 8 reverse-landscape).
  override fun onWebViewCreate(webView: WebView) {
    webView.addJavascriptInterface(OrientationBridge(), "AndroidOrientation")
  }

  inner class OrientationBridge {
    @JavascriptInterface
    fun setOrientation(mode: Int) {
      // @JavascriptInterface runs on a binder thread; setRequestedOrientation
      // must touch the Activity on the UI thread.
      runOnUiThread { requestedOrientation = mode }
    }
  }

  override fun onResume() {
    super.onResume()
    acquireWifiLock()
    requestBatteryOptimizationExemptionOnce()
  }

  override fun onStop() {
    releaseWifiLock()
    super.onStop()
  }

  override fun onDestroy() {
    releaseWifiLock()
    super.onDestroy()
  }

  private fun acquireWifiLock() {
    if (wifiLock?.isHeld == true) return
    try {
      val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager ?: return
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        WifiManager.WIFI_MODE_FULL_LOW_LATENCY
      } else {
        @Suppress("DEPRECATION")
        WifiManager.WIFI_MODE_FULL_HIGH_PERF
      }
      wifiLock = wm.createWifiLock(mode, "android_stream_desk:wifi").also { it.acquire() }
    } catch (_: Exception) {
      wifiLock = null
    }
  }

  private fun releaseWifiLock() {
    try { wifiLock?.let { if (it.isHeld) it.release() } } catch (_: Exception) {}
    wifiLock = null
  }

  // Android/MIUI battery optimization kills WiFi on battery when screen wake lock is held.
  // Prompt once to exclude this app from battery optimization.
  private fun requestBatteryOptimizationExemptionOnce() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
    val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
    if (pm.isIgnoringBatteryOptimizations(packageName)) return
    val prefs = getPreferences(Context.MODE_PRIVATE)
    if (prefs.getBoolean("battery_opt_asked", false)) return
    prefs.edit().putBoolean("battery_opt_asked", true).apply()
    Toast.makeText(
      this,
      "Cho phép \"Không giới hạn pin\" để giữ kết nối WiFi khi dùng pin",
      Toast.LENGTH_LONG
    ).show()
    try {
      startActivity(
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:$packageName")
        }
      )
    } catch (_: Exception) {}
  }
}
