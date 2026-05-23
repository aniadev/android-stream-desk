<script setup lang="ts">
import { useConnectionStore } from '../stores/connection';

const connectionStore = useConnectionStore();
</script>

<template>
  <div class="bg-brand-card border border-brand-border p-4 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-center flex-1">
      <!-- Connection Status Bubble -->
      <div class="flex items-center gap-2">
        <span class="relative flex h-3.5 w-3.5">
          <span 
            class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            :class="{
              'bg-emerald-400': connectionStore.status === 'connected',
              'bg-amber-400': connectionStore.status === 'connecting',
              'bg-rose-400': connectionStore.status === 'error',
              'bg-slate-400': connectionStore.status === 'disconnected'
            }"
          ></span>
          <span 
            class="relative inline-flex rounded-full h-3.5 w-3.5"
            :class="{
              'bg-emerald-500': connectionStore.status === 'connected',
              'bg-amber-500': connectionStore.status === 'connecting',
              'bg-rose-500': connectionStore.status === 'error',
              'bg-slate-500': connectionStore.status === 'disconnected'
            }"
          ></span>
        </span>
        <span class="text-sm font-semibold capitalize tracking-wide">
          {{ connectionStore.status === 'connected' ? 'Đã kết nối' : 
             connectionStore.status === 'connecting' ? 'Đang kết nối...' : 
             connectionStore.status === 'error' ? 'Lỗi kết nối' : 'Chưa kết nối' }}
        </span>
      </div>

      <!-- IP Input -->
      <div class="w-full sm:w-auto flex gap-2 items-center flex-1">
        <input 
          v-model="connectionStore.ipAddress" 
          type="text" 
          placeholder="Địa chỉ IP (e.g. 192.168.1.5)"
          class="bg-brand-dark border border-brand-border text-slate-100 rounded-lg px-3 py-1.5 w-full text-sm focus:outline-none focus:border-brand-accent transition-colors"
          :disabled="connectionStore.status === 'connected' || connectionStore.status === 'connecting'"
        />
        <input 
          v-model="connectionStore.port" 
          type="text" 
          placeholder="Port"
          class="bg-brand-dark border border-brand-border text-slate-100 rounded-lg px-2 py-1.5 w-16 text-center text-sm focus:outline-none focus:border-brand-accent transition-colors"
          :disabled="connectionStore.status === 'connected' || connectionStore.status === 'connecting'"
        />
      </div>
    </div>

    <!-- Toggle Action Button -->
    <button 
      @click="connectionStore.status === 'connected' || connectionStore.status === 'connecting' ? connectionStore.disconnect() : connectionStore.connect()"
      class="w-full md:w-auto font-bold text-sm px-5 py-2 rounded-lg transition-colors cursor-pointer"
      :class="{
        'bg-rose-600 hover:bg-rose-700 text-white': connectionStore.status === 'connected' || connectionStore.status === 'connecting',
        'bg-brand-accent hover:bg-brand-accentHover text-white': connectionStore.status !== 'connected' && connectionStore.status !== 'connecting'
      }"
    >
      {{ connectionStore.status === 'connected' || connectionStore.status === 'connecting' ? 'Ngắt kết nối' : 'Kết nối' }}
    </button>
  </div>
</template>
