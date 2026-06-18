<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useLayoutStore } from '../stores/layout';
import { useConnectionStore } from '../stores/connection';
import { Icon } from '@iconify/vue';
import { applyTheme, isValidTheme, type ThemeName } from '../lib/themes';
import { safeCreateQrSvg } from '../lib/qrSvg';
import {
  buildApkEndpointPayload,
  buildWebClientUrl,
  hasPendingServerChanges as computeHasPendingServerChanges,
} from '../lib/networkEndpointState';

// Import Custom components
import AppPickerModal from '../components/AppPickerModal.vue';
import GuideCenterModal from '../components/GuideCenterModal.vue';

// Import Refactored components
import TopNavHudHeader from '../components/dashboard/TopNavHudHeader.vue';
import AccessibilityRecoveryPanel from '../components/dashboard/AccessibilityRecoveryPanel.vue';
import LeftSideBar from '../components/dashboard/LeftSideBar.vue';
import MainPreview from '../components/dashboard/MainPreview.vue';
import ModalSettings from '../components/dashboard/ModalSettings.vue';
import ErrorToast from '../components/dashboard/ErrorToast.vue';
import FirstRunChecklist from '../components/dashboard/FirstRunChecklist.vue';
import QrZoomModal from '../components/dashboard/QrZoomModal.vue';

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

// --- Modal/Dialog Controls ---
const settingsOpen = ref(false);
const appPickerOpen = ref(false);
const guideCenterOpen = ref(false);
const guideTopic = ref<'browser' | 'shortcut' | 'firewall'>('browser');
const zoomModalOpen = ref(false);
const zoomModalTitle = ref('');
const zoomModalPayload = ref('');
const zoomModalQrSvg = ref('');
const zoomModalImageSrc = ref('');
const zoomModalCopyHint = ref('');

// --- Checklist & Toast ---
const FIRST_RUN_KEY = 'dashboard:first-run-dismissed';
const firstRunDismissed = ref(localStorage.getItem(FIRST_RUN_KEY) === 'true');
const dismissFirstRun = () => {
  firstRunDismissed.value = true;
  localStorage.setItem(FIRST_RUN_KEY, 'true');
};

const dismissToast = () => {
  layoutStore.lastToast = null;
};

// --- Connection & Server State ---
const activeConnectionsCount = ref(0);
const wsReady = ref(false);
const runningWsPort = ref<number | null>(null);
const wsBindError = ref<ListenerBindError | null>(null);
const webReady = ref(false);
const webBindError = ref<ListenerBindError | null>(null);
const serverIp = ref<string>('—');
const serverPort = ref<number>(8089);
const appVersion = ref<string>('1.6.0');
let tauriUnlisteners: (() => void)[] = [];

const clientDeviceSize = ref<{ width: number; height: number } | null>(null);
const clientDeviceName = ref<string>('');

const isMac = computed(() => {
  return (
    navigator.userAgent.toLowerCase().includes('mac') ||
    navigator.platform.toLowerCase().includes('mac')
  );
});

// --- Theme ---
const activeTheme = computed(() =>
  isValidTheme(layoutStore.layout.theme) ? layoutStore.layout.theme : 'cyber',
);
const setTheme = (name: ThemeName) => {
  layoutStore.layout.theme = name;
  applyTheme(name);
  layoutStore.broadcastSync();
};

// --- Autostart ---
const autostartOn = ref(false);
const autostartLoading = ref(false);

watch(activeConnectionsCount, next => {
  if (next === 0) {
    clientDeviceSize.value = null;
    clientDeviceName.value = '';
  }
});

