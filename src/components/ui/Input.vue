<script setup lang="ts">
import { useAttrs } from "vue"
import { cn } from "../../lib/utils"

const props = defineProps<{
  modelValue?: string | number
  class?: string
  disabled?: boolean
  type?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const attrs = useAttrs()
</script>

<template>
  <input
    :type="type || 'text'"
    :placeholder="placeholder"
    :disabled="disabled"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    v-bind="attrs"
    :class="cn(
      'flex w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 shadow-inner transition-all file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-slate-650 focus:outline-none focus:ring-1 focus:ring-slate-700 disabled:cursor-not-allowed disabled:opacity-50 duration-150',
      props.class
    )"
  />
</template>
