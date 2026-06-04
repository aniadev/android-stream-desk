<script setup lang="ts">
import { computed, ref } from 'vue';
import AppBackground from '@/components/landing/AppBackground.vue';
import AppFooter from '@/components/landing/AppFooter.vue';
import AppHeader from '@/components/landing/AppHeader.vue';
import DownloadsSection from '@/components/landing/DownloadsSection.vue';
import FeaturesSection from '@/components/landing/FeaturesSection.vue';
import HeroSection from '@/components/landing/HeroSection.vue';
import HowItWorksSection from '@/components/landing/HowItWorksSection.vue';
import SimulatorSection from '@/components/landing/SimulatorSection.vue';
import type { ThemeMap, ThemeName } from '@/types/landing';

const repoUrl = 'https://github.com/aniadev/android-stream-desk';
const activeTheme = ref<ThemeName>('cyber');
const themes: ThemeMap = {
  cyber: { name: 'Cyber', color: '#00d4ff', ring: 'focus:ring-[#00d4ff]' },
  midnight: { name: 'Midnight', color: '#a855f7', ring: 'focus:ring-[#a855f7]' },
  ember: { name: 'Ember', color: '#f97316', ring: 'focus:ring-[#f97316]' },
};

const currentTheme = computed(() => themes[activeTheme.value]);

function setTheme(theme: ThemeName) {
  activeTheme.value = theme;
}
</script>

<template>
  <div class="min-h-screen text-[#f3f4f6] font-sans antialiased bg-[#000212] overflow-x-hidden relative selection:bg-white/10 selection:text-white">
    <AppBackground :accent-color="currentTheme.color" />

    <AppHeader
      :active-theme="activeTheme"
      :repo-url="repoUrl"
      :themes="themes"
      @set-theme="setTheme"
    />
    <HeroSection :accent-color="currentTheme.color" />
    <FeaturesSection :accent-color="currentTheme.color" />
    <SimulatorSection :accent-color="currentTheme.color" />
    <HowItWorksSection :accent-color="currentTheme.color" />
    <DownloadsSection :accent-color="currentTheme.color" />
    <AppFooter :repo-url="repoUrl" />
  </div>
</template>
