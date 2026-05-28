<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useLayoutStore } from '../stores/layout';
import GridButton from './GridButton.vue';
import emblaCarouselVue from 'embla-carousel-vue';

import { useSettingsStore } from '../stores/settings';
import { playClick } from '../lib/clicksound';

const layoutStore = useLayoutStore();
const settingsStore = useSettingsStore();

const [emblaRef, emblaApi] = emblaCarouselVue({
  loop: false,
  align: 'center',
  containScroll: 'trimSnaps',
});

function handlePress(button: Parameters<typeof layoutStore.pressButton>[0]) {
  if (button.buttonKind === 'monitor') return;

  if (settingsStore.soundOnClick) {
    playClick();
  }

  if (settingsStore.vibrateOnClick && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(20);
    } catch (_) {}
  }

  layoutStore.pressButton(button);
}

// Sync Embla selection back to layoutStore
onMounted(() => {
  if (emblaRef.value) {
    // Satisfy unused compiler checks
  }
  if (!emblaApi.value) return;

  emblaApi.value.on('select', () => {
    if (!emblaApi.value) return;
    const selectedSnap = emblaApi.value.selectedScrollSnap();
    if (layoutStore.currentPageIndex !== selectedSnap) {
      layoutStore.setPage(selectedSnap);
    }
  });

  // Init alignment on mount
  emblaApi.value.scrollTo(layoutStore.currentPageIndex, true);
});

// Watch for internal page index changes (e.g. from Dashboard or actions)
watch(
  () => layoutStore.currentPageIndex,
  (newIdx) => {
    if (emblaApi.value && emblaApi.value.selectedScrollSnap() !== newIdx) {
      emblaApi.value.scrollTo(newIdx);
    }
  }
);

// Pages count changes via broadcast (Dashboard add/remove page). Embla caches its
// snap list, so without reInit the new/removed slides desync swipe + dots. flush:'post'
// runs after the v-for DOM patch so embla measures the updated slide set.
watch(
  () => layoutStore.layout.pages?.length ?? 0,
  () => {
    if (!emblaApi.value) return;
    emblaApi.value.reInit();
    emblaApi.value.scrollTo(layoutStore.currentPageIndex, true);
  },
  { flush: 'post' }
);
</script>

<template>
  <div class="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-0 sm:pt-4 min-h-0 min-w-0 select-none">
    <!-- Stream Deck Cyberpunk Shell -->
    <div
      class="cyber-shell relative w-full h-full max-w-2xl flex flex-col items-center justify-center overflow-hidden"
    >
      <!-- Scanline overlay -->
      <div class="scanline absolute inset-0 pointer-events-none opacity-[0.04]" />

      <!-- Subtle animated grid bg -->
      <div class="absolute inset-0 pointer-events-none opacity-[0.03] bg-grid-dot" />

      <!-- Corner neon brackets -->
      <span
        class="absolute top-3 left-3 w-5 h-5 border-t-[3px] border-l-[3px] pointer-events-none z-20"
        :style="{ borderColor: 'var(--theme-corner-a)' }"
      />
      <span
        class="absolute top-3 right-3 w-5 h-5 border-t-[3px] border-r-[3px] pointer-events-none z-20"
        :style="{ borderColor: 'var(--theme-corner-b)' }"
      />
      <span
        class="absolute bottom-3 left-3 w-5 h-5 border-b-[3px] border-l-[3px] pointer-events-none z-20"
        :style="{ borderColor: 'var(--theme-corner-b)' }"
      />
      <span
        class="absolute bottom-3 right-3 w-5 h-5 border-b-[3px] border-r-[3px] pointer-events-none z-20"
        :style="{ borderColor: 'var(--theme-corner-a)' }"
      />

      <!-- Embla Carousel viewport wrapper -->
      <div ref="emblaRef" class="w-full h-full overflow-hidden relative z-10">
        <!-- Embla sliding container -->
        <div class="flex h-full w-full">
          <!-- Slide item per page -->
          <div
            v-for="page in (layoutStore.layout.pages || [])"
            :key="page.id"
            class="flex-none w-full h-full p-5 sm:p-6"
          >
            <div
              class="grid gap-3 sm:gap-4 w-full h-full max-w-full max-h-full items-stretch justify-items-stretch min-h-0 min-w-0"
              :style="{
                gridTemplateColumns: `repeat(${layoutStore.layout.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layoutStore.layout.rows}, minmax(0, 1fr))`,
              }"
            >
              <GridButton
                v-for="btn in page.buttons"
                :key="btn.id"
                :button="btn"
                @press="handlePress"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Neon Dots Pagination -->
      <div 
        v-if="layoutStore.layout.pages && layoutStore.layout.pages.length > 1"
        class="absolute bottom-3 left-0 right-0 z-30 flex items-center justify-center gap-2 pointer-events-auto"
      >
        <button
          v-for="(_, idx) in layoutStore.layout.pages"
          :key="idx"
          class="w-2.5 h-2.5 rounded-full transition-all duration-300 focus:outline-none border"
          :style="{
            backgroundColor: layoutStore.currentPageIndex === idx ? 'var(--theme-accent, #06b6d4)' : 'transparent',
            borderColor: 'var(--theme-accent, #06b6d4)',
            boxShadow: layoutStore.currentPageIndex === idx ? '0 0 8px var(--theme-accent, #06b6d4)' : 'none',
            opacity: layoutStore.currentPageIndex === idx ? '1' : '0.4'
          }"
          @click="emblaApi?.scrollTo(idx)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cyber-shell {
  background:
    radial-gradient(ellipse at 50% 0%, var(--theme-shell-top) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 100%, var(--theme-shell-bottom) 0%, transparent 60%),
    linear-gradient(180deg, #050a14 0%, #02050c 50%, #050a14 100%);
  border: 1px solid var(--theme-shell-border);
  box-shadow:
    0 0 0 1px var(--theme-shell-border),
    0 4px 40px -8px rgba(0, 0, 0, 0.6),
    0 0 80px -16px var(--theme-shell-top),
    inset 0 0 40px -16px var(--theme-shell-top);
  clip-path: polygon(
    6px 0%,
    calc(100% - 6px) 0%,
    100% 6px,
    100% calc(100% - 6px),
    calc(100% - 6px) 100%,
    6px 100%,
    0% calc(100% - 6px),
    0% 6px
  );
}

.bg-grid-dot {
  background-image: radial-gradient(circle, var(--theme-shell-top) 1px, transparent 1px);
  background-size: 24px 24px;
}

.scanline {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    var(--theme-shell-top) 2px,
    var(--theme-shell-top) 3px
  );
}

:deep(.cyber-ghost) {
  opacity: 0.25;
  transition: opacity 0.15s;
}
</style>
