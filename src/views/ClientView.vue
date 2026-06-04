<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useConnectionStore } from '../stores/connection';
import { useLayoutStore } from '../stores/layout';
import { useSettingsStore } from '../stores/settings';
import GridArea from '../components/GridArea.vue';
import { Icon } from '@iconify/vue';
import { acquireWakeLock, releaseWakeLock, isWakeLockActive } from '../lib/wakelock';
import { unlockAudio } from '../lib/clicksound';
import { parseApkConnectPayload } from '../lib/apkConnectQr';
import { shouldShowScanAgainCta } from '../lib/mobileReconnectState';
import {
  fetchBrowserServerInfo,
  isBrowserMode,
  toBrowserBootstrapTarget,
} from '../lib/browserBootstrap';

const connectionStore = useConnectionStore();
const layoutStore = useLayoutStore();
const settingsStore = useSettingsStore();
const { keepScreenOn, vibrateOnClick, soundOnClick } = storeToRefs(settingsStore);

const showConnectModal = computed(() => {
  return !connectionStore.hasConnectedOnce && connectionStore.status !== 'connected';
});

const toastMessage = ref<string | null>(null);
const isSubmitted = ref(false);
const settingsOpen = ref(false);
const isScanningQr = ref(false);
let toastTimer: number | null = null;

const showToast = (msg: string, ms = 3500) => {
  toastMessage.value = msg;
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMessage.value = null;
    toastTimer = null;
  }, ms);
};

const isBrowserModeActive = isBrowserMode(window);
const isAndroidTauriApp = computed(() => {
  return !!window.__TAURI_INTERNALS__ && /Android/i.test(navigator.userAgent);
});
const showScanAgainCta = computed(() =>
  shouldShowScanAgainCta({
    isAndroidTauriApp: isAndroidTauriApp.value,
    status: connectionStore.status,
    reconnectAttempts: connectionStore.reconnectAttempts,
    maxReconnectAttempts: connectionStore.maxReconnectAttempts,
  }),
);

const bootstrapBrowserConnection = async () => {
  try {
    const info = await fetchBrowserServerInfo(window.location);
    const target = toBrowserBootstrapTarget(info, window.location);
    connectionStore.ipAddress = target.ipAddress;
    connectionStore.port = target.port;
    connectionStore.connect();
  } catch (e) {
    console.warn('Browser server-info bootstrap failed:', e);
    isSubmitted.value = false;
  }
};

type OrientationMode = 'auto' | 'landscape' | 'portrait' | 'landscape-reverse';
const ORIENTATION_KEY = 'asd.orientation';
const orientationMode = ref<OrientationMode>(
  (localStorage.getItem(ORIENTATION_KEY) as OrientationMode) || 'landscape',
);

const orientationOptions: { value: OrientationMode; label: string; icon: string }[] = [
  { value: 'auto', label: 'Tự động', icon: 'mdi:screen-rotation' },
  { value: 'landscape', label: 'Ngang', icon: 'mdi:phone-rotate-landscape' },
  { value: 'landscape-reverse', label: 'Ngang ngược', icon: 'mdi:phone-rotate-landscape' },
  { value: 'portrait', label: 'Dọc', icon: 'mdi:phone-rotate-portrait' },
];

// Android ActivityInfo.SCREEN_ORIENTATION_* values — matches Rust set_android_orientation.
const ANDROID_ORIENTATION: Record<OrientationMode, number> = {
  auto: -1, // UNSPECIFIED
  landscape: 0, // LANDSCAPE
  portrait: 1, // PORTRAIT
  'landscape-reverse': 8, // REVERSE_LANDSCAPE
};

const applyOrientation = async (mode: OrientationMode) => {
  // @ts-ignore
  const isTauri = !!window.__TAURI_INTERNALS__;
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_android_orientation', { mode: ANDROID_ORIENTATION[mode] });
    } catch (e: any) {
      console.warn('set_android_orientation failed:', e);
      showToast(`Xoay thất bại: ${e?.message || e}`);
    }
    return;
  }

  // Desktop / browser fallback — best effort via Screen Orientation API.
  const so = (screen as any).orientation;
  if (!so?.lock) return;
  try {
    if (mode === 'auto') {
      so.unlock?.();
    } else {
      const target =
        mode === 'landscape'
          ? 'landscape-primary'
          : mode === 'landscape-reverse'
            ? 'landscape-secondary'
            : 'portrait-primary';
      await so.lock(target);
    }
  } catch (_) {
    // browsers reject without fullscreen — silent ignore on desktop
  }
};

