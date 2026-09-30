<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Icon } from '@iconify/vue';
import { useUpdaterStore } from '../../stores/updater';
import { FONT_TIER_CLASS } from '../../lib/typography';
import type { ThemeName } from '../../lib/themes';
import { i18n, setLocale, type SupportedLocale } from '../../i18n';
import ModalThemeSelector from './ModalThemeSelector.vue';
import Input from '../ui/Input.vue';

type SettingsGroupId =
  | 'general'
  | 'network'
  | 'client-qr'
  | 'permissions'
  | 'updates'
  | 'import-export'
  | 'about';

const props = defineProps<{
  modelValue: boolean;
  serverIp: string;
  serverPort: number;
  wsReady: boolean;
  runningWsPort: number | null;
  webReady: boolean;
  webClientUrl: string;
  webClientQrSvg: string;
  savedServerConfig: any;
  activeTheme: ThemeName;
  autostartOn: boolean;
  autostartLoading: boolean;
  serverConfigDraft: {
    wsPort: string;
    webEnabled: boolean;
    webPort: string;
  };
  serverConfigSaving: boolean;
  serverConfigError: string;
  serverConfigValidationError: string;
  hasPendingServerChanges: boolean;
  networkSettingsBadgeText: string;
  canSaveServerConfig: boolean;
  serverConfigSaveHint: string;
  appVersion: string;
  isMac: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'setTheme', name: ThemeName): void;
  (e: 'toggleAutostart'): void;
  (e: 'saveNetworkSettingsAndRelaunch'): void;
  (e: 'copyWebClientUrl'): void;
  (e: 'openZoomModal', title: string, payload: string, svg: string): void;
  (e: 'openImageZoom', title: string, src: string): void;
  (e: 'openAccessibilitySettings'): void;
  (e: 'handleExport'): void;
  (e: 'triggerImport'): void;
  (e: 'openExternalLink', url: string): void;
}>();

const updaterStore = useUpdaterStore();
const activeSettingsGroup = ref<SettingsGroupId>('general');
const typographyClass = FONT_TIER_CLASS;

const activeLocale = computed<SupportedLocale>({
  get: () => i18n.global.locale.value as SupportedLocale,
  set: (value) => setLocale(value),
});

