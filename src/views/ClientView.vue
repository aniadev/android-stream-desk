<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useConnectionStore } from '../stores/connection';
import { useLayoutStore } from '../stores/layout';
import GridArea from '../components/GridArea.vue';
import { Icon } from '@iconify/vue';

const connectionStore = useConnectionStore();
const layoutStore = useLayoutStore();

const toastMessage = ref<string | null>(null);
const isSubmitted = ref(false);
const settingsOpen = ref(false);
let toastTimer: number | null = null;

const showToast = (msg: string, ms = 3500) => {
  toastMessage.value = msg;
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMessage.value = null;
    toastTimer = null;
  }, ms);
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

onMounted(async () => {
  applyOrientation(orientationMode.value);
  if (connectionStore.ipAddress) {
    connectionStore.connect();
    return;
  }
  try {
    // @ts-ignore
    if (!window.__TAURI_INTERNALS__) return;
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
  connectionStore.disconnect();
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden relative">
    <!-- Grid Area occupies 98% of the screen when connected -->
    <div
      v-if="connectionStore.status === 'connected'"
      class="flex-1 w-full h-full flex items-center justify-center"
    >
      <GridArea class="w-full h-full origin-center" />
    </div>

    <!-- Offline Glass Connection Modal Popup centered when not connected -->
    <div
      v-else
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
        <div class="flex flex-col leading-tight">
          <span class="font-bold"
            >Không kết nối được sau {{ connectionStore.maxReconnectAttempts }} lần thử</span
          >
          <span class="opacity-90 mt-0.5"
            >Kiểm tra Companion đang chạy + IP/Port đúng rồi thử lại.</span
          >
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
        </div>

        <div class="w-full flex flex-col gap-2 mt-2">
          <button
            @click="handleConnect"
            class="w-full font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition duration-150 transform hover:brightness-105 active:scale-98 shadow-md flex items-center justify-center gap-2 cursor-pointer text-white"
            :class="
              connectionStore.status === 'connecting'
                ? 'bg-amber-600 shadow-amber-900/10'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-indigo-900/20'
            "
            :disabled="connectionStore.status === 'connecting'"
          >
            <span
              v-if="connectionStore.status === 'connecting'"
              class="inline-block animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full"
            ></span>
            {{
              connectionStore.status === 'connecting'
                ? 'Đang kết nối...'
                : connectionStore.status === 'error'
                  ? 'Lỗi - Thử lại ngay'
                  : 'Kết nối ngay'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Absolute miniature HUD float: small pill on the top right when connected -->
    <div
      v-if="connectionStore.status === 'connected'"
      class="absolute top-4 right-4 z-40 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-800 shadow-lg select-none duration-150 hover:bg-slate-850 cursor-pointer animate-pulse"
      @click="settingsOpen = true"
    >
      <span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
      <Icon icon="mdi:cog" class="text-slate-400 text-base" />
    </div>

    <!-- Settings Modal to inspect IP/Port or click 'Ngắt kết nối' -->
    <transition name="fade">
      <div
        v-if="settingsOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none"
      >
        <div
          class="w-[325px] max-w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative"
        >
          <!-- Close button -->
          <button
            class="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            @click="settingsOpen = false"
          >
            <Icon icon="lucide:x" class="text-base" />
          </button>

          <!-- Header -->
          <div class="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
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
          <div class="flex flex-col gap-3">
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
                <span class="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Đang hoạt động
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
