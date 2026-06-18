<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonConfig } from '../types';
import { Icon } from '@iconify/vue';
import { hexToRgb, rgbToHsl } from '../lib/color';
import { currentAccentH } from '../lib/themes';
import { useLayoutStore } from '../stores/layout';

const layoutStore = useLayoutStore();

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

const isMonitor = computed(() => props.button.buttonKind === 'monitor');

const monitorIcon = computed(() =>
  props.button.monitorConfig?.metricType === 'ram_percent' ? 'mdi:memory' : 'mdi:cpu-64-bit',
);

const metricValue = computed(() => {
  if (!props.button.monitorConfig) return '--';
  const mt = props.button.monitorConfig.metricType;
  const val =
    mt === 'ram_percent'
      ? layoutStore.currentMetrics.ram_percent
      : layoutStore.currentMetrics.cpu_percent;
  return Math.round(val);
});

const monitorLoadState = computed<'normal' | 'warning' | 'critical'>(() => {
  const val = metricValue.value;
  if (typeof val !== 'number' || isNaN(val)) return 'normal';
  if (val >= 90) return 'critical';
  if (val >= 70) return 'warning';
  return 'normal';
});

const monitorColor = computed(() => {
  if (!isMonitor.value) return neonColor.value;
  if (monitorLoadState.value === 'critical') return '#ef4444';
  if (monitorLoadState.value === 'warning') return '#f59e0b';
  return neonColor.value;
});

const monitorGlow = computed(() => {
  if (!isMonitor.value) return neonGlow.value;
  if (monitorLoadState.value === 'critical') return 'rgba(239, 68, 68, 0.5)';
  if (monitorLoadState.value === 'warning') return 'rgba(245, 158, 11, 0.5)';
  return neonGlow.value;
});

const circleRadius = computed(() => (props.compact ? 13 : 15));
const dashArray = computed(() => 2 * Math.PI * circleRadius.value);
const dashOffset = computed(() => {
  const val = typeof metricValue.value === 'number' ? metricValue.value : 0;
  const clamped = Math.max(0, Math.min(100, val));
  return dashArray.value - (clamped / 100) * dashArray.value;
});

const genshinFrameClass = computed(() => {
  const frame = props.button.genshinFrame || 1;
  return `genshin-frame-${frame}`;
});

function handleClick() {
  emit('press', props.button);
}
</script>

