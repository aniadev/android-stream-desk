import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Layout, ButtonConfig, Page } from '../types';
import { useConnectionStore } from './connection';
import { applyTheme, isValidTheme, type ThemeName } from '../lib/themes';
import { sanitizeLinkUrl } from '../lib/linkUrl';

const backfillButton = (b: any): ButtonConfig => {
  if (b.emoji && !b.icon) b.icon = 'mdi:button';
  b.buttonKind = b.buttonKind ?? 'action';
  return b as ButtonConfig;
};

const VALID_ACTIONS = new Set<ButtonConfig['actionType']>(['shortcut', 'media', 'app', 'command', 'link']);

// Only accept image data URIs; reject foreign data:/javascript:/url schemes (XSS/SSRF guard).
const sanitizeIcon = (iconStr: any): string => {
  if (typeof iconStr !== 'string') return 'mdi:button';
  const trimmed = iconStr.trim();
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (match) return trimmed;
    return 'mdi:button';
  }
  if (trimmed.includes('://') || trimmed.toLowerCase().startsWith('javascript:')) {
    return 'mdi:button';
  }
  return trimmed;
};

const sanitizeButton = (b: any, i: number): ButtonConfig => ({
  id: typeof b?.id === 'string' && b.id ? b.id : `btn_${Date.now()}_${i}`,
  label: typeof b?.label === 'string' ? b.label : `Button ${i + 1}`,
  icon: sanitizeIcon(b?.icon),
  backgroundColor: typeof b?.backgroundColor === 'string' ? b.backgroundColor : '#1e293b',
  actionType: VALID_ACTIONS.has(b?.actionType) ? b.actionType : 'shortcut',
  buttonKind: b?.buttonKind === 'monitor' ? 'monitor' : 'action',
  monitorConfig:
    b?.buttonKind === 'monitor' && b?.monitorConfig
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
  linkUrl: sanitizeLinkUrl(b?.linkUrl),
  iconSizing: ['normal', 'cover', 'contain', 'fill'].includes(b?.iconSizing) ? b.iconSizing : undefined,
});

const migrateLayout = (raw: any): Layout => {
  let pages: Page[];
  if (Array.isArray(raw.pages) && raw.pages.length > 0) {
    pages = (raw.pages as any[]).map((p) => ({
      id: p.id ?? 'page_1',
      name: p.name,
      buttons: (Array.isArray(p.buttons) ? p.buttons : []).map(backfillButton),
    }));
  } else {
    const btns = (Array.isArray(raw.buttons) ? raw.buttons : []).map(backfillButton);
    pages = [{ id: 'page_1', buttons: btns }];
  }
  return {
    rows: raw.rows ?? 3,
    cols: raw.cols ?? 3,
    theme: isValidTheme(raw.theme) ? raw.theme : undefined,
    buttons: pages[0]?.buttons ?? [],
    pages,
  };
};

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
    pages: [{ id: 'page_1', buttons }],
  };
};

const createEmptyButton = (pageId: string, index: number): ButtonConfig => ({
  id: `btn_${Date.now()}_${pageId}_${index}`,
  label: `Button ${index + 1}`,
  icon: 'mdi:button',
  backgroundColor: '#1e293b',
  actionType: 'shortcut',
  shortcutValue: 'Ctrl+F1',
});

let wsListenerAttached = false;

