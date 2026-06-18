<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutStore } from '../../stores/layout';
import { vDraggable } from 'vue-draggable-plus';
import GridButton from '../GridButton.vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  selectedButtonId: string | null;
  clientDeviceSize?: { width: number; height: number } | null;
  clientDeviceName?: string;
}>();

const emit = defineEmits<{
  (e: 'selectButton', id: string): void;
}>();

const layoutStore = useLayoutStore();

function onUpdate() {
  layoutStore.broadcastSync();
}

const aspectRatio = computed(() => {
  if (
    props.clientDeviceSize &&
    props.clientDeviceSize.width > 0 &&
    props.clientDeviceSize.height > 0
  ) {
    return props.clientDeviceSize.width / props.clientDeviceSize.height;
  }
  return 1.6;
});
</script>

<template>
  <section
    class="cyber-panel cyber-panel--no-blur flex-1 flex flex-col p-4 relative items-center justify-center overflow-hidden"
  >
    <span
      class="absolute top-6 left-8 text-[10px] font-bold uppercase tracking-widest text-cyan-400/50 select-none"
    >
      Mô hình Stream Desk cảm ứng thực tế
      {{ props.clientDeviceName ? `(${props.clientDeviceName})` : '' }}
    </span>

    <!-- Cyberpunk Stream Deck Shell -->
    <div
      class="cyber-shell max-w-2xl w-full max-h-[80%] flex flex-col p-4 relative"
      :class="{
        'theme-genshin-shell': layoutStore.layout.theme === 'genshin-01',
      }"
    >
      <div class="scanline absolute inset-0 pointer-events-none opacity-[0.03]" />
      <div class="absolute inset-0 pointer-events-none opacity-[0.025] bg-grid-dot" />

      <span
        class="absolute top-2 left-2 w-4 h-4 border-t-[3px] border-l-[3px] border-cyan-500/60 pointer-events-none z-20"
      />
      <span
        class="absolute top-2 right-2 w-4 h-4 border-t-[3px] border-r-[3px] border-fuchsia-500/60 pointer-events-none z-20"
      />
      <span
        class="absolute bottom-2 left-2 w-4 h-4 border-b-[3px] border-l-[3px] border-fuchsia-500/60 pointer-events-none z-20"
      />
      <span
        class="absolute bottom-2 right-2 w-4 h-4 border-b-[3px] border-r-[3px] border-cyan-500/60 pointer-events-none z-20"
      />

      <!-- Page Tabs CLICK Navigation & Actions Panel -->
      <div
        v-if="layoutStore.layout.pages"
        class="flex items-center gap-2 mb-3 z-20 border-b border-slate-800 pb-2 px-1 shrink-0 overflow-x-auto no-scrollbar scroll-smooth"
      >
        <div
          v-for="(page, idx) in layoutStore.layout.pages"
          :key="page.id"
          class="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
          :class="
            layoutStore.currentPageIndex === idx
              ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-200'
          "
          @click="layoutStore.setPage(idx)"
        >
          <!-- Rename Input -->
          <input
            v-if="page.name !== undefined"
            :value="page.name"
            class="bg-transparent border-none text-[10px] font-bold uppercase tracking-wider focus:outline-none p-0 w-16 text-center select-all"
            :class="layoutStore.currentPageIndex === idx ? 'text-cyan-400' : 'text-slate-400'"
            @input="layoutStore.renamePage(idx, ($event.target as HTMLInputElement).value)"
            @click.stop
          />
          <span v-else>Trang {{ idx + 1 }}</span>

          <!-- Remove Page tab button -->
          <button
            v-if="layoutStore.layout.pages.length > 1"
            class="text-xs hover:text-rose-500 transition-colors p-0.5 rounded cursor-pointer"
            title="Xóa trang"
            @click.stop="layoutStore.removePage(idx)"
          >
            <Icon icon="lucide:x" class="text-[9px]" />
          </button>
        </div>

        <!-- Add Page Button -->
        <button
          class="w-6 h-6 flex items-center justify-center rounded-lg border border-dashed border-slate-700 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-400 bg-slate-900/10 transition-all duration-200 cursor-pointer"
          title="Thêm trang mới"
          @click="layoutStore.addPage()"
        >
          <Icon icon="lucide:plus" class="text-xs" />
        </button>
      </div>

      <div
        :key="layoutStore.currentPage?.id"
        v-draggable="[
          layoutStore.currentButtons,
          {
            ghostClass: 'cyber-ghost',
            animation: 200,
            forceFallback: true,
            fallbackOnBody: true,
            delay: 100,
            delayOnTouchOnly: true,
            touchStartThreshold: 5,
            onUpdate,
          },
        ]"
        class="preview-grid grid p-1 gap-3 w-full h-[calc(100%-40px)] max-w-full max-h-full items-stretch justify-items-stretch relative z-10 min-h-0 min-w-0"
        :style="{
          gridTemplateColumns: `repeat(${layoutStore.layout.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${layoutStore.layout.rows}, minmax(0, 1fr))`,
          ...(layoutStore.layout.theme === 'genshin-01'
            ? {
                backgroundImage: 'url(/themes/genshin/bg-01.jpg) !important',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}),
          aspectRatio,
        }"
      >
        <div
          v-for="btn in layoutStore.currentButtons"
          :key="btn.id"
          class="grid-item-wrap min-w-0 min-h-0"
        >
          <GridButton
            :button="btn"
            :selected="selectedButtonId === btn.id"
            :compact="true"
            @press="emit('selectButton', btn.id)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-grid {
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 50% 0%, var(--theme-shell-top) 0%, transparent 60%),
      radial-gradient(ellipse at 50% 100%, var(--theme-shell-bottom) 0%, transparent 60%),
      var(--theme-shell-bg);
  }
}
</style>
