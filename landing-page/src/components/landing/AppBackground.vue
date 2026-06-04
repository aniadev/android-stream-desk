<script setup lang="ts">
defineProps<{
  accentColor: string;
}>();
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050711]" aria-hidden="true">
    <div
      class="absolute inset-0 opacity-80"
      :style="{
        backgroundImage: `radial-gradient(ellipse at 16% 0%, ${accentColor}24 0%, transparent 42%), radial-gradient(ellipse at 82% 8%, rgba(129,252,48,0.13) 0%, transparent 38%), linear-gradient(180deg, rgba(5,7,17,0.15) 0%, #050711 72%)`,
      }"
    ></div>
    <div class="hydra-grid absolute inset-0 opacity-[0.18]"></div>
    <div class="hydra-scan absolute inset-0 opacity-[0.16]"></div>
    <div class="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.045] to-transparent"></div>
    <div class="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#050711] to-transparent"></div>
    <div class="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#050711] to-transparent"></div>
    <div
      class="hydra-beam absolute left-1/2 top-0 h-px w-[82vw] -translate-x-1/2"
      :style="{ background: `linear-gradient(to right, transparent, ${accentColor}70 22%, rgba(129,252,48,0.55) 55%, transparent)` }"
    ></div>
  </div>
</template>

<style scoped>
.hydra-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent 82%);
}

.hydra-scan {
  background-image: linear-gradient(to bottom, transparent 50%, rgba(255, 255, 255, 0.035) 50%);
  background-size: 100% 4px;
}

.hydra-beam {
  box-shadow: 0 0 32px currentColor;
  animation: hydra-beam-pulse 4s ease-in-out infinite;
}

@keyframes hydra-beam-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: translateX(-50%) scaleX(0.88);
  }

  50% {
    opacity: 0.9;
    transform: translateX(-50%) scaleX(1);
  }
}
</style>
