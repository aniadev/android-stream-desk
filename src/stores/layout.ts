import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Layout, ButtonConfig } from '../types';
import { useConnectionStore } from './connection';

const DEFAULT_SHORTCUT = 'Ctrl+Tab';

const defaultLayout = (): Layout => ({
  rows: 3,
  cols: 3,
  buttons: Array.from({ length: 9 }, (_, index) => ({
    id: `btn_${index}`,
    label: `Button ${index + 1}`,
    emoji: '🎮',
    backgroundColor: '#1e293b',
    actionType: 'shortcut',
    shortcutValue: DEFAULT_SHORTCUT,
  })),
});

// Module-level guard so the global ws-message listener is attached at most
// once even across HMR / test reloads of the store factory.
let wsListenerAttached = false;

export const useLayoutStore = defineStore('layout', () => {
  const layout = ref<Layout>(defaultLayout());
  const lastToast = ref<{ kind: 'error' | 'info'; message: string; at: number } | null>(null);

  const connectionStore = useConnectionStore();

  // Load local layout store if running on Android Client in standalone mode
  const localConfig = localStorage.getItem('local_layout');
  if (localConfig) {
    try {
      layout.value = JSON.parse(localConfig);
    } catch (_) {}
  }

  const updateLayout = (newLayout: Layout) => {
    layout.value = newLayout;
    localStorage.setItem('local_layout', JSON.stringify(newLayout));
  };

  const broadcastSync = () => {
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

    connectionStore.send({
      type: 'sync_layout',
      payload: layout.value,
    });
  };

  if (!wsListenerAttached) {
    wsListenerAttached = true;
    window.addEventListener('ws-message', (event: any) => {
      const message = event.detail;
      if (message.type === 'sync_layout' && message.payload) {
        updateLayout(message.payload);
      } else if (message.type === 'toast' && message.payload) {
        lastToast.value = {
          kind: message.payload.kind === 'info' ? 'info' : 'error',
          message: message.payload.error || message.payload.message || 'Lỗi không xác định',
          at: Date.now(),
        };
      }
    });
  }

  const pressButton = (button: ButtonConfig) => {
    if (connectionStore.status === 'connected') {
      connectionStore.send({
        type: 'press',
        payload: button,
      });
    } else {
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
    lastToast,
    updateLayout,
    broadcastSync,
    pressButton,
  };
});
