import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ConnectionState, WSMessage } from '../types';

export const useConnectionStore = defineStore('connection', () => {
  const ipAddress = ref(localStorage.getItem('server_ip') || '');
  const port = ref(localStorage.getItem('server_port') || '8089');
  const status = ref<ConnectionState>('disconnected');
  const socket = ref<WebSocket | null>(null);
  const isReconnecting = ref(false);
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

  let heartbeatInterval: number | null = null;
  let reconnectInterval: number | null = null;
  let isAlive = false;
  let userDisconnected = false;

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

  const connect = () => {
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

      ws.onopen = () => {
        status.value = 'connected';
        isAlive = true;
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
        status.value = 'error';
      };

      ws.onclose = () => {
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
    isReconnecting.value = true;
    reconnectInterval = window.setInterval(() => {
      if (userDisconnected) {
        clearReconnect();
        return;
      }
      console.log('Attempting auto-reconnect...');
      connect();
    }, 3000);
  };

  return {
    ipAddress,
    port,
    status,
    isReconnecting,
    isOnline,
    connect,
    disconnect,
    send,
  };
});