const setOrientation = (mode: OrientationMode) => {
  orientationMode.value = mode;
  localStorage.setItem(ORIENTATION_KEY, mode);
  applyOrientation(mode);
};

const handleConnect = () => {
  isSubmitted.value = true;
  if (!connectionStore.ipAddress) {
    return;
  }
  connectionStore.connect();
};

const handleDisconnect = () => {
  connectionStore.disconnect();
  settingsOpen.value = false;
};

const scanCompanionQr = async () => {
  if (!isAndroidTauriApp.value || isScanningQr.value) return;

  isScanningQr.value = true;
  try {
    const { Format, requestPermissions, scan } = await import('@tauri-apps/plugin-barcode-scanner');
    const permission = await requestPermissions();
    if (permission !== 'granted') {
      showToast('Chưa có quyền camera để quét QR.');
      return;
    }

    const result = await scan({ cameraDirection: 'back', formats: [Format.QRCode] });
    const target = parseApkConnectPayload(result.content);
    if (!target) {
      showToast('QR không đúng định dạng kết nối Android Stream Desk.');
      return;
    }

    connectionStore.applyScannedEndpoint(target.host, target.wsPort);
    isSubmitted.value = false;
    showToast(`Đã đọc QR Companion. Đang kết nối ${connectionStore.attemptingEndpoint}...`);
    connectionStore.connect();
  } catch (e: any) {
    showToast(`Quét QR thất bại: ${e?.message || e}`);
  } finally {
    isScanningQr.value = false;
  }
};

watch(
  () => layoutStore.lastToast,
  next => {
    if (!next) return;
    toastMessage.value = next.message;
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastMessage.value = null;
      toastTimer = null;
    }, 3500);
  },
  { deep: true },
);

const handleVisibilityChange = async () => {
  if (
    document.visibilityState === 'visible' &&
    keepScreenOn.value &&
    connectionStore.status === 'connected' &&
    !isWakeLockActive()
  ) {
    await acquireWakeLock();
  }
};

watch(
  [keepScreenOn, () => connectionStore.status],
  async ([keepOn, status]) => {
    if (keepOn && status === 'connected') {
      if (document.visibilityState === 'visible') {
        await acquireWakeLock();
      }
    } else {
      await releaseWakeLock();
    }
  }
);

onMounted(async () => {
  applyOrientation(orientationMode.value);

  const unlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });

  if (keepScreenOn.value) {
    await acquireWakeLock();
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);

  if (isBrowserModeActive) {
    await bootstrapBrowserConnection();
    return;
  }

  if (connectionStore.ipAddress) {
    // connectionStore.connect();
    return;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const info = await invoke<{ ip: string; port: number }>('get_server_info');
    const parts = info.ip.split('.');
    if (parts.length === 4 && info.ip !== '127.0.0.1') {
      connectionStore.ipAddress = `${parts[0]}.${parts[1]}.${parts[2]}.`;
    }
    if (info.port) {
      connectionStore.port = String(info.port);
    }
  } catch (_) {
    // ignore
  }
});

