<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useLayoutStore } from '../stores/layout';
import { useConnectionStore } from '../stores/connection';
import { useUpdaterStore } from '../stores/updater';
import type { ButtonConfig, ActionType } from '../types';
import { Icon, listIcons } from '@iconify/vue';
import { vDraggable } from 'vue-draggable-plus';
import { normalizeHex } from '../lib/color';
import { applyTheme, isValidTheme, THEMES, type ThemeName } from '../lib/themes';
import { safeCreateQrSvg } from '../lib/qrSvg';
import {
  buildApkEndpointPayload,
  buildWebClientUrl,
  hasPendingServerChanges as computeHasPendingServerChanges,
} from '../lib/networkEndpointState';
import { FONT_TIER_CLASS } from '../lib/typography';

// Import Shadcn UI Components
import Input from '../components/ui/Input.vue';
import GridButton from '../components/GridButton.vue';
import AppPickerModal from '../components/AppPickerModal.vue';
import GuideCenterModal from '../components/GuideCenterModal.vue';

interface ServerConfig {
  wsPort: number;
  webEnabled: boolean;
  webPort: number;
}

interface ListenerBindError {
  port: number;
  error: string;
  kind?: 'web';
}

interface ServerInfo {
  ip: string;
  port: number;
  configuredWsPort: number;
  runningWsPort: number | null;
  webEnabled: boolean;
  webPort: number;
  wsReady: boolean;
  wsBindError: ListenerBindError | null;
  webReady: boolean;
  webBindError: ListenerBindError | null;
}

interface ServerConfigDraft {
  wsPort: string;
  webEnabled: boolean;
  webPort: string;
}

type InputPermissionRecommendedAction =
  | 'allow'
  | 'remove_stale_entry'
  | 'restart_app'
  | 'open_settings';

interface InputPermissionDiagnostics {
  trusted: boolean;
  bundleIdentifier: string;
  executablePath: string | null;
  appBundlePath: string | null;
  isPackagedApp: boolean;
  recommendedAction: InputPermissionRecommendedAction;
}

const layoutStore = useLayoutStore();
const updaterStore = useUpdaterStore();

// --- First-Run Checklist ---
const FIRST_RUN_KEY = 'dashboard:first-run-dismissed';
const firstRunDismissed = ref(localStorage.getItem(FIRST_RUN_KEY) === 'true');
const dismissFirstRun = () => {
  firstRunDismissed.value = true;
  localStorage.setItem(FIRST_RUN_KEY, 'true');
};

// --- Realtime HUD ---
const activeConnectionsCount = ref(0);
const wsReady = ref(false);
const runningWsPort = ref<number | null>(null);
const wsBindError = ref<ListenerBindError | null>(null);
const webReady = ref(false);
const webBindError = ref<ListenerBindError | null>(null);
let tauriUnlisteners: (() => void)[] = [];

const selectedButtonId = ref<string | null>(null);
const activeTab = ref<'shortcut' | 'media' | 'app' | 'command' | 'link'>('shortcut');

const serverIp = ref<string>('—');
const serverPort = ref<number>(8089);
const copyHint = ref<string>('');
const webCopyHint = ref<string>('');
const apkCopyHint = ref<string>('');
const colorCopyHint = ref<string>('');
const syncHint = ref<string>('');
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const appVersion = ref<string>('1.3.3');

const isMac = computed(() => {
  return (
    navigator.userAgent.toLowerCase().includes('mac') ||
    navigator.platform.toLowerCase().includes('mac')
  );
});

// Theme
const activeTheme = computed(() =>
  isValidTheme(layoutStore.layout.theme) ? layoutStore.layout.theme : 'cyber',
);
const setTheme = (name: ThemeName) => {
  layoutStore.layout.theme = name;
  applyTheme(name);
  layoutStore.broadcastSync();
};

// Modal Control
const settingsOpen = ref(false);
const appPickerOpen = ref(false);
const guideCenterOpen = ref(false);
const guideTopic = ref<'browser' | 'shortcut' | 'firewall'>('browser');

// --- S-UX2: Settings IA group rail ---
type SettingsGroupId =
  | 'general'
  | 'network'
  | 'client-qr'
  | 'permissions'
  | 'updates'
  | 'import-export'
  | 'about';

const settingsGroups: Array<{ id: SettingsGroupId; label: string; icon: string }> = [
  { id: 'general', label: 'General', icon: 'lucide:sliders-horizontal' },
  { id: 'network', label: 'Network', icon: 'lucide:wifi' },
  { id: 'client-qr', label: 'Client & QR', icon: 'lucide:qr-code' },
  { id: 'permissions', label: 'Permissions', icon: 'lucide:shield-check' },
  { id: 'updates', label: 'Updates', icon: 'lucide:refresh-cw' },
  { id: 'import-export', label: 'Import/Export', icon: 'lucide:database' },
  { id: 'about', label: 'About/Support', icon: 'lucide:info' },
];

const typographyClass = FONT_TIER_CLASS;
const visibleSettingsGroups = computed(() =>
  settingsGroups.filter((group) => group.id !== 'permissions' || isMac.value),
);
const activeSettingsGroup = ref<SettingsGroupId>('general');

