import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ConnectionState, WSMessage } from '../types';

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

    if (!isOnline.value) {
      // No network — skip the WS attempt entirely. `online` listener will
      // re-trigger connect() once the link returns.
      status.value = 'disconnected';
      clearReconnect();
      return;
    }

    userDisconnected = false;

    localStorage.setItem('server_ip', ipAddress.value);
    localStorage.setItem('server_port', port.value);

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

    if (hasConnectedOnce.value) {
      isReconnecting.value = true;
      reconnectInterval = window.setInterval(() => {
        if (userDisconnected) {
          clearReconnect();
          return;
        }
        reconnectAttempts.value += 1;
        console.log(`Silent auto-reconnect attempt ${reconnectAttempts.value} (30s interval)`);
        connect(true);
      }, 30000);
      return;
    }

    if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
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
      if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
        clearReconnect();
        status.value = 'error';
        return;
      }
      reconnectAttempts.value += 1;
      console.log(`Auto-reconnect attempt ${reconnectAttempts.value}/${MAX_RECONNECT_ATTEMPTS}`);
      connect(true);
    }, 3000);
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
    connect,
    disconnect,
    cancelReconnect,
    send,
  };
});