watch(settingsOpen, async open => {
  if (open) {
    autostartLoading.value = true;
    try {
      if ((window as any).__TAURI_INTERNALS__) {
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
      at: Date.now(),
    };
  } finally {
    autostartLoading.value = false;
  }
};

// --- Server Config ---
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
    !wsReady.value ||
    runningWsPort.value !== serverPort.value ||
    (webConfigured && !webReady.value);

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

const webClientQrSvg = computed(() =>
  webClientUrl.value ? safeCreateQrSvg(webClientUrl.value) : '',
);

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

const loadServerConfig = async (
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>,
) => {
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

  if (!(window as any).__TAURI_INTERNALS__) {
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
    restartDialogMessage.value =
      'Đã lưu cấu hình. Companion đang khởi động lại để áp dụng cổng mới...';

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

// --- Selected Button ---
const selectedButtonId = ref<string | null>(null);
const selectButton = (id: string) => {
  selectedButtonId.value = id;
};

const selectedButton = computed(() => {
  return layoutStore.currentButtons.find(btn => btn.id === selectedButtonId.value) || null;
});

// --- Toast & Accessibility macOS ---
const inputPermissionChecked = ref<boolean>(false);
const inputPermissionDiagnostics = ref<InputPermissionDiagnostics | null>(null);
const legacyInputPermission = ref<boolean>(true);
const permissionCopyHint = ref<'executable' | 'bundle' | 'bundleId' | ''>('');
const accessibilityRecoveryRequested = ref(false);
const accessibilityRecoveryPanelRef = ref<any>(null);
let permissionPollTimer: ReturnType<typeof setInterval> | null = null;

const toastNeedsAccessibility = computed(() => {
  const msg = layoutStore.lastToast?.message ?? '';
  return /Accessibility/i.test(msg);
});

const hasInputPermission = computed(
  () => inputPermissionDiagnostics.value?.trusted ?? legacyInputPermission.value,
);

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
    isMac.value &&
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
    if (!(window as any).__TAURI_INTERNALS__) return;
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
    accessibilityRecoveryPanelRef.value?.accessibilityRecoveryRef?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  });
};

const openAccessibilitySettings = async () => {
  try {
    if ((window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_accessibility_settings');
    }
  } catch (e) {
    console.error('open_accessibility_settings failed:', e);
  }
};

// --- QR Zoom & Image Zoom ---
const openZoomModal = (title: string, payload: string, svg: string) => {
  zoomModalTitle.value = title;
  zoomModalPayload.value = payload;
  zoomModalQrSvg.value = svg;
  zoomModalImageSrc.value = '';
  zoomModalCopyHint.value = '';
  zoomModalOpen.value = true;
};

const openImageZoom = (title: string, src: string) => {
  zoomModalTitle.value = title;
  zoomModalPayload.value = '';
  zoomModalQrSvg.value = '';
  zoomModalImageSrc.value = src;
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

// --- Clipboard & Key listeners ---
const copyHint = ref<string>('');
const webCopyHint = ref<string>('');
const syncHint = ref<string>('');
let syncTimer: ReturnType<typeof setTimeout> | null = null;

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

const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && zoomModalOpen.value) {
    zoomModalOpen.value = false;
  }
};

const handleClipboardShortcuts = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    if (selectedButton.value) {
      e.preventDefault();
      layoutStore.copyButtonConfig(selectedButton.value);
      layoutStore.lastToast = {
        kind: 'info',
        message: `Đã sao chép cấu hình nút "${selectedButton.value.label || 'Không tên'}"`,
        at: Date.now(),
      };
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    if (selectedButton.value && layoutStore.hasCopiedButton) {
      e.preventDefault();
      layoutStore.pasteButtonConfig(selectedButton.value.id);
      layoutStore.lastToast = {
        kind: 'info',
        message: 'Đã dán cấu hình thành công!',
        at: Date.now(),
      };
    }
  }
};

// --- External links & Guide center ---
const openGuide = (topic?: 'browser' | 'shortcut' | 'firewall') => {
  if (topic) {
    guideTopic.value = topic;
  }
  guideCenterOpen.value = true;
};

const openExternalLink = async (url: string) => {
  if ((window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_link', { url });
    } catch (err) {
      console.error('Mở link thất bại:', err);
    }
  } else {
    window.open(url, '_blank', 'noopener');
  }
};

// --- Import / Export ---
const importInput = ref<HTMLInputElement | null>(null);
const triggerImport = () => {
  importInput.value?.click();
};

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

// --- Sync ---
const syncLayout = () => {
  layoutStore.broadcastSync();
  if (syncTimer !== null) clearTimeout(syncTimer);
  const isConnected = useConnectionStore().status === 'connected';
  syncHint.value = isConnected ? 'Đã đồng bộ!' : 'Đã đồng bộ cục bộ';
  syncTimer = setTimeout(() => {
    syncHint.value = '';
    syncTimer = null;
  }, 1500);
};

