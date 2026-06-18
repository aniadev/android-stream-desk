<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  firstRunDismissed: boolean;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();
</script>

<template>
  <transition name="fade">
    <div
      v-if="!firstRunDismissed"
      class="cyber-panel flex flex-col gap-3 px-4 py-3 border-cyan-400/30"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon icon="lucide:clipboard-list" class="text-base text-cyan-400 shrink-0" />
          <span class="text-[11px] font-bold text-cyan-300 uppercase tracking-wider"
            >Checklist cài đặt Companion</span
          >
        </div>
        <button
          type="button"
          class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1 flex items-center gap-1.5"
          @click="emit('dismiss')"
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
            <span class="text-[9px] text-slate-500 leading-relaxed"
              >Bật toggle tự động khởi động trong Settings → General</span
            >
          </div>
        </div>
        <div class="cyber-inset flex items-start gap-2 p-3">
          <Icon icon="lucide:shield" class="text-sm text-amber-400 shrink-0 mt-0.5" />
          <div class="flex flex-col gap-0.5">
            <span class="text-[10px] font-bold text-slate-200">Firewall / Port Rule</span>
            <span class="text-[9px] text-slate-500 leading-relaxed"
              >Cho phép cổng WebSocket qua Windows Defender Firewall</span
            >
          </div>
        </div>
        <div class="cyber-inset flex items-start gap-2 p-3">
          <Icon icon="lucide:globe" class="text-sm text-fuchsia-400 shrink-0 mt-0.5" />
          <div class="flex flex-col gap-0.5">
            <span class="text-[10px] font-bold text-slate-200">Web Client (iPad)</span>
            <span class="text-[9px] text-slate-500 leading-relaxed"
              >Bật Web Client trong Settings nếu dùng trình duyệt trên iPad</span
            >
          </div>
        </div>
        <div class="cyber-inset flex items-start gap-2 p-3">
          <Icon icon="lucide:qr-code" class="text-sm text-emerald-400 shrink-0 mt-0.5" />
          <div class="flex flex-col gap-0.5">
            <span class="text-[10px] font-bold text-slate-200">Quét QR tải APK</span>
            <span class="text-[9px] text-slate-500 leading-relaxed"
              >Quét QR bên dưới để tải APK hoặc mở Web URL trên thiết bị Android</span
            >
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
