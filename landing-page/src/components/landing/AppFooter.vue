<script setup lang="ts">
defineProps<{
  repoUrl: string;
}>();
</script>

<template>
  <footer class="relative z-20 border-t border-white/[0.08] mt-auto py-8 sm:py-10 px-4 sm:px-6 bg-[#050711]/95 backdrop-blur-sm">
    <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-white/45">
      <div class="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
        <span class="text-white/60 font-medium font-sans">Android Stream Desk</span>
        <span>&copy; 2026 MIT License. Open Source project.</span>
      </div>
      <div class="flex gap-5 sm:gap-6">
        <a :href="repoUrl" target="_blank" class="hover:text-white transition-colors duration-200">GitHub Repository</a>
        <a :href="repoUrl + '/issues'" target="_blank" class="hover:text-white transition-colors duration-200">Báo lỗi</a>
      </div>
    </div>
  </footer>
</template>