// SHARED-MESSAGES MARKER: this file's other hardcoded strings get folded
// into this same `messages` object (under matching `en`/`vi` keys) rather
// than each getting their own separate useI18n() call.
const { t } = useI18n({
  useScope: 'local',
  messages: {
    en: {
      settings: {
        language: { label: 'Language', en: 'English', vi: 'Vietnamese' },
      },
      modal: {
        title: 'Settings & System Information',
        subtitle: 'Auto configuration, updater, and software license',
        close: 'Close',
      },
      nav: {
        ariaLabel: 'Settings groups',
      },
      groups: {
        general: 'General',
        network: 'Network',
        clientQr: 'Client & QR',
        permissions: 'Permissions',
        updates: 'Updates',
        importExport: 'Import/Export',
        about: 'About/Support',
      },
      general: {
        theme: 'Theme',
        autostart: 'Autostart',
        startWithSystem: 'Start with system:',
        startWithSystemHint: 'Run hidden in the system tray on startup',
        on: 'On',
        off: 'Off',
      },
      network: {
        currentlyRunningPort: 'Currently Running Port',
        portAfterRestart: 'Port After Restart',
        httpWebClientPort: 'HTTP Web Client Port',
        webOn: 'Web On',
        webOff: 'Web Off',
        saving: 'Saving...',
        saveAndRestart: 'Save and Restart',
      },
      clientQr: {
        trustedWifiOnly: 'Only enable on trusted Wi-Fi',
        copyWebUrl: 'Copy Web URL',
        zoomTitle: 'Click to zoom in on the QR code',
        zoomAria: 'Web Client QR code. Press Enter or Space to zoom in.',
        openOnIpadBrowser: 'Open on iPad / Browser',
        enableWebClientPrefix: 'Enable',
        enableWebClientMid: 'in the',
        enableWebClientSuffix: 'group to generate a URL + QR code for iPad/Browser.',
      },
      permissions: {
        accessibilityLabel: 'Accessibility (macOS):',
        accessibilityDesc:
          'Required to send keyboard shortcuts to the focused app. If not enabled, open System Settings and enable it for the running binary.',
        openSettingsTitle: 'Open Accessibility Settings',
        openSystemSettings: 'Open System Settings',
        detailsPrefix: 'For executablePath / bundle identifier details, see',
        detailsBold: 'Accessibility recovery',
        detailsSuffix: 'above on the dashboard.',
      },
      updates: {
        updateLog: 'Update Log:',
        readyToCheck: 'Ready to check',
        check: 'Check',
        checking: 'Checking for updates…',
        upToDate: 'The app is on the latest version.',
        updateReady: 'Update v{version} is ready.',
        downloadingPct: 'Downloading… {pct}%',
        downloadComplete: 'Download complete — installing now.',
        checkFailed: 'Update check failed.',
        updateAvailableText:
          'A new update v{version} is available. Would you like to download and install it automatically?',
        openDownloadPage: 'Open download page →',
        downloadAndUpgrade: 'Download & upgrade automatically',
        downloadingEllipsis: 'Downloading...',
      },
      importExport: {
        exportImportLabel: 'Export/Import layout data:',
        exportImportHint: 'Download or upload a JSON file of the key grid configuration',
        exportTitle: 'Export the current configuration to a JSON file',
        exportBtn: 'Export',
        importTitle: 'Load configuration from a JSON file',
        importBtn: 'Import',
      },
      about: {
        softwareName: 'Software Name:',
        appName: 'Android Stream Desk',
        currentVersion: 'Current Version:',
        author: 'Author:',
        authorValue: 'aniadev',
        license: 'License:',
        licenseValue: 'MIT License',
        sourceCode: 'Source Code:',
        githubRepo: 'GitHub Repo',
        supportDeveloper: 'Support the developer',
        supportText:
          'This project is completely free & open source. Buy the author a coffee if you find this app useful!',
        buyCoffee: 'Buy me a coffee (Ko-Fi)',
        momoZoomTitle: 'Click to zoom in on the MoMo QR code',
        momoZoomAria: 'MoMo QR code. Click to zoom in.',
        supportViaMomo: 'Support via MoMo',
        momoAlt: 'MoMo QR',
        scanMomo: 'Scan MoMo',
      },
    },
    vi: {
      settings: {
        language: { label: 'Ngôn ngữ', en: 'Tiếng Anh', vi: 'Tiếng Việt' },
      },
      modal: {
        title: 'Thiết lập & thông tin hệ thống',
        subtitle: 'Tự động cấu hình, updater và giấy phép phần mềm',
        close: 'Đóng',
      },
      nav: {
        ariaLabel: 'Settings groups',
      },
      groups: {
        general: 'General',
        network: 'Network',
        clientQr: 'Client & QR',
        permissions: 'Permissions',
        updates: 'Updates',
        importExport: 'Import/Export',
        about: 'About/Support',
      },
      general: {
        theme: 'Giao diện',
        autostart: 'Tự khởi động',
        startWithSystem: 'Khởi động cùng hệ thống:',
        startWithSystemHint: 'Chạy ẩn vào khay hệ thống (tray) khi bật máy',
        on: 'Bật',
        off: 'Tắt',
      },
      network: {
        currentlyRunningPort: 'Cổng đang chạy',
        portAfterRestart: 'Cổng sau khi khởi động lại',
        httpWebClientPort: 'Port HTTP Web Client',
        webOn: 'Web bật',
        webOff: 'Web tắt',
        saving: 'Đang lưu...',
        saveAndRestart: 'Lưu và khởi động lại',
      },
      clientQr: {
        trustedWifiOnly: 'Chỉ bật trên Wi-Fi tin cậy',
        copyWebUrl: 'Copy Web URL',
        zoomTitle: 'Click để phóng to mã QR',
        zoomAria: 'Mã QR Web Client. Nhấn Enter hoặc Space để phóng to.',
        openOnIpadBrowser: 'Mở trên iPad / Browser',
        enableWebClientPrefix: 'Bật',
        enableWebClientMid: 'trong nhóm',
        enableWebClientSuffix: 'để sinh URL + QR cho iPad/Browser.',
      },
      permissions: {
        accessibilityLabel: 'Accessibility (macOS):',
        accessibilityDesc:
          'Cần thiết để gửi phím tắt vào app đang focus. Nếu chưa bật, mở System Settings và bật cho binary đang chạy.',
        openSettingsTitle: 'Mở Accessibility Settings',
        openSystemSettings: 'Mở System Settings',
        detailsPrefix: 'Chi tiết executablePath / bundle identifier xem tại',
        detailsBold: 'khôi phục Accessibility',
        detailsSuffix: 'phía trên dashboard.',
      },
      updates: {
        updateLog: 'Nhật ký cập nhật:',
        readyToCheck: 'Sẵn sàng kiểm tra',
        check: 'Check',
        checking: 'Đang kiểm tra bản cập nhật…',
        upToDate: 'Ứng dụng ở phiên bản mới nhất.',
        updateReady: 'Bản cập nhật v{version} đã sẵn sàng.',
        downloadingPct: 'Đang tải xuống… {pct}%',
        downloadComplete: 'Đã tải xong — đang tiến hành cài đặt.',
        checkFailed: 'Kiểm tra cập nhật lỗi.',
        updateAvailableText:
          'Có bản cập nhật mới v{version}. Bạn có muốn tải xuống và cài đặt tự động?',
        openDownloadPage: 'Mở trang tải xuống →',
        downloadAndUpgrade: 'Tải & nâng cấp tự động',
        downloadingEllipsis: 'Đang tải xuống...',
      },
      importExport: {
        exportImportLabel: 'Xuất/Nhập dữ liệu layout:',
        exportImportHint: 'Tải về hoặc tải lên file JSON cấu hình lưới phím',
        exportTitle: 'Xuất cấu hình hiện tại ra file JSON',
        exportBtn: 'Export',
        importTitle: 'Nạp cấu hình từ file JSON',
        importBtn: 'Import',
      },
      about: {
        softwareName: 'Tên phần mềm:',
        appName: 'Android Stream Desk',
        currentVersion: 'Phiên bản hiện tại:',
        author: 'Tác giả:',
        authorValue: 'aniadev',
        license: 'Giấy phép:',
        licenseValue: 'MIT License',
        sourceCode: 'Mã nguồn:',
        githubRepo: 'GitHub Repo',
        supportDeveloper: 'Ủng hộ nhà phát triển',
        supportText:
          'Dự án hoàn toàn miễn phí & mã nguồn mở. Hãy mời tác giả một ly cà phê nếu bạn thấy ứng dụng này hữu ích!',
        buyCoffee: 'Buy me a coffee (Ko-Fi)',
        momoZoomTitle: 'Click để phóng to QR MoMo',
        momoZoomAria: 'Mã QR MoMo. Nhấn để phóng to.',
        supportViaMomo: 'Ủng hộ qua MoMo',
        momoAlt: 'MoMo QR',
        scanMomo: 'Quét MoMo',
      },
    },
  },
});

