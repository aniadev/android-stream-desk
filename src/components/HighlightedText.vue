<script setup lang="ts">
defineProps<{
  text: string;
  indices: readonly (readonly [number, number])[];
}>();

function isHighlighted(index: number, indices: readonly (readonly [number, number])[]): boolean {
  return indices.some(([start, end]) => index >= start && index <= end);
}
</script>

<template>
  <span class="highlighted-text">
    <template v-for="(char, i) in text" :key="i">
      <span
        v-if="isHighlighted(i, indices)"
        class="text-cyan-400 font-bold"
      >{{ char }}</span>
      <span v-else>{{ char }}</span>
    </template>
  </span>
</template>
