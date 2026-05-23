<script setup lang="ts">
import { cn } from "../../lib/utils"

const props = defineProps<{
  class?: string
}>()
</script>

<template>
  <div :class="cn('rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl text-slate-100 shadow-2xl p-5', props.class)">
    <slot />
  </div>
</template>
