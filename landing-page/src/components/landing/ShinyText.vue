<script setup lang="ts">
interface Props {
  disabled?: boolean;
  speed?: number;
  color?: string;
  shineColor?: string;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  speed: 3.4,
  color: 'linear-gradient(135deg, #38bdf8 0%, #81fc30 100%)',
  shineColor: 'rgba(255, 255, 255, 0.9)',
});
</script>

<template>
  <span
    class="shiny-text"
    :class="{ 'shiny-text-disabled': disabled }"
    :style="{
      '--shiny-speed': `${speed}s`,
      '--shiny-color': color.includes('gradient') ? color : `linear-gradient(${color}, ${color})`,
      '--shiny-highlight': shineColor,
    }"
  >
    <slot />
  </span>
</template>

<style scoped>
.shiny-text {
  position: relative;
  display: inline-block;
  background:
    linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 35%,
      var(--shiny-highlight) 50%,
      rgba(255, 255, 255, 0) 65%
    ) no-repeat,
    var(--shiny-color);
  background-size:
    220% 100%,
    100% 100%;
  background-position:
    220% 0,
    0 0;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shiny-text-sweep var(--shiny-speed) linear infinite;
}

.shiny-text-disabled {
  animation: none;
}

@keyframes shiny-text-sweep {
  0% {
    background-position:
      220% 0,
      0 0;
  }

  100% {
    background-position:
      -120% 0,
      0 0;
  }
}
</style>
