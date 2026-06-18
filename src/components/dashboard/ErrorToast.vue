<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  lastToast: {
    kind: 'error' | 'info';
    message: string;
    at: number;
  } | null;
  toastNeedsAccessibility: boolean;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'scrollToAccessibility'): void;
}>();
</script>

<template>
  <transition name="fade">
    <div
      v-if="lastToast"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cyber-panel max-w-[520px] flex items-start gap-3 px-4 py-3 shadow-2xl"
      :class="
        lastToast.kind === 'error' ? 'border-rose-500/40' : 'border-cyan-400/30'
      "
    >
      <Icon
        :icon="lastToast.kind === 'error' ? 'lucide:alert-triangle' : 'lucide:info'"
        class="text-base shrink-0 mt-0.5"
        :class="lastToast.kind === 'error' ? 'text-rose-400' : 'text-cyan-400'"
      />
      <div class="flex-1 flex flex-col gap-2">
        <p class="text-[11px] leading-relaxed text-slate-200">
          {{ lastToast.message }}
        </p>
        <div v-if="toastNeedsAccessibility" class="flex gap-2">
          <button
            type="button"
            class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1"
            @click="emit('scrollToAccessibility')"
          >
            Xem panel khôi phục
          </button>
        </div>
      </div>
      <button
        type="button"
        class="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
        @click="emit('dismiss')"
        title="Đóng"
      >
        <Icon icon="lucide:x" class="text-sm" />
      </button>
    </div>
  </transition>
</template>
