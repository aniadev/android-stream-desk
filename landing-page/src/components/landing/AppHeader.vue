<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { Github } from 'lucide-vue-next';
import { useSectionAnimation } from '@/composables/useSectionAnimation';
import type { ThemeMap, ThemeName } from '@/types/landing';

defineProps<{
  activeTheme: ThemeName;
  themes: ThemeMap;
  repoUrl: string;
}>();

const emit = defineEmits<{
  setTheme: [theme: ThemeName];
}>();

const headerRef = useTemplateRef<HTMLElement>('headerRef');

useSectionAnimation(headerRef, { start: 'top 98%', stagger: 0.06 });
</script>

<template>
  <header
    ref="headerRef"
    class="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#050711]/78 backdrop-blur-md transition-colors duration-300"
  >
    <div
      data-reveal
      class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3"
    >
      <a href="#" class="min-w-0 flex flex-1 md:flex-none items-center gap-2">
        <div class="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-white/[0.04] border border-white/[0.08]">
          <img src="/logo.png" alt="Logo" class="w-4 h-4 object-contain" />
        </div>
        <span class="min-w-0 truncate font-medium text-[13px] sm:text-sm tracking-tight text-white">
          Android Stream Desk
        </span>
        <span
          class="hidden xl:inline-flex shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-white/[0.08] text-white/50 bg-white/[0.02]"
          :style="{ borderColor: `${themes[activeTheme].color}33`, color: themes[activeTheme].color }"
        >
          LAN-Receptor
        </span>
      </a>

      <nav class="hidden lg:flex items-center gap-4 xl:gap-6 text-xs font-normal text-white/60">
        <a href="#features" class="hover:text-white transition-colors duration-200">Tính năng</a>
        <a href="#simulator" class="hover:text-white transition-colors duration-200">Trình mô phỏng</a>
        <a href="#how-it-works" class="hover:text-white transition-colors duration-200">Cách khởi chạy</a>
        <a href="#downloads" class="hover:text-white transition-colors duration-200">Tải xuống</a>
      </nav>

      <div class="shrink-0 flex items-center gap-1.5 sm:gap-3">
        <div class="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-full p-1">
          <button
            v-for="(theme, key) in themes"
            :key="key"
            class="w-4 h-4 rounded-full border border-black/50 transition-all hover:scale-110 relative flex items-center justify-center"
            :aria-label="`Chọn theme ${theme.name}`"
            :style="{ backgroundColor: theme.color }"
            :title="theme.name"
            type="button"
            @click="emit('setTheme', key as ThemeName)"
          >
            <span v-if="activeTheme === key" class="w-1 h-1 rounded-full bg-white shadow-sm"></span>
          </button>
        </div>

        <a
          :href="repoUrl"
          target="_blank"
          rel="noreferrer"
          aria-label="Mở GitHub repository"
          class="h-8 w-8 sm:w-auto sm:px-3 rounded-full text-xs font-medium text-white/80 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] active:bg-white/[0.1] transition-all flex items-center justify-center gap-1.5"
        >
          <Github class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </div>
  </header>
</template>
