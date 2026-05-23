<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutStore } from '../stores/layout';
import GridButton from './GridButton.vue';

const layoutStore = useLayoutStore();

// Compute tailwind grid cols dynamically or inline style
const gridStyle = computed(() => {
  return {
    gridTemplateColumns: `repeat(${layoutStore.layout.cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${layoutStore.layout.rows}, minmax(0, 1fr))`,
  };
});
</script>

<template>
  <div class="w-full flex-1 flex items-center justify-center p-4">
    <div 
      class="grid gap-4 w-full h-full max-w-5xl max-h-[80vh] overflow-y-auto"
      :style="gridStyle"
    >
      <GridButton 
        v-for="btn in layoutStore.layout.buttons" 
        :key="btn.id" 
        :button="btn" 
      />
    </div>
  </div>
</template>
