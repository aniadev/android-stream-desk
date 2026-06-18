<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import { useLayoutStore } from '../../stores/layout';
import type { ButtonConfig, ActionType } from '../../types';
import { Icon, listIcons } from '@iconify/vue';
import { normalizeHex } from '../../lib/color';
import { mdiIcons, lucideIcons, materialIcons, siIcons } from '../../config/icons';
import Input from '../ui/Input.vue';

interface LinkUrlValidation {
  ok: boolean;
  domain?: string;
  reason?: string;
  normalized?: string;
}

const props = defineProps<{
  selectedButtonId: string | null;
  serverIp: string;
  serverPort: number;
  apkConnectPayload: string;
  apkConnectQrSvg: string;
  webClientUrl: string;
  webClientQrSvg: string;
  wsBindError: any;
  webBindError: any;
  savedServerConfig: any;
  isMac: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selectedButtonId', id: string | null): void;
  (e: 'openZoomModal', title: string, payload: string, svg: string): void;
  (e: 'openAppPicker'): void;
  (e: 'openGuideCenter', topic: 'browser' | 'shortcut' | 'firewall'): void;
}>();

const layoutStore = useLayoutStore();

const activeTab = ref<'shortcut' | 'media' | 'app' | 'command' | 'link'>('shortcut');
const qrSectionExpanded = ref(false);
const activeQrTab = ref<'apk' | 'web'>('apk');

const webCopyHint = ref<string>('');
const apkCopyHint = ref<string>('');
const colorCopyHint = ref<string>('');
const appPathHint = ref<string>('');

const selectedButton = computed(() => {
  return layoutStore.currentButtons.find(btn => btn.id === props.selectedButtonId) || null;
});

watch(selectedButton, newVal => {
  if (newVal) {
    activeTab.value = newVal.actionType;
  }
});

// --- Hex Color Input ---
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

// --- Grid Dimensions ---
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

  if (props.selectedButtonId && !newButtons.some(b => b.id === props.selectedButtonId)) {
    emit('update:selectedButtonId', null);
  }
};

// --- Button Settings Save ---
let saveTimer: number | null = null;
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

const duplicateSelected = () => {
  if (!selectedButton.value) return;
  const ok = layoutStore.duplicateButtonConfig(selectedButton.value.id);
  if (ok) {
    layoutStore.lastToast = {
      kind: 'info',
      message: 'Đã nhân bản phím sang ô trống đầu tiên!',
      at: Date.now(),
    };
  } else {
    layoutStore.lastToast = {
      kind: 'error',
      message: 'Không còn ô trống trên trang này để nhân bản.',
      at: Date.now(),
    };
  }
};

// --- Icon Picker ---
const searchQuery = ref('');
const activeIconGroup = ref<'mdi' | 'lucide' | 'material' | 'si'>('mdi');
const visibleCount = ref(120);
const iconScrollRef = ref<HTMLElement | null>(null);
const sentinelRef = ref<HTMLElement | null>(null);

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

const handleCustomIconUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !selectedButton.value) return;

  if (!file.type.startsWith('image/')) {
    layoutStore.lastToast = {
      kind: 'error',
      message: 'Vui lòng chọn tệp ảnh PNG hoặc JPG!',
      at: Date.now(),
    };
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 96;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;

        ctx.drawImage(img, x, y, w, h);

        const dataURL = canvas.toDataURL('image/png');

        if (dataURL.length > 28057) {
          layoutStore.lastToast = {
            kind: 'info',
            message: 'Ảnh đã được nén nhưng vượt 20KB. Payload tải có thể phình to.',
            at: Date.now(),
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

// --- Shortcut Recording ---
const isRecording = ref(false);
const pendingMods = ref({ ctrl: false, shift: false, alt: false, meta: false });
const heldKeys = ref<Set<string>>(new Set());

const metaLabel = computed(() => (props.isMac ? 'Cmd' : 'Win'));
const altLabel = computed(() => (props.isMac ? 'Opt' : 'Alt'));

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

  if (keyName === 'PrintScreen') {
    heldKeys.value.add(keyName);
  }

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
  window.removeEventListener('keydown', handleKeyDown, true);
  window.removeEventListener('keyup', handleKeyUp, true);
  window.removeEventListener('blur', handleWindowBlur);
  iconObserver?.disconnect();
});

const applyPreset = (value: string) => {
  if (selectedButton.value) {
    selectedButton.value.shortcutValue = value;
    saveButtonSettings();
  }
};

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

// --- App Path and Shortcut resolution ---
const appPresets = computed(() => {
  if (props.isMac) {
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
        path: 'C:\\Windows\\System32\\calc.exe',
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

const handleAppPathPaste = async (e: ClipboardEvent) => {
  const raw = e.clipboardData?.getData('text') ?? '';
  const text = raw.trim().replace(/^"|"$/g, '');

  if (!selectedButton.value || !window.__TAURI_INTERNALS__) return;

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

  if (text && text !== raw.trim()) {
    e.preventDefault();
    selectedButton.value.appPath = text;
    saveButtonSettings();
    return;
  }

  if (
    !text ||
    (!text.toLowerCase().endsWith('.lnk') && !text.includes('\\') && !text.includes('/'))
  ) {
    e.preventDefault();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const files = await invoke<string[]>('read_clipboard_files');

      const file = files.find(
        f => f.toLowerCase().endsWith('.lnk') || f.toLowerCase().endsWith('.exe'),
      );
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

// --- Link URL Validation ---
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

const openExternalLink = async (url: string) => {
  if (window.__TAURI_INTERNALS__) {
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

const testOpenLink = () => {
  if (!linkUrlValidation.value.ok || !linkUrlValidation.value.normalized) return;
  void openExternalLink(linkUrlValidation.value.normalized);
};

const copyApkConnectPayload = async () => {
  if (!props.apkConnectPayload) return;
  try {
    await navigator.clipboard.writeText(props.apkConnectPayload);
    apkCopyHint.value = 'Copied!';
    setTimeout(() => (apkCopyHint.value = ''), 1500);
  } catch (_) {
    apkCopyHint.value = 'Failed';
  }
};

const copyWebClientUrl = async () => {
  if (!props.webClientUrl) return;
  try {
    await navigator.clipboard.writeText(props.webClientUrl);
    webCopyHint.value = 'Copied!';
    setTimeout(() => (webCopyHint.value = ''), 1500);
  } catch (_) {
    webCopyHint.value = 'Failed';
  }
};
</script>

<template>
  <div class="cyber-panel w-80 flex flex-col p-5 gap-5 overflow-y-auto">
    <!-- Grid Dimensions -->
    <div class="flex flex-col gap-3">
      <div>
        <div class="inline-flex items-center gap-2">
          <Icon
            icon="lucide:layout-dashboard"
            class="text-sm text-white group-hover:text-cyan-300 transition-colors shrink-0"
          />
          <h2 class="cyber-section-title">Kích thước Lưới</h2>
        </div>
        <p class="cyber-section-desc">Tinh chỉnh kích cỡ cột hàng của pad</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Dòng</label>
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
          <label class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cột</label>
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
      <button
        type="button"
        class="flex items-center justify-between gap-2 w-full text-left cursor-pointer group"
        :aria-expanded="qrSectionExpanded"
        @click="qrSectionExpanded = !qrSectionExpanded"
      >
        <div class="inline-flex items-center gap-2">
          <Icon
            icon="lucide:smartphone"
            class="text-sm text-white group-hover:text-cyan-300 transition-colors shrink-0"
          />
          <h2 class="cyber-section-title">Kết nối thiết bị</h2>
        </div>
        <Icon
          :icon="qrSectionExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
          class="text-sm text-slate-500 group-hover:text-cyan-300 transition-colors shrink-0"
        />
      </button>

      <div v-show="qrSectionExpanded" class="flex flex-col gap-3">
        <div class="flex justify-end gap-1">
          <button
            type="button"
            class="px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded border transition-colors cursor-pointer"
            :class="
              activeQrTab === 'apk'
                ? 'border-cyan-400/50 text-cyan-300 bg-cyan-950/40'
                : 'border-slate-800 text-slate-500 hover:text-slate-350'
            "
            @click="activeQrTab = 'apk'"
          >
            APK
          </button>
          <button
            type="button"
            class="px-2 py-0.5 text-[8.5px] uppercase font-bold tracking-wider rounded border transition-colors cursor-pointer"
            :class="
              activeQrTab === 'web'
                ? 'border-cyan-400/50 text-cyan-300 bg-cyan-950/40'
                : 'border-slate-800 text-slate-500 hover:text-slate-350'
            "
            @click="activeQrTab = 'web'"
          >
            Web
          </button>
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

          <div
            class="flex flex-col items-center justify-center p-3 cyber-inset relative min-h-[224px]"
          >
            <div
              v-if="!apkConnectPayload || wsBindError"
              class="absolute inset-0 bg-slate-950/90 rounded-lg flex flex-col items-center justify-center p-4 text-center z-10 leading-normal gap-2 border border-rose-500/20"
            >
              <Icon
                :icon="wsBindError ? 'lucide:wifi-off' : 'lucide:loader-2'"
                class="text-lg animate-pulse text-rose-400"
              />
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {{ wsBindError ? 'Bind Error' : 'Chưa sẵn sàng' }}
              </span>
              <p class="text-[8.5px] text-slate-500">
                {{
                  wsBindError
                    ? 'Cổng WebSocket lỗi Firewall hoặc xung đột.'
                    : 'Companion server đang khởi động.'
                }}
              </p>
            </div>

            <button
              v-if="apkConnectQrSvg"
              type="button"
              class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in shadow-[0_0_18px_rgba(34,211,238,0.08)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
              @click="emit('openZoomModal', 'Kết nối APK', apkConnectPayload, apkConnectQrSvg)"
              @keydown.enter="
                emit('openZoomModal', 'Kết nối APK', apkConnectPayload, apkConnectQrSvg)
              "
              @keydown.space.prevent="
                emit('openZoomModal', 'Kết nối APK', apkConnectPayload, apkConnectQrSvg)
              "
              title="Click để phóng to mã QR"
              aria-label="Mã QR APK. Nhấn Enter hoặc Space để phóng to."
            >
              <div v-html="apkConnectQrSvg" class="w-full h-full"></div>
            </button>
          </div>

          <div class="px-1 text-[8.5px] text-slate-500 flex flex-col gap-0.5 leading-relaxed">
            <span class="font-bold text-[8px] uppercase tracking-wider text-slate-450"
              >Payload:</span
            >
            <span class="font-mono break-all line-clamp-2 select-text selection:bg-cyan-550/30">{{
              apkConnectPayload || '—'
            }}</span>
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

          <div
            class="flex flex-col items-center justify-center p-3 cyber-inset relative min-h-[224px]"
          >
            <div
              v-if="!webClientUrl || webBindError || !savedServerConfig?.webEnabled"
              class="absolute inset-0 bg-slate-950/90 rounded-lg flex flex-col items-center justify-center p-4 text-center z-10 leading-normal gap-2 border border-amber-500/20"
            >
              <Icon
                :icon="
                  webBindError
                    ? 'lucide:wifi-off'
                    : !savedServerConfig?.webEnabled
                      ? 'lucide:settings-2'
                      : 'lucide:loader-2'
                "
                class="text-lg animate-pulse text-amber-400"
              />
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {{
                  webBindError
                    ? 'Bind Error'
                    : !savedServerConfig?.webEnabled
                      ? 'Chưa bật Web Client'
                      : 'Chưa sẵn sàng'
                }}
              </span>
              <p class="text-[8.5px] text-slate-500">
                {{
                  webBindError
                    ? 'Cổng Web Server bị xung đột.'
                    : !savedServerConfig?.webEnabled
                      ? 'Hãy bật Web Client trong Cài đặt phía dưới.'
                      : 'Companion HTTP đang khởi chạy.'
                }}
              </p>
            </div>

            <button
              v-if="webClientQrSvg"
              type="button"
              class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in shadow-[0_0_18px_rgba(34,211,238,0.08)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
              @click="emit('openZoomModal', 'Web Client LAN', webClientUrl, webClientQrSvg)"
              @keydown.enter="emit('openZoomModal', 'Web Client LAN', webClientUrl, webClientQrSvg)"
              @keydown.space.prevent="
                emit('openZoomModal', 'Web Client LAN', webClientUrl, webClientQrSvg)
              "
              title="Click để phóng to mã QR"
              aria-label="Mã QR Web Client. Nhấn Enter hoặc Space để phóng to."
            >
              <div v-html="webClientQrSvg" class="w-full h-full"></div>
            </button>
          </div>

          <div class="px-1 text-[8.5px] text-slate-500 flex flex-col gap-0.5 leading-relaxed">
            <span class="font-bold text-[8px] uppercase tracking-wider text-slate-450"
              >Địa chỉ URL:</span
            >
            <span class="font-mono break-all line-clamp-2 select-text selection:bg-cyan-550/30">{{
              webClientUrl || '—'
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Button Config -->
    <div class="flex-1 flex flex-col cyber-divider pt-4 gap-4">
      <div class="flex justify-between flex-col">
        <div>
          <div class="inline-flex items-center gap-2">
            <Icon
              icon="lucide:settings"
              class="text-sm text-white group-hover:text-cyan-300 transition-colors shrink-0"
            />
            <h2 class="cyber-section-title">Cấu hình phím</h2>
          </div>

          <p class="cyber-section-desc">Biên tập chi tiết nhãn, biểu tượng, sự kiện</p>
        </div>
        <div v-if="selectedButton" class="flex items-center gap-1.5 shrink-0 mt-1">
          <button
            type="button"
            @click="layoutStore.copyButtonConfig(selectedButton)"
            class="text-[8px] uppercase tracking-widest font-extrabold px-1.5 py-1 rounded border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-0.5"
            title="Sao chép cấu hình phím (Ctrl+C)"
          >
            <Icon icon="lucide:copy" class="text-[9px]" />
            <span>Copy</span>
          </button>
          <button
            type="button"
            @click="layoutStore.pasteButtonConfig(selectedButton.id)"
            :disabled="!layoutStore.hasCopiedButton"
            class="text-[8px] uppercase tracking-widest font-extrabold px-1.5 py-1 rounded border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-0.5 disabled:opacity-45 disabled:cursor-not-allowed"
            title="Dán cấu hình phím (Ctrl+V)"
          >
            <Icon icon="lucide:clipboard" class="text-[9px]" />
            <span>Paste</span>
          </button>
          <button
            type="button"
            @click="duplicateSelected"
            class="text-[8px] uppercase tracking-widest font-extrabold px-1.5 py-1 rounded border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-0.5"
            title="Nhân bản phím vào ô trống"
          >
            <Icon icon="lucide:copy-plus" class="text-[9px]" />
            <span>Dup</span>
          </button>
        </div>
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

                  <!-- Upload Custom Icon Button -->
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

                    <!-- Icon Scale Option Dropdown -->
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

        <!-- Genshin Frame Selector -->
        <div v-if="layoutStore.layout.theme === 'genshin-01'" class="flex flex-col gap-2">
          <label class="cyber-input-label">Khung viền Genshin</label>
          <div class="cyber-tab-group grid grid-cols-4 gap-1 p-1 text-[10px]">
            <button
              v-for="frame in [1, 2, 3, 4]"
              :key="frame"
              @click="
                selectedButton.genshinFrame = frame;
                saveButtonSettings();
              "
              class="text-center py-1.5 font-bold uppercase tracking-wider transition-all duration-150 h-auto cursor-pointer"
              :class="
                (selectedButton.genshinFrame ?? 1) === frame
                  ? 'cyber-tab-active'
                  : 'text-slate-500 hover:text-slate-300'
              "
            >
              Khung {{ frame }}
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

        <!-- Action Type Tabs -->
        <template v-if="selectedButton.buttonKind !== 'monitor'">
          <div class="flex flex-col gap-2">
            <label class="cyber-input-label">Loại sự kiện</label>
            <div class="cyber-tab-group grid grid-cols-3 gap-1 p-1.5 text-[10px]">
              <button
                v-for="tab in ['shortcut', 'media', 'app', 'command', 'link'] as ActionType[]"
                :key="tab"
                @click="
                  activeTab = tab;
                  saveButtonSettings();
                "
                class="text-center py-2 px-1 rounded-md font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
                :class="
                  activeTab === tab
                    ? 'cyber-tab-active'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
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
                <span class="text-[9px] font-bold uppercase text-slate-400">Tổ hợp phím tắt:</span>
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
                  ⚠️ Nhấp tổ hợp phím bất kỳ trên bàn phím của bạn để ghi nhận... (Đang giữ:
                  {{ currentRecordingPreview }})
                </p>
              </div>

              <!-- Modifier toggles + manual key picker -->
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
                    @click="emit('openGuideCenter', 'shortcut')"
                  >
                    <Icon icon="lucide:help-circle" class="text-xs" />
                    <span class="text-[8.5px] uppercase tracking-wider font-semibold"
                      >Trợ giúp</span
                    >
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
                @click="emit('openAppPicker')"
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
                  @click="emit('openGuideCenter', 'browser')"
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

            <!-- Link -->
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
                Mở <span class="font-mono">{{ linkUrlValidation.domain }}</span> bằng trình duyệt
                mặc định.
              </p>
              <div v-if="linkUrlValidation.ok" class="flex justify-end">
                <button
                  type="button"
                  class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-2 flex items-center gap-1.5"
                  @click="testOpenLink"
                >
                  <Icon icon="lucide:external-link" class="text-xs" />
                  <span>Mở thử trên máy này</span>
                </button>
              </div>
              <p v-else class="text-[9px] font-bold text-red-400 flex items-center gap-1">
                <Icon icon="lucide:alert-circle" class="text-xs" />
                {{ linkUrlValidation.reason }}
              </p>
              <p class="text-[9px] font-bold leading-relaxed text-slate-500 px-2 py-1.5">
                URL được truyền nguyên dạng cho lệnh hệ điều hành (Windows
                <span class="font-mono">cmd /c start</span>, macOS
                <span class="font-mono">open</span>, Linux <span class="font-mono">xdg-open</span>)
                — không nối chuỗi shell.
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
</template>
