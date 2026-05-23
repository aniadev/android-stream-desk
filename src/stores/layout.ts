import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Layout, ButtonConfig } from '../types';
import { useConnectionStore } from './connection';

// Detect platform dynamically at runtime
const detectOs = (): 'macos' | 'windows' => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac') || navigator.platform.toLowerCase().includes('mac')) {
    return 'macos';
  }
  return 'windows';
};

const defaultLayout = (): Layout => {
  const os = detectOs();
  const isMac = os === 'macos';

  const buttons: ButtonConfig[] = [
    {
      id: 'btn_1',
      label: 'Copy',
      icon: 'lucide:copy',
      backgroundColor: '#334155',
      actionType: 'shortcut',
      shortcutValue: isMac ? 'Meta+C' : 'Ctrl+C',
    },
    {
      id: 'btn_2',
      label: 'Paste',
      icon: 'lucide:clipboard',
      backgroundColor: '#334155',
      actionType: 'shortcut',
      shortcutValue: isMac ? 'Meta+V' : 'Ctrl+V',
    },
    {
      id: 'btn_3',
      label: 'Chụp hình',
      icon: 'lucide:camera',
      backgroundColor: '#2563eb',
      actionType: 'shortcut',
      shortcutValue: isMac ? 'Meta+Shift+4' : 'Win+Shift+S',
    },
    {
      id: 'btn_4',
      label: 'Tìm kiếm',
      icon: 'lucide:search',
      backgroundColor: '#4f46e5',
      actionType: 'shortcut',
      shortcutValue: isMac ? 'Meta+Space' : 'Win+S',
    },
    {
      id: 'btn_5',
      label: 'Play/Pause',
      icon: 'lucide:play',
      backgroundColor: '#059669',
      actionType: 'media',
      mediaAction: 'play_pause',
    },
    {
      id: 'btn_6',
      label: 'Âm lượng (+)',
      icon: 'lucide:volume-2',
      backgroundColor: '#059669',
      actionType: 'media',
      mediaAction: 'volume_up',
    },
    {
      id: 'btn_7',
      label: 'Âm lượng (-)',
      icon: 'lucide:volume-1',
      backgroundColor: '#059669',
      actionType: 'media',
      mediaAction: 'volume_down',
    },
    {
      id: 'btn_8',
      label: 'Terminal',
      icon: 'lucide:terminal',
      backgroundColor: '#7c3aed',
      actionType: 'app',
      appPath: isMac ? '/System/Applications/Utilities/Terminal.app' : 'cmd.exe',
    },
    {
      id: 'btn_9',
      label: 'Khóa máy',
      icon: 'lucide:lock',
      backgroundColor: '#e11d48',
      actionType: 'shortcut',
      shortcutValue: isMac ? 'Ctrl+Meta+Q' : 'Win+L',
    }
  ];

  return {
    rows: 3,
    cols: 3,
    buttons,
  };
};

let wsListenerAttached = false;

export const useLayoutStore = defineStore('layout', () => {
  const layout = ref<Layout>(defaultLayout());
  const lastToast = ref<{ kind: 'error' | 'info'; message: string; at: number } | null>(null);

  const connectionStore = useConnectionStore();

  const localConfig = localStorage.getItem('local_layout');
  if (localConfig) {
    try {
      const parsed = JSON.parse(localConfig);
      if (parsed.buttons && parsed.buttons.length > 0) {
        parsed.buttons = parsed.buttons.map((b: any) => {
          if (b.emoji && !b.icon) {
            b.icon = 'mdi:button';
          }
          return b;
        });
      }
      layout.value = parsed;
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
        const synced = message.payload;
        if (synced.buttons) {
          synced.buttons = synced.buttons.map((b: any) => {
            if (b.emoji && !b.icon) b.icon = 'mdi:button';
            return b;
          });
        }
        updateLayout(synced);
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
