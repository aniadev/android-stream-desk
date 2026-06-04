<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Mic,
  Cpu,
  Github,
  Download,
  Layers,
  ShieldCheck,
  Zap,
  Volume2,
  VolumeX,
  FolderOpen,
  Code,
  Sparkles,
  Play,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Settings,
} from 'lucide-vue-next';

// State and Theme Management
type ThemeName = 'cyber' | 'midnight' | 'ember';
const activeTheme = ref<ThemeName>('cyber');
const themes = {
  cyber: { name: 'Cyber', color: '#00d4ff', ring: 'focus:ring-[#00d4ff]' },
  midnight: { name: 'Midnight', color: '#a855f7', ring: 'focus:ring-[#a855f7]' },
  ember: { name: 'Ember', color: '#f97316', ring: 'focus:ring-[#f97316]' }
};

// Interactive Simulator State
const logs = ref<
  Array<{ id: number; time: string; action: string; type: 'info' | 'success' | 'warn' }>
>([
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

const isMuted = ref(false);

function addLog(action: string, type: 'info' | 'success' | 'warn' = 'success') {
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

function handleBtnClick(btnName: string) {
  if (btnName === 'Mute Discord') {
    isMuted.value = !isMuted.value;
    addLog(
      `Đã gửi tổ hợp [Ctrl + Shift + M] - ${isMuted.value ? 'Tắt Mic' : 'Bật Mic'} Discord`,
      'warn',
    );
  } else if (btnName === 'Photoshop') {
    addLog('Đã kích hoạt chạy ứng dụng: Photoshop.exe', 'success');
  } else if (btnName === 'Git Push') {
    addLog('Đã gửi script: git add . && git commit -m "Auto Save" && git push', 'info');
  } else if (btnName === 'Prev Track') {
    addLog('Đã gửi phím Media: Previous Track', 'success');
  } else if (btnName === 'Next Track') {
    addLog('Đã gửi phím Media: Next Track', 'success');
  } else if (btnName === 'Play/Pause') {
    addLog('Đã phím Media: Play/Pause', 'success');
  } else if (btnName === 'Vol Up') {
    addLog('Đã tăng âm lượng máy tính (+5%)', 'success');
  } else if (btnName === 'Vol Down') {
    addLog('Đã giảm âm lượng máy tính (-5%)', 'success');
  } else if (btnName === 'Open Browser') {
    addLog('Đã mở URL: https://github.com/aniadev/android-stream-desk', 'info')
  } else if (btnName === 'Build App') {
    addLog('Đã kích hoạt kịch bản Build: pnpm build', 'warn');
  } else if (btnName === 'Screenshot') {
    addLog('Đã gửi tổ hợp Win+Shift+S (Chụp màn hình)', 'success');
  } else if (btnName === 'Calculator') {
    addLog('Đã khởi chạy ứng dụng: Calculator.exe', 'success');
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

// Version and download links
const currentVersion = ref('v1.5.0');
const windowsDownload = ref(
  'https://github.com/aniadev/android-stream-desk/releases/download/v1.5.0/Android-Stream-Desk_1.5.0_x64-setup.msi',
);
const macDownload = ref(
  'https://github.com/aniadev/android-stream-desk/releases/download/v1.5.0/Android-Stream-Desk_1.5.0_x64.dmg',
);
const androidApk = ref(
  'https://github.com/aniadev/android-stream-desk/releases/download/v1.5.0/android-stream-desk-v1_5_0.apk',
);
const repoUrl = 'https://github.com/aniadev/android-stream-desk';

const cpuLoad = ref(12);
const ramLoad = ref(45);

onMounted(() => {
  fetch('https://api.github.com/repos/aniadev/android-stream-desk/releases/latest')
    .then(res => res.json())
    .then(data => {
      if (data && data.tag_name) {
        const tag = data.tag_name;
        const cleanVer = tag.replace('v', '');
        currentVersion.value = tag;
        windowsDownload.value = `https://github.com/aniadev/android-stream-desk/releases/download/${tag}/Android-Stream-Desk_${cleanVer}_x64-setup.msi`;
        macDownload.value = `https://github.com/aniadev/android-stream-desk/releases/download/${tag}/Android-Stream-Desk_${cleanVer}_x64.dmg`;
        
        const underscoreTag = tag.replace(/\./g, '_');
        androidApk.value = `https://github.com/aniadev/android-stream-desk/releases/download/${tag}/android-stream-desk-${underscoreTag}.apk`;
      }
    })
    .catch(err => console.warn('Failed to fetch version, using v1.5.0:', err));

  setInterval(() => {
    cpuLoad.value = Math.floor(Math.random() * 25) + 5;
    ramLoad.value = Math.floor(Math.random() * 5) + 42;
  }, 3000);
});
</script>

<template>
  <div class="min-h-screen text-[#f3f4f6] font-sans antialiased bg-[#000212] overflow-x-hidden relative selection:bg-white/10 selection:text-white">
    <!-- Starfield/Glow ambiance background (Linear.app style) -->
    <div class="absolute inset-0 pointer-events-none z-0">
      <!-- Glow background -->
      <div 
        class="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] rounded-full blur-[160px] opacity-[0.08] transition-all duration-700" 
        :style="{ backgroundColor: themes[activeTheme].color }"
      ></div>
      <!-- Radial gradient page top glow -->
      <div class="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent"></div>
    </div>

    <!-- Sticky Navigation (Linear.app Style) -->
    <header class="sticky top-0 z-50 border-b border-white/[0.06] bg-[#000212]/75 backdrop-blur-md transition-colors duration-300">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="#" class="flex items-center gap-2.5">
          <div class="w-6 h-6 rounded flex items-center justify-center bg-white/[0.04] border border-white/[0.08]">
            <img src="/logo.png" alt="Logo" class="w-4 h-4 object-contain" />
          </div>
          <span class="font-medium text-sm tracking-tight text-white">Android Stream Desk</span>
          <span 
            class="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-white/[0.08] text-white/50 bg-white/[0.02]"
            :style="{ borderColor: `${themes[activeTheme].color}33`, color: themes[activeTheme].color }"
          >
            LAN-Receptor
          </span>
        </a>

        <nav class="hidden md:flex items-center gap-6 text-xs font-normal text-white/60">
          <a href="#features" class="hover:text-white transition-colors duration-200">Tính năng</a>
          <a href="#simulator" class="hover:text-white transition-colors duration-200">Trình mô phỏng</a>
          <a href="#how-it-works" class="hover:text-white transition-colors duration-200">Cách khởi chạy</a>
          <a href="#downloads" class="hover:text-white transition-colors duration-200">Tải xuống</a>
        </nav>

        <div class="flex items-center gap-3">
          <!-- Palette selector -->
          <div class="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.06] rounded-full p-1">
            <button 
              v-for="(th, key) in themes" 
              :key="key" 
              @click="activeTheme = key as ThemeName"
              class="w-4 h-4 rounded-full border border-black/50 transition-all hover:scale-115 relative flex items-center justify-center"
              :style="{ backgroundColor: th.color }"
              :title="th.name"
            >
              <span v-if="activeTheme === key" class="w-1 h-1 rounded-full bg-white shadow-sm"></span>
            </button>
          </div>
          
          <a
            :href="repoUrl"
            target="_blank"
            class="h-8 px-3 rounded-full text-xs font-medium text-white/80 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] active:bg-white/[0.1] transition-all flex items-center gap-1.5"
          >
            <Github class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>

    <!-- Hero Section (Linear.app style) -->
    <section class="relative z-10 pt-20 pb-32 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
      <!-- Badge Pill -->
      <div 
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] text-xs text-white/70 mb-6 backdrop-blur-sm transition-all duration-300"
        :style="{ borderColor: `${themes[activeTheme].color}22` }"
      >
        <Sparkles class="w-3.5 h-3.5 text-white/80 animate-pulse" :style="{ color: themes[activeTheme].color }" />
        <span class="text-[11px] font-medium tracking-tight">Mã nguồn mở miễn phí &bull; Trọng lượng cực nhẹ</span>
      </div>

      <!-- Linear style heading -->
      <h1 class="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05] text-white max-w-4xl font-sans">
        Biến điện thoại của bạn thành
        <span 
          class="bg-gradient-to-r via-slate-100 to-slate-400 bg-clip-text text-transparent block sm:inline transition-all duration-500"
          :style="{ 
            backgroundImage: `linear-gradient(135deg, #ffffff 40%, ${themes[activeTheme].color} 80%, #ffffff 100%)` 
          }"
        >
          Stream Desk không dây
        </span>
      </h1>

      <p class="text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mt-6 leading-relaxed font-normal">
        Tận dụng thiết bị di động cũ để làm bàn phím Macro Pad cao cấp. Kết nối siêu tốc độ mạng LAN không dây, không có trung gian đám mây, an toàn tuyệt đối.
      </p>

      <!-- Elegant Linear Buttons -->
      <div class="flex flex-col sm:flex-row items-center gap-3.5 mt-10 w-full justify-center">
        <a
          href="#downloads"
          class="w-full sm:w-auto h-11 px-6 rounded-full font-medium text-xs text-[#000212] bg-[#f3f4f6] hover:bg-white active:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
        >
          <Download class="w-4 h-4" />
          Tải phần mềm Desktop lý tưởng
        </a>
        <a
          href="#simulator"
          class="w-full sm:w-auto h-11 px-6 rounded-full font-medium text-xs text-white bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.1] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5"
        >
          Mô phỏng trải nghiệm thử
          <ChevronRight class="w-3.5 h-3.5 text-white/50" />
        </a>
      </div>

      <!-- Statistics bar -->
      <div class="grid grid-cols-3 gap-8 md:gap-16 pt-8 mt-24 border-t border-white/[0.06] w-full max-w-2xl text-left">
        <div>
          <div class="text-2xl font-semibold text-white tracking-tight uppercase">0 ms</div>
          <div class="text-[11px] text-white/40 mt-1">Độ trễ truyền mạng LAN</div>
        </div>
        <div>
          <div class="text-2xl font-semibold text-white tracking-tight uppercase">MIỄN PHÍ</div>
          <div class="text-[11px] text-white/40 mt-1">100% Mã nguồn mở</div>
        </div>
        <div>
          <div class="text-2xl font-semibold text-white tracking-tight uppercase">RUST</div>
          <div class="text-[11px] text-white/40 mt-1">Tauri v2 làm Backend</div>
        </div>
      </div>
    </section>

    <!-- Bento Grid Section (Style inspired by Linear.app) -->
    <section id="features" class="relative z-10 py-24 px-6 border-t border-white/[0.06] bg-[#020419]/10">
      <div class="max-w-5xl mx-auto">
        <div class="max-w-2xl mb-16 text-left">
          <span 
            class="text-[11px] font-semibold tracking-wider uppercase transition-colors duration-500"
            :style="{ color: themes[activeTheme].color }"
          >
            kiến trúc đột phá
          </span>
          <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
            Một Stream Desk bền bỉ, an toàn, được tạo ra cho lập trình viên & streamers.
          </h2>
        </div>

        <!-- Bento Grid Structure -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Card 1: Fast connectivity (Large card spans 2 cols on tablet/desktop) -->
          <div class="md:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.01]/[0.02] p-8 flex flex-col justify-between min-h-[250px] relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <!-- Glow effect on hover -->
            <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-0 group-hover:opacity-[0.04] pointer-events-none transition-all duration-500 bg-emerald-500"></div>
            
            <div class="flex items-center justify-between">
              <div 
                class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500"
                :style="{ color: themes[activeTheme].color, borderColor: `${themes[activeTheme].color}33` }"
              >
                <Zap class="w-5 h-5" />
              </div>
              <span class="text-[10px] font-mono text-white/30 px-2 py-0.5 rounded border border-white/[0.04]">0ms delay</span>
            </div>
            
            <div class="mt-12">
              <h3 class="text-lg font-medium text-white mb-2">Tốc độ tức thì (LAN WebSockets)</h3>
              <p class="text-xs text-white/50 leading-relaxed max-w-lg">
                Sử dụng kết nối trực tiếp WebSocket nội bộ mà không cần máy chủ lưu trữ thứ ba. Các sự kiện phím tắt và macro được phát động tức thì với độ trễ thấp đến mức không thể cảm nhận.
              </p>
            </div>
          </div>

          <!-- Card 2: Customization (Small card) -->
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 flex flex-col justify-between min-h-[250px] overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div 
              class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500 self-start"
              :style="{ color: themes[activeTheme].color, borderColor: `${themes[activeTheme].color}33` }"
            >
              <Layers class="w-5 h-5" />
            </div>
            
            <div class="mt-8">
              <h3 class="text-lg font-medium text-white mb-2">Tùy biến không giới hạn</h3>
              <p class="text-xs text-white/50 leading-relaxed">
                Tự do thiết kế menu nút bấm cá nhân, cấu hình kích thước lưới 4x3 đến 8x6, chọn biểu tượng trong kho dữ liệu phong phú và tùy biến lệnh hoạt động.
              </p>
            </div>
          </div>

          <!-- Card 3: Secure (Small card) -->
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.01]/[0.02] p-8 flex flex-col justify-between min-h-[250px] overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div 
              class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500 self-start"
              :style="{ color: themes[activeTheme].color, borderColor: `${themes[activeTheme].color}33` }"
            >
              <ShieldCheck class="w-5 h-5" />
            </div>
            
            <div class="mt-8">
              <h3 class="text-lg font-medium text-white mb-2">Bảo mật hệ thống tối đa</h3>
              <p class="text-xs text-white/50 leading-relaxed font-normal">
                Không thu thập thông tin gõ phím hay gửi dữ liệu qua Internet. Phần mềm chạy hoàn toàn trong mạng gia đình an toàn của bạn.
              </p>
            </div>
          </div>

          <!-- Card 4: Light footprint (Large card spans 2 cols) -->
          <div class="md:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 flex flex-col justify-between min-h-[250px] relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-0 group-hover:opacity-[0.04] pointer-events-none transition-all duration-500 bg-purple-650"></div>
            
            <div class="flex items-center justify-between">
              <div 
                class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500"
                :style="{ color: themes[activeTheme].color, borderColor: `${themes[activeTheme].color}33` }"
              >
                <Cpu class="w-5 h-5" />
              </div>
              <span class="text-[10px] font-mono text-white/30 px-2 py-0.5 rounded border border-white/[0.04]">Tauri v2 + Rust</span>
            </div>
            
            <div class="mt-12">
              <h3 class="text-lg font-medium text-white mb-2">Companion Server siêu gọn nhẹ</h3>
              <p class="text-xs text-white/50 leading-relaxed max-w-lg">
                Được lập trình bằng Rust và Tauri v2 thay vì Electron. Tiêu thụ chưa đầy 15MB RAM và gần như 0% tài nguyên CPU khi chạy nền, đảm bảo chơi game mượt mà nhất.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Simulator Component (Styled clean & dark like Linear pages) -->
    <section id="simulator" class="relative z-10 py-24 px-6 border-t border-white/[0.06]">
      <div class="max-w-5xl mx-auto">
        <div class="text-center max-w-2xl mx-auto mb-16 flex flex-col items-center">
          <span 
            class="text-[11px] font-semibold tracking-wider uppercase mb-1 transition-colors duration-500"
            :style="{ color: themes[activeTheme].color }"
          >
            trải nghiệm trực quan
          </span>
          <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Trình mô phỏng hoạt động Macro Pad
          </h2>
          <p class="text-xs sm:text-sm text-white/50 mt-1">
            Mô phỏng bấm nút trên điện thoại giả lập (bên trái) để xem lệnh gửi trực tiếp đến log nhận tín hiệu WebSockets (bên phải).
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <!-- Simulator Mobile Device (Left) -->
          <div class="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#08080f]/50 p-6 flex flex-col relative overflow-hidden">
            <div class="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.01] to-transparent"></div>
            
            <!-- Tablet Status Header -->
            <div class="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-5">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full animate-ping" :style="{ backgroundColor: themes[activeTheme].color }"></span>
                <span class="w-1.5 h-1.5 rounded-full absolute" :style="{ backgroundColor: themes[activeTheme].color }"></span>
                <span class="text-[10px] font-mono tracking-tight text-white/60">CLIENT CONNECTED (192.168.1.15)</span>
              </div>
              <Smartphone class="w-4 h-4 text-white/40" />
            </div>

            <!-- Custom grid padding & styling matching Linear aesthetics -->
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <!-- Button 1: Discord -->
              <button
                @click="handleBtnClick('Mute Discord')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer relative"
              >
                <div 
                  class="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300"
                  :class="isMuted ? 'bg-rose-500/10 text-rose-455 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'"
                >
                  <Mic class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 group-hover:text-white text-center leading-tight truncate max-w-full">
                  {{ isMuted ? 'Muted' : 'Mute Discord' }}
                </span>
              </button>

              <!-- Button 2: Photoshop -->
              <button
                @click="handleBtnClick('Photoshop')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <span class="text-sm font-bold tracking-tight">Ps</span>
                </div>
                <span class="text-[10px] font-medium text-white/80 group-hover:text-white text-center leading-tight">Photoshop</span>
              </button>

              <!-- Button 3: Git Auto Push -->
              <button
                @click="handleBtnClick('Git Push')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Github class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 group-hover:text-white text-center leading-tight">Git Auto Push</span>
              </button>

              <!-- Button 4: Browser open -->
              <button
                @click="handleBtnClick('Open Browser')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FolderOpen class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 group-hover:text-white text-center leading-tight">GitHub Repo</span>
              </button>

              <!-- Button 5: Music actions (Prev) -->
              <button
                @click="handleBtnClick('Prev Track')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-white/[0.04] text-white/70 flex items-center justify-center font-bold">
                  &larr;
                </div>
                <span class="text-[10px] font-medium text-white/80 text-center leading-tight">Prev Song</span>
              </button>

              <!-- Button 6: Play pause -->
              <button
                @click="handleBtnClick('Play/Pause')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Play class="w-4 h-4 fill-emerald-400/20" />
                </div>
                <span class="text-[10px] font-medium text-white/80 text-center leading-tight">Play / Pause</span>
              </button>

              <!-- Button 7: Next Song -->
              <button
                @click="handleBtnClick('Next Track')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-white/[0.04] text-white/70 flex items-center justify-center font-bold">
                  &rarr;
                </div>
                <span class="text-[10px] font-medium text-white/80 text-center leading-tight">Next Song</span>
              </button>

              <!-- Button 8: Volume Up -->
              <button
                @click="handleBtnClick('Vol Up')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Volume2 class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 text-center leading-tight">Vol +5%</span>
              </button>

              <!-- Button 9: Volume Down -->
              <button
                @click="handleBtnClick('Vol Down')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <VolumeX class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 text-center leading-tight">Vol -5%</span>
              </button>

              <!-- Button 10: Build project -->
              <button
                @click="handleBtnClick('Build App')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-455 text-rose-455 text-rose-450 text-rose-400 flex items-center justify-center">
                  <Code class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 group-hover:text-white text-center leading-tight">Build App</span>
              </button>

              <!-- Button 11: Screenshot mapping -->
              <button
                @click="handleBtnClick('Screenshot')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Zap class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 text-center leading-tight">Chụp MH</span>
              </button>

              <!-- Button 12: Calculator -->
              <button
                @click="handleBtnClick('Calculator')"
                class="aspect-square rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95 cursor-pointer"
              >
                <div class="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Settings class="w-5 h-5" />
                </div>
                <span class="text-[10px] font-medium text-white/80 text-center leading-tight">Máy Tính</span>
              </button>
            </div>
          </div>

          <!-- Dev Console Terminal (Right Side) -->
          <div class="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#020207] p-6 flex flex-col font-mono text-xs justify-between min-h-[300px]">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4 text-[10px] text-white/40">
                <span>COMPANION LAN RECEPTOR LOGS</span>
                <span>TAURI v2 + WS</span>
              </div>
              <div class="space-y-2.5 overflow-y-auto max-h-[320px]">
                <div v-for="log in logs" :key="log.id" class="text-[11px] leading-relaxed">
                  <span class="text-white/30">[{{ log.time }}]</span>
                  <span
                    :class="{
                      'text-white/70': log.type === 'info',
                      'text-white transition-colors duration-500 font-semibold': log.type === 'success',
                      'text-pink-400': log.type === 'warn',
                    }"
                    class="ml-2"
                    :style="log.type === 'success' ? { color: themes[activeTheme].color } : {}"
                  >
                    {{ log.action }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Terminal Controls -->
            <div class="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-4">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full animate-pulse bg-white/40"></span>
                <span class="text-[9px] text-white/30 uppercase tracking-wider">Awaiting dynamic signals</span>
              </div>
              <button
                @click="clearLogs"
                class="text-[10px] h-7 px-3 rounded border border-white/[0.08] hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] text-white/70 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw class="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section (Style Clean Outline Elements) -->
    <section id="how-it-works" class="relative z-10 py-24 px-6 border-t border-white/[0.06]">
      <div class="max-w-5xl mx-auto">
        <div class="text-center max-w-2xl mx-auto mb-16 flex flex-col items-center">
          <span 
            class="text-[11px] font-semibold tracking-wider uppercase mb-1 transition-colors duration-500"
            :style="{ color: themes[activeTheme].color }"
          >
            ba bước giản đơn
          </span>
          <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Thiết lập dễ dàng chỉ trong 3 phút
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Step 1 -->
          <div class="rounded-xl border border-white/[0.04] bg-white/[0.005] p-6 flex flex-col">
            <span class="text-xs font-mono text-white/30 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-full w-7 h-7 flex items-center justify-center">01</span>
            <h3 class="text-sm font-semibold tracking-tight text-white mb-2">Tải Companion Server</h3>
            <p class="text-xs text-white/50 leading-relaxed">
              Tải phiên bản phù hợp với hệ điều hành của máy tính bạn (Windows setup .msi hoặc macOS .dmg) trực tiếp tại mục tải xuống bên dưới.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="rounded-xl border border-white/[0.04] bg-white/[0.005] p-6 flex flex-col">
            <span class="text-xs font-mono text-white/30 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-full w-7 h-7 flex items-center justify-center">02</span>
            <h3 class="text-sm font-semibold tracking-tight text-white mb-2">Quét kết nối QR Code</h3>
            <p class="text-xs text-white/50 leading-relaxed font-normal">
              Cài đặt mobile client bằng cách tải file APK trên Android. Bạn chỉ cần quét mã QR được sinh tự động trên màn hình máy chủ để liên kết LAN.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="rounded-xl border border-white/[0.04] bg-white/[0.005] p-6 flex flex-col">
            <span class="text-xs font-mono text-white/30 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-full w-7 h-7 flex items-center justify-center">03</span>
            <h3 class="text-sm font-semibold tracking-tight text-white mb-2">Tùy biến phím bấm & Sử dụng</h3>
            <p class="text-xs text-white/50 leading-relaxed">
              Giờ đây, bạn có thể tự do mở rộng trang nút bấm, gán lệnh Windows Hotkeys, Scripts, mở phần mềm tùy ý và gán các icon sắc nét.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Downloads Section (Linear.app style) -->
    <section id="downloads" class="relative z-10 py-24 px-6 border-t border-white/[0.06]">
      <div class="max-w-5xl mx-auto">
        <div class="text-center max-w-2xl mx-auto mb-16 flex flex-col items-center">
          <span 
            class="text-[11px] font-semibold tracking-wider uppercase mb-1 transition-colors duration-500"
            :style="{ color: themes[activeTheme].color }"
          >
            sẵn sàng khởi tạo
          </span>
          <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Nhận phiên bản mới nhất
          </h2>
          <p class="text-xs sm:text-sm text-white/50 mt-1 font-normal">
            Bản cập nhật mới nhất: <span class="font-mono font-bold" :style="{ color: themes[activeTheme].color }">{{ currentVersion }}</span>. Hoàn toàn miễn phí.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Windows OS Box -->
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.01]/[0.02] p-6 flex flex-col justify-between min-h-[220px]">
            <div>
              <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-white/30 opacity-70">Desktop Server</span>
              <h3 class="text-base font-semibold tracking-tight text-white mt-1">Windows Setup</h3>
              <p class="text-xs text-white/50 mt-2 leading-relaxed">
                Tương thích Windows 10/11 x64, khởi chạy nhẹ, hỗ trợ startup tự động.
              </p>
            </div>
            <a
              :href="windowsDownload"
              class="w-full h-9 rounded-lg font-medium text-xs text-white bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.1] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5 mt-6"
            >
              <Download class="w-3.5 h-3.5" />
              Tải bộ cài .msi
            </a>
          </div>

          <!-- macOS OS Box -->
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.01]/[0.02] p-6 flex flex-col justify-between min-h-[220px]">
            <div>
              <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-white/30 opacity-70">Desktop Server</span>
              <h3 class="text-base font-semibold tracking-tight text-white mt-1">macOS Disk Image</h3>
              <p class="text-xs text-white/50 mt-2 leading-relaxed">
                Hỗ trợ cả máy chip Intel & Apple Silicon (M1/M2/M3/M4).
              </p>
            </div>
            <a
              :href="macDownload"
              class="w-full h-9 rounded-lg font-medium text-xs text-white bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.1] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5 mt-6"
            >
              <Download class="w-3.5 h-3.5" />
              Tải tệp tin .dmg
            </a>
          </div>

          <!-- Android APK Box -->
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.01]/[0.02] p-6 flex flex-col justify-between min-h-[220px]" :style="{ borderColor: `${themes[activeTheme].color}33` }">
            <div>
              <span 
                class="text-[9px] font-mono font-bold uppercase tracking-wider transition-colors duration-500" 
                :style="{ color: themes[activeTheme].color }"
              >
                Mobile Client
              </span>
              <h3 class="text-base font-semibold tracking-tight text-white mt-1">Android Client App</h3>
              <p class="text-xs text-white/50 mt-2 leading-relaxed">
                Cài đặt trực tiếp trên Tablet/Phone để làm giao diện phím tắt.
              </p>
            </div>
            <a
              :href="androidApk"
              class="w-full h-9 rounded-lg font-medium text-xs text-[#000212] transition-colors duration-300 flex items-center justify-center gap-1.5 mt-6"
              :style="{ backgroundColor: themes[activeTheme].color }"
              hover-style="opacity: 0.9"
            >
              <Smartphone class="w-3.5 h-3.5" />
              Tải APK trực tiếp
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Simple Linear Footer -->
    <footer class="relative z-10 border-t border-white/[0.06] mt-auto py-10 px-6 bg-[#00020a]">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <div class="flex items-center gap-2">
          <span class="text-white/60 font-medium font-sans">Android Stream Desk</span>
          <span>&copy; 2026 MIT License. Open Source project.</span>
        </div>
        <div class="flex gap-6">
          <a :href="repoUrl" target="_blank" class="hover:text-white transition-colors duration-200">GitHub Repository</a>
          <a :href="repoUrl + '/issues'" target="_blank" class="hover:text-white transition-colors duration-200">Báo lỗi</a>
        </div>
      </div>
    </footer>
  </div>
</template>