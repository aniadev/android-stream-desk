import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Layout, ButtonConfig } from '../types';
import { useConnectionStore } from './connection';

export const useLayoutStore = defineStore('layout', () => {
  const layout = ref<Layout>({
    rows: 3,
    cols: 3,
    buttons: Array.from({ length: 9 }, (_, index) => ({
      id: `btn_${index}`,
      label: `Button ${index + 1}`,
      emoji: '🎮',
      backgroundColor: '#1e293b',
      actionType: 'shortcut',
      shortcutValue: 'Ctrl+PgUp',
    })),
  });

  const connectionStore = useConnectionStore();

  // Load local layout store if running on Android Client in standalone mode
  const localConfig = localStorage.getItem('local_layout');
  if (localConfig) {
    try {
      layout.value = JSON.parse(localConfig);
    } catch (_) {}
  }

  // Update layout and sync to local storage/or websocket
  const updateLayout = (newLayout: Layout) => {
    layout.value = newLayout;
    localStorage.setItem('local_layout', JSON.stringify(newLayout));
  };

  // Broadcast layout change to Android client (invoked by Windows Dashboard)
  const broadcastSync = () => {
    // 1. Save Locally on Windows using Tauri app save config API
    try {
      // @ts-ignore
      if (window.__TAURI_INTERNALS__) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('save_layout_config', { layout: layout.value })
            .then(() => console.log('Saved config to AppData'))
            .catch(console.error);
        });
      }
    } catch (_) {}

    // 2. Broadcast via WS server to active clients
    connectionStore.send({
      type: 'sync_layout',
      payload: layout.value,
    });
  };

  // Setup Listener for synchronous updates from server (on Android client)
  window.addEventListener('ws-message', (event: any) => {
    const message = event.detail;
    if (message.type === 'sync_layout' && message.payload) {
      updateLayout(message.payload);
    }
  });

  // Action execution: triggers event to Tauri invoke or WebSocket send
  const pressButton = (button: ButtonConfig) => {
    // Front UI triggering actual click event
    if (connectionStore.status === 'connected') {
      // Send directly over WebSockets to trigger Enigo execution on Windows Companions
      connectionStore.send({
        type: 'press',
        payload: button,
      });
    } else {
      // Offline fallback: try executing locally if this client screen runs on tauri windows dashboard
      try {
        // @ts-ignore
        if (window.__TAURI_INTERNALS__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('execute_button_action', { button })
              .catch(console.error);
          });
        }
      } catch (_) {}
    }
  };

  return {
    layout,
    updateLayout,
    broadcastSync,
    pressButton,
  };
});
