<script setup lang="ts">
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-xs font-semibold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700 disabled:pointer-events-none disabled:opacity-50 active:scale-95 duration-100 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/10 border border-transparent",
        destructive: "bg-rose-600 hover:bg-rose-500 text-white shadow-sm",
        outline: "border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300 hover:text-slate-100",
        secondary: "bg-slate-800 hover:bg-slate-750 text-slate-100 shadow-sm border border-slate-700/30",
        ghost: "hover:bg-slate-900 hover:text-slate-100 text-slate-400 border border-transparent",
        amber: "bg-amber-600 hover:bg-amber-500 text-white animate-pulse border border-transparent",
        link: "text-slate-400 underline-offset-4 hover:underline border border-transparent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3 text-[10px]",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'amber' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  class?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  size: "default",
})
</script>

<template>
  <button
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
    :disabled="props.disabled"
  >
    <slot />
  </button>
</template>
