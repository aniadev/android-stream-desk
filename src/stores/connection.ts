import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ConnectionState, WSMessage } from '../types';
import { formatReconnectEndpoint } from '../lib/mobileReconnectState.ts';

/** USB mode: the phone dials its own loopback and `adb reverse` carries it
 *  over the cable. Such a target needs no network at all. */
export const isLoopbackHost = (host: string): boolean => {
  const h = host.trim().toLowerCase();
  return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]';
};

/** Tell the Android activity whether to hold a Wi-Fi performance lock. Only
 *  worth it when the Companion is reached over Wi-Fi; on USB it just burns
 *  battery. No-op outside the Android WebView. */
const setAndroidWifiLock = (enabled: boolean) => {
  try {
    (window as any).AndroidWifiLock?.setEnabled(enabled);
  } catch (_) {
    /* bridge absent (desktop / browser) */
  }
};

/** Open a throwaway WebSocket to see whether a Companion answers at `url`.
 *  Resolves true on a completed handshake, false on error/close/timeout. */
export const probeWebSocket = (url: string, timeoutMs = 2000): Promise<boolean> =>
  new Promise(resolve => {
    let done = false;
    let ws: WebSocket | null = null;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch (_) {
        /* ignore */
      }
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    try {
      ws = new WebSocket(url);
      ws.onopen = () => finish(true);
      ws.onerror = () => finish(false);
      ws.onclose = () => finish(false);
    } catch (_) {
      finish(false);
    }
  });

