<script setup lang="ts">
import { useLayoutStore } from '../stores/layout';
import GridButton from './GridButton.vue';

const layoutStore = useLayoutStore();

function handlePress(button: Parameters<typeof layoutStore.pressButton>[0]) {
  layoutStore.pressButton(button);
}
</script>

<template>
  <div class="w-full flex-1 flex items-center justify-center p-4 sm:p-6 min-h-0 min-w-0">

    <!-- Stream Deck Cyberpunk Shell -->
    <div
      class="cyber-shell relative w-full h-[92%] max-w-2xl flex items-center justify-center overflow-hidden"
    >
      <!-- Scanline overlay -->
      <div class="scanline absolute inset-0 pointer-events-none opacity-[0.04]" />

      <!-- Subtle animated grid bg -->
      <div class="absolute inset-0 pointer-events-none opacity-[0.03] bg-grid-dot" />

      <!-- Corner neon brackets -->
      <span class="absolute top-3 left-3 w-5 h-5 border-t-[3px] border-l-[3px] border-cyan-500/60 pointer-events-none" />
      <span class="absolute top-3 right-3 w-5 h-5 border-t-[3px] border-r-[3px] border-fuchsia-500/60 pointer-events-none" />
      <span class="absolute bottom-3 left-3 w-5 h-5 border-b-[3px] border-l-[3px] border-fuchsia-500/60 pointer-events-none" />
      <span class="absolute bottom-3 right-3 w-5 h-5 border-b-[3px] border-r-[3px] border-cyan-500/60 pointer-events-none" />

      <div
        class="grid gap-3 sm:gap-4 w-full h-full max-w-full max-h-full items-stretch justify-items-stretch p-5 sm:p-6 relative z-10 min-h-0 min-w-0"
        :style="{
          gridTemplateColumns: `repeat(${layoutStore.layout.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${layoutStore.layout.rows}, minmax(0, 1fr))`,
        }"
      >
        <GridButton
          v-for="btn in layoutStore.layout.buttons"
          :key="btn.id"
          :button="btn"
          @press="handlePress"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
.cyber-shell {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.04) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 100%, rgba(255, 0, 255, 0.03) 0%, transparent 60%),
    linear-gradient(180deg, #050a14 0%, #02050c 50%, #050a14 100%);
  border: 1px solid rgba(0, 240, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(0, 240, 255, 0.04),
    0 4px 40px -8px rgba(0, 0, 0, 0.6),
    0 0 80px -16px rgba(0, 240, 255, 0.04),
    inset 0 0 40px -16px rgba(0, 240, 255, 0.02);
  clip-path: polygon(
    6px 0%, calc(100% - 6px) 0%,
    100% 6px, 100% calc(100% - 6px),
    calc(100% - 6px) 100%, 6px 100%,
    0% calc(100% - 6px), 0% 6px
  );
}

.bg-grid-dot {
  background-image:
    radial-gradient(circle, rgba(0, 240, 255, 0.2) 1px, transparent 1px);
  background-size: 24px 24px;
}

.scanline {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 240, 255, 0.03) 2px,
    rgba(0, 240, 255, 0.03) 3px
  );
}
</style>