const scrollToSettingsGroup = (id: SettingsGroupId) => {
  if (!visibleSettingsGroups.value.some((group) => group.id === id)) return;
  activeSettingsGroup.value = id;
  const el = document.getElementById(`settings-group-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const onSettingsScroll = (e: Event) => {
  const container = e.target as HTMLElement;
  if (!container) return;
  const groups: SettingsGroupId[] = visibleSettingsGroups.value.map((g) => g.id);
  let current: SettingsGroupId = groups[0];
  for (const id of groups) {
    const el = document.getElementById(`settings-group-${id}`);
    if (!el) continue;
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    if (top <= 80) current = id;
  }
  if (current !== activeSettingsGroup.value) {
    activeSettingsGroup.value = current;
  }
};

const canSaveServerConfig = computed(
  () =>
    !serverConfigSaving.value &&
    !restartDialogOpen.value &&
    !serverConfigValidationError.value &&
    hasPendingServerChanges.value,
);
const serverConfigSaveHint = computed(() => {
  if (serverConfigSaving.value) return 'Đang ghi server.json và chuẩn bị relaunch…';
  if (restartDialogOpen.value) return 'Đang chờ Companion khởi động lại để áp dụng cấu hình.';
  if (serverConfigValidationError.value) return serverConfigValidationError.value;
  if (!hasPendingServerChanges.value)
    return 'Chưa có thay đổi. Bật/tắt toggle hoặc đổi port để kích hoạt nút.';
  return 'Lưu thay đổi port sẽ ghi vào server.json và khởi động lại Companion.';
});

// QR Layout and Zoom Modal
const activeQrTab = ref<'apk' | 'web'>('apk');
const zoomModalOpen = ref(false);
const zoomModalTitle = ref('');
const zoomModalPayload = ref('');
const zoomModalQrSvg = ref('');
const zoomModalCopyHint = ref('');

const openZoomModal = (title: string, payload: string, svg: string) => {
  zoomModalTitle.value = title;
  zoomModalPayload.value = payload;
  zoomModalQrSvg.value = svg;
  zoomModalCopyHint.value = '';
  zoomModalOpen.value = true;
};

const copyZoomModalPayload = async () => {
  if (!zoomModalPayload.value) return;
  try {
    await navigator.clipboard.writeText(zoomModalPayload.value);
    zoomModalCopyHint.value = 'Copied!';
    setTimeout(() => {
      zoomModalCopyHint.value = '';
    }, 1500);
  } catch (_) {
    zoomModalCopyHint.value = 'Failed';
  }
};

const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && zoomModalOpen.value) {
    zoomModalOpen.value = false;
  }
};

const openGuide = (topic?: 'browser' | 'shortcut' | 'firewall') => {
  if (topic) {
    guideTopic.value = topic;
  }
  guideCenterOpen.value = true;
};
const autostartOn = ref(false);
const autostartLoading = ref(false);

watch(settingsOpen, async (open) => {
  if (open) {
    autostartLoading.value = true;
    try {
      // @ts-ignore
      if (window.__TAURI_INTERNALS__) {
        const { isEnabled } = await import('@tauri-apps/plugin-autostart');
        autostartOn.value = await isEnabled();
      }
    } catch (err) {
      console.warn('Failed to load autostart status:', err);
    } finally {
      autostartLoading.value = false;
    }
  }
});
const serverConfigLoaded = ref(false);
const serverConfigSaving = ref(false);
const serverConfigError = ref<string>('');
const restartDialogOpen = ref(false);
const restartDialogMessage = ref('Đang lưu cấu hình và khởi động lại Companion...');
const restartDialogFailed = ref(false);
const isDevBuild = import.meta.env.DEV;
const savedServerConfig = ref<ServerConfig | null>(null);
const serverConfigDraft = ref<ServerConfigDraft>({
  wsPort: '8089',
  webEnabled: false,
  webPort: '8090',
});

const toServerConfigDraft = (config: ServerConfig): ServerConfigDraft => ({
  wsPort: String(config.wsPort),
  webEnabled: config.webEnabled,
  webPort: String(config.webPort),
});

const parsePortDraft = (raw: string, label: string) => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { error: `${label} phải là số nguyên.` };

  const value = Number(trimmed);
  if (value < 1024 || value > 65535) {
    return { error: `${label} phải nằm trong khoảng 1024..65535.` };
  }

  return { value };
};

const serverConfigValidationError = computed(() => {
  const ws = parsePortDraft(serverConfigDraft.value.wsPort, 'Cổng WebSocket');
  if (ws.error) return ws.error;

  const web = parsePortDraft(serverConfigDraft.value.webPort, 'Cổng HTTP Web Client');
  if (web.error) return web.error;

  if (serverConfigDraft.value.webEnabled && ws.value === web.value) {
    return 'Cổng WebSocket và HTTP Web Client không được trùng khi Web Client bật.';
  }

  return '';
});

const hasPendingServerChanges = computed(() => {
  const persisted = savedServerConfig.value;
  return computeHasPendingServerChanges({
    draftWsPort: serverConfigDraft.value.wsPort,
    runningWsPort: runningWsPort.value,
    webEnabledDraft: serverConfigDraft.value.webEnabled,
    webEnabledSaved: persisted?.webEnabled ?? false,
    webPortDraft: serverConfigDraft.value.webPort,
    webPortSaved: persisted?.webPort ?? null,
  });
});

const networkSettingsBadgeText = computed(() =>
  hasPendingServerChanges.value ? 'Đang áp dụng' : 'Đang khớp listener hiện thời',
);

const hasListenerBindError = computed(() => Boolean(wsBindError.value || webBindError.value));
const activeWsPort = computed(() => runningWsPort.value ?? serverPort.value);

const listenerHealthBadge = computed(() => {
  const bindError = wsBindError.value ?? webBindError.value;
  if (bindError) {
    return {
      label: 'Bind error',
      detail: `Port ${bindError.port}`,
      icon: 'lucide:wifi-off',
      title: bindError.error,
      classes: 'border-rose-500/50 text-rose-300',
      iconClass: 'text-rose-400 animate-pulse',
    };
  }

  if (hasPendingServerChanges.value) {
    return {
      label: 'Đang áp dụng',
      detail: `WS ${activeWsPort.value}`,
      icon: 'lucide:refresh-cw',
      title: 'Cấu hình đã lưu nhưng listener mới chưa chạy',
      classes: 'border-amber-500/45 text-amber-300',
      iconClass: 'text-amber-400 animate-spin',
    };
  }

  const webConfigured = savedServerConfig.value?.webEnabled ?? false;
  const restartPending =
    !wsReady.value || runningWsPort.value !== serverPort.value || (webConfigured && !webReady.value);

  if (restartPending) {
    return {
      label: 'Restart pending',
      detail: `WS ${serverPort.value}`,
      icon: 'lucide:refresh-cw',
      title: 'Listener chưa khớp cấu hình hiện thời',
      classes: 'border-amber-500/45 text-amber-300',
      iconClass: 'text-amber-400',
    };
  }

  return {
    label: 'Listening',
    detail: `WS ${activeWsPort.value}`,
    icon: 'lucide:radio-tower',
    title: 'WebSocket listener đang chạy',
    classes: 'border-emerald-500/40 text-emerald-300',
    iconClass: 'text-emerald-400',
  };
});

const webClientUrl = computed(() => {
  const config = savedServerConfig.value;
  return buildWebClientUrl({
    serverIp: serverIp.value,
    webEnabled: Boolean(config?.webEnabled),
    webPort: config?.webPort ?? 8090,
    webReady: webReady.value,
    hasPendingServerChanges: hasPendingServerChanges.value,
    hasBindError: hasListenerBindError.value,
  });
});

const webClientQrSvg = computed(() => (webClientUrl.value ? safeCreateQrSvg(webClientUrl.value) : ''));

const apkConnectPayload = computed(() => {
  return buildApkEndpointPayload({
    serverIp: serverIp.value,
    runningWsPort: runningWsPort.value,
    hasPendingServerChanges: hasPendingServerChanges.value,
    hasBindError: hasListenerBindError.value,
  });
});

const apkConnectQrSvg = computed(() =>
  apkConnectPayload.value ? safeCreateQrSvg(apkConnectPayload.value) : '',
);

const runRelaunchWithTimeout = async () => {
  const { relaunch } = await import('@tauri-apps/plugin-process');
  let timeoutId: number | null = null;
  try {
    await Promise.race([
      relaunch(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Restart IPC timed out after 5 seconds')),
          5000,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
};

const buildServerConfigPayload = (): ServerConfig | null => {
  const ws = parsePortDraft(serverConfigDraft.value.wsPort, 'Cổng WebSocket');
  const web = parsePortDraft(serverConfigDraft.value.webPort, 'Cổng HTTP Web Client');
  if (ws.error || web.error || ws.value === undefined || web.value === undefined) return null;

  return {
    wsPort: ws.value,
    webEnabled: serverConfigDraft.value.webEnabled,
    webPort: web.value,
  };
};

const loadServerConfig = async (invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) => {
  const config = await invoke<ServerConfig>('get_server_config');
  savedServerConfig.value = config;
  serverConfigDraft.value = toServerConfigDraft(config);
  serverConfigLoaded.value = true;
};

const saveNetworkSettingsAndRelaunch = async () => {
  serverConfigError.value = '';
  const validationError = serverConfigValidationError.value;
  if (validationError) {
    serverConfigError.value = validationError;
    return;
  }

  if (!window.__TAURI_INTERNALS__) {
    serverConfigError.value = 'Chỉ có thể lưu và khởi động lại trong Companion desktop.';
    return;
  }

  const payload = buildServerConfigPayload();
  if (!payload) return;

  serverConfigSaving.value = true;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_server_config', { config: payload });
    savedServerConfig.value = payload;
    restartDialogOpen.value = true;
    restartDialogFailed.value = false;
    restartDialogMessage.value = 'Đã lưu cấu hình. Companion đang khởi động lại để áp dụng cổng mới...';

    if (isDevBuild) {
      restartDialogFailed.value = true;
      restartDialogMessage.value =
        'Đã lưu cấu hình. Đang chạy ở chế độ dev nên Companion không tự relaunch để tránh webview trắng do mất Vite dev server. Hãy dừng và chạy lại `pnpm tauri dev` để áp dụng cổng mới.';
      return;
    }

    window.setTimeout(async () => {
      try {
        await runRelaunchWithTimeout();
      } catch (err: any) {
        restartDialogFailed.value = true;
        restartDialogMessage.value = `Đã lưu cấu hình nhưng chưa thể tự khởi động lại: ${err?.message || err}`;
        layoutStore.lastToast = {
          kind: 'error',
          message: restartDialogMessage.value,
          at: Date.now(),
        };
      }
    }, 450);
  } catch (err: any) {
    serverConfigError.value = `Không lưu được cấu hình mạng: ${err?.message || err}`;
    layoutStore.lastToast = {
      kind: 'error',
      message: serverConfigError.value,
      at: Date.now(),
    };
  } finally {
    serverConfigSaving.value = false;
  }
};

const toggleAutostart = async () => {
  if (autostartLoading.value) return;
  autostartLoading.value = true;
  try {
    const { enable, disable, isEnabled } = await import('@tauri-apps/plugin-autostart');
    if (autostartOn.value) {
      await disable();
    } else {
      await enable();
    }
    autostartOn.value = await isEnabled();
    layoutStore.lastToast = {
      kind: 'info',
      message: autostartOn.value
        ? 'Đã bật tự khởi động cùng hệ thống thành công'
        : 'Đã tắt tự khởi động cùng hệ thống thành công',
      at: Date.now(),
    };
  } catch (err: any) {
    console.error('Failed to toggle autostart:', err);
    layoutStore.lastToast = {
      kind: 'error',
      message: `Lỗi thiết lập khởi động: ${err?.message || err}. Hãy chạy ứng dụng với quyền Administrator hoặc kiểm tra danh sách Startup.`,
      at: Date.now()
    };
  } finally {
    autostartLoading.value = false;
  }
};

const isRecording = ref(false);
const shortcutPresets = [
  { label: 'Copy (Ctrl+C)', value: 'Ctrl+C' },
  { label: 'Paste (Ctrl+V)', value: 'Ctrl+V' },
  { label: 'Undo (Ctrl+Z)', value: 'Ctrl+Z' },
  { label: 'Save (Ctrl+S)', value: 'Ctrl+S' },
  { label: 'Close App (Alt+F4)', value: 'Alt+F4' },
  { label: 'Switch Tab (Ctrl+Tab)', value: 'Ctrl+Tab' },
  { label: 'Task Manager (Ctrl+Shift+Escape)', value: 'Ctrl+Shift+Escape' },
  { label: 'Show Desktop (Win+D)', value: 'Win+D' },
  { label: 'Snipping Tool (Win+Shift+S)', value: 'Win+Shift+S' },
  { label: 'Search (Win+S)', value: 'Win+S' },
  { label: 'Lock PC (Win+L)', value: 'Win+L' },
  { label: 'PrintScreen', value: 'PrintScreen' },
  { label: 'Alt+PrintScreen', value: 'Alt+PrintScreen' },
];

// App Presets dynamic mapping based on OS
const appPresets = computed(() => {
  if (isMac.value) {
    return [
      { name: 'Google Chrome', path: '/Applications/Google Chrome.app', icon: 'lucide:chrome' },
      { name: 'Safari', path: '/Applications/Safari.app', icon: 'lucide:globe' },
      { name: 'VS Code', path: '/Applications/Visual Studio Code.app', icon: 'lucide:terminal' },
      {
        name: 'Terminal',
        path: '/System/Applications/Utilities/Terminal.app',
        icon: 'lucide:terminal',
      },
      { name: 'Finder', path: '/System/Library/CoreServices/Finder.app', icon: 'lucide:folder' },
      { name: 'Spotify', path: '/Applications/Spotify.app', icon: 'lucide:music' },
      {
        name: 'Calculator',
        path: '/System/Applications/Calculator.app',
        icon: 'lucide:calculator',
      },
    ];
  } else {
    return [
      {
        name: 'Google Chrome',
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        icon: 'lucide:chrome',
      },
      { name: 'Notepad', path: 'C:\\Windows\\notepad.exe', icon: 'material-symbols:edit' },
      { name: 'Command Prompt', path: 'C:\\Windows\\System32\\cmd.exe', icon: 'lucide:terminal' },
      {
        name: 'PowerShell',
        path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        icon: 'lucide:terminal',
      },
      { name: 'Explorer', path: 'C:\\Windows\\explorer.exe', icon: 'lucide:folder' },
      {
        name: 'Calculator',
        path: 'C:\\Windows\System32\\calc.exe',
        icon: 'material-symbols:open-in-new',
      },
      { name: 'Paint', path: 'C:\\Windows\\System32\\mspaint.exe', icon: 'material-symbols:edit' },
    ];
  }
});

const applyAppPreset = (preset: { name: string; path: string; icon: string }) => {
  if (selectedButton.value) {
    selectedButton.value.label = preset.name;
    selectedButton.value.icon = preset.icon;
    selectedButton.value.appPath = preset.path;
    saveButtonSettings();
  }
};

const appPathHint = ref<string>('');

// --- S-LINK1: link action helpers ---
type LinkUrlValidation =
  | { ok: true; domain: string; normalized: string }
  | { ok: false; reason: string };

const validateLinkUrl = (raw: string | undefined | null): LinkUrlValidation => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, reason: 'Nhập URL bắt đầu bằng http:// hoặc https://' };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: 'Chỉ chấp nhận http:// hoặc https://' };
    }
    if (!parsed.hostname) {
      return { ok: false, reason: 'URL thiếu hostname' };
    }
    if (parsed.username || parsed.password) {
      return { ok: false, reason: 'URL không được chứa tài khoản/mật khẩu (user:pass@)' };
    }
    return { ok: true, domain: parsed.hostname, normalized: parsed.toString() };
  } catch {
    return { ok: false, reason: 'URL không hợp lệ' };
  }
};

const linkUrlValidation = computed<LinkUrlValidation>(() => {
  if (!selectedButton.value || selectedButton.value.actionType !== 'link') {
    return { ok: false, reason: '' };
  }
  return validateLinkUrl(selectedButton.value.linkUrl);
});

const handleAppPathPaste = async (e: ClipboardEvent) => {
  const raw = e.clipboardData?.getData('text') ?? '';
  const text = raw.trim().replace(/^"|"$/g, ''); // strip surrounding quotes

  if (!selectedButton.value || !window.__TAURI_INTERNALS__) return;

  // Let browser paste or do custom resolving
  if (text.toLowerCase().endsWith('.lnk')) {
    e.preventDefault();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const resolved = await invoke<string>('resolve_shortcut', { lnkPath: text });
      selectedButton.value.appPath = resolved;
      saveButtonSettings();
      appPathHint.value = '✓ Đã giải shortcut';
    } catch {
      appPathHint.value = '✗ Không đọc được shortcut';
    }
    setTimeout(() => (appPathHint.value = ''), 3000);
    return;
  }

  // Strip surrounding quotes from quoted exe path (e.g. pasted from Properties dialog)
  if (text && text !== raw.trim()) {
    e.preventDefault();
    selectedButton.value.appPath = text;
    saveButtonSettings();
    return;
  }

  // Fallback: If clipboard has no valid text path but might contain a copied file (CF_HDROP)
  if (!text || (!text.toLowerCase().endsWith('.lnk') && !text.includes('\\') && !text.includes('/'))) {
    e.preventDefault();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const files = await invoke<string[]>('read_clipboard_files');
      
      const file = files.find(f => f.toLowerCase().endsWith('.lnk') || f.toLowerCase().endsWith('.exe'));
      if (file) {
        if (file.toLowerCase().endsWith('.lnk')) {
          const resolved = await invoke<string>('resolve_shortcut', { lnkPath: file });
          selectedButton.value.appPath = resolved;
        } else {
          selectedButton.value.appPath = file;
        }
        saveButtonSettings();
        appPathHint.value = '✓ Đã dán shortcut copy thành công';
      } else {
        appPathHint.value = '✗ Không có gì để dán. Hãy chọn App Picker!';
      }
    } catch (err: any) {
      console.warn('Clipboard file read error:', err);
      appPathHint.value = '✗ Không đọc được Clipboard. Hãy dùng App Picker!';
    }
    setTimeout(() => (appPathHint.value = ''), 4000);
  }
};

const handleCustomIconUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !selectedButton.value) return;

  if (!file.type.startsWith('image/')) {
    layoutStore.lastToast = {
      kind: 'error',
      message: 'Vui lòng chọn tệp ảnh PNG hoặc JPG!',
      at: Date.now()
    };
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas for downscaling
      const canvas = document.createElement('canvas');
      const size = 96;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw image keeping ratio (cover / fill bounding box)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;

        ctx.drawImage(img, x, y, w, h);

        // Export to highly compressed webp/png data URL
        const dataURL = canvas.toDataURL('image/png'); // Standard format
        
        // Base64 size overhead check: ~1.37 times raw binary size.
        // Cap is 20KB = 20480 bytes * 1.37 = ~28057 chars.
        if (dataURL.length > 28057) {
          layoutStore.lastToast = {
            kind: 'info',
            message: 'Ảnh đã được nén nhưng vượt 20KB. Payload tải có thể phình to.',
            at: Date.now()
          };
        }

        selectedButton.value!.icon = dataURL;
        saveButtonSettings();
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
};
const searchQuery = ref('');
const activeIconGroup = ref<'mdi' | 'lucide' | 'material' | 'si'>('mdi');
const visibleCount = ref(120);
const iconScrollRef = ref<HTMLElement | null>(null);
const sentinelRef = ref<HTMLElement | null>(null);

import { mdiIcons, lucideIcons, materialIcons, siIcons } from '@/config/icons';

const prefixMap: Record<'mdi' | 'lucide' | 'material' | 'si', string> = {
  mdi: 'mdi',
  lucide: 'lucide',
  material: 'material-symbols',
  si: 'simple-icons',
};

const filteredIcons = computed(() => {
  const group = activeIconGroup.value;
  let pool: string[];
  if (group === 'mdi') pool = mdiIcons;
  else if (group === 'lucide') pool = lucideIcons;
  else if (group === 'material') pool = materialIcons;
  else pool = siIcons;

  if (!searchQuery.value || group === 'si') {
    if (!searchQuery.value) return pool;
    return pool.filter(ico => ico.toLowerCase().includes(searchQuery.value.toLowerCase()));
  }

  const q = searchQuery.value.toLowerCase();
  const prefix = prefixMap[group];
  const all = listIcons(undefined, prefix);
  if (all.length > 0) {
    return all.filter(name => name.toLowerCase().includes(q)).slice(0, 200);
  }
  return pool.filter(ico => ico.toLowerCase().includes(q));
});

const isFullSearch = computed(() => searchQuery.value !== '' && activeIconGroup.value !== 'si');

const packLabel = computed(() => {
  const labels: Record<'mdi' | 'lucide' | 'material' | 'si', string> = {
    mdi: 'MDI',
    lucide: 'Lucide',
    material: 'Material Symbols',
    si: 'Brands',
  };
  return labels[activeIconGroup.value];
});

const visibleIcons = computed(() => filteredIcons.value.slice(0, visibleCount.value));

watch(filteredIcons, () => {
  visibleCount.value = 120;
});

let iconObserver: IntersectionObserver | null = null;

watch(
  sentinelRef,
  newSentinel => {
    iconObserver?.disconnect();
    iconObserver = null;
    if (newSentinel && iconScrollRef.value) {
      iconObserver = new IntersectionObserver(
        entries => {
          if (entries[0]?.isIntersecting) visibleCount.value += 60;
        },
        { root: iconScrollRef.value, threshold: 0.1 },
      );
      iconObserver.observe(newSentinel);
    }
  },
  { flush: 'post' },
);

const selectIconForButton = (icoName: string) => {
  if (selectedButton.value) {
    selectedButton.value.icon = icoName;
    saveButtonSettings();
  }
};

const applyPreset = (value: string) => {
  if (selectedButton.value) {
    selectedButton.value.shortcutValue = value;
    saveButtonSettings();
  }
};

// Modifier toggle state — lets user pre-arm modifiers via UI so OS-trapped
// combos (Cmd+Q, Cmd+Ctrl+Q on macOS) can still be assembled by pressing
// only the base key on keyboard.
const pendingMods = ref({ ctrl: false, shift: false, alt: false, meta: false });
const heldKeys = ref<Set<string>>(new Set());

const metaLabel = computed(() => (isMac.value ? 'Cmd' : 'Win'));
const altLabel = computed(() => (isMac.value ? 'Opt' : 'Alt'));

const toggleMod = (mod: 'ctrl' | 'shift' | 'alt' | 'meta') => {
  pendingMods.value[mod] = !pendingMods.value[mod];
};

const buildModifiers = (e?: KeyboardEvent): string[] => {
  const mods: string[] = [];
  const ctrl = pendingMods.value.ctrl || !!e?.ctrlKey;
  const shift = pendingMods.value.shift || !!e?.shiftKey;
  const alt = pendingMods.value.alt || !!e?.altKey;
  const meta = pendingMods.value.meta || !!e?.metaKey;
  if (ctrl) mods.push('Ctrl');
  if (shift) mods.push('Shift');
  if (alt) mods.push('Alt');
  if (meta) mods.push('Meta');
  return mods;
};

const currentRecordingPreview = computed(() => {
  const modifiers = buildModifiers();
  const bases = Array.from(heldKeys.value);
  if (modifiers.length === 0 && bases.length === 0) return 'Đang chờ phím...';
  return [...modifiers, ...bases].join(' + ');
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isRecording.value || !selectedButton.value) return;
  e.preventDefault();
  e.stopPropagation();

  let keyName = e.key;
  // Live-sync UI toggles when user holds physical modifier keys.
  if (keyName === 'Control') {
    pendingMods.value.ctrl = true;
    return;
  }
  if (keyName === 'Shift') {
    pendingMods.value.shift = true;
    return;
  }
  if (keyName === 'Alt') {
    pendingMods.value.alt = true;
    return;
  }
  if (keyName === 'Meta') {
    pendingMods.value.meta = true;
    return;
  }

  if (keyName === ' ') keyName = 'Space';
  else if (keyName === 'Escape') keyName = 'Esc';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();

  heldKeys.value.add(keyName);
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (!isRecording.value || !selectedButton.value) return;

  let keyName = e.key;

  // Sync modifier keyup if they release modifiers physically
  if (keyName === 'Control') {
    pendingMods.value.ctrl = false;
    return;
  }
  if (keyName === 'Shift') {
    pendingMods.value.shift = false;
    return;
  }
  if (keyName === 'Alt') {
    pendingMods.value.alt = false;
    return;
  }
  if (keyName === 'Meta') {
    pendingMods.value.meta = false;
    return;
  }

  if (keyName === ' ') keyName = 'Space';
  else if (keyName === 'Escape') keyName = 'Esc';
  else if (keyName === 'PrintScreen') keyName = 'PrintScreen';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();

  // PrintScreen usually only fires keyup on Windows, catch it here.
  if (keyName === 'PrintScreen') {
    heldKeys.value.add(keyName);
  }

  // Once a base key is released and we have at least one base key captured, we finalize the chord.
  if (heldKeys.value.size > 0) {
    e.preventDefault();
    e.stopPropagation();

    const modifiers = buildModifiers(e);
    const bases = Array.from(heldKeys.value);
    const shortcutString = [...modifiers, ...bases].join('+');

    selectedButton.value.shortcutValue = shortcutString;

    isRecording.value = false;
    pendingMods.value = { ctrl: false, shift: false, alt: false, meta: false };
    heldKeys.value.clear();
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keyup', handleKeyUp, true);
    window.removeEventListener('blur', handleWindowBlur);
    saveButtonSettings();
  }
};

// Apply current modifier toggles + a manually-picked key. Used by the
// "Apply" button — required for OS-trapped combos that never reach JS.
const applyManualKey = (keyName: string) => {
  if (!selectedButton.value) return;
  const modifiers = buildModifiers();
  if (modifiers.length === 0 && !keyName) return;
  selectedButton.value.shortcutValue = [...modifiers, keyName].filter(Boolean).join('+');
  isRecording.value = false;
  pendingMods.value = { ctrl: false, shift: false, alt: false, meta: false };
  heldKeys.value.clear();
  window.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('keyup', handleKeyUp, true);
  saveButtonSettings();
};

const manualKey = ref<string>('');

// If the window loses focus mid-chord (alt-tab, OS overlay), keydown/keyup can be
// swallowed and leave recording stuck on. Abort cleanly without saving the partial chord.
const handleWindowBlur = () => {
  if (!isRecording.value) return;
  isRecording.value = false;
  pendingMods.value = { ctrl: false, shift: false, alt: false, meta: false };
  heldKeys.value.clear();
  window.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('keyup', handleKeyUp, true);
  window.removeEventListener('blur', handleWindowBlur);
};

const toggleRecording = () => {
  if (isRecording.value) {
    isRecording.value = false;
    pendingMods.value = { ctrl: false, shift: false, alt: false, meta: false };
    heldKeys.value.clear();
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keyup', handleKeyUp, true);
    window.removeEventListener('blur', handleWindowBlur);
  } else {
    isRecording.value = true;
    manualKey.value = '';
    heldKeys.value.clear();
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
  }
};

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
  window.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('keyup', handleKeyUp, true);
  window.removeEventListener('blur', handleWindowBlur);
  window.removeEventListener('focus', probePermission);
  if (syncTimer !== null) clearTimeout(syncTimer);
  if (saveTimer !== null) clearTimeout(saveTimer);
  if (permissionPollTimer !== null) {
    clearInterval(permissionPollTimer);
    permissionPollTimer = null;
  }
  iconObserver?.disconnect();
  tauriUnlisteners.forEach(fn => fn());
  tauriUnlisteners = [];
});

// Accessibility / input permission state
const inputPermissionChecked = ref<boolean>(false);
const inputPermissionDiagnostics = ref<InputPermissionDiagnostics | null>(null);
const legacyInputPermission = ref<boolean>(true);
const permissionCopyHint = ref<'executable' | 'bundle' | 'bundleId' | ''>('');
const accessibilityRecoveryRequested = ref(false);
const accessibilityRecoveryRef = ref<HTMLElement | null>(null);
let permissionPollTimer: ReturnType<typeof setInterval> | null = null;

const isMacPlatform = computed(
  () =>
    navigator.userAgent.toLowerCase().includes('mac') ||
    navigator.platform.toLowerCase().includes('mac'),
);

const hasInputPermission = computed(() => inputPermissionDiagnostics.value?.trusted ?? legacyInputPermission.value);

const inputPermissionNeedsRecovery = computed(() => {
  const diagnostics = inputPermissionDiagnostics.value;
  if (!diagnostics) return !hasInputPermission.value;
  return !diagnostics.trusted || diagnostics.recommendedAction !== 'allow';
});

const shortBundleIdentifier = computed(() => {
  const bundleId = inputPermissionDiagnostics.value?.bundleIdentifier ?? '';
  if (bundleId.length <= 34) return bundleId;
  return `…${bundleId.slice(-31)}`;
});

const inputPermissionActionText = computed(() => {
  switch (inputPermissionDiagnostics.value?.recommendedAction) {
    case 'remove_stale_entry':
      return 'Bản `.app` build lại đã đổi chữ ký nên entry Accessibility cũ vô dụng. Quit app, xoá entry Android Stream Desk cũ trong Accessibility, kéo đúng .app mới vào, bật lại rồi mở app.';
    case 'restart_app':
      return 'macOS đã trust process native, nhưng probe input vẫn lỗi. Hãy quit và mở lại Companion để TCC cache nạp lại quyền.';
    case 'open_settings':
      return 'Mở Accessibility Settings và bật Android Stream Desk cho binary đang chạy.';
    case 'allow':
      return 'Quyền Accessibility native đang hợp lệ.';
    default:
      return 'Kiểm tra Accessibility để biết app/path nào đang được macOS trust.';
  }
});

const showAccessibilityRecovery = computed(
  () =>
    isMacPlatform.value &&
    inputPermissionChecked.value &&
    (inputPermissionNeedsRecovery.value || accessibilityRecoveryRequested.value),
);

const clearPermissionPollIfHealthy = () => {
  if (!inputPermissionNeedsRecovery.value && permissionPollTimer !== null) {
    clearInterval(permissionPollTimer);
    permissionPollTimer = null;
  }
};

const ensurePermissionPoll = () => {
  if (inputPermissionNeedsRecovery.value && permissionPollTimer === null) {
    permissionPollTimer = setInterval(probePermission, 3000);
  }
};

const probePermission = async () => {
  try {
    // @ts-ignore
    if (!window.__TAURI_INTERNALS__) return;
    const { invoke } = await import('@tauri-apps/api/core');
    try {
      inputPermissionDiagnostics.value = await invoke<InputPermissionDiagnostics>(
        'get_input_permission_diagnostics',
      );
      legacyInputPermission.value = inputPermissionDiagnostics.value.trusted;
    } catch (diagnosticsError) {
      console.warn('get_input_permission_diagnostics failed, falling back:', diagnosticsError);
      const ok = await invoke<boolean>('probe_input_permission');
      inputPermissionDiagnostics.value = null;
      legacyInputPermission.value = ok;
    }
    inputPermissionChecked.value = true;
    clearPermissionPollIfHealthy();
    ensurePermissionPoll();
    // Quyền đã hợp lệ → bỏ cờ mở panel thủ công để panel có thể tự ẩn.
    if (!inputPermissionNeedsRecovery.value) {
      accessibilityRecoveryRequested.value = false;
    }
  } catch (e) {
    console.error('probe_input_permission failed:', e);
  }
};

const copyPermissionDetail = async (
  value: string | null | undefined,
  key: 'executable' | 'bundle' | 'bundleId',
) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    permissionCopyHint.value = key;
    setTimeout(() => {
      if (permissionCopyHint.value === key) permissionCopyHint.value = '';
    }, 1500);
  } catch (e) {
    console.error('copy permission detail failed:', e);
  }
};

const scrollToAccessibilityRecovery = async () => {
  accessibilityRecoveryRequested.value = true;
  await probePermission();
  requestAnimationFrame(() => {
    accessibilityRecoveryRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

onMounted(async () => {
  window.addEventListener('keydown', handleEscKey);
  try {
    // @ts-ignore
    if (window.__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      const { getVersion } = await import('@tauri-apps/api/app');

      appVersion.value = await getVersion();

      try {
        const { isEnabled } = await import('@tauri-apps/plugin-autostart');
        autostartOn.value = await isEnabled();
      } catch (err) {
        console.warn('Failed to load autostart status:', err);
      }

      // Attach Tauri event listeners BEFORE reading the startup snapshot so a
      // (re)bind event firing during init isn't lost — otherwise runningWsPort/
      // webReady could stay stale until the next mount.
      const { listen } = await import('@tauri-apps/api/event');
      const unlistenCount = await listen<{ count: number }>('client-count-changed', (e) => {
        activeConnectionsCount.value = e.payload.count;
      });
      // WS bind errors only — web bind errors arrive on the separate
      // `server-web-error` event (WsServerErrorPayload carries no `kind`).
      const unlistenError = await listen<ListenerBindError>('server-error', (e) => {
        wsReady.value = false;
        runningWsPort.value = null;
        wsBindError.value = e.payload;
      });
      const unlistenReady = await listen<{ port: number }>('server-ready', (e) => {
        wsReady.value = true;
        runningWsPort.value = e.payload.port;
        wsBindError.value = null;
      });
      const unlistenWebReady = await listen<{ port: number }>('server-web-ready', () => {
        webReady.value = true;
        webBindError.value = null;
      });
      const unlistenWebError = await listen<ListenerBindError>('server-web-error', (e) => {
        webReady.value = false;
        webBindError.value = e.payload;
      });
      const unlistenActionError = await listen<{ error?: string; message?: string }>(
        'action-error',
        (e) => {
          const message = e.payload.error || e.payload.message || '';
          if (/Accessibility/i.test(message)) {
            accessibilityRecoveryRequested.value = true;
            void probePermission();
          }
        },
      );
      tauriUnlisteners.push(
        unlistenCount,
        unlistenError,
        unlistenReady,
        unlistenWebReady,
        unlistenWebError,
        unlistenActionError,
      );

      const info = await invoke<ServerInfo>('get_server_info');
      serverIp.value = info.ip;
      serverPort.value = info.configuredWsPort || info.port;
      runningWsPort.value = info.runningWsPort;
      wsReady.value = info.wsReady;
      wsBindError.value = info.wsBindError;
      webReady.value = info.webReady;
      webBindError.value = info.webBindError;
      await loadServerConfig(invoke);

      await probePermission();
      // Poll until granted — user may toggle Accessibility while app runs.
      ensurePermissionPoll();
      window.addEventListener('focus', probePermission);
    } else {
      const fallback = { wsPort: serverPort.value, webEnabled: false, webPort: 8090 };
      wsReady.value = true;
      runningWsPort.value = serverPort.value;
      savedServerConfig.value = fallback;
      serverConfigDraft.value = toServerConfigDraft(fallback);
      serverConfigLoaded.value = true;
    }
  } catch (e) {
    console.error('Failed initialization:', e);
    if (!serverConfigLoaded.value) {
      const fallback = { wsPort: serverPort.value, webEnabled: false, webPort: 8090 };
      wsReady.value = true;
      runningWsPort.value = serverPort.value;
      savedServerConfig.value = fallback;
      serverConfigDraft.value = toServerConfigDraft(fallback);
      serverConfigLoaded.value = true;
    }
  }
});

const copyAddress = async () => {
  if (serverIp.value === '—') return;
  const addr = `${serverIp.value}:${serverPort.value}`;
  try {
    await navigator.clipboard.writeText(addr);
    copyHint.value = 'Copied!';
    setTimeout(() => (copyHint.value = ''), 1500);
  } catch (_) {
    copyHint.value = 'Failed';
  }
};

const copyWebClientUrl = async () => {
  if (!webClientUrl.value) return;
  try {
    await navigator.clipboard.writeText(webClientUrl.value);
    webCopyHint.value = 'Copied!';
    setTimeout(() => (webCopyHint.value = ''), 1500);
  } catch (_) {
    webCopyHint.value = 'Failed';
  }
};

const copyApkConnectPayload = async () => {
  if (!apkConnectPayload.value) return;
  try {
    await navigator.clipboard.writeText(apkConnectPayload.value);
    apkCopyHint.value = 'Copied!';
    setTimeout(() => (apkCopyHint.value = ''), 1500);
  } catch (_) {
    apkCopyHint.value = 'Failed';
  }
};

const copyColor = async () => {
  if (!selectedButton.value?.backgroundColor) return;
  try {
    await navigator.clipboard.writeText(selectedButton.value.backgroundColor);
    colorCopyHint.value = 'Copied!';
    setTimeout(() => (colorCopyHint.value = ''), 1500);
  } catch (_) {
    colorCopyHint.value = 'Failed';
  }
};

const selectedButton = computed(() => {
  return layoutStore.currentButtons.find(btn => btn.id === selectedButtonId.value) || null;
});

watch(selectedButton, newVal => {
  if (newVal) {
    activeTab.value = newVal.actionType;
  }
});

const hexDraft = ref<string>('');
const hexDraftValid = ref<boolean>(true);
const hexInputFocused = ref<boolean>(false);

watch(
  () => selectedButton.value?.backgroundColor,
  val => {
    if (hexInputFocused.value) return;
    hexDraft.value = val ?? '';
    hexDraftValid.value = true;
  },
  { immediate: true },
);

function onHexDraftInput() {
  const stripped = hexDraft.value.trim().replace(/^#/, '');
  hexDraftValid.value = stripped.length < 3 || normalizeHex(hexDraft.value) !== null;
}

function onHexDraftFocus() {
  hexInputFocused.value = true;
}

function onHexDraftBlur() {
  hexInputFocused.value = false;
  commitHex();
}

function commitHex() {
  if (!selectedButton.value) return;
  const out = normalizeHex(hexDraft.value);
  if (out) {
    selectedButton.value.backgroundColor = out;
    hexDraft.value = out;
    hexDraftValid.value = true;
    saveButtonSettings();
  } else {
    hexDraft.value = selectedButton.value.backgroundColor;
    hexDraftValid.value = true;
  }
}

const selectButton = (id: string) => {
  selectedButtonId.value = id;
};

const updateGridDimensions = (type: 'rows' | 'cols', delta: number) => {
  let newRows = layoutStore.layout.rows;
  let newCols = layoutStore.layout.cols;

  if (type === 'rows') newRows = Math.max(2, Math.min(6, newRows + delta));
  if (type === 'cols') newCols = Math.max(2, Math.min(8, newCols + delta));

  const totalButtonsNeeded = newRows * newCols;
  const currentButtons = [...layoutStore.currentButtons];
  let newButtons: ButtonConfig[] = [];

  for (let i = 0; i < totalButtonsNeeded; i++) {
    if (currentButtons[i]) {
      newButtons.push(currentButtons[i]);
    } else {
      newButtons.push({
        id: `btn_${Date.now()}_${i}`,
        label: `Button ${i + 1}`,
        icon: 'mdi:button',
        backgroundColor: '#1e293b',
        actionType: 'shortcut',
        shortcutValue: 'Ctrl+F1',
      });
    }
  }

  layoutStore.resizeGrid(newRows, newCols, newButtons);

  if (selectedButtonId.value && !newButtons.some(b => b.id === selectedButtonId.value)) {
    selectedButtonId.value = null;
  }
};

// --- Drag & Drop (vue-draggable-plus) ---
// Directive mutate array in place. Just persist + broadcast.
function onUpdate() {
  layoutStore.broadcastSync();
}

// --- Manual Sync ---
const syncLayout = () => {
  const connectionStore = useConnectionStore();
  layoutStore.broadcastSync();
  if (syncTimer !== null) clearTimeout(syncTimer);
  const isConnected = connectionStore.status === 'connected';
  syncHint.value = isConnected ? 'Đã đồng bộ!' : 'Đã đồng bộ cục bộ';
  syncTimer = setTimeout(() => {
    syncHint.value = '';
    syncTimer = null;
  }, 1500);
};

let saveTimer: number | null = null;
const setButtonKind = (kind: 'action' | 'monitor') => {
  if (!selectedButton.value) return;
  selectedButton.value.buttonKind = kind;
  if (kind === 'monitor') {
    if (!selectedButton.value.monitorConfig) {
      selectedButton.value.monitorConfig = { metricType: 'cpu_percent', intervalMs: 5000 };
    }
  } else {
    selectedButton.value.monitorConfig = undefined;
  }
  saveButtonSettings();
};

const saveButtonSettings = () => {
  if (selectedButton.value && selectedButton.value.buttonKind !== 'monitor') {
    selectedButton.value.actionType = activeTab.value;
  }
  layoutStore.updateLayout({ ...layoutStore.layout });
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
  }, 250);
};

const importInput = ref<HTMLInputElement | null>(null);

const handleExport = async () => {
  try {
    const ok = await layoutStore.exportLayout();
    if (ok) {
      layoutStore.lastToast = {
        kind: 'info',
        message: 'Đã xuất cấu hình ra file JSON.',
        at: Date.now(),
      };
    }
  } catch (e: any) {
    layoutStore.lastToast = {
      kind: 'error',
      message: `Export lỗi: ${e?.message ?? e}`,
      at: Date.now(),
    };
  }
};

const triggerImport = () => {
  importInput.value?.click();
};

const handleImport = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    await layoutStore.importLayout(file);
    selectedButtonId.value = null;
    layoutStore.lastToast = {
      kind: 'info',
      message: `Đã nạp cấu hình từ "${file.name}".`,
      at: Date.now(),
    };
  } catch (err: any) {
    layoutStore.lastToast = {
      kind: 'error',
      message: `Import lỗi: ${err?.message ?? err}`,
      at: Date.now(),
    };
  }
};

const toastNeedsAccessibility = computed(() => {
  const msg = layoutStore.lastToast?.message ?? '';
  return /Accessibility/i.test(msg);
});

const dismissToast = () => {
  layoutStore.lastToast = null;
};

const openAccessibilitySettings = async () => {
  try {
    // @ts-ignore
    if (window.__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_accessibility_settings');
    }
  } catch (e) {
    console.error('open_accessibility_settings failed:', e);
  }
};

const updateStatusText = computed(() => {
  switch (updaterStore.state) {
    case 'checking':
      return 'Đang kiểm tra bản cập nhật…';
    case 'no-update':
      return 'Ứng dụng ở phiên bản mới nhất.';
    case 'available':
      return `Bản cập nhật v${updaterStore.update?.version} đã sẵn sàng.`;
    case 'downloading':
      return `Đang tải xuống… ${updaterStore.progressPct}%`;
    case 'ready':
      return 'Đã tải xong — đang tiến hành cài đặt.';
    case 'error':
      return updaterStore.errorMsg ?? 'Kiểm tra cập nhật lỗi.';
    default:
      return '';
  }
});
</script>

<template>
  <div
    class="cyber-dashboard h-screen w-screen flex flex-col p-6 overflow-hidden gap-6 antialiased select-none relative"
  >
    <!-- Ambient background glows -->
    <div
      class="pointer-events-none absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/3 blur-[150px]"
    />
    <div
      class="pointer-events-none absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-500/3 blur-[130px]"
    />

    <!-- Scanline overlay (subtle) -->
    <div class="dashboard-scanline fixed inset-0 pointer-events-none opacity-[0.015]" />

    <!-- Error toast (Enigo / shortcut failures) -->
    <transition name="fade">
      <div
        v-if="layoutStore.lastToast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cyber-panel max-w-[520px] flex items-start gap-3 px-4 py-3 shadow-2xl"
        :class="
          layoutStore.lastToast.kind === 'error' ? 'border-rose-500/40' : 'border-cyan-400/30'
        "
      >
        <Icon
          :icon="layoutStore.lastToast.kind === 'error' ? 'lucide:alert-triangle' : 'lucide:info'"
          class="text-base shrink-0 mt-0.5"
          :class="layoutStore.lastToast.kind === 'error' ? 'text-rose-400' : 'text-cyan-400'"
        />
        <div class="flex-1 flex flex-col gap-2">
          <p class="text-[11px] leading-relaxed text-slate-200">
            {{ layoutStore.lastToast.message }}
          </p>
          <div v-if="toastNeedsAccessibility" class="flex gap-2">
            <button
              type="button"
              class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1"
              @click="scrollToAccessibilityRecovery"
            >
              Xem panel khôi phục
            </button>
          </div>
        </div>
        <button
          type="button"
          class="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
          @click="dismissToast"
          title="Đóng"
        >
          <Icon icon="lucide:x" class="text-sm" />
        </button>
      </div>
    </transition>

    <!-- Top Nav HUD Header -->
    <div class="cyber-panel flex flex-col md:flex-row gap-3 md:items-center md:justify-between px-4 py-2.5 shadow-xl">
      <div class="flex items-center gap-2">
        <!-- <div
          class="h-8 w-8 cyber-hex flex items-center justify-center"
        >
          ...
        </div> -->
        <img src="/logo.png" alt="Logo" class="h-8 w-8" />
        <div class="flex flex-col leading-none">
          <span class="text-xs font-bold tracking-tight text-slate-50">Android Stream Desk</span>
          <span class="text-[8.5px] text-cyan-400/60 font-bold tracking-wider uppercase mt-0.5"
            >companion control panel</span
          >
        </div>
      </div>

      <!-- Right Header: IP + Settings -->
      <div class="flex flex-wrap items-center gap-2.5 md:gap-3 justify-end">
        <div class="cyber-hud flex items-center gap-3 px-4 py-2">
          <span
            class="inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse"
          ></span>
          <div class="flex flex-col">
            <label class="text-[9px] uppercase tracking-widest font-bold text-slate-500"
              >WebSocket LAN IP</label
            >
            <span class="font-mono text-xs font-bold text-slate-300">
              {{ serverIp }}<span class="text-slate-600">:</span>{{ serverPort }}
            </span>
          </div>
          <button
            class="cyber-action-btn ml-2 font-bold cursor-pointer disabled:opacity-50 text-[10px] uppercase tracking-wider px-3 py-1"
            @click="copyAddress"
            :disabled="serverIp === '—'"
          >
            {{ copyHint || 'Copy' }}
          </button>
        </div>

        <!-- HUD: Active Connections Counter (AC: 2) -->
        <div class="cyber-hud flex items-center gap-3 px-4 py-2">
          <Icon
            icon="lucide:users"
            class="text-sm shrink-0"
            :class="activeConnectionsCount > 0 ? 'text-emerald-400' : 'text-slate-500'"
          />
          <div class="flex flex-col">
            <label class="text-[9px] uppercase tracking-widest font-bold text-slate-500">Đang kết nối</label>
            <span class="font-mono text-xs font-bold" :class="activeConnectionsCount > 0 ? 'text-emerald-300' : 'text-slate-500'">
              {{ activeConnectionsCount }} thiết bị
            </span>
          </div>
        </div>

        <!-- HUD: Listener Health Badge -->
        <div
          class="cyber-hud flex items-center gap-2.5 px-3.5 py-2 max-w-[320px]"
          :class="listenerHealthBadge.classes"
          :title="listenerHealthBadge.title"
        >
          <Icon
            :icon="listenerHealthBadge.icon"
            class="text-base shrink-0"
            :class="listenerHealthBadge.iconClass"
          />
          <div class="flex flex-col leading-tight min-w-0">
            <span class="text-[9px] font-bold uppercase tracking-wider">
              {{ listenerHealthBadge.label }}
            </span>
            <button
              v-if="wsBindError || webBindError"
              type="button"
              class="text-[8px] text-slate-400 hover:text-cyan-400 transition-colors text-left underline decoration-dotted cursor-pointer font-medium mt-0.5 truncate"
              @click="openGuide('firewall')"
            >
              Hướng dẫn mở khóa Tường lửa & Sửa dải cổng mạng
            </button>
            <span v-else class="font-mono text-[9px] text-slate-400 mt-0.5">
              {{ listenerHealthBadge.detail }}
            </span>
          </div>
        </div>

        <div
          v-if="webClientUrl"
          class="cyber-hud hidden xl:flex items-center gap-3 px-4 py-2 max-w-[420px]"
        >
          <Icon icon="lucide:triangle-alert" class="text-amber-400 text-sm shrink-0" />
          <div class="flex flex-col min-w-0">
            <label class="text-[9px] uppercase tracking-widest font-bold text-amber-300/80"
              >Chỉ bật trên Wi-Fi tin cậy</label
            >
            <span class="font-mono text-xs font-bold text-slate-300 truncate">
              {{ webClientUrl }}
            </span>
          </div>
          <button
            class="cyber-action-btn ml-1 font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1 shrink-0"
            @click="copyWebClientUrl"
          >
            {{ webCopyHint || 'Copy' }}
          </button>
        </div>

        <!-- Sync button -->
        <button
          class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
          @click="syncLayout"
          title="Đồng bộ cấu hình sang thiết bị Android"
        >
          <Icon :icon="syncHint ? 'lucide:check' : 'lucide:refresh-cw'" class="text-xs" />
          <span>{{ syncHint || 'Sync' }}</span>
        </button>

        <input
          ref="importInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="handleImport"
        />

        <button
          class="cyber-icon-btn cursor-pointer flex items-center justify-center animate-pulse"
          @click="settingsOpen = true"
          title="Thiết lập hệ thống & Cập nhật"
        >
          <Icon
            icon="lucide:settings"
            class="text-lg text-cyan-400/70 hover:text-cyan-300 transition-colors"
          />
        </button>
      </div>
    </div>

    <!-- Accessibility recovery panel (macOS) -->
    <div
      v-if="showAccessibilityRecovery"
      ref="accessibilityRecoveryRef"
      class="cyber-panel flex flex-col gap-3 px-4 py-3 border-rose-500/40"
    >
      <div class="flex flex-col gap-3 xl:flex-row xl:items-start">
        <Icon icon="lucide:shield-alert" class="text-base text-rose-400 shrink-0 mt-0.5" />
        <div class="flex-1 flex flex-col gap-2 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
              Khôi phục Accessibility permission
            </span>
            <button
              type="button"
              class="font-mono text-[9px] text-cyan-300 hover:text-cyan-200 cursor-pointer underline decoration-dotted"
              :title="inputPermissionDiagnostics?.bundleIdentifier || 'Bundle identifier'"
              @click="
                copyPermissionDetail(inputPermissionDiagnostics?.bundleIdentifier, 'bundleId')
              "
            >
              {{
                permissionCopyHint === 'bundleId'
                  ? 'Đã copy bundle id'
                  : shortBundleIdentifier || 'bundle id chưa rõ'
              }}
            </button>
          </div>
          <p class="text-[10px] text-slate-400 leading-relaxed">
            {{ inputPermissionActionText }} Quy trình reset dev build: quit app → xoá entry cũ →
            kéo đúng `.app` vào Accessibility → bật lại → mở app → kiểm tra lại.
          </p>
          <div class="grid gap-2 xl:grid-cols-2">
            <button
              type="button"
              class="cyber-inset flex min-w-0 items-center justify-between gap-2 p-2 text-left cursor-pointer"
              :disabled="!inputPermissionDiagnostics?.executablePath"
              @click="copyPermissionDetail(inputPermissionDiagnostics?.executablePath, 'executable')"
              title="Sao chép executablePath"
            >
              <span class="min-w-0">
                <span class="block text-[9px] uppercase tracking-widest font-bold text-slate-500">
                  executablePath
                </span>
                <span class="block font-mono text-[9px] text-slate-300 truncate select-text">
                  {{ inputPermissionDiagnostics?.executablePath || 'Không resolve được' }}
                </span>
              </span>
              <Icon
                :icon="permissionCopyHint === 'executable' ? 'lucide:check' : 'lucide:copy'"
                class="text-xs text-cyan-400 shrink-0"
              />
            </button>
            <button
              type="button"
              class="cyber-inset flex min-w-0 items-center justify-between gap-2 p-2 text-left cursor-pointer"
              :disabled="!inputPermissionDiagnostics?.appBundlePath"
              @click="copyPermissionDetail(inputPermissionDiagnostics?.appBundlePath, 'bundle')"
              title="Sao chép appBundlePath"
            >
              <span class="min-w-0">
                <span class="block text-[9px] uppercase tracking-widest font-bold text-slate-500">
                  appBundlePath
                </span>
                <span class="block font-mono text-[9px] text-slate-300 truncate select-text">
                  {{
                    inputPermissionDiagnostics?.appBundlePath ||
                    (inputPermissionDiagnostics?.isPackagedApp ? 'Không resolve được' : 'Dev binary')
                  }}
                </span>
              </span>
              <Icon
                :icon="permissionCopyHint === 'bundle' ? 'lucide:check' : 'lucide:copy'"
                class="text-xs text-cyan-400 shrink-0"
              />
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 xl:justify-end">
          <button
            class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
            @click="openAccessibilitySettings"
          >
            <Icon icon="lucide:external-link" class="text-xs" />
            <span>Mở Accessibility Settings</span>
          </button>
          <button
            class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
            @click="probePermission"
            title="Kiểm tra lại quyền"
          >
            <Icon icon="lucide:refresh-cw" class="text-xs" />
            <span>Kiểm tra lại</span>
          </button>
        </div>
      </div>
    </div>

    <!-- First-Run Checklist Card (AC: 1) -->
    <transition name="fade">
      <div
        v-if="!firstRunDismissed"
        class="cyber-panel flex flex-col gap-3 px-4 py-3 border-cyan-400/30"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon icon="lucide:clipboard-list" class="text-base text-cyan-400 shrink-0" />
            <span class="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Checklist cài đặt Companion</span>
          </div>
          <button
            type="button"
            class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1 flex items-center gap-1.5"
            @click="dismissFirstRun"
            title="Ẩn vĩnh viễn"
          >
            <Icon icon="lucide:x" class="text-xs" />
            <span>Dismiss</span>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <div class="cyber-inset flex items-start gap-2 p-3">
            <Icon icon="lucide:power" class="text-sm text-cyan-400 shrink-0 mt-0.5" />
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-bold text-slate-200">Khởi động cùng hệ thống</span>
              <span class="text-[9px] text-slate-500 leading-relaxed">Bật toggle tự động khởi động trong Settings → General</span>
            </div>
          </div>
          <div class="cyber-inset flex items-start gap-2 p-3">
            <Icon icon="lucide:shield" class="text-sm text-amber-400 shrink-0 mt-0.5" />
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-bold text-slate-200">Firewall / Port Rule</span>
              <span class="text-[9px] text-slate-500 leading-relaxed">Cho phép cổng WebSocket qua Windows Defender Firewall</span>
            </div>
          </div>
          <div class="cyber-inset flex items-start gap-2 p-3">
            <Icon icon="lucide:globe" class="text-sm text-fuchsia-400 shrink-0 mt-0.5" />
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-bold text-slate-200">Web Client (iPad)</span>
              <span class="text-[9px] text-slate-500 leading-relaxed">Bật Web Client trong Settings nếu dùng trình duyệt trên iPad</span>
            </div>
          </div>
          <div class="cyber-inset flex items-start gap-2 p-3">
            <Icon icon="lucide:qr-code" class="text-sm text-emerald-400 shrink-0 mt-0.5" />
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-bold text-slate-200">Quét QR tải APK</span>
              <span class="text-[9px] text-slate-500 leading-relaxed">Quét QR bên dưới để tải APK hoặc mở Web URL trên thiết bị Android</span>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden gap-6">
      <!-- Left Sidebar -->
      <div class="cyber-panel w-80 flex flex-col p-5 gap-5 overflow-y-auto">
        <!-- Grid Dimensions -->
        <div class="flex flex-col gap-3">
          <div>
            <h2 class="cyber-section-title">Kích thước Lưới</h2>
            <p class="cyber-section-desc">Tinh chỉnh kích cỡ cột hàng của pad</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-[9px] font-bold uppercase tracking-wider text-slate-400"
                >Dòng</label
              >
              <div class="cyber-stepper flex items-center justify-between p-1">
                <button
                  class="cyber-stepper-btn w-7 h-7 flex items-center justify-center text-sm font-semibold select-none"
                  @click="updateGridDimensions('rows', -1)"
                >
                  -
                </button>
                <span class="font-bold text-xs font-mono text-cyan-300">{{
                  layoutStore.layout.rows
                }}</span>
                <button
                  class="cyber-stepper-btn w-7 h-7 flex items-center justify-center text-sm font-semibold select-none"
                  @click="updateGridDimensions('rows', 1)"
                >
                  +
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[9px] font-bold uppercase tracking-wider text-slate-400"
                >Cột</label
              >
              <div class="cyber-stepper flex items-center justify-between p-1">
                <button
                  class="cyber-stepper-btn w-7 h-7 flex items-center justify-center text-sm font-semibold select-none"
                  @click="updateGridDimensions('cols', -1)"
                >
                  -
                </button>
                <span class="font-bold text-xs font-mono text-cyan-300">{{
                  layoutStore.layout.cols
                }}</span>
                <button
                  class="cyber-stepper-btn w-7 h-7 flex items-center justify-center text-sm font-semibold select-none"
                  @click="updateGridDimensions('cols', 1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- QR Codes & Connection Tabs -->
        <div class="cyber-divider pt-4 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="cyber-section-title">Kết nối thiết bị</h2>
            <div class="flex gap-1">
              <button
                type="button"
                class="px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded border transition-colors cursor-pointer"
                :class="activeQrTab === 'apk' ? 'border-cyan-400/50 text-cyan-300 bg-cyan-950/40' : 'border-slate-800 text-slate-500 hover:text-slate-350'"
                @click="activeQrTab = 'apk'"
              >
                APK
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded border transition-colors cursor-pointer"
                :class="activeQrTab === 'web' ? 'border-cyan-400/50 text-cyan-300 bg-cyan-950/40' : 'border-slate-800 text-slate-500 hover:text-slate-350'"
                @click="activeQrTab = 'web'"
              >
                Web
              </button>
            </div>
          </div>

          <!-- APK Tab Content -->
          <div v-show="activeQrTab === 'apk'" class="flex flex-col gap-2.5">
            <div class="flex justify-between items-center gap-1">
              <p class="cyber-section-desc">LAN IP cho Android app</p>
              <button
                type="button"
                class="cyber-action-btn font-bold cursor-pointer text-[9px] uppercase tracking-wider px-2 py-1 flex items-center gap-1"
                @click="copyApkConnectPayload"
                :disabled="!apkConnectPayload"
                title="Sao chép payload kết nối APK"
              >
                <Icon :icon="apkCopyHint ? 'lucide:check' : 'lucide:copy'" class="text-[10px]" />
                <span>{{ apkCopyHint || 'Copy' }}</span>
              </button>
            </div>

            <div class="flex flex-col items-center justify-center p-3 cyber-inset relative min-h-[224px]">
              <div v-if="!apkConnectPayload || wsBindError" class="absolute inset-0 bg-slate-950/90 rounded-lg flex flex-col items-center justify-center p-4 text-center z-10 leading-normal gap-2 border border-rose-500/20">
                <Icon :icon="wsBindError ? 'lucide:wifi-off' : 'lucide:loader-2'" class="text-lg animate-pulse text-rose-400" />
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {{ wsBindError ? 'Bind Error' : 'Chưa sẵn sàng' }}
                </span>
                <p class="text-[8.5px] text-slate-500">
                  {{ wsBindError ? 'Cổng WebSocket lỗi Firewall hoặc xung đột.' : 'Companion server đang khởi động.' }}
                </p>
              </div>

              <button
                v-if="apkConnectQrSvg"
                type="button"
                class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in shadow-[0_0_18px_rgba(34,211,238,0.08)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
                @click="openZoomModal('Kết nối APK', apkConnectPayload, apkConnectQrSvg)"
                @keydown.enter="openZoomModal('Kết nối APK', apkConnectPayload, apkConnectQrSvg)"
                @keydown.space.prevent="openZoomModal('Kết nối APK', apkConnectPayload, apkConnectQrSvg)"
                title="Click để phóng to mã QR"
                aria-label="Mã QR APK. Nhấn Enter hoặc Space để phóng to."
              >
                <div v-html="apkConnectQrSvg" class="w-full h-full"></div>
              </button>
            </div>

            <div class="px-1 text-[8.5px] text-slate-500 flex flex-col gap-0.5 leading-relaxed">
              <span class="font-bold text-[8px] uppercase tracking-wider text-slate-450">Payload:</span>
              <span class="font-mono break-all line-clamp-2 select-text selection:bg-cyan-550/30">{{ apkConnectPayload || '—' }}</span>
            </div>
          </div>

          <!-- Web Client Tab Content -->
          <div v-show="activeQrTab === 'web'" class="flex flex-col gap-2.5">
            <div class="flex justify-between items-center gap-1">
              <p class="cyber-section-desc">Mở Web client trên iPad / Browser</p>
              <button
                type="button"
                class="cyber-action-btn font-bold cursor-pointer text-[9px] uppercase tracking-wider px-2 py-1 flex items-center gap-1"
                @click="copyWebClientUrl"
                :disabled="!webClientUrl"
                title="Sao chép địa chỉ Web Client"
              >
                <Icon :icon="webCopyHint ? 'lucide:check' : 'lucide:copy'" class="text-[10px]" />
                <span>{{ webCopyHint || 'Copy' }}</span>
              </button>
            </div>

            <div class="flex flex-col items-center justify-center p-3 cyber-inset relative min-h-[224px]">
              <div v-if="!webClientUrl || webBindError || !savedServerConfig?.webEnabled" class="absolute inset-0 bg-slate-950/90 rounded-lg flex flex-col items-center justify-center p-4 text-center z-10 leading-normal gap-2 border border-amber-500/20">
                <Icon :icon="webBindError ? 'lucide:wifi-off' : !savedServerConfig?.webEnabled ? 'lucide:settings-2' : 'lucide:loader-2'" class="text-lg animate-pulse text-amber-400" />
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {{ webBindError ? 'Bind Error' : !savedServerConfig?.webEnabled ? 'Chưa bật Web Client' : 'Chưa sẵn sàng' }}
                </span>
                <p class="text-[8.5px] text-slate-500">
                  {{ webBindError ? 'Cổng Web Server bị xung đột.' : !savedServerConfig?.webEnabled ? 'Hãy bật Web Client trong Cài đặt phía dưới.' : 'Companion HTTP đang khởi chạy.' }}
                </p>
              </div>

              <button
                v-if="webClientQrSvg"
                type="button"
                class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in shadow-[0_0_18px_rgba(34,211,238,0.08)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
                @click="openZoomModal('Web Client LAN', webClientUrl, webClientQrSvg)"
                @keydown.enter="openZoomModal('Web Client LAN', webClientUrl, webClientQrSvg)"
                @keydown.space.prevent="openZoomModal('Web Client LAN', webClientUrl, webClientQrSvg)"
                title="Click để phóng to mã QR"
                aria-label="Mã QR Web Client. Nhấn Enter hoặc Space để phóng to."
              >
                <div v-html="webClientQrSvg" class="w-full h-full"></div>
              </button>
            </div>

            <div class="px-1 text-[8.5px] text-slate-500 flex flex-col gap-0.5 leading-relaxed">
              <span class="font-bold text-[8px] uppercase tracking-wider text-slate-450">Địa chỉ URL:</span>
              <span class="font-mono break-all line-clamp-2 select-text selection:bg-cyan-550/30">{{ webClientUrl || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Button Config -->
        <div class="flex-1 flex flex-col cyber-divider pt-4 gap-4">
          <div>
            <h2 class="cyber-section-title">Cấu hình phím</h2>
            <p class="cyber-section-desc">Biên tập chi tiết nhãn, biểu tượng, sự kiện</p>
          </div>

          <div v-if="selectedButton" class="flex flex-col gap-4">
            <!-- Label -->
            <div class="flex flex-col gap-1.5">
              <label class="cyber-input-label">Nhãn chữ</label>
              <Input
                v-model="selectedButton.label"
                type="text"
                class="shadow-inner"
                @input="saveButtonSettings"
              />
            </div>

            <!-- Icon & Color -->
            <div class="flex flex-col gap-1.5">
              <label class="cyber-input-label">Biểu tượng & Màu sắc</label>
              <div class="flex flex-col gap-3">
                <div class="flex gap-2">
                  <div class="h-10 w-12 cyber-inset flex items-center justify-center overflow-hidden">
                    <img
                      v-if="selectedButton.icon?.startsWith('data:')"
                      :src="selectedButton.icon"
                      class="max-w-full max-h-full object-contain"
                    />
                    <Icon
                      v-else
                      :icon="selectedButton.icon || 'mdi:button'"
                      class="text-xl text-cyan-300"
                    />
                  </div>
                  <div
                    class="flex-1 relative flex justify-between items-center cyber-inset overflow-hidden px-2"
                  >
                    <div class="flex items-center">
                      <input
                        v-model="selectedButton.backgroundColor"
                        type="color"
                        class="h-6 w-9 rounded-md border-0 bg-transparent cursor-pointer"
                        @input="saveButtonSettings"
                      />
                      <input
                        v-model="hexDraft"
                        type="text"
                        spellcheck="false"
                        maxlength="7"
                        placeholder="#rrggbb"
                        class="ml-2 font-mono text-[10px] text-slate-300 uppercase font-semibold bg-transparent border px-1.5 py-0.5 w-[68px] focus:outline-none focus:border-cyan-400 transition-colors"
                        :class="hexDraftValid ? 'border-cyan-400/20' : 'border-rose-500/70'"
                        :title="
                          hexDraftValid
                            ? 'Nhập mã hex (#rgb hoặc #rrggbb)'
                            : 'Mã hex không hợp lệ — sẽ revert khi rời focus'
                        "
                        @focus="onHexDraftFocus"
                        @input="onHexDraftInput"
                        @blur="onHexDraftBlur"
                        @keyup.enter="commitHex"
                      />
                    </div>
                    <button
                      type="button"
                      @click="copyColor"
                      class="text-slate-400 hover:text-cyan-400 cursor-pointer select-none flex items-center gap-1 focus:outline-none transition-colors"
                      :title="colorCopyHint || 'Sao chép mã màu'"
                    >
                      <span
                        v-if="colorCopyHint"
                        class="text-[8px] uppercase tracking-wider font-extrabold text-cyan-400 font-mono"
                        >{{ colorCopyHint }}</span
                      >
                      <Icon
                        :icon="colorCopyHint ? 'lucide:check' : 'lucide:copy'"
                        class="text-xs"
                        :class="{ 'text-cyan-400': colorCopyHint }"
                      />
                    </button>
                  </div>
                </div>

                 <!-- Icon Picker -->
                <div class="cyber-inset p-2.5 flex flex-col gap-2">
                  <div class="flex flex-col gap-1.5 cyber-divider pb-2">
                    <div class="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                      <div class="flex flex-wrap items-center gap-1 min-w-0">
                        <button
                          v-for="group in ['mdi', 'lucide', 'material', 'si'] as const"
                          :key="group"
                          @click="activeIconGroup = group"
                          type="button"
                          class="text-[9px] uppercase tracking-wider font-extrabold px-1 py-0.5 cursor-pointer duration-100 whitespace-nowrap"
                          :class="
                            activeIconGroup === group
                              ? 'cyber-tab-active'
                              : 'text-slate-500 hover:text-slate-300'
                          "
                        >
                          {{ group === 'si' ? 'brands' : group }}
                        </button>
                      </div>
                      
                      <!-- Upload Custom Icon Button (S-IMG1) -->
                      <div class="shrink-0 flex items-center gap-1.5">
                        <input
                          type="file"
                          ref="iconFileInput"
                          accept="image/png,image/jpeg"
                          class="hidden"
                          @change="handleCustomIconUpload"
                        />
                        <button
                          type="button"
                          @click="($refs.iconFileInput as HTMLInputElement).click()"
                          class="text-[8px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-0.5 whitespace-nowrap shrink-0"
                          title="Tải ảnh PNG/JPG từ máy tính làm biểu tượng nút"
                        >
                          <Icon icon="lucide:upload" class="text-[8px]" />
                          Tải ảnh
                        </button>

                        <!-- Icon Scale Option Dropdown (S-IMG1 Extension) -->
                        <select
                          v-if="selectedButton.icon?.startsWith('data:')"
                          v-model="selectedButton.iconSizing"
                          @change="saveButtonSettings"
                          class="text-[8px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-cyan-400 rounded px-1 py-0.5 cursor-pointer max-w-[80px] shrink-0"
                          title="Tỉ lệ phủ ảnh trên nút (Sizing Mode)"
                        >
                          <option value="normal">Gốc</option>
                          <option value="cover">Cover (Phủ)</option>
                          <option value="contain">Contain (Thừa)</option>
                          <option value="fill">Fill (Kéo)</option>
                        </select>
                      </div>
                    </div>
                    <Input
                      v-model="searchQuery"
                      placeholder="Tìm biểu tượng..."
                      class="h-6 text-[9px] py-1 px-2.5 cyber-input-sm"
                    />
                  </div>
                  <p
                    v-if="isFullSearch"
                    class="text-[8px] text-cyan-400/70 font-mono text-center leading-tight pb-0.5"
                  >
                    Đang tìm trong toàn bộ {{ packLabel }} ({{ filteredIcons.length }} kết quả)
                  </p>
                  <div
                    ref="iconScrollRef"
                    class="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto pr-1"
                    style="contain: layout"
                  >
                    <button
                      v-for="ico in visibleIcons"
                      :key="ico"
                      @click="selectIconForButton(ico)"
                      type="button"
                      class="aspect-square flex items-center justify-center cyber-icon-cell transition-all cursor-pointer select-none"
                      :class="selectedButton.icon === ico ? 'cyber-icon-cell--active' : ''"
                    >
                      <Icon :icon="ico" class="text-lg" />
                    </button>
                    <p
                      v-if="filteredIcons.length === 0"
                      class="col-span-6 text-[9px] text-slate-500 font-bold text-center py-4 uppercase"
                    >
                      Không tìm thấy biểu tượng
                    </p>
                    <div
                      ref="sentinelRef"
                      v-if="filteredIcons.length > visibleCount"
                      class="col-span-6 h-4"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Button Kind Toggle -->
            <div class="flex flex-col gap-2">
              <label class="cyber-input-label">Loại button</label>
              <div class="cyber-tab-group flex p-1 text-[10px]">
                <button
                  v-for="kind in ['action', 'monitor'] as const"
                  :key="kind"
                  @click="setButtonKind(kind)"
                  class="flex-1 text-center py-1.5 font-bold uppercase tracking-wider transition-all duration-150 h-auto cursor-pointer"
                  :class="
                    (selectedButton.buttonKind ?? 'action') === kind
                      ? 'cyber-tab-active'
                      : 'text-slate-500 hover:text-slate-300'
                  "
                >
                  {{ kind === 'action' ? 'Action' : 'Monitor' }}
                </button>
              </div>
            </div>

            <!-- Monitor Config -->
            <div
              v-if="selectedButton.buttonKind === 'monitor' && selectedButton.monitorConfig"
              class="cyber-inset p-3 flex flex-col gap-3"
            >
              <div class="flex flex-col gap-1.5">
                <label class="cyber-input-label">Dữ liệu hiển thị</label>
                <select
                  v-model="selectedButton.monitorConfig!.metricType"
                  @change="saveButtonSettings"
                  class="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
                >
                  <option value="cpu_percent">CPU Usage (%)</option>
                  <option value="ram_percent">RAM Usage (%)</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="cyber-input-label">Cập nhật mỗi (giây)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  :value="(selectedButton.monitorConfig?.intervalMs ?? 5000) / 1000"
                  @change="
                    e => {
                      if (selectedButton?.monitorConfig) {
                        selectedButton.monitorConfig.intervalMs =
                          Math.max(1, Number((e.target as HTMLInputElement).value)) * 1000;
                        saveButtonSettings();
                      }
                    }
                  "
                  class="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <!-- Action Type Tabs (hidden when monitor) -->
            <template v-if="selectedButton.buttonKind !== 'monitor'">
              <div class="flex flex-col gap-2">
                <label class="cyber-input-label">Loại sự kiện</label>
                <div class="cyber-tab-group flex p-1 text-[10px]">
                  <button
                    v-for="tab in ['shortcut', 'media', 'app', 'command', 'link'] as ActionType[]"
                    :key="tab"
                    @click="
                      activeTab = tab;
                      saveButtonSettings();
                    "
                    class="flex-1 text-center py-1.5 font-bold uppercase tracking-wider transition-all duration-150 h-auto cursor-pointer"
                    :class="
                      activeTab === tab ? 'cyber-tab-active' : 'text-slate-500 hover:text-slate-300'
                    "
                  >
                    {{ tab }}
                  </button>
                </div>
              </div>

              <!-- Tab Content Panel -->
              <div class="cyber-inset p-3">
                <!-- Shortcut -->
                <div v-if="activeTab === 'shortcut'" class="flex flex-col gap-3">
                  <div class="flex flex-col gap-2">
                    <span class="text-[9px] font-bold uppercase text-slate-400"
                      >Tổ hợp phím tắt:</span
                    >
                    <div class="relative flex items-center cyber-input-group overflow-hidden">
                      <Input
                        v-model="selectedButton.shortcutValue"
                        type="text"
                        placeholder="Chưa gán phím"
                        class="border-0 bg-transparent px-3 py-1.5 shadow-none"
                        disabled
                      />
                      <button
                        @click="toggleRecording"
                        class="cyber-record-btn h-auto text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 cursor-pointer"
                        :class="isRecording ? 'cyber-record-btn--active' : ''"
                      >
                        {{ isRecording ? 'Thu...' : 'Thu' }}
                      </button>
                    </div>
                    <p
                      class="text-[9px] text-fuchsia-400 font-semibold select-none leading-relaxed animate-pulse"
                      v-if="isRecording"
                    >
                      ⚠️ Nhấp tổ hợp phím bất kỳ trên bàn phím của bạn để ghi nhận... (Đang giữ: {{ currentRecordingPreview }})
                    </p>
                  </div>

                  <!-- Modifier toggles + manual key picker (fallback for OS-trapped combos like Cmd+Ctrl+Q on macOS) -->
                  <div v-if="isRecording" class="flex flex-col gap-2 pt-2 cyber-divider">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      Hoặc gán thủ công (cho tổ hợp bị macOS chặn):
                    </span>
                    <div class="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        @click="toggleMod('meta')"
                        class="cyber-preset-btn text-[9px] py-1 font-bold uppercase tracking-wider"
                        :class="pendingMods.meta ? 'cyber-tab-active' : ''"
                      >
                        {{ metaLabel }}
                      </button>
                      <button
                        type="button"
                        @click="toggleMod('ctrl')"
                        class="cyber-preset-btn text-[9px] py-1 font-bold uppercase tracking-wider"
                        :class="pendingMods.ctrl ? 'cyber-tab-active' : ''"
                      >
                        Ctrl
                      </button>
                      <button
                        type="button"
                        @click="toggleMod('shift')"
                        class="cyber-preset-btn text-[9px] py-1 font-bold uppercase tracking-wider"
                        :class="pendingMods.shift ? 'cyber-tab-active' : ''"
                      >
                        Shift
                      </button>
                      <button
                        type="button"
                        @click="toggleMod('alt')"
                        class="cyber-preset-btn text-[9px] py-1 font-bold uppercase tracking-wider"
                        :class="pendingMods.alt ? 'cyber-tab-active' : ''"
                      >
                        {{ altLabel }}
                      </button>
                    </div>
                    <div class="flex gap-1.5">
                      <Input
                        v-model="manualKey"
                        type="text"
                        placeholder="Phím cuối (vd: Q, F4, Space)"
                        class="flex-1 text-[10px] py-1 px-2"
                        maxlength="10"
                      />
                      <button
                        type="button"
                        @click="
                          applyManualKey(
                            manualKey.trim().length === 1
                              ? manualKey.trim().toUpperCase()
                              : manualKey.trim(),
                          )
                        "
                        :disabled="!manualKey.trim()"
                        class="cyber-action-btn font-bold text-[10px] uppercase tracking-wider px-3 py-1 cursor-pointer disabled:opacity-40"
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>
                  <div class="flex flex-col gap-1.5 pt-2 cyber-divider">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500"
                      >Mẫu gợi ý nhanh:</span
                    >
                    <div class="grid grid-cols-2 gap-1.5 max-h-[105px] overflow-y-auto pr-1">
                      <button
                        v-for="preset in shortcutPresets"
                        :key="preset.value"
                        @click="applyPreset(preset.value)"
                        class="cyber-preset-btn text-[9px] text-left px-2 py-1 h-auto truncate font-bold min-h-6"
                        :title="preset.label"
                      >
                        {{ preset.label }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Media -->
                <div v-else-if="activeTab === 'media'" class="flex flex-col gap-2">
                  <span class="text-[9px] font-bold uppercase text-slate-400">Lệnh hệ thống:</span>
                  <select
                    v-model="selectedButton.mediaAction"
                    class="w-full text-xs font-semibold cyber-select px-2.5 py-2.5 cursor-pointer"
                    @change="saveButtonSettings"
                  >
                    <option value="play_pause">Play/Pause</option>
                    <option value="volume_up">Volume (+) Tăng</option>
                    <option value="volume_down">Volume (-) Giảm</option>
                    <option value="mute">Mute Tắt âm</option>
                    <option value="next">Next Track</option>
                    <option value="prev">Previous Track</option>
                  </select>
                </div>

                 <!-- App -->
                <div v-else-if="activeTab === 'app'" class="flex flex-col gap-3">
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] font-bold uppercase text-slate-400">
                        {{
                          isMac
                            ? 'Đường dẫn App macOS (.app):'
                            : 'Đường dẫn .exe hoặc dán shortcut (.lnk):'
                        }}
                      </span>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer p-0.5 flex items-center gap-1"
                        title="Xem hướng dẫn dán Shortcut / Copy as path"
                        @click="openGuide('shortcut')"
                      >
                        <Icon icon="lucide:help-circle" class="text-xs" />
                        <span class="text-[8.5px] uppercase tracking-wider font-semibold">Trợ giúp</span>
                      </button>
                    </div>
                    <Input
                      v-model="selectedButton.appPath"
                      type="text"
                      :placeholder="
                        isMac
                          ? 'e.g. /Applications/Safari.app'
                          : 'Dán shortcut hoặc C:\\path\\app.exe --args'
                      "
                      @input="saveButtonSettings"
                      @paste="handleAppPathPaste"
                    />
                    <span
                      v-if="appPathHint"
                      class="text-[9px] font-bold"
                      :class="appPathHint.startsWith('✓') ? 'text-green-400' : 'text-red-400'"
                    >
                      {{ appPathHint }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="cyber-action-btn w-full font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-2 flex items-center justify-center gap-1.5"
                    @click="appPickerOpen = true"
                  >
                    <Icon icon="lucide:search" class="text-xs" />
                    <span>Browse installed apps...</span>
                  </button>
                  <div class="flex flex-col gap-1.5 pt-2 cyber-divider">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500"
                      >Chọn nhanh ứng dụng:</span
                    >
                    <div class="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                      <button
                        v-for="preset in appPresets"
                        :key="preset.path"
                        @click="applyAppPreset(preset)"
                        type="button"
                        class="cyber-preset-btn text-[9px] text-left px-2 py-1.5 h-auto truncate font-bold flex items-center gap-1.5"
                      >
                        <Icon :icon="preset.icon" class="text-xs text-cyan-400 shrink-0" />
                        <span class="truncate">{{ preset.name }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Command -->
                <div v-else-if="activeTab === 'command'" class="flex flex-col gap-2">
                  <span class="text-[9px] font-bold uppercase text-slate-400">Lệnh shell:</span>
                  <textarea
                    v-model="selectedButton.commandValue"
                    rows="3"
                    spellcheck="false"
                    placeholder='vd: open -a "Google Chrome" "https://github.com"'
                    class="w-full text-[11px] font-mono cyber-input-group bg-transparent px-2.5 py-2 resize-y focus:outline-none"
                    @input="saveButtonSettings"
                  ></textarea>
                  <div class="flex justify-end">
                    <button
                      type="button"
                      class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-2 flex items-center gap-1.5"
                      @click="openGuide('browser')"
                    >
                      <Icon icon="lucide:help-circle" class="text-xs" />
                      <span>Xem mẫu lệnh trợ giúp...</span>
                    </button>
                  </div>
                  <p
                    class="text-[9px] font-bold leading-relaxed text-amber-400/90 cyber-warning px-2 py-1.5"
                  >
                    ⚠ Lệnh chạy với quyền user hiện tại — chỉ dùng cho command bạn tin cậy. Trên
                    macOS/Linux qua <span class="font-mono">/bin/sh -c</span>, Windows qua
                    <span class="font-mono">cmd /C</span>.
                  </p>
                </div>

                <!-- Link (S-LINK1) -->
                <div v-else-if="activeTab === 'link'" class="flex flex-col gap-2">
                  <label class="text-[9px] font-bold uppercase text-slate-400" for="link-url-input"
                    >URL trang web:</label
                  >
                  <Input
                    id="link-url-input"
                    v-model="selectedButton.linkUrl"
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="https://github.com/ania/android-stream-desk"
                    @input="saveButtonSettings"
                  />
                  <p
                    v-if="linkUrlValidation.ok"
                    class="text-[9px] font-bold text-green-400 flex items-center gap-1"
                  >
                    <Icon icon="lucide:check-circle" class="text-xs" />
                    Mở <span class="font-mono">{{ linkUrlValidation.domain }}</span> bằng trình duyệt mặc định.
                  </p>
                  <p v-else class="text-[9px] font-bold text-red-400 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" class="text-xs" />
                    {{ linkUrlValidation.reason }}
                  </p>
                  <p class="text-[9px] font-bold leading-relaxed text-slate-500 px-2 py-1.5">
                    URL được truyền nguyên dạng cho lệnh hệ điều hành (Windows
                    <span class="font-mono">cmd /c start</span>, macOS
                    <span class="font-mono">open</span>, Linux
                    <span class="font-mono">xdg-open</span>) — không nối chuỗi shell.
                  </p>
                </div>
              </div>
            </template>
          </div>

          <!-- Empty state -->
          <div
            v-else
            class="flex flex-1 flex-col items-center justify-center p-6 text-center select-none cyber-empty my-2"
          >
            <Icon icon="lucide:pointer" class="text-2xl mb-2 text-slate-600" />
            <span
              class="text-[10px] text-slate-500 font-bold uppercase tracking-wider max-w-[200px] leading-relaxed"
            >
              Chọn ô nút bên lưới mô phỏng để gán sự kiện
            </span>
          </div>
        </div>
      </div>

      <!-- Right Preview -->
      <section
        class="cyber-panel cyber-panel--no-blur flex-1 flex flex-col p-4 relative items-center justify-center overflow-hidden"
      >
        <span
          class="absolute top-6 left-8 text-[10px] font-bold uppercase tracking-widest text-cyan-400/50 select-none"
        >
          Mô hình Stream Desk cảm ứng thực tế
        </span>

        <!-- Cyberpunk Stream Deck Shell -->
        <div class="cyber-shell max-w-2xl w-full h-[80%] flex flex-col p-4 relative">
          <div class="scanline absolute inset-0 pointer-events-none opacity-[0.03]" />
          <div class="absolute inset-0 pointer-events-none opacity-[0.025] bg-grid-dot" />

          <span
            class="absolute top-2 left-2 w-4 h-4 border-t-[3px] border-l-[3px] border-cyan-500/60 pointer-events-none z-20"
          />
          <span
            class="absolute top-2 right-2 w-4 h-4 border-t-[3px] border-r-[3px] border-fuchsia-500/60 pointer-events-none z-20"
          />
          <span
            class="absolute bottom-2 left-2 w-4 h-4 border-b-[3px] border-l-[3px] border-fuchsia-500/60 pointer-events-none z-20"
          />
          <span
            class="absolute bottom-2 right-2 w-4 h-4 border-b-[3px] border-r-[3px] border-cyan-500/60 pointer-events-none z-20"
          />

          <!-- Page Tabs CLICK Navigation & Actions Panel (S-PAGE4) -->
          <div
            v-if="layoutStore.layout.pages"
            class="flex items-center gap-2 mb-3 z-20 border-b border-slate-800 pb-2 px-1 shrink-0 overflow-x-auto no-scrollbar scroll-smooth"
          >
            <div
              v-for="(page, idx) in layoutStore.layout.pages"
              :key="page.id"
              class="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
              :class="
                layoutStore.currentPageIndex === idx
                  ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-200'
              "
              @click="layoutStore.setPage(idx)"
            >
              <!-- Rename Input -->
              <input
                v-if="page.name !== undefined"
                :value="page.name"
                class="bg-transparent border-none text-[10px] font-bold uppercase tracking-wider focus:outline-none p-0 w-16 text-center select-all"
                :class="layoutStore.currentPageIndex === idx ? 'text-cyan-400' : 'text-slate-400'"
                @input="layoutStore.renamePage(idx, ($event.target as HTMLInputElement).value)"
                @click.stop
              />
              <span v-else>Trang {{ idx + 1 }}</span>

              <!-- Remove Page tab button (visible on hover/active, disabled if only 1 page remains) -->
              <button
                v-if="layoutStore.layout.pages.length > 1"
                class="text-xs hover:text-rose-500 transition-colors p-0.5 rounded cursor-pointer"
                title="Xóa trang"
                @click.stop="layoutStore.removePage(idx)"
              >
                <Icon icon="lucide:x" class="text-[9px]" />
              </button>
            </div>

            <!-- Add Page Button -->
            <button
              class="w-6 h-6 flex items-center justify-center rounded-lg border border-dashed border-slate-700 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-400 bg-slate-900/10 transition-all duration-200 cursor-pointer"
              title="Thêm trang mới"
              @click="layoutStore.addPage()"
            >
              <Icon icon="lucide:plus" class="text-xs" />
            </button>
          </div>

          <div
            :key="layoutStore.currentPage?.id"
            v-draggable="[
              layoutStore.currentButtons,
              {
                ghostClass: 'cyber-ghost',
                animation: 200,
                forceFallback: true,
                fallbackOnBody: true,
                delay: 100,
                delayOnTouchOnly: true,
                touchStartThreshold: 5,
                onUpdate,
              },
            ]"
            class="grid gap-3 w-full h-[calc(100%-40px)] max-w-full max-h-full items-stretch justify-items-stretch relative z-10 min-h-0 min-w-0"
            :style="{
              gridTemplateColumns: `repeat(${layoutStore.layout.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${layoutStore.layout.rows}, minmax(0, 1fr))`,
            }"
          >
            <div
              v-for="btn in layoutStore.currentButtons"
              :key="btn.id"
              class="grid-item-wrap min-w-0 min-h-0"
            >
              <GridButton
                :button="btn"
                :selected="selectedButtonId === btn.id"
                :compact="true"
                @press="selectButton(btn.id)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Settings Modal -->
    <transition name="fade">
      <div
        v-if="settingsOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      >
        <div
          class="cyber-modal w-[840px] max-w-full max-h-[calc(100vh-2rem)] flex flex-col p-0 relative overflow-hidden"
        >
          <!-- Sticky Header -->
          <div
            class="flex items-center gap-3 px-6 py-4 cyber-divider sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md"
          >
            <img src="/logo.png" alt="Logo" class="h-9 w-9 shrink-0" />
            <div class="flex-1 min-w-0">
              <h2 class="text-sm font-bold text-slate-50 uppercase tracking-wider">
                Thiết lập & thông tin hệ thống
              </h2>
              <p class="text-[9px] text-slate-500 mt-0.5">
                Tự động cấu hình, updater và giấy phép phần mềm
              </p>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              @click="settingsOpen = false"
              title="Đóng"
              aria-label="Đóng"
            >
              <Icon icon="lucide:x" class="text-base" />
            </button>
          </div>

          <!-- Body: 2-col layout, left rail nav + scrollable content -->
          <div class="flex flex-1 overflow-hidden min-h-0">
            <nav
              class="w-[160px] shrink-0 border-r border-slate-800/60 p-3 flex flex-col gap-1 overflow-y-auto bg-slate-950/40"
              aria-label="Settings groups"
            >
              <button
                v-for="g in visibleSettingsGroups"
                :key="g.id"
                type="button"
                @click="scrollToSettingsGroup(g.id)"
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-md font-bold uppercase tracking-wider transition cursor-pointer text-left"
                :class="[
                  typographyClass.control,
                  activeSettingsGroup === g.id
                    ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent',
                ]"
              >
                <Icon :icon="g.icon" class="text-xs shrink-0" />
                <span class="truncate">{{ g.label }}</span>
              </button>
            </nav>

            <div
              class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6 text-xs text-slate-300"
              @scroll.passive="onSettingsScroll"
            >
              <!-- ===== Group: General ===== -->
              <section
                id="settings-group-general"
                class="flex flex-col gap-3 scroll-mt-4"
              >
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:sliders-horizontal" class="text-sm text-cyan-400" />
                  <h3 class="cyber-section-title">General</h3>
                </div>

                <!-- Theme -->
                <div class="flex flex-col gap-2.5">
                  <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500"
                    >Giao diện</span
                  >
                  <div class="flex gap-2">
                    <button
                      v-for="(meta, name) in THEMES"
                      :key="name"
                      @click="setTheme(name as ThemeName)"
                      class="flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl border transition-all duration-150 cursor-pointer"
                      :class="
                        activeTheme === name
                          ? 'border-cyan-400/70 bg-slate-800/60 shadow shadow-cyan-900/20'
                          : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
                      "
                    >
                      <span
                        class="w-5 h-5 rounded-full border-2 border-black/20"
                        :style="{ backgroundColor: meta.previewColor }"
                      />
                      <span class="text-[9px] font-bold uppercase tracking-wider text-slate-300">{{
                        meta.label
                      }}</span>
                    </button>
                  </div>
                </div>

                <!-- Autostart -->
                <div class="flex flex-col gap-2.5">
                  <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500"
                    >Tự khởi động</span
                  >
                  <div class="cyber-inset flex items-center justify-between p-3">
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="font-medium text-slate-300">Khởi động cùng hệ thống:</span>
                      <span class="text-[9px] text-slate-500"
                        >Chạy ẩn vào khay hệ thống (tray) khi bật máy</span
                      >
                    </div>
                    <button
                      @click="toggleAutostart"
                      :disabled="autostartLoading"
                      class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      :class="
                        autostartOn
                          ? 'border-cyan-400/70 text-cyan-300 bg-slate-900/80 shadow shadow-cyan-900/20'
                          : 'border-slate-750 text-slate-400 hover:border-slate-600'
                      "
                    >
                      <Icon
                        v-if="autostartLoading"
                        icon="lucide:loader-2"
                        class="animate-spin text-xs"
                      />
                      <span>{{ autostartOn ? 'Bật' : 'Tắt' }}</span>
                    </button>
                  </div>
                </div>
              </section>

              <!-- ===== Group: Network ===== -->
              <section
                id="settings-group-network"
                class="flex flex-col gap-3 scroll-mt-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <Icon icon="lucide:wifi" class="text-sm text-cyan-400" />
                    <h3 class="cyber-section-title">Network</h3>
                  </div>
                  <span
                    class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider shrink-0"
                    :class="
                      hasPendingServerChanges
                        ? 'border-amber-300/40 bg-amber-400/10 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.08)]'
                        : 'border-emerald-300/25 bg-emerald-400/5 text-emerald-300/80'
                    "
                  >
                    <Icon
                      :icon="hasPendingServerChanges ? 'lucide:triangle-alert' : 'lucide:check'"
                      class="text-[11px]"
                    />
                    {{ networkSettingsBadgeText }}
                  </span>
                </div>

                <div class="cyber-inset flex flex-col gap-3 p-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label class="flex flex-col gap-1.5">
                      <span class="cyber-input-label">Cổng đang chạy</span>
                      <div
                        class="h-[38px] rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 font-mono text-xs text-slate-400 shadow-inner"
                      >
                        {{ activeWsPort }}
                      </div>
                    </label>

                    <label class="flex flex-col gap-1.5">
                      <span class="cyber-input-label">Cổng sau khi khởi động lại</span>
                      <Input
                        v-model="serverConfigDraft.wsPort"
                        inputmode="numeric"
                        autocomplete="off"
                        class="font-mono"
                        :class="
                          serverConfigValidationError
                            ? 'border-rose-500/40 focus:ring-rose-500/40'
                            : hasPendingServerChanges
                              ? 'border-amber-300/35 focus:ring-amber-300/30'
                              : ''
                        "
                      />
                    </label>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                    <label class="flex flex-col gap-1.5">
                      <span class="cyber-input-label">Port HTTP Web Client</span>
                      <Input
                        v-model="serverConfigDraft.webPort"
                        inputmode="numeric"
                        autocomplete="off"
                        class="font-mono"
                      />
                    </label>

                    <button
                      type="button"
                      class="cyber-action-btn h-[38px] min-w-[116px] font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center justify-center gap-1.5"
                      :class="
                        serverConfigDraft.webEnabled
                          ? 'border-cyan-400/70 text-cyan-300 bg-slate-900/80 shadow shadow-cyan-900/20'
                          : 'border-slate-750 text-slate-400 hover:border-slate-600'
                      "
                      @click="serverConfigDraft.webEnabled = !serverConfigDraft.webEnabled"
                    >
                      <Icon
                        :icon="serverConfigDraft.webEnabled ? 'lucide:toggle-right' : 'lucide:toggle-left'"
                        class="text-sm"
                      />
                      {{ serverConfigDraft.webEnabled ? 'Web bật' : 'Web tắt' }}
                    </button>
                  </div>

                  <div class="flex flex-col gap-2 pt-2 cyber-divider">
                    <p
                      class="text-[10px] leading-relaxed"
                      :class="
                        serverConfigValidationError || serverConfigError
                          ? 'text-rose-300'
                          : hasPendingServerChanges
                            ? 'text-amber-200/90'
                            : 'text-slate-500'
                      "
                    >
                      <Icon
                        v-if="serverConfigSaving"
                        icon="lucide:loader-circle"
                        class="inline text-[11px] animate-spin mr-1 align-middle"
                      />
                      <Icon
                        v-else-if="serverConfigValidationError || serverConfigError"
                        icon="lucide:triangle-alert"
                        class="inline text-[11px] mr-1 align-middle text-rose-300"
                      />
                      <Icon
                        v-else-if="hasPendingServerChanges"
                        icon="lucide:triangle-alert"
                        class="inline text-[11px] mr-1 align-middle text-amber-300"
                      />
                      <Icon
                        v-else
                        icon="lucide:check"
                        class="inline text-[11px] mr-1 align-middle text-emerald-300/80"
                      />
                      {{ serverConfigSaveHint }}
                    </p>

                    <button
                      type="button"
                      class="cyber-action-btn w-full font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 text-[10px] uppercase tracking-wider px-3 py-2 flex items-center justify-center gap-1.5"
                      :disabled="!canSaveServerConfig"
                      :aria-disabled="!canSaveServerConfig"
                      :title="serverConfigSaveHint"
                      @click="saveNetworkSettingsAndRelaunch"
                    >
                      <Icon
                        :icon="serverConfigSaving ? 'lucide:loader-circle' : 'lucide:refresh-cw'"
                        class="text-xs"
                        :class="serverConfigSaving ? 'animate-spin' : ''"
                      />
                      {{ serverConfigSaving ? 'Đang lưu...' : 'Lưu và khởi động lại' }}
                    </button>
                  </div>
                </div>
              </section>

              <!-- ===== Group: Client & QR ===== -->
              <section
                id="settings-group-client-qr"
                class="flex flex-col gap-3 scroll-mt-4"
              >
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:qr-code" class="text-sm text-cyan-400" />
                  <h3 class="cyber-section-title">Client & QR</h3>
                </div>

                <div
                  v-if="webClientUrl"
                  class="cyber-inset p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start"
                >
                  <div class="flex flex-col gap-2 min-w-0">
                    <div class="flex items-center gap-2">
                      <Icon icon="lucide:triangle-alert" class="text-amber-400 text-sm shrink-0" />
                      <span class="text-[9px] font-bold uppercase tracking-wider text-amber-300/90"
                        >Chỉ bật trên Wi-Fi tin cậy</span
                      >
                    </div>
                    <div
                      class="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 font-mono text-[11px] text-slate-300 shadow-inner truncate"
                    >
                      {{ webClientUrl }}
                    </div>
                    <button
                      type="button"
                      class="cyber-action-btn w-full sm:w-fit font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-2 flex items-center justify-center gap-1.5"
                      @click="copyWebClientUrl"
                    >
                      <Icon :icon="webCopyHint ? 'lucide:check' : 'lucide:copy'" class="text-xs" />
                      {{ webCopyHint || 'Copy Web URL' }}
                    </button>
                  </div>

                  <div
                    class="w-56 rounded-xl border border-cyan-400/20 bg-slate-950/80 p-3.5 shadow-[0_0_24px_rgba(34,211,238,0.08)] flex flex-col items-center justify-center gap-2"
                  >
                    <button
                      v-if="webClientQrSvg"
                      type="button"
                      class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
                      @click="openZoomModal('Web Client LAN', webClientUrl, webClientQrSvg)"
                      @keydown.enter="openZoomModal('Web Client LAN', webClientUrl, webClientQrSvg)"
                      @keydown.space.prevent="openZoomModal('Web Client LAN', webClientUrl, webClientQrSvg)"
                      title="Click để phóng to mã QR"
                      aria-label="Mã QR Web Client. Nhấn Enter hoặc Space để phóng to."
                    >
                      <div v-html="webClientQrSvg" class="w-full h-full"></div>
                    </button>
                    <div
                      class="mt-1 text-center text-[8.5px] font-bold uppercase tracking-wider text-cyan-300/80"
                    >
                      Mở trên iPad / Browser
                    </div>
                  </div>
                </div>
                <p v-else class="text-[10px] text-slate-500 leading-relaxed">
                  Bật <strong class="text-slate-300">Web Client</strong> trong nhóm
                  <em>Network</em> để sinh URL + QR cho iPad/Browser.
                </p>
              </section>

              <!-- ===== Group: Permissions (mac only) ===== -->
              <section
                v-if="isMac"
                id="settings-group-permissions"
                class="flex flex-col gap-3 scroll-mt-4"
              >
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:shield-check" class="text-sm text-cyan-400" />
                  <h3 class="cyber-section-title">Permissions</h3>
                </div>

                <div class="cyber-inset flex items-center justify-between p-3">
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="font-medium text-slate-300">Accessibility (macOS):</span>
                    <span class="text-[9px] text-slate-500">
                      Cần thiết để gửi phím tắt vào app đang focus. Nếu chưa bật, mở
                      System Settings và bật cho binary đang chạy.
                    </span>
                  </div>
                  <button
                    type="button"
                    class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center justify-center gap-1.5 shrink-0"
                    @click="openAccessibilitySettings"
                    title="Mở Accessibility Settings"
                  >
                    <Icon icon="lucide:external-link" class="text-xs" />
                    <span>Mở System Settings</span>
                  </button>
                </div>

                <p class="text-[9px] text-slate-500 leading-relaxed px-1">
                  Chi tiết executablePath / bundle identifier xem tại
                  <strong class="text-slate-300">khôi phục Accessibility</strong> phía trên
                  dashboard.
                </p>
              </section>

              <!-- ===== Group: Updates ===== -->
              <section
                id="settings-group-updates"
                class="flex flex-col gap-3 scroll-mt-4"
              >
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:refresh-cw" class="text-sm text-cyan-400" />
                  <h3 class="cyber-section-title">Updates</h3>
                </div>

                <div class="cyber-inset flex flex-col gap-3 p-3">
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="font-medium text-slate-300">Nhật ký cập nhật:</span>
                      <span class="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                        {{ updateStatusText || 'Sẵn sàng kiểm tra' }}
                      </span>
                    </div>
                    <button
                      class="cyber-action-btn font-bold cursor-pointer disabled:opacity-50 text-[10px] uppercase tracking-wider px-3 py-1.5"
                      :disabled="
                        updaterStore.state === 'checking' || updaterStore.state === 'downloading'
                      "
                      @click="updaterStore.checkForUpdates()"
                    >
                      Check
                    </button>
                  </div>

                  <div
                    v-if="updaterStore.state === 'available'"
                    class="flex flex-col gap-2 pt-2 cyber-divider"
                  >
                    <p class="text-[10px] text-emerald-400 font-medium">
                      Có bản cập nhật mới v{{ updaterStore.update?.version }}. Bạn có muốn tải xuống
                      và cài đặt tự động?
                    </p>
                    <button
                      class="cyber-action-btn font-bold w-full uppercase tracking-wider text-[10px] py-1.5 cursor-pointer"
                      @click="updaterStore.startInstall()"
                    >
                      {{
                        (updaterStore.update as any)?.isManual
                          ? 'Mở trang tải xuống →'
                          : 'Tải & nâng cấp tự động'
                      }}
                    </button>
                  </div>

                  <div
                    v-if="updaterStore.state === 'downloading'"
                    class="flex flex-col gap-1.5 pt-2 cyber-divider"
                  >
                    <div class="flex justify-between text-[10px] font-mono text-slate-300">
                      <span>Đang tải xuống...</span>
                      <span class="text-cyan-400">{{ updaterStore.progressPct }}%</span>
                    </div>
                    <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-cyan-500 rounded-full transition-all duration-150"
                        :style="{ width: `${updaterStore.progressPct}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- ===== Group: Import/Export ===== -->
              <section
                id="settings-group-import-export"
                class="flex flex-col gap-3 scroll-mt-4"
              >
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:database" class="text-sm text-cyan-400" />
                  <h3 class="cyber-section-title">Import/Export</h3>
                </div>

                <div class="cyber-inset flex items-center justify-between p-3">
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="font-medium text-slate-300">Xuất/Nhập dữ liệu layout:</span>
                    <span class="text-[9px] text-slate-500"
                      >Tải về hoặc tải lên file JSON cấu hình lưới phím</span
                    >
                  </div>
                  <div class="flex gap-2 shrink-0">
                    <button
                      type="button"
                      class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
                      @click="handleExport"
                      title="Xuất cấu hình hiện tại ra file JSON"
                    >
                      <Icon icon="lucide:download" class="text-xs" />
                      <span>Export</span>
                    </button>
                    <button
                      type="button"
                      class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
                      @click="triggerImport"
                      title="Nạp cấu hình từ file JSON"
                    >
                      <Icon icon="lucide:upload" class="text-xs" />
                      <span>Import</span>
                    </button>
                  </div>
                </div>
              </section>

              <!-- ===== Group: About/Support ===== -->
              <section
                id="settings-group-about"
                class="flex flex-col gap-3 scroll-mt-4"
              >
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:info" class="text-sm text-cyan-400" />
                  <h3 class="cyber-section-title">About/Support</h3>
                </div>

                <div class="flex flex-col gap-3">
                  <div class="cyber-inset p-3">
                  <div class="grid grid-cols-2 gap-y-2">
                    <span class="text-slate-400 font-medium">Tên phần mềm:</span>
                    <span class="text-slate-200 font-bold justify-self-end">Android Stream Desk</span>
                    <span class="text-slate-400 font-medium">Phiên bản hiện tại:</span>
                    <span class="font-mono text-cyan-300 justify-self-end">v{{ appVersion }}</span>
                    <span class="text-slate-400 font-medium">Tác giả:</span>
                    <span class="text-slate-200 justify-self-end font-semibold">aniadev</span>
                    <span class="text-slate-400 font-medium">Giấy phép:</span>
                    <span class="font-mono text-slate-200 justify-self-end">MIT License</span>
                    <span class="text-slate-400 font-medium">Mã nguồn:</span>
                    <span class="justify-self-end">
                      <a
                        href="https://github.com/aniadev/android-stream-desk"
                        target="_blank"
                        class="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        GitHub Repo <Icon icon="lucide:external-link" class="text-[10px]" />
                      </a>
                    </span>
                  </div>
                  </div>

                  <div
                    class="p-3 bg-gradient-to-r from-fuchsia-950/20 via-violet-950/30 to-cyan-950/20 rounded-xl border border-violet-500/20 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-[0_0_24px_rgba(139,92,246,0.05)]"
                  >
                    <div class="flex-1 flex flex-col gap-1 items-center sm:items-start text-center sm:text-left">
                      <div class="flex items-center gap-1.5 text-xs font-bold text-fuchsia-300">
                        <Icon icon="mdi:coffee" class="text-sm shrink-0 animate-bounce" />
                        <span>Ủng hộ nhà phát triển</span>
                      </div>
                      <p class="text-[9px] text-slate-400 max-w-[280px] leading-relaxed">
                        Dự án hoàn toàn miễn phí & mã nguồn mở. Hãy mời tác giả một ly cà phê nếu bạn thấy ứng dụng này hữu ích!
                      </p>
                      <a
                        href="https://ko-fi.com/ania9"
                        target="_blank"
                        class="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/30 hover:bg-fuchsia-900/40 hover:border-fuchsia-400 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-fuchsia-200 shadow shadow-fuchsia-950/20 transition duration-150 cursor-pointer"
                      >
                        <Icon icon="lucide:external-link" class="text-xs" />
                        <span>Buy me a coffee (Ko-Fi)</span>
                      </a>
                    </div>
                    <div class="w-[148px] shrink-0 p-2 flex flex-col items-center gap-1">
                      <img
                        src="/donate/momo.png"
                        alt="MoMo QR"
                        class="w-full aspect-square object-cover rounded bg-white p-0.5"
                      />
                      <span class="text-[8px] font-extrabold tracking-wider uppercase text-cyan-300/80">Quét MoMo</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Relaunch Dialog -->
    <transition name="fade">
      <div
        v-if="restartDialogOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <div class="cyber-modal w-[420px] max-w-full flex flex-col gap-4 p-5">
          <div class="flex items-center gap-3">
            <div
              class="h-9 w-9 rounded-lg border border-cyan-300/20 bg-cyan-400/10 flex items-center justify-center"
              :class="restartDialogFailed ? 'border-rose-300/30 bg-rose-400/10' : ''"
            >
              <Icon
                :icon="restartDialogFailed ? 'lucide:triangle-alert' : 'lucide:refresh-cw'"
                class="text-base"
                :class="restartDialogFailed ? 'text-rose-300' : 'text-cyan-300 animate-spin'"
              />
            </div>
            <div class="flex flex-col">
              <h3 class="text-xs font-bold text-slate-50 uppercase tracking-wider">
                {{ restartDialogFailed ? 'Chưa tự khởi động lại được' : 'Đang áp dụng cấu hình mạng' }}
              </h3>
              <p class="text-[9px] text-slate-500 mt-0.5">
                {{
                  restartDialogFailed
                    ? 'Cấu hình đã lưu; hãy mở lại Companion thủ công nếu cần.'
                    : 'Companion sẽ mở lại với listener mới.'
                }}
              </p>
            </div>
          </div>
          <p class="text-[11px] leading-relaxed text-slate-300">
            {{ restartDialogMessage }}
          </p>
          <div
            v-if="restartDialogFailed"
            class="rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2.5 text-[10px] leading-relaxed text-amber-100/90"
          >
            <div class="font-bold uppercase tracking-wider text-amber-200">Checklist restart thủ công</div>
            <ul class="mt-2 flex flex-col gap-1.5 text-slate-300">
              <li class="flex gap-2">
                <Icon icon="lucide:check" class="mt-0.5 text-xs text-amber-300 shrink-0" />
                Dừng Companion hiện tại.
              </li>
              <li class="flex gap-2">
                <Icon icon="lucide:check" class="mt-0.5 text-xs text-amber-300 shrink-0" />
                Chạy lại `pnpm tauri dev` hoặc mở lại app đã build.
              </li>
              <li class="flex gap-2">
                <Icon icon="lucide:check" class="mt-0.5 text-xs text-amber-300 shrink-0" />
                Chờ badge chuyển sang Listening rồi mới quét/copy endpoint.
              </li>
            </ul>
          </div>
          <button
            v-if="restartDialogFailed"
            type="button"
            class="cyber-action-btn w-full font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-2 flex items-center justify-center gap-1.5"
            @click="restartDialogOpen = false"
          >
            <Icon icon="lucide:x" class="text-xs" />
            Đóng
          </button>
        </div>
      </div>
    </transition>

    <!-- App Picker Modal -->
    <AppPickerModal
      v-model="appPickerOpen"
      @select="
        (path: string) => {
          if (selectedButton) {
            selectedButton.appPath = path;
            saveButtonSettings();
          }
        }
      "
    />

    <!-- Guide Center Modal -->
    <GuideCenterModal
      v-model="guideCenterOpen"
      :active-topic="guideTopic"
      @apply-template="
        (cmdVal: string) => {
          if (selectedButton) {
            selectedButton.commandValue = cmdVal;
            saveButtonSettings();
          }
        }
      "
    />

    <!-- QR Zoom Modal (S-QRX2) -->
    <transition name="fade">
      <div
        v-if="zoomModalOpen"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 cursor-default"
        @click.self="zoomModalOpen = false"
      >
        <div 
          class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full flex flex-col p-6 gap-5 shadow-2xl relative overflow-hidden"
          role="dialog"
          aria-modal="true"
          :aria-label="`Phóng to ${zoomModalTitle}`"
        >
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-xs font-bold text-slate-100 uppercase tracking-widest">{{ zoomModalTitle }}</h3>
              <p class="text-[9.5px] text-slate-450">Quét mã QR từ camera điện thoại hoặc iPad</p>
            </div>
            <button
              type="button"
              class="w-6 h-6 rounded-md hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              @click="zoomModalOpen = false"
              title="Đóng modal"
            >
              <Icon icon="lucide:x" class="text-sm" />
            </button>
          </div>

          <!-- Plain White QR Container (no glow/filter) -->
          <div class="flex justify-center py-2 bg-slate-950/40 rounded-xl p-4 border border-slate-850">
            <div 
              class="w-full max-w-96 aspect-square bg-white p-2.5 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-transform overflow-hidden"
            >
              <div v-html="zoomModalQrSvg" class="w-full h-full"></div>
            </div>
          </div>

          <!-- Payload copy & detail -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-450 font-bold px-1">
              <span>Đường dẫn kết nối</span>
              <button
                type="button"
                class="hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
                @click="copyZoomModalPayload"
              >
                <Icon :icon="zoomModalCopyHint ? 'lucide:check' : 'lucide:copy'" class="text-[10px]" />
                <span>{{ zoomModalCopyHint || 'Sao chép' }}</span>
              </button>
            </div>
            <div 
              class="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono text-[10.5px] text-slate-350 shadow-inner break-all max-h-24 overflow-y-auto selection:bg-cyan-550/30 select-text"
            >
              {{ zoomModalPayload }}
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ========== CYBERPUNK DESIGN SYSTEM ========== */

.cyber-dashboard {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.02) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(255, 0, 255, 0.015) 0%, transparent 50%),
    linear-gradient(180deg, #020617 0%, #060b1a 50%, #030712 100%);
  color: #e2e8f0;
}

/* --- Panels --- */
.cyber-panel {
  background: rgba(4, 10, 24, 0.75);
  border: 1px solid rgba(0, 240, 255, 0.06);
  box-shadow:
    0 0 0 1px rgba(0, 240, 255, 0.02),
    0 8px 32px -8px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.01);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}

/* --- Inset containers --- */
.cyber-inset {
  background: rgba(2, 8, 20, 0.7);
  border: 1px solid rgba(0, 240, 255, 0.06);
  border-radius: 10px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* --- Section labels --- */
.cyber-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.cyber-section-desc {
  font-size: 9px;
  color: #64748b;
  margin-top: 2px;
}
.cyber-input-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

/* --- S-UX1 typography tiers (min 9/10/11) --- */
.cyber-text-2xs { font-size: 9px; line-height: 1.35; }
.cyber-text-xs  { font-size: 10px; line-height: 1.4; }
.cyber-text-sm  { font-size: 11px; line-height: 1.45; }

/* --- Dividers --- */
.cyber-divider {
  border-top: 1px solid rgba(0, 240, 255, 0.06);
}

/* --- HUD (IP box) --- */
.cyber-hud {
  background: rgba(2, 8, 20, 0.85);
  border: 1px solid rgba(0, 240, 255, 0.1);
  border-radius: 12px;
}

/* --- Stepper --- */
.cyber-stepper {
  background: rgba(2, 8, 20, 0.8);
  border: 1px solid rgba(0, 240, 255, 0.08);
  border-radius: 10px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}
.cyber-stepper-btn {
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  transition: all 0.15s;
  cursor: pointer;
}
.cyber-stepper-btn:hover {
  background: rgba(0, 240, 255, 0.08);
  color: #22d3ee;
}

/* --- Tabs --- */
.cyber-tab-group {
  background: rgba(2, 8, 20, 0.8);
  border: 1px solid rgba(0, 240, 255, 0.06);
  border-radius: 10px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}
.cyber-tab-active {
  background: rgba(0, 240, 255, 0.08);
  color: #22d3ee;
  border-radius: 6px;
  border: 1px solid rgba(0, 240, 255, 0.12);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.06);
}

/* --- Hex icon bg --- */
.cyber-hex {
  background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
  border-radius: 10px;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
}

/* --- Icon button --- */
.cyber-icon-btn {
  border: 1px solid rgba(0, 240, 255, 0.08);
  border-radius: 10px;
  background: rgba(2, 8, 20, 0.6);
  transition: all 0.2s;
}
.cyber-icon-btn:hover {
  border-color: rgba(0, 240, 255, 0.2);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.08);
  background: rgba(0, 240, 255, 0.04);
}

