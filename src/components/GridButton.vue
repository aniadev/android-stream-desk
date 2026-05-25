<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonConfig } from '../types';
import { Icon } from '@iconify/vue';
import { hexToRgb, rgbToHsl } from '../lib/color';
import { currentAccentH } from '../lib/themes';

const props = defineProps<{
  button: ButtonConfig;
  selected?: boolean;
  compact?: boolean;
}>();

const emit = defineEmits<{
  press: [button: ButtonConfig];
}>();

const bgColor = computed(() => props.button.backgroundColor || '#1e293b');

const neonHsl = computed(() => {
  const rgb = hexToRgb(bgColor.value);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const clampedL = Math.min(70, Math.max(45, l));
  if (s < 10) {
    return { h: currentAccentH.value, s: 80, l: clampedL };
  }
  return { h, s: Math.max(60, s), l: clampedL };
});

const neonColor = computed(() => {
  const hsl = neonHsl.value;
  if (!hsl) return `hsl(${currentAccentH.value}, 100%, 55%)`;
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
});

const neonGlow = computed(() => {
  const hsl = neonHsl.value;
  if (!hsl) return `hsla(${currentAccentH.value}, 100%, 55%, 0.5)`;
  return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.5)`;
});

const isLongLabel = computed(() => props.button.label && props.button.label.length > 8);

function handleClick() {
  emit('press', props.button);
}
</script>

<template>
  <button
    @click="handleClick"
    class="cyber-btn group relative w-full h-full min-w-0 min-h-0 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden transition-all duration-150 ease-out"
    :class="{
      'gap-1 p-1.5': !compact,
      'gap-0.5 p-1': compact,
      'cyber-btn--selected': selected,
    }"
    :style="{
      '--neon': neonColor,
      '--neon-glow': neonGlow,
      backgroundColor: 'var(--theme-btn-bg)',
      borderColor: neonColor,
      boxShadow: selected
        ? `0 0 10px 2px ${neonGlow}, 0 0 25px 4px ${neonGlow.replace('0.5)', '0.25)')}`
        : `0 0 5px 1px ${neonGlow}, 0 0 12px 1px ${neonGlow.replace('0.5)', '0.15)')}`,
    }"
  >
    <!-- Selected ring indicator -->
    <span
      v-if="selected"
      class="absolute inset-1 pointer-events-none border-2"
      :style="{
        borderColor: neonColor,
        boxShadow: `inset 0 0 12px 2px ${neonGlow}, 0 0 8px 1px ${neonGlow}`,
        clipPath: `polygon(3px 0%, calc(100% - 3px) 0%, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0% calc(100% - 3px), 0% 3px)`,
      }"
    />

    <!-- Scanline overlay -->
    <span
      class="absolute inset-0 pointer-events-none opacity-[0.06]"
      :style="{
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${neonColor} 2px, ${neonColor} 3px)`,
      }"
    />

    <!-- Corner accents -->
    <span class="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 pointer-events-none" :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'" :style="{ borderColor: neonColor }" />
    <span class="absolute top-1.5 right-1.5 border-t-2 border-r-2 pointer-events-none" :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'" :style="{ borderColor: neonColor }" />
    <span class="absolute bottom-1.5 left-1.5 border-b-2 border-l-2 pointer-events-none" :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'" :style="{ borderColor: neonColor }" />
    <span class="absolute bottom-1.5 right-1.5 border-b-2 border-r-2 pointer-events-none" :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'" :style="{ borderColor: neonColor }" />

    <!-- Icon -->
    <Icon
      :icon="button.icon || 'mdi:button-pointer'"
      class="icon-slot transition-all duration-150 group-hover:scale-110 group-active:scale-90"
      :style="{
        color: neonColor,
        fontSize: isLongLabel
          ? (compact ? 'clamp(1.1rem, 4vw, 1.4rem)' : 'clamp(1.4rem, 5vw, 1.8rem)')
          : (compact ? 'clamp(1.3rem, 5vw, 1.6rem)' : 'clamp(1.6rem, 6vw, 2.2rem)'),
        filter: `drop-shadow(0 0 6px ${neonGlow})`,
      }"
    />

    <!-- Label -->
    <span
      :class="[
        'label-slot text-center font-bold leading-tight px-0.5 select-none transition-all duration-150 tracking-wider uppercase group-hover:scale-105 group-active:scale-90',
        isLongLabel
          ? (compact ? 'text-[0.5rem] sm:text-[0.55rem]' : 'text-[0.55rem] sm:text-[0.6rem]')
          : (compact ? 'text-[0.6rem] sm:text-[0.65rem]' : 'text-[0.65rem] sm:text-[0.7rem]'),
      ]"
      :style="{
        color: neonColor,
        textShadow: `0 0 6px ${neonGlow}, 0 0 12px ${neonGlow}`,
      }"
    >
      {{ button.label || 'Untitled' }}
    </span>

    <!-- Selected checkmark -->
    <span
      v-if="selected"
      class="absolute top-1 right-1 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-black pointer-events-none animate-scaleIn"
      :style="{
        backgroundColor: neonColor,
        boxShadow: `0 0 8px ${neonGlow}`,
      }"
    >
      ✓
    </span>
  </button>
</template>

<style scoped>
.cyber-btn {
  border: 1.5px solid var(--neon);
  clip-path: polygon(
    4px 0%, calc(100% - 4px) 0%,
    100% 4px, 100% calc(100% - 4px),
    calc(100% - 4px) 100%, 4px 100%,
    0% calc(100% - 4px), 0% 4px
  );
}

.cyber-btn:hover {
  background-color: var(--theme-btn-hover) !important;
  box-shadow:
    inset 0 0 20px 2px var(--neon-glow),
    0 0 10px 1px var(--neon-glow),
    0 0 30px 4px var(--neon-glow);
  animation: cyber-flicker 0.15s ease-in-out;
}

.cyber-btn:active {
  transform: scale(0.95);
  box-shadow:
    inset 0 0 30px 4px var(--neon-glow),
    0 0 20px 3px var(--neon-glow);
}

.cyber-btn--selected {
  background-color: var(--theme-btn-hover) !important;
  box-shadow:
    inset 0 0 24px 3px var(--neon-glow),
    0 0 14px 2px var(--neon-glow),
    0 0 36px 6px var(--neon-glow);
}

@keyframes cyber-flicker {
  0%, 100% { opacity: 1; }
  30% { opacity: 0.85; }
  60% { opacity: 0.95; }
  80% { opacity: 0.7; }
}

@keyframes scaleIn {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-scaleIn {
  animation: scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
</style>
