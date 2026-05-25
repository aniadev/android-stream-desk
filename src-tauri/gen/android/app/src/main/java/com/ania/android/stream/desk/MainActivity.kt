package com.ania.android.stream.desk

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  private var wifiLock: WifiManager.WifiLock? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onResume() {
    super.onResume()
    acquireWifiLock()
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
      val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager ?: return
      val lockMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        WifiManager.WIFI_MODE_FULL_LOW_LATENCY
      } else {
        @Suppress("DEPRECATION")
        WifiManager.WIFI_MODE_FULL_HIGH_PERF
      }
      wifiLock = wifiManager.createWifiLock(lockMode, "android_stream_desk:wifi").also {
        it.acquire()
      }
    } catch (e: Exception) {
      wifiLock = null
    }
  }

  private fun releaseWifiLock() {
    try {
      wifiLock?.let { if (it.isHeld) it.release() }
    } catch (_: Exception) {}
    wifiLock = null
  }
}
