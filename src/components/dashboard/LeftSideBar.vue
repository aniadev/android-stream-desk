<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
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

const { t } = useI18n({
  useScope: 'local',
  messages: {
    en: {
      grid: {
        title: 'Grid Size',
        desc: "Fine-tune the pad's row and column count",
        rows: 'Rows',
        cols: 'Columns',
      },
      connection: {
        title: 'Device Connection',
        apkTab: 'APK',
        webTab: 'Web',
        apkLanIp: 'LAN IP for the Android app',
        copyApkTitle: 'Copy the APK connection payload',
        copy: 'Copy',
        bindError: 'Bind Error',
        notReady: 'Not ready',
        wsFirewallDetail: 'WebSocket port blocked by Firewall or in conflict.',
        serverStartingUp: 'Companion server is starting up.',
        apkConnectionModalTitle: 'APK Connection',
        zoomTitle: 'Click to zoom in on the QR code',
        apkZoomAria: 'APK QR code. Press Enter or Space to zoom in.',
        payloadLabel: 'Payload:',
        webLanIp: 'Open the Web client on iPad / Browser',
        copyWebTitle: 'Copy the Web Client address',
        webNotEnabled: 'Web Client not enabled',
        webPortConflict: 'Web Server port is in conflict.',
        enableWebInSettings: 'Enable Web Client in Settings below.',
        companionHttpStarting: 'Companion HTTP is starting up.',
        webClientLanTitle: 'Web Client LAN',
        webZoomAria: 'Web Client QR code. Press Enter or Space to zoom in.',
        urlAddressLabel: 'URL Address:',
      },
      keyConfig: {
        title: 'Key Configuration',
        desc: 'Edit label, icon, and action details',
        copyTitle: 'Copy key configuration (Ctrl+C)',
        copy: 'Copy',
        pasteTitle: 'Paste key configuration (Ctrl+V)',
        paste: 'Paste',
        dupTitle: 'Duplicate key into an empty slot',
        dup: 'Dup',
        labelText: 'Label Text',
        iconColor: 'Icon & Color',
        hexPlaceholder: '#rrggbb',
        hexTitleValid: 'Enter a hex code (#rgb or #rrggbb)',
        hexTitleInvalid: 'Invalid hex code — will revert on blur',
        copyColorTitle: 'Copy color code',
        uploadTitle: 'Upload a PNG/JPG image from your computer as the button icon',
        upload: 'Upload',
        sizingTitle: 'Image scaling on the button (Sizing Mode)',
        sizingOriginal: 'Original',
        sizingCover: 'Cover (Fill)',
        sizingContain: 'Contain (Fit)',
        sizingFill: 'Fill (Stretch)',
        searchIconsPlaceholder: 'Search icons...',
        searchingAllOf: 'Searching all of {pack} ({count} results)',
        noIconsFound: 'No icons found',
        buttonType: 'Button Type',
        action: 'Action',
        monitor: 'Monitor',
        genshinFrame: 'Genshin Frame',
        frameLabel: 'Frame {frame}',
        displayedData: 'Displayed Data',
        cpuUsage: 'CPU Usage (%)',
        ramUsage: 'RAM Usage (%)',
        updateEvery: 'Update every (seconds)',
        actionType: 'Action Type',
      },
      shortcutTab: {
        label: 'Keyboard shortcut:',
        noKeyAssigned: 'No key assigned — type e.g. Ctrl+Shift+T or press Record',
        recording: 'Recording...',
        record: 'Record',
        holdingHint: '⚠ Press any key combination on your keyboard to record it... (Holding: {preview})',
        assignManually: 'Or assign manually (for combinations your OS grabs first, e.g. desktop switching, macOS globals):',
        ctrl: 'Ctrl',
        shift: 'Shift',
        finalKeyPlaceholder: 'Final key (e.g. Q, F4, Space)',
        apply: 'Apply',
        quickPresets: 'Quick presets:',
        waitingForKeys: 'Waiting for keys...',
      },
      mediaTab: {
        systemCommand: 'System command:',
        playPause: 'Play/Pause',
        volumeUp: 'Volume Up (+)',
        volumeDown: 'Volume Down (-)',
        mute: 'Mute',
        nextTrack: 'Next Track',
        prevTrack: 'Previous Track',
      },
      appTab: {
        macPathLabel: 'macOS App Path (.app):',
        winPathLabel: '.exe path or paste a shortcut (.lnk):',
        viewGuideTitle: 'View guide for pasting a Shortcut / Copy as path',
        help: 'Help',
        macPlaceholder: 'e.g. /Applications/Safari.app',
        winPlaceholder: 'Paste a shortcut or C:\\path\\app.exe --args',
        browseApps: 'Browse installed apps...',
        quickAppSelect: 'Quick app select:',
      },
      commandTab: {
        shellCommand: 'Shell command:',
        viewExamples: 'View example commands...',
        warningPrefix:
          "⚠ The command runs with the current user's permissions — only use commands you trust. On macOS/Linux via",
        warningMid: ', Windows via',
        warningSuffix: '.',
      },
      linkTab: {
        websiteUrl: 'Website URL:',
        opensPrefix: 'Opens',
        opensSuffix: 'with the default browser.',
        testOpen: 'Test open on this machine',
        urlPassedPrefix: 'The URL is passed as-is to the OS command (Windows',
        urlPassedMid1: ', macOS',
        urlPassedMid2: ', Linux',
        urlPassedSuffix: ') — no shell string concatenation.',
      },
      emptyState: {
        selectKeyHint: 'Select a key on the preview grid to assign an action',
      },
      toast: {
        duplicated: 'Duplicated key to the first empty slot!',
        noEmptySlots: 'No empty slots left on this page to duplicate into.',
        pngJpgOnly: 'Please select a PNG or JPG image file!',
        imageCompressedWarning:
          'The image was compressed but still exceeds 20KB. The upload payload may be bloated.',
        shortcutResolved: '✓ Shortcut resolved',
        shortcutReadFailed: '✗ Could not read shortcut',
        pastedShortcutSuccess: '✓ Pasted shortcut successfully',
        nothingToPaste: '✗ Nothing to paste. Please use App Picker!',
        clipboardReadFailed: '✗ Could not read clipboard. Please use App Picker!',
      },
      linkValidation: {
        enterUrl: 'Enter a URL starting with http:// or https://',
        onlyHttp: 'Only http:// or https:// are accepted',
        missingHostname: 'URL is missing a hostname',
        noCredentials: 'URL must not contain credentials (user:pass@)',
        invalidUrl: 'Invalid URL',
      },
    },
    vi: {
      grid: {
        title: 'Kích thước Lưới',
        desc: 'Tinh chỉnh kích cỡ cột hàng của pad',
        rows: 'Dòng',
        cols: 'Cột',
      },
      connection: {
        title: 'Kết nối thiết bị',
        apkTab: 'APK',
        webTab: 'Web',
        apkLanIp: 'LAN IP cho Android app',
        copyApkTitle: 'Sao chép payload kết nối APK',
        copy: 'Copy',
        bindError: 'Bind Error',
        notReady: 'Chưa sẵn sàng',
        wsFirewallDetail: 'Cổng WebSocket lỗi Firewall hoặc xung đột.',
        serverStartingUp: 'Companion server đang khởi động.',
        apkConnectionModalTitle: 'Kết nối APK',
        zoomTitle: 'Click để phóng to mã QR',
        apkZoomAria: 'Mã QR APK. Nhấn Enter hoặc Space để phóng to.',
        payloadLabel: 'Payload:',
        webLanIp: 'Mở Web client trên iPad / Browser',
        copyWebTitle: 'Sao chép địa chỉ Web Client',
        webNotEnabled: 'Chưa bật Web Client',
        webPortConflict: 'Cổng Web Server bị xung đột.',
        enableWebInSettings: 'Hãy bật Web Client trong Cài đặt phía dưới.',
        companionHttpStarting: 'Companion HTTP đang khởi chạy.',
        webClientLanTitle: 'Web Client LAN',
        webZoomAria: 'Mã QR Web Client. Nhấn Enter hoặc Space để phóng to.',
        urlAddressLabel: 'Địa chỉ URL:',
      },
      keyConfig: {
        title: 'Cấu hình phím',
        desc: 'Biên tập chi tiết nhãn, biểu tượng, sự kiện',
        copyTitle: 'Sao chép cấu hình phím (Ctrl+C)',
        copy: 'Copy',
        pasteTitle: 'Dán cấu hình phím (Ctrl+V)',
        paste: 'Paste',
        dupTitle: 'Nhân bản phím vào ô trống',
        dup: 'Dup',
        labelText: 'Nhãn chữ',
        iconColor: 'Biểu tượng & Màu sắc',
        hexPlaceholder: '#rrggbb',
        hexTitleValid: 'Nhập mã hex (#rgb hoặc #rrggbb)',
        hexTitleInvalid: 'Mã hex không hợp lệ — sẽ revert khi rời focus',
        copyColorTitle: 'Sao chép mã màu',
        uploadTitle: 'Tải ảnh PNG/JPG từ máy tính làm biểu tượng nút',
        upload: 'Tải ảnh',
        sizingTitle: 'Tỉ lệ phủ ảnh trên nút (Sizing Mode)',
        sizingOriginal: 'Gốc',
        sizingCover: 'Cover (Phủ)',
        sizingContain: 'Contain (Thừa)',
        sizingFill: 'Fill (Kéo)',
        searchIconsPlaceholder: 'Tìm biểu tượng...',
        searchingAllOf: 'Đang tìm trong toàn bộ {pack} ({count} kết quả)',
        noIconsFound: 'Không tìm thấy biểu tượng',
        buttonType: 'Loại button',
        action: 'Action',
        monitor: 'Monitor',
        genshinFrame: 'Khung viền Genshin',
        frameLabel: 'Khung {frame}',
        displayedData: 'Dữ liệu hiển thị',
        cpuUsage: 'CPU Usage (%)',
        ramUsage: 'RAM Usage (%)',
        updateEvery: 'Cập nhật mỗi (giây)',
        actionType: 'Loại sự kiện',
      },
      shortcutTab: {
        label: 'Tổ hợp phím tắt:',
        noKeyAssigned: 'Chưa gán phím — gõ ví dụ Ctrl+Shift+T hoặc bấm Ghi',
        recording: 'Thu...',
        record: 'Thu',
        holdingHint: '⚠ Nhấp tổ hợp phím bất kỳ trên bàn phím của bạn để ghi nhận... (Đang giữ: {preview})',
        assignManually: 'Hoặc gán thủ công (cho tổ hợp bị hệ điều hành chặn trước, ví dụ chuyển desktop, phím macOS):',
        ctrl: 'Ctrl',
        shift: 'Shift',
        finalKeyPlaceholder: 'Phím cuối (vd: Q, F4, Space)',
        apply: 'Áp dụng',
        quickPresets: 'Mẫu gợi ý nhanh:',
        waitingForKeys: 'Đang chờ phím...',
      },
      mediaTab: {
        systemCommand: 'Lệnh hệ thống:',
        playPause: 'Play/Pause',
        volumeUp: 'Volume (+) Tăng',
        volumeDown: 'Volume (-) Giảm',
        mute: 'Mute Tắt âm',
        nextTrack: 'Next Track',
        prevTrack: 'Previous Track',
      },
      appTab: {
        macPathLabel: 'Đường dẫn App macOS (.app):',
        winPathLabel: 'Đường dẫn .exe hoặc dán shortcut (.lnk):',
        viewGuideTitle: 'Xem hướng dẫn dán Shortcut / Copy as path',
        help: 'Trợ giúp',
        macPlaceholder: 'e.g. /Applications/Safari.app',
        winPlaceholder: 'Dán shortcut hoặc C:\\path\\app.exe --args',
        browseApps: 'Browse installed apps...',
        quickAppSelect: 'Chọn nhanh ứng dụng:',
      },
      commandTab: {
        shellCommand: 'Lệnh shell:',
        viewExamples: 'Xem mẫu lệnh trợ giúp...',
        warningPrefix:
          '⚠ Lệnh chạy với quyền user hiện tại — chỉ dùng cho command bạn tin cậy. Trên macOS/Linux qua',
        warningMid: ', Windows qua',
        warningSuffix: '.',
      },
      linkTab: {
        websiteUrl: 'URL trang web:',
        opensPrefix: 'Mở',
        opensSuffix: 'bằng trình duyệt mặc định.',
        testOpen: 'Mở thử trên máy này',
        urlPassedPrefix: 'URL được truyền nguyên dạng cho lệnh hệ điều hành (Windows',
        urlPassedMid1: ', macOS',
        urlPassedMid2: ', Linux',
        urlPassedSuffix: ') — không nối chuỗi shell.',
      },
      emptyState: {
        selectKeyHint: 'Chọn ô nút bên lưới mô phỏng để gán sự kiện',
      },
      toast: {
        duplicated: 'Đã nhân bản phím sang ô trống đầu tiên!',
        noEmptySlots: 'Không còn ô trống trên trang này để nhân bản.',
        pngJpgOnly: 'Vui lòng chọn tệp ảnh PNG hoặc JPG!',
        imageCompressedWarning: 'Ảnh đã được nén nhưng vượt 20KB. Payload tải có thể phình to.',
        shortcutResolved: '✓ Đã giải shortcut',
        shortcutReadFailed: '✗ Không đọc được shortcut',
        pastedShortcutSuccess: '✓ Đã dán shortcut copy thành công',
        nothingToPaste: '✗ Không có gì để dán. Hãy chọn App Picker!',
        clipboardReadFailed: '✗ Không đọc được Clipboard. Hãy dùng App Picker!',
      },
      linkValidation: {
        enterUrl: 'Nhập URL bắt đầu bằng http:// hoặc https://',
        onlyHttp: 'Chỉ chấp nhận http:// hoặc https://',
        missingHostname: 'URL thiếu hostname',
        noCredentials: 'URL không được chứa tài khoản/mật khẩu (user:pass@)',
        invalidUrl: 'URL không hợp lệ',
      },
    },
  },
});

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
      message: t('toast.duplicated'),
      at: Date.now(),
    };
  } else {
    layoutStore.lastToast = {
      kind: 'error',
      message: t('toast.noEmptySlots'),
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
      message: t('toast.pngJpgOnly'),
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
            message: t('toast.imageCompressedWarning'),
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
  if (modifiers.length === 0 && bases.length === 0) return t('shortcutTab.waitingForKeys');
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
      appPathHint.value = t('toast.shortcutResolved');
    } catch {
      appPathHint.value = t('toast.shortcutReadFailed');
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
        appPathHint.value = t('toast.pastedShortcutSuccess');
      } else {
        appPathHint.value = t('toast.nothingToPaste');
      }
    } catch (err: any) {
      console.warn('Clipboard file read error:', err);
      appPathHint.value = t('toast.clipboardReadFailed');
    }
    setTimeout(() => (appPathHint.value = ''), 4000);
  }
};

