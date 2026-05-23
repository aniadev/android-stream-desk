import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ConnectionState, WSMessage } from '../types';

export const useConnectionStore = defineStore('connection', () => {
  const ipAddress = ref(localStorage.getItem('server_ip') || '');
  const port = ref(localStorage.getItem('server_port') || '8089');
  const status = ref<ConnectionState>('disconnected');
  const socket = ref<WebSocket | null>(null);
  
  let heartbeatInterval: number | null = null;
  let reconnectInterval: number | null = null;
  let isAlive = false;

  const connect = () => {
    if (!ipAddress.value) {
      status.value = 'error';
      return;
    }
    
    // Save to local storage
    localStorage.setItem('server_ip', ipAddress.value);
    localStorage.setItem('server_port', port.value);

    status.value = 'connecting';
    
    if (socket.value) {
      socket.value.close();
    }

    try {
      const url = `ws://${ipAddress.value}:${port.value}`;
      socket.value = new WebSocket(url);

      socket.value.onopen = () => {
        status.value = 'connected';
        isAlive = true;
        
        // Clear reconnect loop if in progress
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }

        // Start WebSocket Heartbeat
        startHeartbeat();
      };

      socket.value.onmessage = (event) => {
        isAlive = true;
        try {
          const data: WSMessage = JSON.parse(event.data);
          if (data.type === 'ping') {
            send({ type: 'pong' });
          } else if (data.type === 'pong') {
            // Heartbeat check acknowledged
          } else {
            // Pass message globally to custom hook or event dispatcher
            const eventObj = new CustomEvent('ws-message', { detail: data });
            window.dispatchEvent(eventObj);
          }
        } catch (e) {
          console.error('Failed parsing WS message:', e);
        }
      };

      socket.value.onerror = () => {
        status.value = 'error';
      };

      socket.value.onclose = () => {
        status.value = 'disconnected';
        stopHeartbeat();
        triggerAutoReconnect();
      };

    } catch (e) {
      status.value = 'error';
      triggerAutoReconnect();
    }
  };

  const disconnect = () => {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    stopHeartbeat();
    if (socket.value) {
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
        disconnect();
        connect();
        return;
      }
      isAlive = false;
      send({ type: 'ping' });
    }, 5000); // 5 seconds interval
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const triggerAutoReconnect = () => {
    if (!reconnectInterval) {
      reconnectInterval = window.setInterval(() => {
        console.log('Attempting auto-reconnect...');
        connect();
      }, 3000); // Reconnect every 3s
    }
  };

  return {
    ipAddress,
    port,
    status,
    connect,
    disconnect,
    send,
  };
});