export const useLayoutStore = defineStore('layout', () => {
  const layout = ref<Layout>(defaultLayout());
  const currentPageIndex = ref(0);
  const lastToast = ref<{ kind: 'error' | 'info'; message: string; at: number } | null>(null);
  const currentMetrics = ref<{ ram_percent: number; cpu_percent: number }>({
    ram_percent: 0,
    cpu_percent: 0,
  });

  const currentPage = computed(() => {
    const pages = layout.value.pages || [];
    return pages[currentPageIndex.value] ?? pages[0];
  });

  const currentButtons = computed(() => {
    return currentPage.value?.buttons ?? [];
  });

  const connectionStore = useConnectionStore();

  const localConfig = localStorage.getItem('local_layout');
  if (localConfig) {
    try {
      layout.value = migrateLayout(JSON.parse(localConfig));
    } catch (_) {}
  }

  const updateLayout = (newLayout: Layout, skipBroadcast = false) => {
    layout.value = newLayout;
    if (layout.value.pages && layout.value.pages[0]) {
      layout.value.buttons.splice(0, layout.value.buttons.length, ...layout.value.pages[0].buttons);
    }
    currentPageIndex.value = Math.max(0, Math.min(currentPageIndex.value, (layout.value.pages?.length ?? 1) - 1));
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

    if (layout.value.pages) {
      layout.value.pages.forEach((page, idx) => {
        if (idx === currentPageIndex.value) {
          page.buttons.splice(0, page.buttons.length, ...newButtons);
        } else {
          const totalNeeded = rows * cols;
          const currentBtns = [...page.buttons];
          const newBtns: ButtonConfig[] = [];
          for (let i = 0; i < totalNeeded; i++) {
            if (currentBtns[i]) {
              newBtns.push(currentBtns[i]);
            } else {
              newBtns.push(createEmptyButton(page.id, i));
            }
          }
          page.buttons.splice(0, page.buttons.length, ...newBtns);
        }
      });
    }

    const activeButtons = layout.value.pages?.[0]?.buttons ?? newButtons;
    layout.value.buttons.splice(0, layout.value.buttons.length, ...activeButtons);

    broadcastSync();
  };

  const reorderButtons = (fromIndex: number, toIndex: number) => {
    const len = currentButtons.value.length;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex > len) return;
    const buttons = [...currentButtons.value];
    const [moved] = buttons.splice(fromIndex, 1);
    if (!moved) return;
    const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
    buttons.splice(insertAt, 0, moved);

    if (currentPage.value) {
      currentPage.value.buttons.splice(0, currentPage.value.buttons.length, ...buttons);
    }

    if (layout.value.pages?.[0]) {
      layout.value.buttons.splice(0, layout.value.buttons.length, ...layout.value.pages[0].buttons);
    }

    updateLayout({ ...layout.value });
  };

  const addPage = () => {
    if (!layout.value.pages) {
      layout.value.pages = [];
    }
    const pageId = `page_${Date.now()}`;
    const totalButtons = layout.value.rows * layout.value.cols;
    const buttons: ButtonConfig[] = [];
    for (let i = 0; i < totalButtons; i++) {
      buttons.push(createEmptyButton(pageId, i));
    }
    const newPage: Page = {
      id: pageId,
      name: `Trang ${layout.value.pages.length + 1}`,
      buttons,
    };
    layout.value.pages.push(newPage);
    currentPageIndex.value = layout.value.pages.length - 1;
    updateLayout({ ...layout.value });
  };

  const removePage = (idx: number) => {
    if (!layout.value.pages || layout.value.pages.length <= 1) return;
    layout.value.pages.splice(idx, 1);
    currentPageIndex.value = Math.max(0, Math.min(currentPageIndex.value, layout.value.pages.length - 1));
    updateLayout({ ...layout.value });
  };

  const renamePage = (idx: number, name: string) => {
    if (!layout.value.pages || idx < 0 || idx >= layout.value.pages.length) return;
    layout.value.pages[idx].name = name;
    updateLayout({ ...layout.value });
  };

  const goNextPage = () => {
    if (!layout.value.pages) return;
    currentPageIndex.value = Math.min(currentPageIndex.value + 1, layout.value.pages.length - 1);
  };

  const goPrevPage = () => {
    currentPageIndex.value = Math.max(0, currentPageIndex.value - 1);
  };

  const setPage = (idx: number) => {
    if (!layout.value.pages) return;
    currentPageIndex.value = Math.max(0, Math.min(idx, layout.value.pages.length - 1));
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
        const synced = migrateLayout(message.payload);
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

  const exportLayout = async (): Promise<boolean> => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultName = `stream-desk-layout-${ts}.json`;
    // @ts-ignore
    if (window.__TAURI_INTERNALS__) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { invoke } = await import('@tauri-apps/api/core');
        const path = await save({
          defaultPath: defaultName,
          filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (!path) return false; // user hủy
        await invoke('export_layout_to_path', { path, layout: layout.value });
        return true;
      } catch (err) {
        console.error('Tauri export error', err);
        throw err;
      }
    }
    // web fallback: blob + anchor (GIỮ NGUYÊN)
    const json = JSON.stringify(layout.value, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  };

  const importLayout = async (file: File): Promise<void> => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON không hợp lệ');
    if (typeof parsed.rows !== 'number' || typeof parsed.cols !== 'number') {
      throw new Error('Thiếu trường rows/cols');
    }
    if (!Array.isArray(parsed.buttons)) throw new Error('Thiếu mảng buttons');

    const sanitized: ButtonConfig[] = parsed.buttons.map((b: any, i: number) => sanitizeButton(b, i));

    // migrateLayout prefers `pages` when present, so sanitize per-page buttons too —
    // otherwise a multi-page import bypasses icon/action validation entirely.
    const sanitizedPages: Page[] | undefined = Array.isArray(parsed.pages)
      ? parsed.pages.map((p: any, pi: number) => ({
          id: typeof p?.id === 'string' && p.id ? p.id : `page_${Date.now()}_${pi}`,
          name: typeof p?.name === 'string' ? p.name : undefined,
          buttons: (Array.isArray(p?.buttons) ? p.buttons : []).map((b: any, i: number) =>
            sanitizeButton(b, i)
          ),
        }))
      : undefined;

    updateLayout(migrateLayout({
      rows: Math.max(2, Math.min(6, parsed.rows | 0)),
      cols: Math.max(2, Math.min(8, parsed.cols | 0)),
      buttons: sanitized,
      pages: sanitizedPages,
      theme: isValidTheme(parsed.theme) ? parsed.theme : undefined,
    }));
  };

  return {
    layout,
    currentPageIndex,
    currentPage,
    currentButtons,
    lastToast,
    currentMetrics,
    updateLayout,
    resizeGrid,
    broadcastSync,
    reorderButtons,
    pressButton,
    addPage,
    removePage,
    renamePage,
    goNextPage,
    goPrevPage,
    setPage,
    exportLayout,
    importLayout,
  };
});