export const useConnectionStore = defineStore('connection', () => {
  const MAX_RECONNECT_ATTEMPTS = 3;

  const ipAddress = ref(localStorage.getItem('server_ip') || '');
  const port = ref(localStorage.getItem('server_port') || '8089');
  const status = ref<ConnectionState>('disconnected');
  const socket = ref<WebSocket | null>(null);
  const isReconnecting = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = ref(MAX_RECONNECT_ATTEMPTS);
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const hasConnectedOnce = ref(false);
  const attemptingEndpoint = ref('');

  let heartbeatInterval: number | null = null;
  let reconnectInterval: number | null = null;
  let connectTimeout: number | null = null;
  let isAlive = false;
  let userDisconnected = false;

  const clearConnectTimeout = () => {
    if (connectTimeout !== null) {
      clearTimeout(connectTimeout);
      connectTimeout = null;
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true;
      // Kick a reconnect attempt immediately once link returns.
      if (!userDisconnected && status.value !== 'connected' && ipAddress.value) {
        connect();
      }
    });
    window.addEventListener('offline', () => {
      isOnline.value = false;
    });
  }

  const detachSocket = (target: WebSocket | null) => {
    if (!target) return;
    target.onopen = null;
    target.onmessage = null;
    target.onerror = null;
    target.onclose = null;
  };

  const clearReconnect = () => {
    if (reconnectInterval !== null) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    isReconnecting.value = false;
  };

  const connect = (fromTicker = false) => {
    if (!fromTicker) {
      // Manual connect attempt — reset attempt counter so user gets a fresh budget.
      reconnectAttempts.value = 0;
    }
    if (!ipAddress.value) {
      status.value = 'error';
      return;
    }

    const loopback = isLoopbackHost(ipAddress.value);
    setAndroidWifiLock(!loopback);

    if (!isOnline.value && !loopback) {
      // No network — skip the WS attempt entirely. `online` listener will
      // re-trigger connect() once the link returns. Loopback targets (USB
      // mode) are exempt: with Wi-Fi off the WebView reports offline, yet
      // 127.0.0.1 still works over `adb reverse`.
      status.value = 'disconnected';
      clearReconnect();
      return;
    }

    userDisconnected = false;

    localStorage.setItem('server_ip', ipAddress.value);
    localStorage.setItem('server_port', port.value);
    attemptingEndpoint.value = formatReconnectEndpoint(ipAddress.value, port.value);

    // Tear down any previous socket so its async close handler cannot
    // overwrite the new socket's status mid-handshake.
    if (socket.value) {
      detachSocket(socket.value);
      socket.value.close();
      socket.value = null;
    }

    clearReconnect();
    status.value = 'connecting';

    try {
      const url = `ws://${ipAddress.value}:${port.value}`;
      console.log(`Trying WebSocket endpoint ${attemptingEndpoint.value}`);
      const ws = new WebSocket(url);
      socket.value = ws;

      connectTimeout = window.setTimeout(() => {
        connectTimeout = null;
        if (status.value === 'connecting' && socket.value === ws) {
          detachSocket(ws);
          ws.close();
          socket.value = null;
          status.value = 'disconnected';
          if (!userDisconnected) triggerAutoReconnect();
        }
      }, 8000);

      ws.onopen = () => {
        clearConnectTimeout();
        status.value = 'connected';
        isAlive = true;
        reconnectAttempts.value = 0;
        hasConnectedOnce.value = true;
        clearReconnect();
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        isAlive = true;
        try {
          const data: WSMessage = JSON.parse(event.data);
          if (data.type === 'ping') {
            send({ type: 'pong' });
          } else if (data.type === 'pong') {
            // Heartbeat ack — already marked alive.
          } else {
            window.dispatchEvent(new CustomEvent('ws-message', { detail: data }));
          }
        } catch (e) {
          console.error('Failed parsing WS message:', e);
        }
      };

      ws.onerror = () => {
        clearConnectTimeout();
        status.value = 'error';
      };

      ws.onclose = () => {
        clearConnectTimeout();
        if (socket.value !== ws) {
          // Stale close from a superseded socket — ignore.
          return;
        }
        socket.value = null;
        stopHeartbeat();
        if (userDisconnected) {
          status.value = 'disconnected';
          return;
        }
        status.value = 'disconnected';
        triggerAutoReconnect();
      };
    } catch (_) {
      status.value = 'error';
      if (!userDisconnected) {
        triggerAutoReconnect();
      }
    }
  };

  const disconnect = () => {
    userDisconnected = true;
    hasConnectedOnce.value = false;
    clearConnectTimeout();
    clearReconnect();
    stopHeartbeat();
    if (socket.value) {
      detachSocket(socket.value);
      socket.value.close();
      socket.value = null;
    }
    status.value = 'disconnected';
  };

  const send = (message: WSMessage) => {
    if (socket.value && socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(message));
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatInterval = window.setInterval(() => {
      if (!isAlive) {
        console.warn('Heartbeat dead. Reconnecting...');
        // Drop the current socket and let auto-reconnect handle the next attempt
        // so we don't recurse into connect() from the heartbeat tick.
        if (socket.value) {
          detachSocket(socket.value);
          socket.value.close();
          socket.value = null;
        }
        stopHeartbeat();
        status.value = 'disconnected';
        if (!userDisconnected) {
          triggerAutoReconnect();
        }
        return;
      }
      isAlive = false;
      send({ type: 'ping' });
    }, 5000);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval !== null) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const triggerAutoReconnect = () => {
    if (reconnectInterval !== null || userDisconnected) return;

    // USB mode (loopback via `adb reverse`): the forward drops on every
    // unplug and comes back a few seconds after replug, so retry fast and
    // never give up — a loopback attempt costs nothing. Wi-Fi keeps the
    // original budget: 3 quick tries before the first connection, then
    // 3 silent 30 s tries once we have connected before.
    const loopback = isLoopbackHost(ipAddress.value);
    const unlimited = loopback;
    const intervalMs = loopback ? 2000 : hasConnectedOnce.value ? 30000 : 3000;
    const silent = hasConnectedOnce.value;

    if (!unlimited && !silent && reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
      status.value = 'error';
      isReconnecting.value = false;
      return;
    }

    isReconnecting.value = true;
    reconnectInterval = window.setInterval(() => {
      if (userDisconnected) {
        clearReconnect();
        return;
      }
      if (!unlimited && reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
        clearReconnect();
        status.value = 'error';
        return;
      }
      reconnectAttempts.value += 1;
      console.log(
        `${silent ? 'Silent auto-reconnect' : 'Auto-reconnect'} attempt ${reconnectAttempts.value}${unlimited ? '' : `/${MAX_RECONNECT_ATTEMPTS}`} to ${formatReconnectEndpoint(ipAddress.value, port.value)} (${intervalMs / 1000}s interval)`,
      );
      connect(true);
    }, intervalMs);
  };

  /** First run on a phone plugged in by USB: with no saved address, see if a
   *  Companion answers on the phone's own loopback (bridged by `adb reverse`)
   *  and adopt it silently, so a fresh phone needs no typing at all. */
  const tryLoopbackAutoConnect = async (): Promise<boolean> => {
    if (ipAddress.value) return false;
    const ok = await probeWebSocket(`ws://127.0.0.1:${port.value}`);
    if (!ok) return false;
    console.log('Companion found on loopback (USB mode) — auto-connecting');
    ipAddress.value = '127.0.0.1';
    connect();
    return true;
  };

  const applyScannedEndpoint = (host: string, wsPort: string) => {
    clearConnectTimeout();
    clearReconnect();
    reconnectAttempts.value = 0;
    ipAddress.value = host;
    port.value = wsPort;
    attemptingEndpoint.value = formatReconnectEndpoint(host, wsPort);
    localStorage.setItem('server_ip', host);
    localStorage.setItem('server_port', wsPort);
    userDisconnected = false;
  };

  const cancelReconnect = () => {
    clearReconnect();
    reconnectAttempts.value = 0;
    status.value = 'disconnected';
  };

  return {
    ipAddress,
    port,
    status,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    isOnline,
    hasConnectedOnce,
    tryLoopbackAutoConnect,
    attemptingEndpoint,
    connect,
    disconnect,
    applyScannedEndpoint,
    cancelReconnect,
    send,
  };
});
