<script setup lang="ts">
import type { ButtonConfig } from '../types';
import { useLayoutStore } from '../stores/layout';

const props = defineProps<{
  button: ButtonConfig;
}>();

const layoutStore = useLayoutStore();
</script>

<template>
  <button 
    @click="layoutStore.pressButton(button)"
    class="w-full aspect-square p-4 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer border border-white/5 active:scale-95 hover:brightness-110 active:brightness-90 transition-all shadow-md select-none"
    :style="{ backgroundColor: button.backgroundColor || '#1e293b' }"
  >
    <!-- Emoji Icon -->
    <span class="text-3xl sm:text-4xl">{{ button.emoji || '🎮' }}</span>
    <!-- Text Label -->
    <span class="font-bold text-xs sm:text-sm text-center truncate max-w-full text-slate-100">
      {{ button.label || 'Macro' }}
    </span>
    <!-- Shortcut/App indicator subtle bubble -->
    <span class="text-[9px] opacity-40 uppercase tracking-widest mt-1">
      {{ button.actionType }}
    </span>
  </button>
</template>
