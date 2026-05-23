<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useConnectionStore } from '../stores/connection';
import ConnectionStatus from '../components/ConnectionStatus.vue';
import GridArea from '../components/GridArea.vue';

const connectionStore = useConnectionStore();

onMounted(() => {
  // Try dynamic auto-connecting on load if IP is cached
  if (connectionStore.ipAddress) {
    connectionStore.connect();
  }
});

onUnmounted(() => {
  connectionStore.disconnect();
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col p-4 bg-brand-dark overflow-hidden">
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
  </div>
</template>
