<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, ref, watch, computed } from 'vue';
import { useLayoutStore } from '../stores/layout';
import GridButton from './GridButton.vue';

import { useSettingsStore } from '../stores/settings';
import { playClick } from '../lib/clicksound';
import type { DisplayFitMode } from '../stores/settings';

const layoutStore = useLayoutStore();
const settingsStore = useSettingsStore();

const fitMode = computed<DisplayFitMode>(() => settingsStore.displayFitMode);
const isFullscreen = computed(() => fitMode.value === 'fullscreen');
const isCover = computed(() => fitMode.value === 'cover');
// `contain` keeps the existing cap (max-w-2xl) so the deck never explodes on a
// 4K monitor. `cover`/`fullscreen` let the grid fill the whole viewport.
const applyContainMaxWidth = computed(() => fitMode.value === 'contain');

const scrollerRef = ref<HTMLElement | null>(null);

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

function pageFromScroll(el: HTMLElement): number {
  if (el.clientWidth === 0) return layoutStore.currentPageIndex;
  return Math.round(el.scrollLeft / el.clientWidth);
}

function scrollToIndex(idx: number) {
  const el = scrollerRef.value;
  if (!el) return;
  el.scrollTo({ left: idx * el.clientWidth, behavior: 'auto' });
}

// Native scroll-snap → layoutStore. Throttle to one pending rAF so a swipe's
// scroll-event burst collapses into a single setPage when it settles.
let rafId = 0;
let rafPending = false;
function onScroll() {
  if (rafPending) return;
  rafPending = true;
  rafId = requestAnimationFrame(() => {
    rafPending = false;
    const el = scrollerRef.value;
    if (!el) return;
    const idx = pageFromScroll(el);
    if (idx !== layoutStore.currentPageIndex) {
      layoutStore.setPage(idx);
    }
  });
}

// Rotate/resize: pages are clientWidth-wide but scrollLeft is in px, so realign
// the snap to currentPageIndex when the viewport changes size.
function onResize() {
  scrollToIndex(layoutStore.currentPageIndex);
}

onMounted(() => {
  // clientWidth can be 0 before first layout (mounted under v-if); defer so the
  // initial scroll lands on currentPageIndex instead of px 0 → page 0.
  const el = scrollerRef.value;
  if (el && el.clientWidth > 0) {
    scrollToIndex(layoutStore.currentPageIndex);
  } else {
    nextTick(() => scrollToIndex(layoutStore.currentPageIndex));
  }
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  if (rafId) cancelAnimationFrame(rafId);
});

// Index changed by dot tap / action / Dashboard. Guard: skip scrollTo when the
// snap is already there (swipe-driven change) to avoid fighting native momentum.
watch(
  () => layoutStore.currentPageIndex,
  (newIdx) => {
    const el = scrollerRef.value;
    if (!el) return;
    if (pageFromScroll(el) !== newIdx) {
      scrollToIndex(newIdx);
    }
  }
);

// Pages count changes via broadcast (Dashboard add/remove page). flush:'post'
// runs after the v-for DOM patch so the slide set is realigned to currentPageIndex.
watch(
  () => layoutStore.layout.pages?.length ?? 0,
  () => {
    scrollToIndex(layoutStore.currentPageIndex);
  },
  { flush: 'post' }
);
</script>

<template>
  <div
    class="w-full flex-1 flex flex-col items-center justify-center min-h-0 min-w-0 select-none"
    :class="[
      isFullscreen
        ? 'p-0 sm:p-0'
        : isCover
          ? 'p-2 sm:p-3'
          : 'p-4 sm:p-0 sm:pt-4',
    ]"
  >
    <!-- Stream Deck Cyberpunk Shell -->
    <div
      class="cyber-shell relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      :class="{ 'max-w-2xl': applyContainMaxWidth, 'shell--fullscreen': isFullscreen }"
    >
      <!-- Scanline overlay (hidden in fullscreen) -->
      <div
        v-if="!isFullscreen"
        class="scanline absolute inset-0 pointer-events-none opacity-[0.04]"
      />

      <!-- Subtle animated grid bg (hidden in fullscreen) -->
      <div
        v-if="!isFullscreen"
        class="absolute inset-0 pointer-events-none opacity-[0.03] bg-grid-dot"
      />

      <!-- Corner neon brackets (hidden in fullscreen) -->
      <template v-if="!isFullscreen">
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
      </template>

      <!-- Native scroll-snap viewport (no JS carousel engine) -->
      <div
        ref="scrollerRef"
        class="scroller w-full h-full overflow-x-auto overflow-y-hidden relative z-10"
        @scroll.passive="onScroll"
      >
        <!-- Horizontal track -->
        <div class="flex h-full w-full">
          <!-- Snap page per layout page -->
          <div
            v-for="page in (layoutStore.layout.pages || [])"
            :key="page.id"
            class="snap-page flex-none w-full h-full"
            :class="[
              isFullscreen
                ? 'p-2 sm:p-3'
                : isCover
                  ? 'p-3 sm:p-4'
                  : 'p-5 sm:p-6',
            ]"
          >
            <div
              class="grid w-full h-full max-w-full max-h-full items-stretch justify-items-stretch min-h-0 min-w-0"
              :class="[
                isFullscreen ? 'gap-1.5 sm:gap-2' : isCover ? 'gap-2 sm:gap-3' : 'gap-3 sm:gap-4',
              ]"
              :style="{
                gridTemplateColumns: `repeat(${layoutStore.layout.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layoutStore.layout.rows}, minmax(0, 1fr))`,
              }"
            >
              <GridButton
                v-for="btn in page.buttons"
                :key="btn.id"
                :button="btn"
                :compact="isFullscreen || isCover"
                @press="handlePress"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Neon Dots Pagination (compact + offset for fullscreen bottom safe-area) -->
      <div
        v-if="layoutStore.layout.pages && layoutStore.layout.pages.length > 1"
        class="absolute left-0 right-0 z-30 flex items-center justify-center gap-2 pointer-events-auto"
        :class="[
          isFullscreen
            ? 'bottom-1 pb-[env(safe-area-inset-bottom)]'
            : 'bottom-3',
        ]"
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
          @click="layoutStore.setPage(idx)"
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

.scroller {
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.scroller::-webkit-scrollbar {
  display: none;
}

/* Fullscreen: drop the rounded shell + clip-path so the grid reaches every edge
   of the device viewport. Safe-area handled via env() on the parent. */
.shell--fullscreen {
  border-radius: 0;
  border: none;
  box-shadow: none;
  clip-path: none;
}

.snap-page {
  scroll-snap-align: center;
  scroll-snap-stop: always;
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