<template>
  <button
    @click="handleClick"
    class="cyber-btn group relative w-full h-full min-w-0 min-h-0 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden transition-all duration-150 ease-out"
    :class="{
      'gap-1 p-1.5': !compact && !isMonitor,
      'gap-0.5 p-1': compact && !isMonitor,
      'cyber-btn--selected': selected,
      'cyber-btn--monitor': isMonitor,
      'theme-genshin-btn': layoutStore.layout.theme === 'genshin-01',
      [genshinFrameClass]: layoutStore.layout.theme === 'genshin-01',
    }"
    :style="{
      '--neon': neonColor,
      '--neon-glow': neonGlow,
      backgroundColor:
        layoutStore.layout.theme === 'genshin-01' ? 'transparent' : 'var(--theme-btn-bg)',
      borderColor: layoutStore.layout.theme === 'genshin-01' ? 'transparent' : neonColor,
      boxShadow:
        layoutStore.layout.theme === 'genshin-01'
          ? 'none'
          : selected
            ? `0 0 10px 2px ${neonGlow}, 0 0 25px 4px ${neonGlow.replace('0.5)', '0.25)')}`
            : `0 0 5px 1px ${neonGlow}, 0 0 12px 1px ${neonGlow.replace('0.5)', '0.15)')}`,
    }"
  >
    <!-- Monitor display -->
    <template v-if="isMonitor">
      <div
        class="relative flex items-center justify-center"
        :style="{ width: compact ? '2.5rem' : '3.5rem', height: compact ? '2.5rem' : '3.5rem' }"
      >
        <!-- Circular Progress Ring Background -->
        <svg class="absolute transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            :r="circleRadius"
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            stroke-width="2.5"
          />
          <!-- Foreground Ring -->
          <circle
            cx="18"
            cy="18"
            :r="circleRadius"
            fill="transparent"
            :stroke="monitorColor"
            stroke-width="2.5"
            :stroke-dasharray="dashArray"
            :stroke-dashoffset="dashOffset"
            stroke-linecap="round"
            class="transition-all duration-300 ease-out"
            :style="{
              filter: `drop-shadow(0 0 3px ${monitorGlow})`,
            }"
          />
        </svg>

        <Icon
          :icon="monitorIcon"
          class="transition-all duration-150 relative z-10"
          :class="{
            'animate-pulse-slow': monitorLoadState === 'warning',
            'animate-pulse-fast': monitorLoadState === 'critical',
          }"
          :style="{
            color: monitorColor,
            fontSize: compact ? '1rem' : '1.25rem',
            filter: `drop-shadow(0 0 4px ${monitorGlow})`,
          }"
        />
      </div>

      <span
        class="font-bold font-mono leading-none mt-1 z-10"
        :style="{
          color: monitorColor,
          fontSize: compact ? '0.8rem' : '1rem',
          textShadow: `0 0 8px ${monitorGlow}`,
        }"
        >{{ metricValue }}%</span
      >
      <span
        class="text-center leading-tight px-0.5 select-none uppercase tracking-wider mt-0.5 z-10"
        :style="{
          color: monitorColor,
          fontSize: compact ? '0.45rem' : '0.5rem',
          opacity: 0.7,
        }"
        >{{ button.label || 'Monitor' }}</span
      >
    </template>

    <!-- Action button content -->
    <template v-else>
      <!-- Selected ring indicator -->
      <span
        v-if="selected && layoutStore.layout.theme !== 'genshin-01'"
        class="absolute inset-1 pointer-events-none border-2"
        :style="{
          borderColor: neonColor,
          boxShadow: `inset 0 0 12px 2px ${neonGlow}, 0 0 8px 1px ${neonGlow}`,
          borderRadius: undefined,
          clipPath: `polygon(3px 0%, calc(100% - 3px) 0%, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0% calc(100% - 3px), 0% 3px)`,
        }"
      />
      <!-- Selected checkmark -->
      <!-- <span
        v-if="selected"
        class="absolute top-0 right-0 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-black pointer-events-none animate-scaleIn"
        :style="{
          backgroundColor: neonColor,
          boxShadow: `0 0 8px ${neonGlow}`,
        }"
      >
        ✓
      </span> -->

      <!-- Scanline overlay -->
      <span
        v-if="layoutStore.layout.theme !== 'genshin-01'"
        class="absolute inset-0 pointer-events-none opacity-[0.06]"
        :style="{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${neonColor} 2px, ${neonColor} 3px)`,
        }"
      />

      <!-- Corner accents -->
      <span
        v-if="layoutStore.layout.theme !== 'genshin-01'"
        class="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 pointer-events-none"
        :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'"
        :style="{ borderColor: neonColor }"
      />
      <span
        v-if="layoutStore.layout.theme !== 'genshin-01'"
        class="absolute top-1.5 right-1.5 border-t-2 border-r-2 pointer-events-none"
        :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'"
        :style="{ borderColor: neonColor }"
      />
      <span
        v-if="layoutStore.layout.theme !== 'genshin-01'"
        class="absolute bottom-1.5 left-1.5 border-b-2 border-l-2 pointer-events-none"
        :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'"
        :style="{ borderColor: neonColor }"
      />
      <span
        v-if="layoutStore.layout.theme !== 'genshin-01'"
        class="absolute bottom-1.5 right-1.5 border-b-2 border-r-2 pointer-events-none"
        :class="compact ? 'w-1.5 h-1.5' : 'w-2 h-2'"
        :style="{ borderColor: neonColor }"
      />

      <!-- Icon -->
      <img
        v-if="button.icon?.startsWith('data:')"
        :src="button.icon"
        class="icon-slot max-w-full transition-all duration-150 group-hover:scale-110 group-active:scale-90"
        :class="{
          'relative z-0 pointer-events-none select-none': true,
          'w-full h-full absolute inset-0': button.iconSizing && button.iconSizing !== 'normal',
          'object-cover': button.iconSizing === 'cover',
          'object-contain':
            button.iconSizing === 'contain' || !button.iconSizing || button.iconSizing === 'normal',
          'object-fill': button.iconSizing === 'fill',
        }"
        :style="{
          width:
            !button.iconSizing || button.iconSizing === 'normal'
              ? isLongLabel
                ? compact
                  ? 'clamp(1.1rem, 4vw, 1.4rem)'
                  : 'clamp(1.4rem, 5vw, 1.8rem)'
                : compact
                  ? 'clamp(1.3rem, 5vw, 1.6rem)'
                  : 'clamp(1.6rem, 6vw, 2.2rem)'
              : '100%',
          height:
            !button.iconSizing || button.iconSizing === 'normal'
              ? isLongLabel
                ? compact
                  ? 'clamp(1.1rem, 4vw, 1.4rem)'
                  : 'clamp(1.4rem, 5vw, 1.8rem)'
                : compact
                  ? 'clamp(1.3rem, 5vw, 1.6rem)'
                  : 'clamp(1.6rem, 6vw, 2.2rem)'
              : '100%',
          filter:
            !button.iconSizing || button.iconSizing === 'normal'
              ? `drop-shadow(0 0 6px ${neonGlow})`
              : undefined,
        }"
      />
      <Icon
        v-else
        :icon="button.icon || 'mdi:button-pointer'"
        class="icon-slot transition-all duration-150 group-hover:scale-110 group-active:scale-90"
        :style="{
          color: neonColor,
          fontSize: isLongLabel
            ? compact
              ? 'clamp(1.1rem, 4vw, 1.4rem)'
              : 'clamp(1.4rem, 5vw, 1.8rem)'
            : compact
              ? 'clamp(1.3rem, 5vw, 1.6rem)'
              : 'clamp(1.6rem, 6vw, 2.2rem)',
          filter: `drop-shadow(0 0 6px ${neonGlow})`,
        }"
      />

      <!-- Label -->
      <span
        v-if="button.label"
        :class="[
          'label-slot text-center font-bold leading-tight px-0.5 select-none transition-all duration-150 tracking-wider uppercase group-hover:scale-105 group-active:scale-90',
          isLongLabel
            ? compact
              ? 'text-[0.5rem] sm:text-[0.55rem]'
              : 'text-[0.55rem] sm:text-[0.6rem]'
            : compact
              ? 'text-[0.6rem] sm:text-[0.65rem]'
              : 'text-[0.65rem] sm:text-[0.7rem]',
          button.iconSizing && button.iconSizing !== 'normal'
            ? 'absolute inset-0 flex items-center justify-center pointer-events-none z-10'
            : '',
        ]"
        :style="{
          color: neonColor,
          textShadow: `0 0 6px ${neonGlow}, 0 0 12px ${neonGlow}`,
        }"
      >
        {{ button.label }}
      </span>
    </template>
  </button>
</template>

<style scoped>
.cyber-btn {
  border: 1.5px solid var(--neon);
  border-radius: var(--theme-btn-radius);
  clip-path: var(--theme-clip-path);
  font-family: var(--theme-font-family);
}

@media (hover: hover) {
  .cyber-btn:hover {
    background-color: var(--theme-btn-hover) !important;
    box-shadow:
      inset 0 0 20px 2px var(--neon-glow),
      0 0 10px 1px var(--neon-glow),
      0 0 30px 4px var(--neon-glow);
    animation: cyber-flicker 0.15s ease-in-out;
  }
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
  0%,
  100% {
    opacity: 1;
  }
  30% {
    opacity: 0.85;
  }
  60% {
    opacity: 0.95;
  }
  80% {
    opacity: 0.7;
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-scaleIn {
  animation: scaleIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.cyber-btn--monitor {
  cursor: default;
  gap: 0.25rem;
  padding: 0.375rem;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes pulse-fast {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.2;
    transform: scale(0.92);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-pulse-fast {
  animation: pulse-fast 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