// --- Lifecycle ---
onMounted(async () => {
  window.addEventListener('keydown', handleEscKey);
  window.addEventListener('keydown', handleClipboardShortcuts);
  try {
    if ((window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      const { getVersion } = await import('@tauri-apps/api/app');

      appVersion.value = await getVersion();

      try {
        const { isEnabled } = await import('@tauri-apps/plugin-autostart');
        autostartOn.value = await isEnabled();
      } catch (err) {
        console.warn('Failed to load autostart status:', err);
      }

      const { listen } = await import('@tauri-apps/api/event');
      const unlistenCount = await listen<{ count: number }>('client-count-changed', e => {
        activeConnectionsCount.value = e.payload.count;
      });
      const unlistenError = await listen<ListenerBindError>('server-error', e => {
        wsReady.value = false;
        runningWsPort.value = null;
        wsBindError.value = e.payload;
      });
      const unlistenReady = await listen<{ port: number }>('server-ready', e => {
        wsReady.value = true;
        runningWsPort.value = e.payload.port;
        wsBindError.value = null;
      });
      const unlistenWebReady = await listen<{ port: number }>('server-web-ready', () => {
        webReady.value = true;
        webBindError.value = null;
      });
      const unlistenWebError = await listen<ListenerBindError>('server-web-error', e => {
        webReady.value = false;
        webBindError.value = e.payload;
      });
      const unlistenActionError = await listen<{ error?: string; message?: string }>(
        'action-error',
        e => {
          const message = e.payload.error || e.payload.message || '';
          if (/Accessibility/i.test(message)) {
            accessibilityRecoveryRequested.value = true;
            void probePermission();
          }
        },
      );
      const unlistenDeviceInfo = await listen<{
        width: number;
        height: number;
        deviceName: string;
      }>('client-device-info', e => {
        clientDeviceSize.value = { width: e.payload.width, height: e.payload.height };
        clientDeviceName.value = e.payload.deviceName;
      });
      tauriUnlisteners.push(
        unlistenCount,
        unlistenError,
        unlistenReady,
        unlistenWebReady,
        unlistenWebError,
        unlistenActionError,
        unlistenDeviceInfo,
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

const containerStyle = computed(() => {
  const isGenshin = layoutStore.layout.theme === 'genshin-01';
  return {
    // paddingTop: 'env(safe-area-inset-top)',
    // paddingBottom: 'env(safe-area-inset-bottom)',
    // height: 'calc(var(--vh, 1vh) * 100)',
    backgroundColor: isGenshin ? 'transparent' : 'var(--theme-bg)',
    backgroundImage: isGenshin ? "url('/themes/genshin/bg-02.jpg')" : 'none',
    backgroundSize: isGenshin ? 'cover' : 'auto',
    backgroundPosition: isGenshin ? 'center' : 'unset',
    backgroundRepeat: isGenshin ? 'no-repeat' : 'unset',
    backgroundAttachment: isGenshin ? 'fixed' : 'unset',
  };
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
  window.removeEventListener('keydown', handleClipboardShortcuts);
  window.removeEventListener('focus', probePermission);
  if (syncTimer !== null) clearTimeout(syncTimer);
  if (permissionPollTimer !== null) {
    clearInterval(permissionPollTimer);
    permissionPollTimer = null;
  }
  tauriUnlisteners.forEach(fn => fn());
  tauriUnlisteners = [];
});
</script>

<template>
  <div
    class="cyber-dashboard h-screen w-screen flex flex-col p-6 overflow-hidden gap-6 antialiased select-none relative"
    :style="containerStyle"
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
    <!-- Error toast (Enigo / shortcut failures) -->
    <ErrorToast
      :last-toast="layoutStore.lastToast"
      :toast-needs-accessibility="toastNeedsAccessibility"
      @dismiss="dismissToast"
      @scroll-to-accessibility="scrollToAccessibilityRecovery"
    />

    <!-- Top Nav HUD Header -->
    <TopNavHudHeader
      :server-ip="serverIp"
      :server-port="serverPort"
      :active-connections-count="activeConnectionsCount"
      :listener-health-badge="listenerHealthBadge"
      :web-client-url="webClientUrl"
      :sync-hint="syncHint"
      :copy-hint="copyHint"
      :web-copy-hint="webCopyHint"
      :ws-bind-error="wsBindError"
      :web-bind-error="webBindError"
      :saved-server-config="savedServerConfig"
      @copy-address="copyAddress"
      @copy-web-client-url="copyWebClientUrl"
      @sync-layout="syncLayout"
      @open-settings="settingsOpen = true"
      @open-guide="openGuide"
    />

    <!-- Accessibility recovery panel (macOS) -->
    <AccessibilityRecoveryPanel
      ref="accessibilityRecoveryPanelRef"
      :show-accessibility-recovery="showAccessibilityRecovery"
      :input-permission-diagnostics="inputPermissionDiagnostics"
      :short-bundle-identifier="shortBundleIdentifier"
      :input-permission-action-text="inputPermissionActionText"
      :permission-copy-hint="permissionCopyHint"
      @copy-permission-detail="copyPermissionDetail"
      @open-accessibility-settings="openAccessibilitySettings"
      @probe-permission="probePermission"
    />

    <!-- First-Run Checklist Card -->
    <FirstRunChecklist :first-run-dismissed="firstRunDismissed" @dismiss="dismissFirstRun" />

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden gap-6">
      <!-- Left Sidebar -->
      <LeftSideBar
        v-model:selected-button-id="selectedButtonId"
        :server-ip="serverIp"
        :server-port="serverPort"
        :apk-connect-payload="apkConnectPayload"
        :apk-connect-qr-svg="apkConnectQrSvg"
        :web-client-url="webClientUrl"
        :web-client-qr-svg="webClientQrSvg"
        :ws-bind-error="wsBindError"
        :web-bind-error="webBindError"
        :saved-server-config="savedServerConfig"
        :is-mac="isMac"
        @open-zoom-modal="openZoomModal"
        @open-app-picker="appPickerOpen = true"
        @open-guide-center="openGuide"
      />

      <!-- Right Preview -->
      <MainPreview
        :selected-button-id="selectedButtonId"
        :client-device-size="clientDeviceSize"
        :client-device-name="clientDeviceName"
        @select-button="selectButton"
      />
    </div>

    <!-- Settings Modal -->
    <ModalSettings
      v-model="settingsOpen"
      :server-ip="serverIp"
      :server-port="serverPort"
      :ws-ready="wsReady"
      :running-ws-port="runningWsPort"
      :web-ready="webReady"
      :web-client-url="webClientUrl"
      :web-client-qr-svg="webClientQrSvg"
      :saved-server-config="savedServerConfig"
      :active-theme="activeTheme"
      :autostart-on="autostartOn"
      :autostart-loading="autostartLoading"
      :server-config-draft="serverConfigDraft"
      :server-config-saving="serverConfigSaving"
      :server-config-error="serverConfigError"
      :server-config-validation-error="serverConfigValidationError"
      :has-pending-server-changes="hasPendingServerChanges"
      :network-settings-badge-text="networkSettingsBadgeText"
      :can-save-server-config="canSaveServerConfig"
      :server-config-save-hint="serverConfigSaveHint"
      :app-version="appVersion"
      :is-mac="isMac"
      @set-theme="setTheme"
      @toggle-autostart="toggleAutostart"
      @save-network-settings-and-relaunch="saveNetworkSettingsAndRelaunch"
      @copy-web-client-url="copyWebClientUrl"
      @open-zoom-modal="openZoomModal"
      @open-image-zoom="openImageZoom"
      @open-accessibility-settings="openAccessibilitySettings"
      @handle-export="handleExport"
      @trigger-import="triggerImport"
      @open-external-link="openExternalLink"
    />

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
                {{
                  restartDialogFailed ? 'Chưa tự khởi động lại được' : 'Đang áp dụng cấu hình mạng'
                }}
              </h3>
              <p class="text-[9px] text-slate-500 mt-0.5">
                {{
                  restartDialogFailed
                    ? 'Cấu hình đã lưu; hãy mở lại Companion thủ công nếu cần.'
                    : 'Companion sẽ mở lại with listener mới.'
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
            <div class="font-bold uppercase tracking-wider text-amber-200">
              Checklist restart thủ công
            </div>
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
        </div>
      </div>
    </transition>

    <!-- App Picker Modal -->
    <AppPickerModal
      v-model="appPickerOpen"
      @select="
        path => {
          if (selectedButton) {
            selectedButton.appPath = path;
            layoutStore.updateLayout({ ...layoutStore.layout });
          }
        }
      "
    />

    <!-- Guide Center Modal -->
    <GuideCenterModal
      v-model="guideCenterOpen"
      :active-topic="guideTopic"
      @apply-template="
        cmdVal => {
          if (selectedButton) {
            selectedButton.commandValue = cmdVal;
            layoutStore.updateLayout({ ...layoutStore.layout });
          }
        }
      "
    />

    <!-- QR Zoom Modal -->
    <QrZoomModal
      v-model="zoomModalOpen"
      :zoom-modal-title="zoomModalTitle"
      :zoom-modal-image-src="zoomModalImageSrc"
      :zoom-modal-qr-svg="zoomModalQrSvg"
      :zoom-modal-payload="zoomModalPayload"
      :zoom-modal-copy-hint="zoomModalCopyHint"
      @copy="copyZoomModalPayload"
    />

    <input
      ref="importInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="handleImport"
    />
  </div>
</template>

<style>
@import '../assets/dashboard.css';
</style>