onUnmounted(() => {
  if (toastTimer !== null) clearTimeout(toastTimer);
  releaseWakeLock().catch(() => {});
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  connectionStore.disconnect();
});
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col overflow-hidden relative"
    :style="{ backgroundColor: 'var(--theme-bg)' }"
  >
    <!-- Grid Area occupies 98% of the screen when connected -->
    <div
      v-if="connectionStore.status === 'connected' || (connectionStore.hasConnectedOnce && !showConnectModal)"
      class="flex-1 w-full h-full flex items-center justify-center"
    >
      <GridArea class="w-full h-full origin-center" />
    </div>

    <!-- Offline Glass Connection Modal Popup centered when not connected -->
    <div
      v-else-if="showConnectModal"
      class="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none"
    >
      <!-- Offline banner if network is down altogether -->
      <div
        v-if="!connectionStore.isOnline"
        class="mb-6 w-full max-w-sm bg-amber-600/90 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-3 border border-amber-500/20"
      >
        <span class="text-xl">📡</span>
        <div class="flex flex-col leading-tight">
          <span class="font-bold">Mất kết nối mạng LAN</span>
          <span class="opacity-90 mt-0.5">Bật Wi-Fi và ở cùng mạng LAN với Companion.</span>
        </div>
      </div>

      <!-- Reconnect-in-progress banner -->
      <div
        v-else-if="connectionStore.isReconnecting"
        class="mb-6 w-full max-w-sm bg-indigo-600/90 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-3 border border-indigo-500/20"
      >
        <span
          class="inline-block animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
        ></span>
        <div class="flex flex-col leading-tight flex-1">
          <span class="font-bold"
            >Đang thử lại {{ connectionStore.reconnectAttempts }}/{{
              connectionStore.maxReconnectAttempts
            }}</span
          >
          <span class="opacity-90 mt-0.5"
            >Sửa IP/Port bên dưới rồi nhấn Kết nối ngay để dừng chu kỳ.</span
          >
          <span v-if="connectionStore.attemptingEndpoint" class="font-mono opacity-80 mt-1">
            {{ connectionStore.attemptingEndpoint }}
          </span>
        </div>
        <button
          @click="connectionStore.cancelReconnect()"
          class="text-[10px] uppercase font-extrabold tracking-wider px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 cursor-pointer"
        >
          Hủy
        </button>
      </div>

      <!-- Final error after max attempts -->
      <div
        v-else-if="
          connectionStore.status === 'error' &&
          connectionStore.reconnectAttempts >= connectionStore.maxReconnectAttempts
        "
        class="mb-6 w-full max-w-sm bg-rose-600/90 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-3 border border-rose-500/20"
      >
        <Icon icon="mdi:alert-circle" class="text-xl" />
        <div class="flex flex-col leading-tight flex-1">
          <span class="font-bold"
            >Không kết nối được sau {{ connectionStore.maxReconnectAttempts }} lần thử</span
          >
          <span class="opacity-90 mt-0.5"
            >Kiểm tra Companion đang chạy + IP/Port đúng rồi thử lại.</span
          >
          <span v-if="connectionStore.attemptingEndpoint" class="font-mono opacity-80 mt-1">
            {{ connectionStore.attemptingEndpoint }}
          </span>
        </div>
      </div>

      <div
        class="w-[380px] max-w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5 text-center relative overflow-hidden"
      >
        <!-- Glass shine overlay -->
        <span
          class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"
        ></span>

        <div
          class="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"
        >
          <Icon icon="mdi:wifi-strength-off" class="text-3xl text-slate-100" />
        </div>

        <div class="flex flex-col gap-1">
          <h2 class="text-base font-extrabold text-slate-100 uppercase tracking-wider">
            Chưa kết nối Companion
          </h2>
          <p class="text-[10px] text-slate-500 leading-normal max-w-xs px-2">
            Nhập địa chỉ IPv4 nội bộ và Port (ở Companion HUD góc phải) để đồng bộ hóa lưới phím
            macro.
          </p>
        </div>

        <div class="flex flex-col w-full gap-3">
          <div class="flex gap-2">
            <div class="flex-1 flex flex-col gap-1.5 align-left text-left">
              <label class="text-[8px] uppercase tracking-wider font-extrabold text-slate-455"
                >Địa chỉ IP:</label
              >
              <input
                v-model="connectionStore.ipAddress"
                type="text"
                placeholder="e.g. 192.168.1.15"
                class="w-full bg-slate-950 border text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-700 transition"
                :class="
                  isSubmitted && !connectionStore.ipAddress
                    ? 'border-rose-650 ring-1 ring-rose-650/50'
                    : 'border-slate-800'
                "
                :disabled="
                  connectionStore.status === 'connecting' && !connectionStore.isReconnecting
                "
              />
            </div>
            <div class="w-20 flex flex-col gap-1.5 align-left text-left">
              <label class="text-[8px] uppercase tracking-wider font-extrabold text-slate-455"
                >Port:</label
              >
              <input
                v-model="connectionStore.port"
                type="text"
                placeholder="Port"
                class="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2 py-2.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-slate-700 transition"
                :disabled="
                  connectionStore.status === 'connecting' && !connectionStore.isReconnecting
                "
              />
            </div>
          </div>
          <button
            v-if="isAndroidTauriApp"
            type="button"
            class="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-950/50 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-100 shadow shadow-violet-950/20 transition duration-150 hover:border-violet-400 hover:bg-violet-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            :class="showScanAgainCta ? 'border-amber-300/70 bg-amber-500/20 text-amber-100 shadow-amber-950/30' : ''"
            :disabled="
              isScanningQr ||
              (connectionStore.status === 'connecting' && !connectionStore.isReconnecting)
            "
            @click="scanCompanionQr"
          >
            <Icon
              :icon="isScanningQr ? 'mdi:loading' : 'mdi:camera-iris'"
              class="text-base"
              :class="{ 'animate-spin': isScanningQr }"
            />
            {{ isScanningQr ? 'Đang quét...' : showScanAgainCta ? 'Quét QR lại' : 'Quét QR từ Companion' }}
          </button>
        </div>

        <div class="w-full flex flex-col gap-2 mt-2">
          <button
            @click="
              connectionStore.status === 'connecting' && !connectionStore.isReconnecting
                ? connectionStore.disconnect()
                : handleConnect()
            "
            class="w-full font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition duration-150 transform hover:brightness-105 active:scale-98 shadow-md flex items-center justify-center gap-2 cursor-pointer text-white"
            :class="
              connectionStore.status === 'connecting' && !connectionStore.isReconnecting
                ? 'bg-rose-600 shadow-rose-900/10'
                : connectionStore.status === 'connecting'
                  ? 'bg-amber-600 shadow-amber-900/10'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-indigo-900/20'
            "
          >
            <span
              v-if="connectionStore.status === 'connecting'"
              class="inline-block animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full"
            ></span>
            {{
              connectionStore.status === 'connecting' && !connectionStore.isReconnecting
                ? 'Hủy'
                : connectionStore.status === 'connecting'
                  ? 'Đang kết nối...'
                  : connectionStore.status === 'error'
                    ? 'Lỗi - Thử lại ngay'
                    : 'Kết nối ngay'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Absolute miniature HUD float: small pill on the top right when connected or silently reconnecting -->
    <div
      v-if="connectionStore.status === 'connected' || connectionStore.hasConnectedOnce"
      class="absolute top-4 right-4 z-40 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-800 shadow-lg select-none duration-150 hover:bg-slate-850 cursor-pointer animate-pulse"
      @click="settingsOpen = true"
    >
      <span
        class="inline-flex h-2.5 w-2.5 rounded-full"
        :class="{
          'bg-emerald-500': connectionStore.status === 'connected',
          'bg-amber-500': connectionStore.status !== 'connected' && connectionStore.isReconnecting,
          'bg-rose-500': connectionStore.status !== 'connected' && !connectionStore.isReconnecting
        }"
      ></span>
      <Icon icon="mdi:cog" class="text-slate-400 text-base" />
    </div>

    <button
      v-if="showScanAgainCta"
      type="button"
      class="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-2xl shadow-amber-950/30"
      :disabled="isScanningQr"
      @click="scanCompanionQr"
    >
      <Icon
        :icon="isScanningQr ? 'mdi:loading' : 'mdi:camera-iris'"
        class="text-base"
        :class="{ 'animate-spin': isScanningQr }"
      />
      {{ isScanningQr ? 'Đang quét...' : 'Quét QR lại' }}
    </button>

    <!-- Settings Modal to inspect IP/Port or click 'Ngắt kết nối' -->
    <transition name="fade">
      <div
        v-if="settingsOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none"
        @click.self="settingsOpen = false"
      >
        <div
          class="w-[325px] max-w-full overflow-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative max-h-[90vh]"
        >
          <!-- Close button -->
          <button
            class="absolute top-3 right-3 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition duration-150"
            @click="settingsOpen = false"
          >
            <Icon icon="lucide:x" class="text-lg" />
          </button>

          <!-- Header -->
          <div class="flex items-center gap-2.5 border-b border-slate-800/80 pb-3 shrink-0">
            <div
              class="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-sm shadow"
            >
              ⚙️
            </div>
            <div>
              <h3 class="text-xs font-bold text-slate-50 uppercase tracking-wider">
                Thông tin kết nối
              </h3>
              <p class="text-[8px] text-slate-500 uppercase font-bold mt-0.5">Companion config</p>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
            <div
              class="flex flex-col gap-1 rounded-xl bg-slate-950/60 p-3 border border-slate-850/60 text-xs"
            >
              <div class="flex justify-between py-1 border-b border-slate-900/60">
                <span class="text-slate-450 font-semibold">Server Address:</span>
                <span class="font-mono text-slate-200 font-bold">
                  {{ connectionStore.ipAddress }}:{{ connectionStore.port }}
                </span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-450 font-semibold">Trạng thái:</span>
                <span
                  class="font-bold flex items-center gap-1.5"
                  :class="{
                    'text-emerald-400': connectionStore.status === 'connected',
                    'text-amber-400': connectionStore.status !== 'connected' && connectionStore.isReconnecting,
                    'text-rose-400': connectionStore.status !== 'connected' && !connectionStore.isReconnecting
                  }"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full animate-pulse"
                    :class="{
                      'bg-emerald-500': connectionStore.status === 'connected',
                      'bg-amber-500': connectionStore.status !== 'connected' && connectionStore.isReconnecting,
                      'bg-rose-500': connectionStore.status !== 'connected' && !connectionStore.isReconnecting
                    }"
                  ></span>
                  {{
                    connectionStore.status === 'connected'
                      ? 'Đang hoạt động'
                      : connectionStore.isReconnecting
                        ? 'Đang kết nối lại...'
                        : 'Mất kết nối'
                  }}
                </span>
              </div>
            </div>

            <!-- Orientation lock -->
            <div
              class="flex flex-col gap-2 rounded-xl bg-slate-950/60 p-3 border border-slate-850/60"
            >
              <span class="text-[8px] uppercase tracking-wider font-extrabold text-slate-450"
                >Xoay màn hình</span
              >
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="opt in orientationOptions"
                  :key="opt.value"
                  @click="setOrientation(opt.value)"
                  class="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg border transition duration-150 cursor-pointer"
                  :class="
                    orientationMode === opt.value
                      ? 'bg-violet-600 border-violet-500 text-white shadow shadow-violet-900/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  "
                >
                  <Icon :icon="opt.icon" class="text-sm" />
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Keep Screen On -->
            <div
              class="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2.5 border border-slate-850/60"
            >
              <div class="flex items-center gap-2">
                <Icon icon="mdi:brightness-5" class="text-base text-slate-400" />
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300"
                  >Luôn bật màn hình</span
                >
              </div>
              <button
                @click="keepScreenOn = !keepScreenOn"
                class="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition duration-150 cursor-pointer"
                :class="
                  keepScreenOn
                    ? 'bg-violet-600 border-violet-500 text-white shadow shadow-violet-900/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                "
              >
                {{ keepScreenOn ? 'Bật' : 'Tắt' }}
              </button>
            </div>

            <!-- Vibrate on click -->
            <div
              class="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2.5 border border-slate-850/60"
            >
              <div class="flex items-center gap-2">
                <Icon icon="mdi:vibrate" class="text-base text-slate-400" />
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300"
                  >Rung khi nhấn</span
                >
              </div>
              <button
                @click="vibrateOnClick = !vibrateOnClick"
                class="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition duration-150 cursor-pointer"
                :class="
                  vibrateOnClick
                    ? 'bg-violet-600 border-violet-500 text-white shadow shadow-violet-900/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                "
              >
                {{ vibrateOnClick ? 'Bật' : 'Tắt' }}
              </button>
            </div>

            <!-- Sound on click -->
            <div
              class="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2.5 border border-slate-850/60"
            >
              <div class="flex items-center gap-2">
                <Icon icon="mdi:volume-high" class="text-base text-slate-400" />
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300"
                  >Âm thanh khi nhấn</span
                >
              </div>
              <button
                @click="soundOnClick = !soundOnClick"
                class="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition duration-150 cursor-pointer"
                :class="
                  soundOnClick
                    ? 'bg-violet-600 border-violet-500 text-white shadow shadow-violet-900/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                "
              >
                {{ soundOnClick ? 'Bật' : 'Tắt' }}
              </button>
            </div>

            <!-- Battery optimization notice for MIUI/Android devices -->
            <div
              v-if="!isBrowserModeActive"
              class="flex items-start gap-2 rounded-xl bg-amber-950/40 px-3 py-2.5 border border-amber-900/30"
            >
              <Icon icon="mdi:battery-alert" class="text-amber-400 text-base mt-0.5 shrink-0" />
              <p class="text-[9px] leading-relaxed text-amber-300/80">
                Nếu WiFi mất kết nối khi dùng pin, vào
                <strong class="text-amber-200">Cài đặt → Ứng dụng → Pin → Không có hạn chế</strong>
                để tắt tối ưu hóa pin cho app.
              </p>
            </div>

            <button
              @click="handleDisconnect"
              class="w-full text-center text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl border border-rose-900/30 bg-rose-950/80 text-rose-350 hover:bg-rose-900 hover:text-white transition duration-150 cursor-pointer"
            >
              Ngắt kết nối
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast feedback from server-side action errors -->
    <transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[90%] bg-rose-600/95 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold pointer-events-none z-50 border border-rose-500/20"
      >
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>