const settingsGroups = computed<Array<{ id: SettingsGroupId; label: string; icon: string }>>(() => [
  { id: 'general', label: t('groups.general'), icon: 'lucide:sliders-horizontal' },
  { id: 'network', label: t('groups.network'), icon: 'lucide:wifi' },
  { id: 'client-qr', label: t('groups.clientQr'), icon: 'lucide:qr-code' },
  { id: 'permissions', label: t('groups.permissions'), icon: 'lucide:shield-check' },
  { id: 'updates', label: t('groups.updates'), icon: 'lucide:refresh-cw' },
  { id: 'import-export', label: t('groups.importExport'), icon: 'lucide:database' },
  { id: 'about', label: t('groups.about'), icon: 'lucide:info' },
]);

const visibleSettingsGroups = computed(() =>
  settingsGroups.value.filter(group => group.id !== 'permissions' || props.isMac),
);

const activeWsPort = computed(() => props.runningWsPort ?? props.serverPort);

const updateStatusText = computed(() => {
  switch (updaterStore.state) {
    case 'checking':
      return t('updates.checking');
    case 'no-update':
      return t('updates.upToDate');
    case 'available':
      return t('updates.updateReady', { version: updaterStore.update?.version });
    case 'downloading':
      return t('updates.downloadingPct', { pct: updaterStore.progressPct });
    case 'ready':
      return t('updates.downloadComplete');
    case 'error':
      return updaterStore.errorMsg ?? t('updates.checkFailed');
    default:
      return '';
  }
});

