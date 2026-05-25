import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Layout, ButtonConfig } from '../types';
import { useConnectionStore } from './connection';
import { applyTheme, isValidTheme, type ThemeName } from '../lib/themes';

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
  const currentMetrics = ref<{ ram_percent: number; cpu_percent: number }>({
    ram_percent: 0,
    cpu_percent: 0,
  });

  const connectionStore = useConnectionStore();

  const localConfig = localStorage.getItem('local_layout');
  if (localConfig) {
    try {
      const parsed = JSON.parse(localConfig);
      if (parsed.buttons && parsed.buttons.length > 0) {
        parsed.buttons = parsed.buttons.map((b: any) => {
          if (b.emoji && !b.icon) b.icon = 'mdi:button';
          b.buttonKind = b.buttonKind ?? 'action';
          return b;
        });
      }
      if (!isValidTheme(parsed.theme)) parsed.theme = undefined;
      layout.value = parsed;
    } catch (_) {}
  }

  const updateLayout = (newLayout: Layout, skipBroadcast = false) => {
    layout.value = newLayout;
    localStorage.setItem('local_layout', JSON.stringify(newLayout));
    if (!skipBroadcast) {
      broadcastSync();
    }
  };

  // Mutate buttons array in-place via splice to preserve reference identity for
  // vue-draggable-plus Sortable instance bound at mount. Reassigning would
  // orphan Sortable's array pointer and cause drop snap-back after resize.
  const resizeGrid = (rows: number, cols: number, newButtons: ButtonConfig[]) => {
    layout.value.rows = rows;
    layout.value.cols = cols;
    layout.value.buttons.splice(0, layout.value.buttons.length, ...newButtons);
    broadcastSync();
  };

  const reorderButtons = (fromIndex: number, toIndex: number) => {
    const len = layout.value.buttons.length;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex > len) return;
    const buttons = [...layout.value.buttons];
    const [moved] = buttons.splice(fromIndex, 1);
    if (!moved) return;
    const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
    buttons.splice(insertAt, 0, moved);
    updateLayout({ ...layout.value, buttons });
  };

  const broadcastSync = () => {
    localStorage.setItem('local_layout', JSON.stringify(layout.value));

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
            b.buttonKind = b.buttonKind ?? 'action';
            return b;
          });
        }
        updateLayout(synced, true);
        applyTheme(isValidTheme(synced.theme) ? (synced.theme as ThemeName) : 'cyber');
      } else if (message.type === 'metric_update' && message.payload) {
        const p = message.payload;
        if (typeof p.cpu_percent === 'number') currentMetrics.value.cpu_percent = p.cpu_percent;
        if (typeof p.ram_percent === 'number') currentMetrics.value.ram_percent = p.ram_percent;
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
            invoke('execute_button_action', { button }).catch((err: unknown) => {
              const message = typeof err === 'string' ? err : String(err);
              lastToast.value = { kind: 'error', message, at: Date.now() };
              console.error(err);
            });
          });
        }
      } catch (_) {}
    }
  };

  const exportLayout = (): void => {
    const json = JSON.stringify(layout.value, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `stream-desk-layout-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importLayout = async (file: File): Promise<void> => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON không hợp lệ');
    if (typeof parsed.rows !== 'number' || typeof parsed.cols !== 'number') {
      throw new Error('Thiếu trường rows/cols');
    }
    if (!Array.isArray(parsed.buttons)) throw new Error('Thiếu mảng buttons');

    const validActions = new Set<ButtonConfig['actionType']>(['shortcut', 'media', 'app', 'command']);
    const sanitized: ButtonConfig[] = parsed.buttons.map((b: any, i: number) => ({
      id: typeof b?.id === 'string' && b.id ? b.id : `btn_${Date.now()}_${i}`,
      label: typeof b?.label === 'string' ? b.label : `Button ${i + 1}`,
      icon: typeof b?.icon === 'string' ? b.icon : 'mdi:button',
      backgroundColor: typeof b?.backgroundColor === 'string' ? b.backgroundColor : '#1e293b',
      actionType: validActions.has(b?.actionType) ? b.actionType : 'shortcut',
      buttonKind: b?.buttonKind === 'monitor' ? 'monitor' : 'action',
      monitorConfig: b?.buttonKind === 'monitor' && b?.monitorConfig
        ? {
            metricType: ['ram_percent', 'cpu_percent'].includes(b.monitorConfig.metricType)
              ? b.monitorConfig.metricType
              : 'cpu_percent',
            intervalMs: Math.max(1000, Number(b.monitorConfig?.intervalMs) || 5000),
          }
        : undefined,
      shortcutValue: typeof b?.shortcutValue === 'string' ? b.shortcutValue : undefined,
      mediaAction: typeof b?.mediaAction === 'string' ? b.mediaAction : undefined,
      appPath: typeof b?.appPath === 'string' ? b.appPath : undefined,
      commandValue: typeof b?.commandValue === 'string' ? b.commandValue : undefined,
    }));

    updateLayout({
      rows: Math.max(2, Math.min(6, parsed.rows | 0)),
      cols: Math.max(2, Math.min(8, parsed.cols | 0)),
      buttons: sanitized,
      theme: isValidTheme(parsed.theme) ? parsed.theme : undefined,
    });
  };

  return {
    layout,
    lastToast,
    currentMetrics,
    updateLayout,
    resizeGrid,
    broadcastSync,
    reorderButtons,
    pressButton,
    exportLayout,
    importLayout,
  };
});
