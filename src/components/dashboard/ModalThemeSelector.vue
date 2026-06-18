<script setup lang="ts">
import { THEMES, type ThemeName } from '../../lib/themes';

defineProps<{
  activeTheme: ThemeName;
}>();

const emit = defineEmits<{
  (e: 'setTheme', name: ThemeName): void;
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <button
      v-for="(meta, name) in THEMES"
      :key="name"
      @click="emit('setTheme', name as ThemeName)"
      class="flex flex-col items-stretch rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer relative h-24"
      :class="
        activeTheme === name
          ? 'border-[var(--theme-accent)] shadow-[0_0_12px_var(--theme-accent)] bg-slate-900/60'
          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
      "
      :style="{
        '--theme-accent': meta.previewColor
      }"
    >
      <!-- Theme Visual Demo Area -->
      <div 
        class="flex-1 flex items-center justify-center p-2 relative overflow-hidden"
        :class="{
          'bg-gradient-to-b from-[#050a14] to-[#02050c]': name === 'cyber',
          'bg-gradient-to-b from-[#0a0012] to-[#10041c]': name === 'midnight',
          'bg-gradient-to-b from-[#100804] to-[#1a0c06]': name === 'ember',
          'bg-slate-900': name === 'genshin-01'
        }"
      >
        <!-- For Genshin: show a mini background image thumbnail -->
        <div 
          v-if="name === 'genshin-01'" 
          class="absolute inset-0 bg-cover bg-center opacity-60 pointer-events-none" 
          style="background-image: url('/themes/genshin/bg.jpg')" 
        />
        
        <!-- Mini Button Mockups -->
        <div class="relative z-10 grid grid-cols-3 gap-1">
          <div 
            v-for="i in 3" 
            :key="i"
            class="w-4 h-4 rounded-sm transition-all duration-150"
            :class="{
              'border border-cyan-400 shadow-[0_0_3px_rgba(0,212,255,0.4)]': name === 'cyber',
              'border border-purple-500 shadow-[0_0_3px_rgba(168,85,247,0.4)]': name === 'midnight',
              'border border-orange-500 shadow-[0_0_3px_rgba(249,115,22,0.4)]': name === 'ember',
            }"
            :style="name === 'genshin-01' ? {
              border: '2px solid transparent',
              borderImageSource: 'url(\'/themes/genshin/frame-01.png\')',
              borderImageSlice: '160 fill',
              borderImageRepeat: 'stretch'
            } : {}"
          />
        </div>
      </div>
      
      <!-- Theme Label Bar -->
      <div class="h-6 flex items-center justify-between px-2.5 bg-slate-950/90 border-t border-slate-900">
        <span class="text-[9px] font-bold uppercase tracking-wider text-slate-300">{{ meta.label }}</span>
        <!-- Radio selection dot -->
        <span 
          class="w-2 h-2 rounded-full border transition-all duration-150"
          :class="activeTheme === name ? 'bg-[var(--theme-accent)] border-transparent' : 'border-slate-700'"
        />
      </div>
    </button>
  </div>
</template>