/* --- Action button --- */
.cyber-action-btn {
  background: rgba(0, 240, 255, 0.06);
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 8px;
  color: #22d3ee;
  transition: all 0.2s;
}
.cyber-action-btn:hover {
  background: rgba(0, 240, 255, 0.12);
  box-shadow: 0 0 16px rgba(0, 240, 255, 0.1);
}

/* --- Record button --- */
.cyber-record-btn {
  background: rgba(2, 8, 20, 0.8);
  border: none;
  border-left: 1px solid rgba(0, 240, 255, 0.08);
  color: #94a3b8;
  transition: all 0.2s;
}
.cyber-record-btn:hover {
  color: #22d3ee;
}
.cyber-record-btn--active {
  background: rgba(192, 38, 211, 0.12);
  color: #f0abfc;
  box-shadow: inset 0 0 12px rgba(192, 38, 211, 0.12);
}

/* --- Record input group --- */
.cyber-input-group {
  background: rgba(2, 8, 20, 0.8);
  border: 1px solid rgba(0, 240, 255, 0.08);
  border-radius: 10px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* --- Select dropdown --- */
.cyber-select {
  background: rgba(2, 8, 20, 0.9);
  border: 1px solid rgba(0, 240, 255, 0.08);
  border-radius: 10px;
  color: #cbd5e1;
  outline: none;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}
.cyber-select:focus {
  border-color: rgba(0, 240, 255, 0.2);
  box-shadow:
    0 0 0 1px rgba(0, 240, 255, 0.1),
    inset 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* --- Preset buttons --- */
.cyber-preset-btn {
  background: rgba(0, 240, 255, 0.03);
  border: 1px solid rgba(0, 240, 255, 0.06);
  border-radius: 8px;
  color: #94a3b8;
  transition: all 0.15s;
  cursor: pointer;
}
.cyber-preset-btn:hover {
  background: rgba(0, 240, 255, 0.06);
  border-color: rgba(0, 240, 255, 0.12);
  color: #e2e8f0;
}

/* --- Icon cell --- */
.cyber-icon-cell {
  background: rgba(2, 8, 20, 0.8);
  border: 1px solid rgba(0, 240, 255, 0.04);
  border-radius: 8px;
  color: #64748b;
}
.cyber-icon-cell:hover {
  border-color: rgba(0, 240, 255, 0.1);
  color: #e2e8f0;
  background: rgba(0, 240, 255, 0.04);
}
.cyber-icon-cell--active {
  border-color: #22d3ee !important;
  color: #22d3ee !important;
  background: rgba(0, 240, 255, 0.08) !important;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.08);
}

/* --- Empty state --- */
.cyber-empty {
  border: 1px dashed rgba(0, 240, 255, 0.08);
  border-radius: 14px;
  background: rgba(0, 240, 255, 0.015);
}

/* --- Input small --- */
.cyber-input-sm {
  border: 1px solid rgba(0, 240, 255, 0.06) !important;
  background: rgba(2, 8, 20, 0.7) !important;
}

/* --- Modal --- */
.cyber-modal {
  background: rgba(4, 10, 24, 0.95);
  border: 1px solid rgba(0, 240, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 0 0 1px rgba(0, 240, 255, 0.03),
    0 0 60px -8px rgba(0, 240, 255, 0.06),
    0 20px 60px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
}

/* --- Grid Stream Deck Shell (shared) --- */
.cyber-shell {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.04) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 100%, rgba(255, 0, 255, 0.03) 0%, transparent 60%),
    linear-gradient(180deg, #050a14 0%, #02050c 50%, #050a14 100%);
  border: 1px solid rgba(0, 240, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(0, 240, 255, 0.04),
    0 4px 40px -8px rgba(0, 0, 0, 0.6),
    0 0 80px -16px rgba(0, 240, 255, 0.04),
    inset 0 0 40px -16px rgba(0, 240, 255, 0.02);
  clip-path: polygon(
    6px 0%,
    calc(100% - 6px) 0%,
    100% 6px,
    100% calc(100% - 6px),
    calc(100% - 6px) 100%,
    6px 100%,
    0% calc(100% - 6px),
    0% 6px
  );
}

.bg-grid-dot {
  background-image: radial-gradient(circle, rgba(0, 240, 255, 0.2) 1px, transparent 1px);
  background-size: 24px 24px;
}

.scanline {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 240, 255, 0.03) 2px,
    rgba(0, 240, 255, 0.03) 3px
  );
}

/* Drag ghost placeholder */
:deep(.cyber-ghost) {
  opacity: 0.25;
  transition: opacity 0.15s;
}

/* Wrap each draggable grid cell so Sortable item is a plain div, not <button>.
   Avoids native-button transform/clone quirks in production WebView. */
.grid-item-wrap {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}
.grid-item-wrap:active {
  cursor: grabbing;
}

/* Right preview section: no backdrop-filter — creates containing block
   for position:fixed and breaks Sortable fallback ghost coords. */
.cyber-panel--no-blur {
  backdrop-filter: none !important;
}

/* Dashboard-wide scanline */
.dashboard-scanline {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 240, 255, 0.02) 2px,
    rgba(0, 240, 255, 0.02) 3px
  );
}
</style>

<style>
/* Global cyberpunk scrollbar */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 240, 255, 0.1) transparent;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 240, 255, 0.1);
  border-radius: 3px;
  border: 1px solid rgba(0, 240, 255, 0.04);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 240, 255, 0.2);
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-corner {
  background: transparent;
}
</style>
