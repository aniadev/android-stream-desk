<script setup lang="ts">
import { markRaw, ref, shallowRef, useTemplateRef, type Component } from 'vue';
import {
  Code,
  FolderOpen,
  Github,
  Mic,
  Play,
  RotateCcw,
  Settings,
  Smartphone,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-vue-next';
import { useSectionAnimation } from '@/composables/useSectionAnimation';

type LogType = 'info' | 'success' | 'warn';

interface SimulatorLog {
  id: number;
  time: string;
  action: string;
  type: LogType;
}

interface SimulatorButton {
  name: string;
  label: string;
  icon?: Component;
  textIcon?: string;
  iconClass: string;
}

defineProps<{
  accentColor: string;
}>();

const sectionRef = useTemplateRef<HTMLElement>('sectionRef');
const isMuted = shallowRef(false);
const logs = ref<SimulatorLog[]>([
  {
    id: 1,
    time: new Date().toLocaleTimeString(),
    action: 'Companion Server initialized on port 8089',
    type: 'info',
  },
  {
    id: 2,
    time: new Date().toLocaleTimeString(),
    action: 'Android client connected. IP: 192.168.1.15',
    type: 'success',
  },
]);

const actionButtons: SimulatorButton[] = [
  {
    name: 'Photoshop',
    label: 'Photoshop',
    textIcon: 'Ps',
    iconClass: 'bg-blue-500/10 text-blue-400',
  },
  {
    name: 'Git Push',
    label: 'Git Auto Push',
    icon: markRaw(Github),
    iconClass: 'bg-purple-500/10 text-purple-400',
  },
  {
    name: 'Open Browser',
    label: 'GitHub Repo',
    icon: markRaw(FolderOpen),
    iconClass: 'bg-amber-500/10 text-amber-400',
  },
  {
    name: 'Prev Track',
    label: 'Prev Song',
    textIcon: '←',
    iconClass: 'bg-white/[0.04] text-white/70 font-bold',
  },
  {
    name: 'Play/Pause',
    label: 'Play / Pause',
    icon: markRaw(Play),
    iconClass: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    name: 'Next Track',
    label: 'Next Song',
    textIcon: '→',
    iconClass: 'bg-white/[0.04] text-white/70 font-bold',
  },
  {
    name: 'Vol Up',
    label: 'Vol +5%',
    icon: markRaw(Volume2),
    iconClass: 'bg-indigo-500/10 text-indigo-400',
  },
  {
    name: 'Vol Down',
    label: 'Vol -5%',
    icon: markRaw(VolumeX),
    iconClass: 'bg-indigo-500/10 text-indigo-400',
  },
  {
    name: 'Build App',
    label: 'Build App',
    icon: markRaw(Code),
    iconClass: 'bg-rose-500/10 text-rose-400',
  },
  {
    name: 'Screenshot',
    label: 'Chụp MH',
    icon: markRaw(Zap),
    iconClass: 'bg-orange-500/10 text-orange-400',
  },
  {
    name: 'Calculator',
    label: 'Máy Tính',
    icon: markRaw(Settings),
    iconClass: 'bg-teal-500/10 text-teal-400',
  },
];

useSectionAnimation(sectionRef, { stagger: 0.08 });

function addLog(action: string, type: LogType = 'success') {
  logs.value.push({
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    action,
    type,
  });

  if (logs.value.length > 8) {
    logs.value.shift();
  }
}

function handleButtonClick(buttonName: string) {
  if (buttonName === 'Mute Discord') {
    isMuted.value = !isMuted.value;
    addLog(
      `Đã gửi tổ hợp [Ctrl + Shift + M] - ${isMuted.value ? 'Tắt Mic' : 'Bật Mic'} Discord`,
      'warn',
    );
    return;
  }

  const actions: Record<string, { message: string; type: LogType }> = {
    Photoshop: { message: 'Đã kích hoạt chạy ứng dụng: Photoshop.exe', type: 'success' },
    'Git Push': {
      message: 'Đã gửi script: git add . && git commit -m "Auto Save" && git push',
      type: 'info',
    },
    'Open Browser': {
      message: 'Đã mở URL: https://github.com/aniadev/android-stream-desk',
      type: 'info',
    },
    'Prev Track': { message: 'Đã gửi phím Media: Previous Track', type: 'success' },
    'Play/Pause': { message: 'Đã phím Media: Play/Pause', type: 'success' },
    'Next Track': { message: 'Đã gửi phím Media: Next Track', type: 'success' },
    'Vol Up': { message: 'Đã tăng âm lượng máy tính (+5%)', type: 'success' },
    'Vol Down': { message: 'Đã giảm âm lượng máy tính (-5%)', type: 'success' },
    'Build App': { message: 'Đã kích hoạt kịch bản Build: pnpm build', type: 'warn' },
    Screenshot: { message: 'Đã gửi tổ hợp Win+Shift+S (Chụp màn hình)', type: 'success' },
    Calculator: { message: 'Đã khởi chạy ứng dụng: Calculator.exe', type: 'success' },
  };

  const action = actions[buttonName];

  if (action) {
    addLog(action.message, action.type);
  }
}

function clearLogs() {
  logs.value = [
    {
      id: 1,
      time: new Date().toLocaleTimeString(),
      action: 'Log cleared. Connection active.',
      type: 'info',
    },
  ];
}
</script>

<template>
  <section id="simulator" ref="sectionRef" class="relative z-10 py-16 px-4 sm:py-20 sm:px-6 lg:py-24 border-t border-white/[0.06]">
    <div class="max-w-5xl mx-auto">
      <div data-reveal class="text-center max-w-2xl mx-auto mb-10 sm:mb-14 lg:mb-16 flex flex-col items-center">
        <span class="text-[11px] font-semibold tracking-wider uppercase mb-1 transition-colors duration-500" :style="{ color: accentColor }">
          trải nghiệm trực quan
        </span>
        <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Trình mô phỏng hoạt động Macro Pad
        </h2>
        <p class="text-xs sm:text-sm text-white/50 mt-1">
          Mô phỏng bấm nút trên điện thoại giả lập (bên trái) để xem lệnh gửi trực tiếp đến log nhận tín hiệu WebSockets (bên phải).
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        <div data-reveal class="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#08080f]/50 p-4 sm:p-6 flex flex-col relative overflow-hidden">
          <div class="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.01] to-transparent"></div>
          <div class="flex items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06] mb-4 sm:mb-5">
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full animate-ping" :style="{ backgroundColor: accentColor }"></span>
              <span class="w-1.5 h-1.5 rounded-full absolute" :style="{ backgroundColor: accentColor }"></span>
              <span class="truncate text-[10px] font-mono tracking-tight text-white/60">CLIENT CONNECTED (192.168.1.15)</span>
            </div>
            <Smartphone class="w-4 h-4 shrink-0 text-white/40" />
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            <button
              class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-2 sm:p-3 gap-1.5 sm:gap-2 transition-all group scale-100 active:scale-95 cursor-pointer relative"
              type="button"
              @click="handleButtonClick('Mute Discord')"
            >
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-300" :class="isMuted ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'">
                <Mic class="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span class="text-[10px] font-medium text-white/80 group-hover:text-white text-center leading-tight truncate max-w-full">
                {{ isMuted ? 'Muted' : 'Mute Discord' }}
              </span>
            </button>

            <button
              v-for="button in actionButtons"
              :key="button.name"
              class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-2 sm:p-3 gap-1.5 sm:gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              type="button"
              @click="handleButtonClick(button.name)"
            >
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" :class="button.iconClass">
                <component :is="button.icon" v-if="button.icon" class="w-4 h-4 sm:w-5 sm:h-5" />
                <span v-else class="text-sm font-bold tracking-tight">{{ button.textIcon }}</span>
              </div>
              <span class="text-[10px] font-medium text-white/80 group-hover:text-white text-center leading-tight">
                {{ button.label }}
              </span>
            </button>
          </div>
        </div>

        <div data-reveal class="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#020207] p-4 sm:p-6 flex flex-col font-mono text-xs justify-between min-h-[280px] sm:min-h-[300px]">
          <div>
            <div class="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06] mb-4 text-[10px] text-white/40">
              <span>COMPANION LAN RECEPTOR LOGS</span>
              <span class="shrink-0">TAURI v2 + WS</span>
            </div>
            <div class="space-y-2.5 overflow-y-auto max-h-[320px]">
              <div v-for="log in logs" :key="log.id" class="text-[11px] leading-relaxed">
                <span class="text-white/30">[{{ log.time }}]</span>
                <span
                  class="ml-2"
                  :class="{
                    'text-white/70': log.type === 'info',
                    'text-white transition-colors duration-500 font-semibold': log.type === 'success',
                    'text-pink-400': log.type === 'warn',
                  }"
                  :style="log.type === 'success' ? { color: accentColor } : {}"
                >
                  {{ log.action }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 pt-4 border-t border-white/[0.06] mt-4">
            <div class="min-w-0 flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full animate-pulse bg-white/40"></span>
              <span class="truncate text-[9px] text-white/30 uppercase tracking-wider">Awaiting dynamic signals</span>
            </div>
            <button class="shrink-0 text-[10px] h-7 px-3 rounded border border-white/[0.08] hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] text-white/70 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer" type="button" @click="clearLogs">
              <RotateCcw class="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
