<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useConnectionStore } from '../stores/connection';
import { useLayoutStore } from '../stores/layout';
import ConnectionStatus from '../components/ConnectionStatus.vue';
import GridArea from '../components/GridArea.vue';

const connectionStore = useConnectionStore();
const layoutStore = useLayoutStore();

const toastMessage = ref<string | null>(null);
let toastTimer: number | null = null;

watch(
  () => layoutStore.lastToast,
  (next) => {
    if (!next) return;
    toastMessage.value = next.message;
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastMessage.value = null;
      toastTimer = null;
    }, 3500);
  },
  { deep: true }
);

onMounted(() => {
  if (connectionStore.ipAddress) {
    connectionStore.connect();
  }
});

onUnmounted(() => {
  if (toastTimer !== null) clearTimeout(toastTimer);
  connectionStore.disconnect();
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col p-4 bg-brand-dark overflow-hidden">
    <!-- Offline banner — Wi-Fi/network down, server hoàn toàn không reach được -->
    <div
      v-if="!connectionStore.isOnline"
      class="mb-3 bg-amber-600/95 text-white px-4 py-2.5 rounded-lg shadow text-sm font-medium flex items-center gap-3"
    >
      <span class="text-xl">📡</span>
      <div class="flex flex-col leading-tight">
        <span class="font-bold">Mất kết nối mạng</span>
        <span class="text-xs opacity-90">Bật Wi-Fi và kết nối cùng mạng LAN với máy Companion.</span>
      </div>
    </div>

    <!-- Top HUD connection bar -->
    <ConnectionStatus class="mb-4" />

    <!-- Macro pad buttons container -->
    <div class="flex-1 flex flex-col items-center justify-center border border-brand-border/40 rounded-2xl bg-brand-card/25 shadow-inner">
      <template v-if="connectionStore.status === 'connected'">
        <GridArea />
      </template>
      <template v-else>
        <div class="flex flex-col items-center justify-center p-6 text-center select-none">
          <span class="text-6xl mb-4">🛜</span>
          <h2 class="text-xl font-bold text-slate-200 mb-2">Chưa kết nối tới Windows Server</h2>
          <p class="text-slate-400 text-sm max-w-sm">
            Vui lòng nhập địa chỉ IP nội bộ được cung cấp bởi ứng dụng Companion trên máy tính và click Kết nối.
          </p>
        </div>
      </template>
    </div>

    <!-- Toast feedback from server-side action errors -->
    <transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[90%] bg-rose-600/95 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none"
      >
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>
