<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonConfig } from '../types';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  button: ButtonConfig;
  selected?: boolean;
  compact?: boolean;
  draggable?: boolean;
}>();

const emit = defineEmits<{
  press: [button: ButtonConfig];
  dragStart: [event: DragEvent, button: ButtonConfig];
  drop: [event: DragEvent, button: ButtonConfig];
  dragend: [event: DragEvent];
}>();

const bgColor = computed(() => props.button.backgroundColor || '#1e293b');

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr: h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6; break;
      case ng: h = ((nb - nr) / d + 2) / 6; break;
      case nb: h = ((nr - ng) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const neonColor = computed(() => {
  const rgb = hexToRgb(bgColor.value);
  if (!rgb) return 'hsl(187, 100%, 55%)';
  const { h } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslToString(h, 90, 58);
});

const neonGlow = computed(() => {
  const rgb = hexToRgb(bgColor.value);
  if (!rgb) return 'rgba(0,240,255,0.5)';
  const { h } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `hsla(${h}, 100%, 55%, 0.5)`;
});

const isLongLabel = computed(() => props.button.label && props.button.label.length > 8);

function handleClick() {
  emit('press', props.button);
}
</script>

<template>
  <button
    @click="handleClick"
    @dragstart="(e) => emit('dragStart', e, props.button)"
    @drop="(e) => { e.stopPropagation(); emit('drop', e, props.button); }"
    @dragend="(e) => emit('dragend', e)"
    :draggable="draggable ? 'true' : undefined"
    class="cyber-btn group relative w-full h-full min-w-0 min-h-0 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden transition-all duration-150 ease-out"
    :class="{
      'gap-1 p-1.5': !compact,
      'gap-0.5 p-1': compact,
      'cyber-btn--selected': selected,
    }"
    :style="{
      '--neon': neonColor,
      '--neon-glow': neonGlow,
      backgroundColor: 'rgba(2, 6, 14, 0.92)',
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
  background-color: rgba(4, 12, 24, 0.96) !important;
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
  background-color: rgba(6, 14, 28, 0.96) !important;
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
