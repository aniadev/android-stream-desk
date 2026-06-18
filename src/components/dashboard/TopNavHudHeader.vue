<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  serverIp: string;
  serverPort: number;
  activeConnectionsCount: number;
  listenerHealthBadge: {
    label: string;
    detail: string;
    icon: string;
    title: string;
    classes: string;
    iconClass: string;
  };
  webClientUrl: string;
  syncHint: string;
  copyHint: string;
  webCopyHint: string;
  wsBindError: any;
  webBindError: any;
  savedServerConfig: any;
}>();

const emit = defineEmits<{
  (e: 'copyAddress'): void;
  (e: 'copyWebClientUrl'): void;
  (e: 'syncLayout'): void;
  (e: 'openSettings'): void;
  (e: 'openGuide', topic: 'browser' | 'shortcut' | 'firewall'): void;
}>();
</script>

<template>
  <div
    class="cyber-panel flex flex-col md:flex-row gap-3 md:items-center md:justify-between px-4 py-2.5 shadow-xl"
  >
    <div class="flex items-center gap-2">
      <img src="/logo.png" alt="Logo" class="h-8 w-8" />
      <div class="flex flex-col leading-none">
        <span class="text-xs font-bold tracking-tight text-slate-50">Android Stream Desk</span>
        <span class="text-[8.5px] text-cyan-400/60 font-bold tracking-wider uppercase mt-0.5"
          >companion control panel</span
        >
      </div>
    </div>

    <!-- Right Header: IP + Settings -->
    <div class="flex flex-wrap items-center gap-2.5 md:gap-3 justify-end">
      <div class="cyber-hud flex items-center gap-3 px-4 py-2">
        <span
          class="inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse"
        ></span>
        <div class="flex flex-col">
          <label class="text-[9px] uppercase tracking-widest font-bold text-slate-500"
            >WebSocket LAN IP</label
          >
          <span class="font-mono text-xs font-bold text-slate-300">
            {{ serverIp }}<span class="text-slate-600">:</span>{{ serverPort }}
          </span>
        </div>
        <button
          class="cyber-action-btn ml-2 font-bold cursor-pointer disabled:opacity-50 text-[10px] uppercase tracking-wider px-3 py-1"
          @click="emit('copyAddress')"
          :disabled="serverIp === '—'"
        >
          {{ copyHint || 'Copy' }}
        </button>
      </div>

      <!-- HUD: Active Connections Counter -->
      <div class="cyber-hud flex items-center gap-3 px-4 py-2">
        <Icon
          icon="lucide:users"
          class="text-sm shrink-0"
          :class="activeConnectionsCount > 0 ? 'text-emerald-400' : 'text-slate-500'"
        />
        <div class="flex flex-col">
          <label class="text-[9px] uppercase tracking-widest font-bold text-slate-500"
            >Đang kết nối</label
          >
          <span
            class="font-mono text-xs font-bold"
            :class="activeConnectionsCount > 0 ? 'text-emerald-300' : 'text-slate-500'"
          >
            {{ activeConnectionsCount }} thiết bị
          </span>
        </div>
      </div>

      <!-- HUD: Listener Health Badge -->
      <div
        class="cyber-hud flex items-center gap-2.5 px-3.5 py-2 max-w-[320px]"
        :class="listenerHealthBadge.classes"
        :title="listenerHealthBadge.title"
      >
        <Icon
          :icon="listenerHealthBadge.icon"
          class="text-base shrink-0"
          :class="listenerHealthBadge.iconClass"
        />
        <div class="flex flex-col leading-tight min-w-0">
          <span class="text-[9px] font-bold uppercase tracking-wider">
            {{ listenerHealthBadge.label }}
          </span>
          <button
            v-if="wsBindError || webBindError"
            type="button"
            class="text-[8px] text-slate-400 hover:text-cyan-400 transition-colors text-left underline decoration-dotted cursor-pointer font-medium mt-0.5 truncate"
            @click="emit('openGuide', 'firewall')"
          >
            Hướng dẫn mở khóa Tường lửa & Sửa dải cổng mạng
          </button>
          <span v-else class="font-mono text-[9px] text-slate-400 mt-0.5">
            {{ listenerHealthBadge.detail }}
          </span>
        </div>
      </div>

      <div
        v-if="webClientUrl"
        class="cyber-hud hidden xl:flex items-center gap-3 px-4 py-2 max-w-[420px]"
      >
        <Icon icon="lucide:triangle-alert" class="text-amber-400 text-sm shrink-0" />
        <div class="flex flex-col min-w-0">
          <label class="text-[9px] uppercase tracking-widest font-bold text-amber-300/80"
            >Chỉ bật trên Wi-Fi tin cậy</label
          >
          <span class="font-mono text-xs font-bold text-slate-300 truncate">
            {{ webClientUrl }}
          </span>
        </div>
        <button
          class="cyber-action-btn ml-1 font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1 shrink-0"
          @click="emit('copyWebClientUrl')"
        >
          {{ webCopyHint || 'Copy' }}
        </button>
      </div>

      <!-- Sync button -->
      <button
        class="cyber-action-btn font-bold cursor-pointer text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
        @click="emit('syncLayout')"
        title="Đồng bộ cấu hình sang thiết bị Android"
      >
        <Icon :icon="syncHint ? 'lucide:check' : 'lucide:refresh-cw'" class="text-xs" />
        <span>{{ syncHint || 'Sync' }}</span>
      </button>

      <button
        class="cyber-icon-btn cursor-pointer flex items-center justify-center animate-pulse"
        @click="emit('openSettings')"
        title="Thiết lập hệ thống & Cập nhật"
      >
        <Icon
          icon="lucide:settings"
          class="text-lg text-cyan-400/70 hover:text-cyan-300 transition-colors"
        />
      </button>
    </div>
  </div>
</template>