const scrollToSettingsGroup = (id: SettingsGroupId) => {
  if (!visibleSettingsGroups.value.some(group => group.id === id)) return;
  activeSettingsGroup.value = id;
  const el = document.getElementById(`settings-group-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const onSettingsScroll = (e: Event) => {
  const container = e.target as HTMLElement;
  if (!container) return;
  const groups: SettingsGroupId[] = visibleSettingsGroups.value.map(g => g.id);
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
</script>

<template>
  <transition name="fade">
    <div
      v-if="modelValue"
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
              {{ t('modal.title') }}
            </h2>
            <p class="text-[9px] text-slate-500 mt-0.5">
              {{ t('modal.subtitle') }}
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            @click="emit('update:modelValue', false)"
            :title="t('modal.close')"
            :aria-label="t('modal.close')"
          >
            <Icon icon="lucide:x" class="text-base" />
          </button>
        </div>

        <!-- Body: 2-col layout, left rail nav + scrollable content -->
        <div class="flex flex-1 overflow-hidden min-h-0">
          <nav
            class="w-[160px] shrink-0 border-r border-slate-800/60 p-3 flex flex-col gap-1 overflow-y-auto bg-slate-950/40"
            :aria-label="t('nav.ariaLabel')"
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
            <section id="settings-group-general" class="flex flex-col gap-3 scroll-mt-4">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:sliders-horizontal" class="text-sm text-cyan-400" />
                <h3 class="cyber-section-title">{{ t('groups.general') }}</h3>
              </div>

              <!-- Theme -->
              <div class="flex flex-col gap-2.5">
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500"
                  >{{ t('general.theme') }}</span
                >
                <ModalThemeSelector
                  :active-theme="activeTheme"
                  @set-theme="emit('setTheme', $event)"
                />
              </div>

              <!-- Language -->
              <div class="flex flex-col gap-2.5">
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500"
                  >{{ t('settings.language.label') }}</span
                >
                <select
                  v-model="activeLocale"
                  class="cyber-inset bg-brand-dark border border-brand-border text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
                >
                  <option value="en">{{ t('settings.language.en') }}</option>
                  <option value="vi">{{ t('settings.language.vi') }}</option>
                </select>
              </div>

              <!-- Autostart -->
              <div class="flex flex-col gap-2.5">
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500"
                  >{{ t('general.autostart') }}</span
                >
                <div class="cyber-inset flex items-center justify-between p-3">
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="font-medium text-slate-300">{{ t('general.startWithSystem') }}</span>
                    <span class="text-[9px] text-slate-500"
                      >{{ t('general.startWithSystemHint') }}</span
                    >
                  </div>
                  <button
                    @click="emit('toggleAutostart')"
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
                    <span>{{ autostartOn ? t('general.on') : t('general.off') }}</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- ===== Group: Network ===== -->
            <section id="settings-group-network" class="flex flex-col gap-3 scroll-mt-4">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:wifi" class="text-sm text-cyan-400" />
                  <h3 class="cyber-section-title">{{ t('groups.network') }}</h3>
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
                    <span class="cyber-input-label">{{ t('network.currentlyRunningPort') }}</span>
                    <div
                      class="h-[38px] rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 font-mono text-xs text-slate-400 shadow-inner"
                    >
                      {{ activeWsPort }}
                    </div>
                  </label>

                  <label class="flex flex-col gap-1.5">
                    <span class="cyber-input-label">{{ t('network.portAfterRestart') }}</span>
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
                    <span class="cyber-input-label">{{ t('network.httpWebClientPort') }}</span>
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
                      :icon="
                        serverConfigDraft.webEnabled
                          ? 'lucide:toggle-right'
                          : 'lucide:toggle-left'
                      "
                      class="text-sm"
                    />
                    {{ serverConfigDraft.webEnabled ? t('network.webOn') : t('network.webOff') }}
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
                    @click="emit('saveNetworkSettingsAndRelaunch')"
                  >
                    <Icon
                      :icon="serverConfigSaving ? 'lucide:loader-circle' : 'lucide:refresh-cw'"
                      class="text-xs"
                      :class="serverConfigSaving ? 'animate-spin' : ''"
                    />
                    {{ serverConfigSaving ? t('network.saving') : t('network.saveAndRestart') }}
                  </button>
                </div>
              </div>
            </section>

            <!-- ===== Group: Client & QR ===== -->
            <section id="settings-group-client-qr" class="flex flex-col gap-3 scroll-mt-4">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:qr-code" class="text-sm text-cyan-400" />
                <h3 class="cyber-section-title">{{ t('groups.clientQr') }}</h3>
              </div>

              <div
                v-if="webClientUrl"
                class="cyber-inset p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start"
              >
                <div class="flex flex-col gap-2 min-w-0">
                  <div class="flex items-center gap-2">
                    <Icon icon="lucide:triangle-alert" class="text-amber-400 text-sm shrink-0" />
                    <span class="text-[9px] font-bold uppercase tracking-wider text-amber-300/90"
                      >{{ t('clientQr.trustedWifiOnly') }}</span
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
                    @click="emit('copyWebClientUrl')"
                  >
                    <Icon :icon="updaterStore.errorMsg ? 'lucide:alert-circle' : 'lucide:copy'" class="text-xs" />
                    {{ t('clientQr.copyWebUrl') }}
                  </button>
                </div>

                <div
                  class="w-56 rounded-xl border border-cyan-400/20 bg-slate-950/80 p-3.5 shadow-[0_0_24px_rgba(34,211,238,0.08)] flex flex-col items-center justify-center gap-2"
                >
                  <button
                    v-if="props.webClientQrSvg"
                    type="button"
                    class="w-48 h-48 rounded-lg overflow-hidden bg-white p-1 cursor-zoom-in transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none hover:scale-[1.02]"
                    @click="emit('openZoomModal', 'Web Client LAN', webClientUrl, props.webClientQrSvg)"
                    @keydown.enter="emit('openZoomModal', 'Web Client LAN', webClientUrl, props.webClientQrSvg)"
                    @keydown.space.prevent="emit('openZoomModal', 'Web Client LAN', webClientUrl, props.webClientQrSvg)"
                    :title="t('clientQr.zoomTitle')"
                    :aria-label="t('clientQr.zoomAria')"
                  >
                    <div v-html="props.webClientQrSvg" class="w-full h-full"></div>
                  </button>
                  <div
                    class="mt-1 text-center text-[8.5px] font-bold uppercase tracking-wider text-cyan-300/80"
                  >
                    {{ t('clientQr.openOnIpadBrowser') }}
                  </div>
                </div>
              </div>
              <p v-else class="text-[10px] text-slate-500 leading-relaxed">
                {{ t('clientQr.enableWebClientPrefix') }} <strong class="text-slate-300">Web Client</strong> {{ t('clientQr.enableWebClientMid') }}
                <em>Network</em> {{ t('clientQr.enableWebClientSuffix') }}
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
                <h3 class="cyber-section-title">{{ t('groups.permissions') }}</h3>
              </div>

              <div class="cyber-inset flex items-center justify-between p-3">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="font-medium text-slate-300">{{ t('permissions.accessibilityLabel') }}</span>
                  <span class="text-[9px] text-slate-500">
                    {{ t('permissions.accessibilityDesc') }}
                  </span>
                </div>
                <button
                  type="button"
                  class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center justify-center gap-1.5 shrink-0"
                  @click="emit('openAccessibilitySettings')"
                  :title="t('permissions.openSettingsTitle')"
                >
                  <Icon icon="lucide:external-link" class="text-xs" />
                  <span>{{ t('permissions.openSystemSettings') }}</span>
                </button>
              </div>

              <p class="text-[9px] text-slate-500 leading-relaxed px-1">
                {{ t('permissions.detailsPrefix') }}
                <strong class="text-slate-300">{{ t('permissions.detailsBold') }}</strong> {{ t('permissions.detailsSuffix') }}
              </p>
            </section>

            <!-- ===== Group: Updates ===== -->
            <section id="settings-group-updates" class="flex flex-col gap-3 scroll-mt-4">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:refresh-cw" class="text-sm text-cyan-400" />
                <h3 class="cyber-section-title">{{ t('groups.updates') }}</h3>
              </div>

              <div class="cyber-inset flex flex-col gap-3 p-3">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="font-medium text-slate-300">{{ t('updates.updateLog') }}</span>
                    <span class="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                      {{ updateStatusText || t('updates.readyToCheck') }}
                    </span>
                  </div>
                  <button
                    class="cyber-action-btn font-bold cursor-pointer disabled:opacity-50 text-[10px] uppercase tracking-wider px-3 py-1.5"
                    :disabled="
                      updaterStore.state === 'checking' || updaterStore.state === 'downloading'
                    "
                    @click="updaterStore.checkForUpdates()"
                  >
                    {{ t('updates.check') }}
                  </button>
                </div>

                <div
                  v-if="updaterStore.state === 'available'"
                  class="flex flex-col gap-2 pt-2 cyber-divider"
                >
                  <p class="text-[10px] text-emerald-400 font-medium">
                    {{ t('updates.updateAvailableText', { version: updaterStore.update?.version }) }}
                  </p>
                  <button
                    class="cyber-action-btn font-bold w-full uppercase tracking-wider text-[10px] py-1.5 cursor-pointer"
                    @click="updaterStore.startInstall()"
                  >
                    {{
                      (updaterStore.update as any)?.isManual
                        ? t('updates.openDownloadPage')
                        : t('updates.downloadAndUpgrade')
                    }}
                  </button>
                </div>

                <div
                  v-if="updaterStore.state === 'downloading'"
                  class="flex flex-col gap-1.5 pt-2 cyber-divider"
                >
                  <div class="flex justify-between text-[10px] font-mono text-slate-300">
                    <span>{{ t('updates.downloadingEllipsis') }}</span>
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
            <section id="settings-group-import-export" class="flex flex-col gap-3 scroll-mt-4">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:database" class="text-sm text-cyan-400" />
                <h3 class="cyber-section-title">{{ t('groups.importExport') }}</h3>
              </div>

              <div class="cyber-inset flex items-center justify-between p-3">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="font-medium text-slate-300">{{ t('importExport.exportImportLabel') }}</span>
                  <span class="text-[9px] text-slate-500"
                    >{{ t('importExport.exportImportHint') }}</span
                  >
                </div>
                <div class="flex gap-2 shrink-0">
                  <button
                    type="button"
                    class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
                    @click="emit('handleExport')"
                    :title="t('importExport.exportTitle')"
                  >
                    <Icon icon="lucide:download" class="text-xs" />
                    <span>{{ t('importExport.exportBtn') }}</span>
                  </button>
                  <button
                    type="button"
                    class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
                    @click="emit('triggerImport')"
                    :title="t('importExport.importTitle')"
                  >
                    <Icon icon="lucide:upload" class="text-xs" />
                    <span>{{ t('importExport.importBtn') }}</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- ===== Group: About/Support ===== -->
            <section id="settings-group-about" class="flex flex-col gap-3 scroll-mt-4">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:info" class="text-sm text-cyan-400" />
                <h3 class="cyber-section-title">{{ t('groups.about') }}</h3>
              </div>

              <div class="flex flex-col gap-3">
                <div class="cyber-inset p-3">
                  <div class="grid grid-cols-2 gap-y-2">
                    <span class="text-slate-400 font-medium">{{ t('about.softwareName') }}</span>
                    <span class="text-slate-200 font-bold justify-self-end"
                      >{{ t('about.appName') }}</span
                    >
                    <span class="text-slate-400 font-medium">{{ t('about.currentVersion') }}</span>
                    <span class="font-mono text-cyan-300 justify-self-end"
                      >v{{ appVersion }}</span
                    >
                    <span class="text-slate-400 font-medium">{{ t('about.author') }}</span>
                    <span class="text-slate-200 justify-self-end font-semibold">{{ t('about.authorValue') }}</span>
                    <span class="text-slate-400 font-medium">{{ t('about.license') }}</span>
                    <span class="font-mono text-slate-200 justify-self-end">{{ t('about.licenseValue') }}</span>
                    <span class="text-slate-400 font-medium">{{ t('about.sourceCode') }}</span>
                    <span class="justify-self-end">
                      <a
                        href="https://github.com/aniadev/android-stream-desk"
                        @click.prevent="
                          emit('openExternalLink', 'https://github.com/aniadev/android-stream-desk')
                        "
                        class="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {{ t('about.githubRepo') }} <Icon icon="lucide:external-link" class="text-[10px]" />
                      </a>
                    </span>
                  </div>
                </div>

                <div
                  class="p-3 bg-gradient-to-r from-fuchsia-950/20 via-violet-950/30 to-cyan-950/20 rounded-xl border border-violet-500/20 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-[0_0_24px_rgba(139,92,246,0.05)]"
                >
                  <div
                    class="flex-1 flex flex-col gap-1 items-center sm:items-start text-center sm:text-left"
                  >
                    <div class="flex items-center gap-1.5 text-xs font-bold text-fuchsia-300">
                      <Icon icon="mdi:coffee" class="text-sm shrink-0" />
                      <span>{{ t('about.supportDeveloper') }}</span>
                    </div>
                    <p class="text-[9px] text-slate-400 max-w-[280px] leading-relaxed">
                      {{ t('about.supportText') }}
                    </p>
                    <a
                      href="https://ko-fi.com/ania9"
                      @click.prevent="emit('openExternalLink', 'https://ko-fi.com/ania9')"
                      class="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/30 hover:bg-fuchsia-900/40 hover:border-fuchsia-400 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-fuchsia-200 shadow shadow-fuchsia-950/20 transition duration-150 cursor-pointer"
                    >
                      <Icon icon="lucide:external-link" class="text-xs" />
                      <span>{{ t('about.buyCoffee') }}</span>
                    </a>
                  </div>
                  <div class="w-[148px] shrink-0 p-2 flex flex-col items-center gap-1">
                    <button
                      type="button"
                      class="w-full rounded bg-white p-0.5 cursor-zoom-in transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none"
                      :title="t('about.momoZoomTitle')"
                      :aria-label="t('about.momoZoomAria')"
                      @click="emit('openImageZoom', t('about.supportViaMomo'), '/donate/momo.png')"
                    >
                      <img
                        src="/donate/momo.png"
                        :alt="t('about.momoAlt')"
                        class="w-full aspect-square object-cover rounded"
                      />
                    </button>
                    <span
                      class="text-[8px] font-extrabold tracking-wider uppercase text-cyan-300/80"
                      >{{ t('about.scanMomo') }}</span
                    >
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