// --- Link URL Validation ---
const validateLinkUrl = (raw: string | undefined | null): LinkUrlValidation => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, reason: t('linkValidation.enterUrl') };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: t('linkValidation.onlyHttp') };
    }
    if (!parsed.hostname) {
      return { ok: false, reason: t('linkValidation.missingHostname') };
    }
    if (parsed.username || parsed.password) {
      return { ok: false, reason: t('linkValidation.noCredentials') };
    }
    return { ok: true, domain: parsed.hostname, normalized: parsed.toString() };
  } catch {
    return { ok: false, reason: t('linkValidation.invalidUrl') };
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
      console.error('Failed to open link:', err);
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
          <h2 class="cyber-section-title">{{ t('grid.title') }}</h2>
        </div>
        <p class="cyber-section-desc">{{ t('grid.desc') }}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[9px] font-bold uppercase tracking-wider text-slate-400">{{ t('grid.rows') }}</label>
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
          <label class="text-[9px] font-bold uppercase tracking-wider text-slate-400">{{ t('grid.cols') }}</label>
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
          <h2 class="cyber-section-title">{{ t('connection.title') }}</h2>
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
            {{ t('connection.apkTab') }}
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
            {{ t('connection.webTab') }}
          </button>
        </div>

        <!-- APK Tab Content -->
        <div v-show="activeQrTab === 'apk'" class="flex flex-col gap-2.5">
          <div class="flex justify-between items-center gap-1">
            <p class="cyber-section-desc">{{ t('connection.apkLanIp') }}</p>
            <button
              type="button"
              class="cyber-action-btn font-bold cursor-pointer text-[9px] uppercase tracking-wider px-2 py-1 flex items-center gap-1"
              @click="copyApkConnectPayload"
              :disabled="!apkConnectPayload"
              :title="t('connection.copyApkTitle')"
            >
              <Icon :icon="apkCopyHint ? 'lucide:check' : 'lucide:copy'" class="text-[10px]" />
              <span>{{ apkCopyHint || t('connection.copy') }}</span>
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
                class="text-lg text-rose-400"
                :class="wsBindError ? '' : 'animate-spin'"
              />
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {{ wsBindError ? t('connection.bindError') : t('connection.notReady') }}
              </span>
              <p class="text-[8.5px] text-slate-500">
                {{
                  wsBindError
                    ? t('connection.wsFirewallDetail')
                    : t('connection.serverStartingUp')
                }}
              </p>
            </div>

            <button
              v-if="apkConnectQrSvg"
              type="button"
              class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in shadow-[0_0_18px_rgba(34,211,238,0.08)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
              @click="emit('openZoomModal', t('connection.apkConnectionModalTitle'), apkConnectPayload, apkConnectQrSvg)"
              @keydown.enter="
                emit('openZoomModal', t('connection.apkConnectionModalTitle'), apkConnectPayload, apkConnectQrSvg)
              "
              @keydown.space.prevent="
                emit('openZoomModal', t('connection.apkConnectionModalTitle'), apkConnectPayload, apkConnectQrSvg)
              "
              :title="t('connection.zoomTitle')"
              :aria-label="t('connection.apkZoomAria')"
            >
              <div v-html="apkConnectQrSvg" class="w-full h-full"></div>
            </button>
          </div>

          <div class="px-1 text-[8.5px] text-slate-500 flex flex-col gap-0.5 leading-relaxed">
            <span class="font-bold text-[8px] uppercase tracking-wider text-slate-450"
              >{{ t('connection.payloadLabel') }}</span
            >
            <span class="font-mono break-all line-clamp-2 select-text selection:bg-cyan-550/30">{{
              apkConnectPayload || '—'
            }}</span>
          </div>
        </div>

        <!-- Web Client Tab Content -->
        <div v-show="activeQrTab === 'web'" class="flex flex-col gap-2.5">
          <div class="flex justify-between items-center gap-1">
            <p class="cyber-section-desc">{{ t('connection.webLanIp') }}</p>
            <button
              type="button"
              class="cyber-action-btn font-bold cursor-pointer text-[9px] uppercase tracking-wider px-2 py-1 flex items-center gap-1"
              @click="copyWebClientUrl"
              :disabled="!webClientUrl"
              :title="t('connection.copyWebTitle')"
            >
              <Icon :icon="webCopyHint ? 'lucide:check' : 'lucide:copy'" class="text-[10px]" />
              <span>{{ webCopyHint || t('connection.copy') }}</span>
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
                class="text-lg text-amber-400"
              />
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {{
                  webBindError
                    ? t('connection.bindError')
                    : !savedServerConfig?.webEnabled
                      ? t('connection.webNotEnabled')
                      : t('connection.notReady')
                }}
              </span>
              <p class="text-[8.5px] text-slate-500">
                {{
                  webBindError
                    ? t('connection.webPortConflict')
                    : !savedServerConfig?.webEnabled
                      ? t('connection.enableWebInSettings')
                      : t('connection.companionHttpStarting')
                }}
              </p>
            </div>

            <button
              v-if="webClientQrSvg"
              type="button"
              class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in shadow-[0_0_18px_rgba(34,211,238,0.08)] transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
              @click="emit('openZoomModal', t('connection.webClientLanTitle'), webClientUrl, webClientQrSvg)"
              @keydown.enter="emit('openZoomModal', t('connection.webClientLanTitle'), webClientUrl, webClientQrSvg)"
              @keydown.space.prevent="
                emit('openZoomModal', t('connection.webClientLanTitle'), webClientUrl, webClientQrSvg)
              "
              :title="t('connection.zoomTitle')"
              :aria-label="t('connection.webZoomAria')"
            >
              <div v-html="webClientQrSvg" class="w-full h-full"></div>
            </button>
          </div>

          <div class="px-1 text-[8.5px] text-slate-500 flex flex-col gap-0.5 leading-relaxed">
            <span class="font-bold text-[8px] uppercase tracking-wider text-slate-450"
              >{{ t('connection.urlAddressLabel') }}</span
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
            <h2 class="cyber-section-title">{{ t('keyConfig.title') }}</h2>
          </div>

          <p class="cyber-section-desc">{{ t('keyConfig.desc') }}</p>
        </div>
        <div v-if="selectedButton" class="flex items-center gap-1.5 shrink-0 mt-1">
          <button
            type="button"
            @click="layoutStore.copyButtonConfig(selectedButton)"
            class="text-[8px] uppercase tracking-widest font-extrabold px-1.5 py-1 rounded border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-0.5"
            :title="t('keyConfig.copyTitle')"
          >
            <Icon icon="lucide:copy" class="text-[9px]" />
            <span>{{ t('keyConfig.copy') }}</span>
          </button>
          <button
            type="button"
            @click="layoutStore.pasteButtonConfig(selectedButton.id)"
            :disabled="!layoutStore.hasCopiedButton"
            class="text-[8px] uppercase tracking-widest font-extrabold px-1.5 py-1 rounded border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-0.5 disabled:opacity-45 disabled:cursor-not-allowed"
            :title="t('keyConfig.pasteTitle')"
          >
            <Icon icon="lucide:clipboard" class="text-[9px]" />
            <span>{{ t('keyConfig.paste') }}</span>
          </button>
          <button
            type="button"
            @click="duplicateSelected"
            class="text-[8px] uppercase tracking-widest font-extrabold px-1.5 py-1 rounded border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-0.5"
            :title="t('keyConfig.dupTitle')"
          >
            <Icon icon="lucide:copy-plus" class="text-[9px]" />
            <span>{{ t('keyConfig.dup') }}</span>
          </button>
        </div>
      </div>

      <div v-if="selectedButton" class="flex flex-col gap-4">
        <!-- Label -->
        <div class="flex flex-col gap-1.5">
          <label class="cyber-input-label">{{ t('keyConfig.labelText') }}</label>
          <Input
            v-model="selectedButton.label"
            type="text"
            class="shadow-inner"
            @input="saveButtonSettings"
          />
        </div>

        <!-- Icon & Color -->
        <div class="flex flex-col gap-1.5">
          <label class="cyber-input-label">{{ t('keyConfig.iconColor') }}</label>
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
                    :placeholder="t('keyConfig.hexPlaceholder')"
                    class="ml-2 font-mono text-[10px] text-slate-300 uppercase font-semibold bg-transparent border px-1.5 py-0.5 w-[68px] focus:outline-none focus:border-cyan-400 transition-colors"
                    :class="hexDraftValid ? 'border-cyan-400/20' : 'border-rose-500/70'"
                    :title="
                      hexDraftValid
                        ? t('keyConfig.hexTitleValid')
                        : t('keyConfig.hexTitleInvalid')
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
                  :title="colorCopyHint || t('keyConfig.copyColorTitle')"
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
                      :title="t('keyConfig.uploadTitle')"
                    >
                      <Icon icon="lucide:upload" class="text-[8px]" />
                      {{ t('keyConfig.upload') }}
                    </button>

                    <!-- Icon Scale Option Dropdown -->
                    <select
                      v-if="selectedButton.icon?.startsWith('data:')"
                      v-model="selectedButton.iconSizing"
                      @change="saveButtonSettings"
                      class="text-[8px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-cyan-400 rounded px-1 py-0.5 cursor-pointer max-w-[80px] shrink-0"
                      :title="t('keyConfig.sizingTitle')"
                    >
                      <option value="normal">{{ t('keyConfig.sizingOriginal') }}</option>
                      <option value="cover">{{ t('keyConfig.sizingCover') }}</option>
                      <option value="contain">{{ t('keyConfig.sizingContain') }}</option>
                      <option value="fill">{{ t('keyConfig.sizingFill') }}</option>
                    </select>
                  </div>
                </div>
                <Input
                  v-model="searchQuery"
                  :placeholder="t('keyConfig.searchIconsPlaceholder')"
                  class="h-6 text-[9px] py-1 px-2.5 cyber-input-sm"
                />
              </div>
              <p
                v-if="isFullSearch"
                class="text-[8px] text-cyan-400/70 font-mono text-center leading-tight pb-0.5"
              >
                {{ t('keyConfig.searchingAllOf', { pack: packLabel, count: filteredIcons.length }) }}
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
                  {{ t('keyConfig.noIconsFound') }}
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
          <label class="cyber-input-label">{{ t('keyConfig.buttonType') }}</label>
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
              {{ kind === 'action' ? t('keyConfig.action') : t('keyConfig.monitor') }}
            </button>
          </div>
        </div>

        <!-- Genshin Frame Selector -->
        <div v-if="layoutStore.layout.theme === 'genshin-01'" class="flex flex-col gap-2">
          <label class="cyber-input-label">{{ t('keyConfig.genshinFrame') }}</label>
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
              {{ t('keyConfig.frameLabel', { frame }) }}
            </button>
          </div>
        </div>

        <!-- Monitor Config -->
        <div
          v-if="selectedButton.buttonKind === 'monitor' && selectedButton.monitorConfig"
          class="cyber-inset p-3 flex flex-col gap-3"
        >
          <div class="flex flex-col gap-1.5">
            <label class="cyber-input-label">{{ t('keyConfig.displayedData') }}</label>
            <select
              v-model="selectedButton.monitorConfig!.metricType"
              @change="saveButtonSettings"
              class="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="cpu_percent">{{ t('keyConfig.cpuUsage') }}</option>
              <option value="ram_percent">{{ t('keyConfig.ramUsage') }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="cyber-input-label">{{ t('keyConfig.updateEvery') }}</label>
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
            <label class="cyber-input-label">{{ t('keyConfig.actionType') }}</label>
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
                <span class="text-[9px] font-bold uppercase text-slate-400">{{ t('shortcutTab.label') }}</span>
                <div class="relative flex items-center cyber-input-group overflow-hidden">
                  <!-- Typeable as well as recordable: combos the OS or window
                       manager grabs (desktop switching, macOS globals) never
                       reach the recorder, so typing e.g. "Shift+F1" is the
                       only way to assign them. Saved on Enter / blur. -->
                  <Input
                    v-model="selectedButton.shortcutValue"
                    type="text"
                    :placeholder="t('shortcutTab.noKeyAssigned')"
                    class="border-0 bg-transparent px-3 py-1.5 shadow-none font-mono"
                    :disabled="isRecording"
                    spellcheck="false"
                    autocomplete="off"
                    @change="saveButtonSettings"
                    @keydown.enter.prevent="saveButtonSettings"
                  />
                  <button
                    @click="toggleRecording"
                    class="cyber-record-btn h-auto text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 cursor-pointer"
                    :class="isRecording ? 'cyber-record-btn--active' : ''"
                  >
                    {{ isRecording ? t('shortcutTab.recording') : t('shortcutTab.record') }}
                  </button>
                </div>
                <p
                  class="text-[9px] text-fuchsia-400 font-semibold select-none leading-relaxed animate-pulse"
                  v-if="isRecording"
                >
                  {{ t('shortcutTab.holdingHint', { preview: currentRecordingPreview }) }}
                </p>
              </div>

              <!-- Modifier toggles + manual key picker -->
              <div v-if="isRecording" class="flex flex-col gap-2 pt-2 cyber-divider">
                <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  {{ t('shortcutTab.assignManually') }}
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
                    {{ t('shortcutTab.ctrl') }}
                  </button>
                  <button
                    type="button"
                    @click="toggleMod('shift')"
                    class="cyber-preset-btn text-[9px] py-1 font-bold uppercase tracking-wider"
                    :class="pendingMods.shift ? 'cyber-tab-active' : ''"
                  >
                    {{ t('shortcutTab.shift') }}
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
                    :placeholder="t('shortcutTab.finalKeyPlaceholder')"
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
                    {{ t('shortcutTab.apply') }}
                  </button>
                </div>
              </div>
              <div class="flex flex-col gap-1.5 pt-2 cyber-divider">
                <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500"
                  >{{ t('shortcutTab.quickPresets') }}</span
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
              <span class="text-[9px] font-bold uppercase text-slate-400">{{ t('mediaTab.systemCommand') }}</span>
              <select
                v-model="selectedButton.mediaAction"
                class="w-full text-xs font-semibold cyber-select px-2.5 py-2.5 cursor-pointer"
                @change="saveButtonSettings"
              >
                <option value="play_pause">{{ t('mediaTab.playPause') }}</option>
                <option value="volume_up">{{ t('mediaTab.volumeUp') }}</option>
                <option value="volume_down">{{ t('mediaTab.volumeDown') }}</option>
                <option value="mute">{{ t('mediaTab.mute') }}</option>
                <option value="next">{{ t('mediaTab.nextTrack') }}</option>
                <option value="prev">{{ t('mediaTab.prevTrack') }}</option>
              </select>
            </div>

            <!-- App -->
            <div v-else-if="activeTab === 'app'" class="flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] font-bold uppercase text-slate-400">
                    {{
                      isMac
                        ? t('appTab.macPathLabel')
                        : t('appTab.winPathLabel')
                    }}
                  </span>
                  <button
                    type="button"
                    class="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer p-0.5 flex items-center gap-1"
                    :title="t('appTab.viewGuideTitle')"
                    @click="emit('openGuideCenter', 'shortcut')"
                  >
                    <Icon icon="lucide:help-circle" class="text-xs" />
                    <span class="text-[8.5px] uppercase tracking-wider font-semibold"
                      >{{ t('appTab.help') }}</span
                    >
                  </button>
                </div>
                <Input
                  v-model="selectedButton.appPath"
                  type="text"
                  :placeholder="
                    isMac
                      ? t('appTab.macPlaceholder')
                      : t('appTab.winPlaceholder')
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
                <span>{{ t('appTab.browseApps') }}</span>
              </button>
              <div class="flex flex-col gap-1.5 pt-2 cyber-divider">
                <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500"
                  >{{ t('appTab.quickAppSelect') }}</span
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
              <span class="text-[9px] font-bold uppercase text-slate-400">{{ t('commandTab.shellCommand') }}</span>
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
                  <span>{{ t('commandTab.viewExamples') }}</span>
                </button>
              </div>
              <p
                class="text-[9px] font-bold leading-relaxed text-amber-400/90 cyber-warning px-2 py-1.5"
              >
                {{ t('commandTab.warningPrefix') }}
                <span class="font-mono">/bin/sh -c</span>{{ t('commandTab.warningMid') }}
                <span class="font-mono">cmd /C</span>{{ t('commandTab.warningSuffix') }}
              </p>
            </div>

            <!-- Link -->
            <div v-else-if="activeTab === 'link'" class="flex flex-col gap-2">
              <label class="text-[9px] font-bold uppercase text-slate-400" for="link-url-input"
                >{{ t('linkTab.websiteUrl') }}</label
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
                {{ t('linkTab.opensPrefix') }} <span class="font-mono">{{ linkUrlValidation.domain }}</span> {{ t('linkTab.opensSuffix') }}
              </p>
              <div v-if="linkUrlValidation.ok" class="flex justify-end">
                <button
                  type="button"
                  class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-2 flex items-center gap-1.5"
                  @click="testOpenLink"
                >
                  <Icon icon="lucide:external-link" class="text-xs" />
                  <span>{{ t('linkTab.testOpen') }}</span>
                </button>
              </div>
              <p v-else class="text-[9px] font-bold text-red-400 flex items-center gap-1">
                <Icon icon="lucide:alert-circle" class="text-xs" />
                {{ linkUrlValidation.reason }}
              </p>
              <p class="text-[9px] font-bold leading-relaxed text-slate-500 px-2 py-1.5">
                {{ t('linkTab.urlPassedPrefix') }}
                <span class="font-mono">cmd /c start</span>{{ t('linkTab.urlPassedMid1') }}
                <span class="font-mono">open</span>{{ t('linkTab.urlPassedMid2') }} <span class="font-mono">xdg-open</span>{{ t('linkTab.urlPassedSuffix') }}
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
          {{ t('emptyState.selectKeyHint') }}
        </span>
      </div>
    </div>
  </div>
</template>
