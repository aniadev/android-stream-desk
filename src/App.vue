<script setup lang="ts">
import { onMounted } from 'vue';
import { applyTheme, isValidTheme } from './lib/themes';

onMounted(() => {
  let saved: string | null = null;
  try { saved = localStorage.getItem('theme'); } catch (_) {}
  applyTheme(isValidTheme(saved) ? saved : 'cyber');
});
</script>

<template>
  <main class="h-screen w-screen bg-brand-dark antialiased overflow-hidden">
    <!-- Vue Router View Handler -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
