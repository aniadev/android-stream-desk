<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Mic,
  Monitor,
  Cpu,
  Github,
  Download,
  Layers,
  ShieldCheck,
  Zap,
  QrCode,
  Volume2,
  VolumeX,
  FolderOpen,
  Code,
  Sparkles,
  ExternalLink,
  Play,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Settings,
} from 'lucide-vue-next';

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
  // Limit to last 8 logs
  if (logs.value.length > 8) {
    logs.value.shift();
  }
}

function handleBtnClick(btnName: string) {
  if (btnName === 'Mute Discord') {
    isMuted.value = !isMuted.value;
    addLog(
      `Đã gửi tổ hợp phím [Ctrl + Shift + M] - ${isMuted.value ? 'Tắt Mic' : 'Bật Mic'} Discord`,
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
      action: 'Logs cleared. Connection active.',
      type: 'info',
    },
  ];
}

// Version and download links (Dynamic via GitHub Releases API)
const currentVersion = ref('v1.5.0');
const windowsDownload = ref(
  'https://github.com/aniadev/android-stream-desk/releases/download/v1.5.0/Android-Stream-Desk_1.5.0_x64-setup.msi',
);
const macDownload = ref(
  'https://github.com/aniadev/android-stream-desk/releases/download/v1.5.0/Android-Stream-Desk_1.5.0_x64.dmg',
);
const androidApk = ref(
  'https://github.com/aniadev/android-stream-desk/releases/download/v1.5.0/app-universal-release-signed.apk',
);
const repoUrl = 'https://github.com/aniadev/android-stream-desk';

// CPU / RAM emulation
const cpuLoad = ref(12);
const ramLoad = ref(45);

onMounted(() => {
  // Fetch latest version from GitHub API
  fetch('https://api.github.com/repos/aniadev/android-stream-desk/releases/latest')
    .then(res => res.json())
    .then(data => {
      if (data && data.tag_name) {
        const tag = data.tag_name; // e.g. "v1.5.0"
        const cleanVer = tag.replace('v', ''); // e.g. "1.5.0"
        currentVersion.value = tag;
        windowsDownload.value = `https://github.com/aniadev/android-stream-desk/releases/download/${tag}/Android-Stream-Desk_${cleanVer}_x64-setup.msi`;
        macDownload.value = `https://github.com/aniadev/android-stream-desk/releases/download/${tag}/Android-Stream-Desk_${cleanVer}_x64.dmg`;
        androidApk.value = `https://github.com/aniadev/android-stream-desk/releases/download/${tag}/app-universal-release-signed.apk`;
      }
    })
    .catch(err => console.warn('Failed to fetch dynamic version, fallback to v1.5.0:', err));

  setInterval(() => {
    cpuLoad.value = Math.floor(Math.random() * 25) + 5;
    ramLoad.value = Math.floor(Math.random() * 5) + 42;
  }, 3000);
});
</script>

<template>
  <div class="min-h-screen text-slate-100 flex flex-col relative bg-[#030712]">
    <!-- Background Mesh Trị Liệu & Ambient Glow -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div
        class="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-emerald-500/10 blur-[150px]"
      ></div>
      <div
        class="absolute top-[20%] -right-[20%] w-[70%] h-[70%] rounded-full bg-purple-600/10 blur-[150px]"
      ></div>
      <div
        class="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem]"
      ></div>
    </div>

    <!-- Navigation Header -->
    <header class="sticky top-0 z-50 border-b border-white/5 bg-brand-bg/80 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="#" class="flex items-center gap-3 group">
          <div class="w-10 h-10 overflow-hidden transition-transform group-hover:scale-105">
            <img
              src="/logo.png"
              alt="Android Stream Desk Logo"
              class="w-full h-full object-cover"
            />
          </div>
          <div>
            <div
              class="font-display font-bold text-lg leading-tight tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:opacity-90"
            >
              Android Stream Desk
            </div>
            <span
              class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-accent/10 text-brand-accent font-medium"
              >Local-LAN</span
            >
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" class="hover:text-white transition-colors">Tính năng</a>
          <a href="#simulator" class="hover:text-white transition-colors">Trình mô phỏng</a>
          <a href="#how-it-works" class="hover:text-white transition-colors">Cách khởi chạy</a>
          <a href="#downloads" class="hover:text-white transition-colors">Tải xuống</a>
        </nav>

        <div class="flex items-center gap-4">
          <a
            :href="repoUrl"
            target="_blank"
            class="p-2 text-slate-400 hover:text-white bg-slate-900 border border-white/5 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 text-xs"
          >
            <Github class="w-4 h-4" />
            <span class="hidden sm:inline">GitHub Project</span>
          </a>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section
      class="relative z-10 pt-16 pb-24 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center"
    >
      <div class="lg:col-span-7 flex flex-col gap-8 text-left">
        <div
          class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold self-start tracking-wide uppercase"
        >
          <Sparkles class="w-3.5 h-3.5 animate-pulse" />
          Giải pháp Macro Pad mã nguồn mở hoàn toàn miễn phí
        </div>

        <h1
          class="text-4xl sm:text-6xl font-display font-bold tracking-tight text-white leading-[1.1]"
        >
          Biến điện thoại của bạn thành
          <span
            class="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent"
            >Stream Deck</span
          >
          không dây
        </h1>

        <p class="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Không cần tốn hàng triệu đồng mua phần cứng Stream Deck. Tận dụng điện thoại hoặc máy tính
          bảng cũ chạy Android/iOS, liên kết trực tiếp với máy tính thông qua mạng Wi-Fi nội bộ LAN
          để thực hiện vô vàn phím tắt, mở ứng dụng và giám sát hệ thống.
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 z-10">
          <a
            href="#downloads"
            class="px-8 py-4 rounded-xl font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 glow-subtle"
          >
            <Download class="w-5 h-5" />
            Tải Ngay Về Máy Tính
          </a>
          <a
            href="#simulator"
            class="px-8 py-4 rounded-xl font-semibold bg-slate-900 border border-white/10 hover:border-emerald-500/30 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Mô phỏng trải nghiệm
            <ChevronRight class="w-4 h-4" />
          </a>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-3 gap-6 pt-6 border-t border-white/5 max-w-lg">
          <div>
            <div class="text-2xl font-bold text-white font-display">0 ms</div>
            <div class="text-xs text-slate-500">Độ trễ truyền mạng LAN</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-white font-display">MIỄN PHÍ</div>
            <div class="text-xs text-slate-500">100% Mã nguồn mở</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-white font-display">5 phút</div>
            <div class="text-xs text-slate-500">Thiết lập kể lúc cài đặt</div>
          </div>
        </div>
      </div>

      <!-- Real Preview Mockup -->
      <div class="lg:col-span-5 relative">
        <div
          class="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-emerald-500 to-purple-600 opacity-20 blur-xl"
        ></div>
        <div
          class="relative rounded-2xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-2xl p-4"
        >
          <div
            class="flex items-center justify-between pb-3 border-b border-white/5 mb-4 text-xs text-slate-500 font-mono"
          >
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>COMPANION SERVER ACTIVE</span>
            </div>
            <div>PORT: 8089</div>
          </div>
          <!-- System Monitor inside Hero -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div
              class="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <Cpu class="w-4 h-4 text-emerald-400" />
                <span class="text-xs text-slate-400">Cpu Load</span>
              </div>
              <span class="font-mono text-sm font-bold text-emerald-400">{{ cpuLoad }}%</span>
            </div>
            <div
              class="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <Monitor class="w-4 h-4 text-purple-400" />
                <span class="text-xs text-slate-400">Ram In Use</span>
              </div>
              <span class="font-mono text-sm font-bold text-purple-400">{{ ramLoad }}%</span>
            </div>
          </div>
          <!-- App mockup screenshot style -->
          <div
            class="relative bg-slate-950 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center p-1"
          >
            <img
              src="/hero.png"
              alt="Android Stream Desk Mockup"
              class="w-full h-auto object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Core Features Grid -->
    <section id="features" class="relative z-10 py-24 px-6 border-t border-white/5 bg-slate-950/20">
      <div class="max-w-7xl mx-auto">
        <div class="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div
            class="px-3 py-1 rounded-full border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 text-xs font-semibold mb-4"
          >
            ĐÁP ỨNG MỌI NHU CẦU CỦA BẠN
          </div>
          <h2 class="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Tại sao Android Stream Desk là sự lựa chọn hoàn hảo?
          </h2>
          <p class="text-sm sm:text-base text-slate-400">
            Một giải pháp tối giản nhưng mạnh mẽ, viết bằng Rust & Tauri v2 giúp Companion Server
            cực nhẹ và không hề hao tài nguyên CPU của máy tính.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Card 1 -->
          <div
            class="p-8 rounded-2xl border border-white/5 bg-slate-900/50 hover:border-emerald-500/20 hover:bg-slate-900 transition-all group flex flex-col gap-4"
          >
            <div
              class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform"
            >
              <Zap class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-white font-display">Tốc Độ Độc Bản</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Companion Server được biên dịch trực tiếp sang mã máy thông qua Rust. WebSocket giao
              tiếp siêu tốc với độ trễ phản hồi gần như bằng 0.
            </p>
          </div>

          <!-- Card 2 -->
          <div
            class="p-8 rounded-2xl border border-white/5 bg-slate-900/50 hover:border-emerald-500/20 hover:bg-slate-900 transition-all group flex flex-col gap-4"
          >
            <div
              class="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform"
            >
              <Layers class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-white font-display">Không Giới Hạn Tùy Biến</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Tự do cấu hình lưới nút (Grid), màu sắc, biểu tượng (hơn 1000+ Icon có sẵn) cùng với
              các hành động từ macro phím tắt, mở phần mềm đến scripts.
            </p>
          </div>

          <!-- Card 3 -->
          <div
            class="p-8 rounded-2xl border border-white/5 bg-slate-900/50 hover:border-emerald-500/20 hover:bg-slate-900 transition-all group flex flex-col gap-4"
          >
            <div
              class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform"
            >
              <ShieldCheck class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-white font-display">An Toàn Tuyệt Đối</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Hoạt động hoàn toàn qua mạng LAN của bạn. Không gửi bất cứ phím gõ hoặc hoạt động
              click nào ra môi trường Internet.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Simulator Section -->
    <section id="simulator" class="relative z-10 py-24 px-6 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <div class="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div
            class="px-3 py-1 rounded-full border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 text-xs font-semibold mb-4"
          >
            HÃY TRẢI NGHIỆM THỬ
          </div>
          <h2 class="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Trình mô phỏng cách thức hoạt động
          </h2>
          <p class="text-sm sm:text-base text-slate-400">
            Nhấn vào các nút trên màn hình máy tính bảng (Trái) để xem sự kiện giả lập tương ứng gửi
            đến máy tính (Phải).
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <!-- Tablet Mockup (Left Side) -->
          <div
            class="lg:col-span-7 rounded-3xl border border-white/10 bg-slate-950 p-6 flex flex-col glow-card"
          >
            <!-- Tablet Status Header -->
            <div class="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span class="text-xs uppercase font-mono text-slate-350"
                  >Android Client Connected</span
                >
              </div>
              <Smartphone class="w-5 h-5 text-slate-500" />
            </div>

            <!-- Macro Grid Buttons -->
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-4 flex-1">
              <!-- Button 1: Discord Mute -->
              <button
                @click="handleBtnClick('Mute Discord')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  :class="`w-12 h-12 rounded-xl flex items-center justify-center ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`"
                >
                  <Mic class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white group-hover:text-emerald-400 text-center"
                >
                  {{ isMuted ? 'Mic Discord: OFF' : 'Mute Discord' }}
                </span>
              </button>

              <!-- Button 2: Photoshop -->
              <button
                @click="handleBtnClick('Photoshop')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"
                >
                  <span class="text-lg font-bold font-display">Ps</span>
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white group-hover:text-emerald-400 text-center"
                  >Photoshop</span
                >
              </button>

              <!-- Button 3: Git Push -->
              <button
                @click="handleBtnClick('Git Push')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center"
                >
                  <Github class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white group-hover:text-emerald-400 text-center"
                  >Git Auto Push</span
                >
              </button>

              <!-- Button 4: Browser -->
              <button
                @click="handleBtnClick('Open Browser')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-405 text-amber-400 flex items-center justify-center"
                >
                  <FolderOpen class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white group-hover:text-emerald-400 text-center"
                  >GitHub Repo</span
                >
              </button>

              <!-- Button 5: Prev Music -->
              <button
                @click="handleBtnClick('Prev Track')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"
                >
                  &larr;
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white text-center"
                  >Prev Song</span
                >
              </button>

              <!-- Button 6: Play Music -->
              <button
                @click="handleBtnClick('Play/Pause')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center"
                >
                  <Play class="w-5 h-5 fill-emerald-400" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white text-center"
                  >Play / Pause</span
                >
              </button>

              <!-- Button 7: Next Music -->
              <button
                @click="handleBtnClick('Next Track')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"
                >
                  &rarr;
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white text-center"
                  >Next Song</span
                >
              </button>

              <!-- Button 8: Volume Up -->
              <button
                @click="handleBtnClick('Vol Up')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center"
                >
                  <Volume2 class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white text-center"
                  >Vol +5%</span
                >
              </button>

              <!-- Button 9: Volume Down -->
              <button
                @click="handleBtnClick('Vol Down')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center"
                >
                  <VolumeX class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white text-center"
                  >Vol -5%</span
                >
              </button>

              <!-- Button 10: Build project -->
              <button
                @click="handleBtnClick('Build App')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-455 text-rose-400 flex items-center justify-center"
                >
                  <Code class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white group-hover:text-emerald-400 text-center"
                  >Build App</span
                >
              </button>

              <!-- Button 11: Chụp màn hình -->
              <button
                @click="handleBtnClick('Screenshot')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center"
                >
                  <Zap class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white text-center"
                  >Chụp MH</span
                >
              </button>

              <!-- Button 12: Máy tính -->
              <button
                @click="handleBtnClick('Calculator')"
                class="aspect-square rounded-2xl border border-white/5 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 flex flex-col items-center justify-center p-3 gap-2 transition-all group scale-100 active:scale-95"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center"
                >
                  <Settings class="w-6 h-6" />
                </div>
                <span
                  class="text-xs font-semibold font-display tracking-tight text-white text-center"
                  >Máy Tính</span
                >
              </button>
            </div>
          </div>

          <!-- Dev Console Terminal (Right Side) -->
          <div
            class="lg:col-span-5 rounded-3xl border border-white/10 bg-[#02050e] p-6 flex flex-col font-mono text-sm leading-relaxed justify-between"
          >
            <div>
              <div
                class="flex items-center justify-between pb-3 border-b border-white/5 mb-4 text-xs text-slate-500"
              >
                <span>COMPANION RECEPTOR LOGS</span>
                <span>TAURI v2 + WEBSOCKET</span>
              </div>
              <div class="space-y-3 min-h-[300px] overflow-y-auto">
                <div v-for="log in logs" :key="log.id" class="text-xs">
                  <span class="text-slate-500">[{{ log.time }}]</span>
                  <span
                    :class="{
                      'text-slate-350': log.type === 'info',
                      'text-emerald-400': log.type === 'success',
                      'text-pink-400': log.type === 'warn',
                    }"
                    class="ml-2"
                  >
                    {{ log.action }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Terminal Controls -->
            <div class="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span class="text-[10px] text-slate-500 uppercase tracking-widest"
                  >Awaiting Events...</span
                >
              </div>
              <button
                @click="clearLogs"
                class="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                Xóa Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section
      id="how-it-works"
      class="relative z-10 py-24 px-6 border-t border-white/5 bg-slate-950/20"
    >
      <div class="max-w-7xl mx-auto">
        <div class="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
          <div
            class="px-3 py-1 rounded-full border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 text-xs font-semibold mb-4"
          >
            CHỈ 3 BƯỚC ĐƠN GIẢN
          </div>
          <h2 class="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Hướng dẫn bắt đầu chi tiết
          </h2>
          <p class="text-sm sm:text-base text-slate-400">
            Dễ dàng cài đặt và vận hành chỉ trong vài phút, không đòi hỏi kiến thức mạng phức tạp.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <!-- Step 1 -->
          <div class="flex flex-col gap-4 relative">
            <div
              class="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-display font-bold text-xl"
            >
              1
            </div>
            <h3 class="text-xl font-bold text-white font-display flex items-center gap-2">
              tải Companion Server
            </h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Tải Companion Server dành cho Windows hoặc macOS từ mục download, giải nén và tiến
              hành cài đặt chương trình.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="flex flex-col gap-4 relative">
            <div
              class="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-display font-bold text-xl"
            >
              2
            </div>
            <h3 class="text-xl font-bold text-white font-display">Quét mã QR kết nối</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Khởi chạy máy chủ, cài đặt file APK trên thiết bị Android (hoặc dùng trình duyệt
              Client). Quét mã QR code để tự nhận dạng kết nối qua mạng LAN Wi-Fi nội bộ.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="flex flex-col gap-4 relative">
            <div
              class="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-display font-bold text-xl"
            >
              3
            </div>
            <h3 class="text-xl font-bold text-white font-display">Tùy biến & sử dụng</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Giờ đây bạn đã có thể kéo thả các nút bấm, thiết lập phím tắt Macro, tùy chỉnh icon,
              ảnh nền và bắt đầu thưởng thức sự tiện lợi của Stream Desk.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Downloads Section -->
    <section id="downloads" class="relative z-10 py-24 px-6 border-t border-white/5">
      <div class="max-w-5xl mx-auto text-center">
        <h2 class="text-3xl sm:text-4xl font-display font-bold text-white mb-6">
          Sẵn sàng trải nghiệm Android Stream Desk?
        </h2>
        <p class="text-sm sm:text-base text-slate-405 text-slate-400 mb-12 max-w-2xl mx-auto">
          Hoàn toàn miễn phí, an toàn và tối giản. Hãy chọn phiên bản phù hợp để bắt đầu ngay hôm
          nay. Phiên bản hiện tại:
          <span class="text-emerald-400 font-bold font-mono">{{ currentVersion }}</span>
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <!-- Windows -->
          <div
            class="p-6 rounded-2xl border border-white/10 bg-slate-900 flex flex-col justify-between gap-6 glow-subtle"
          >
            <div class="flex flex-col gap-2">
              <span class="text-xs font-mono text-emerald-400 font-bold uppercase"
                >Desktop Companion</span
              >
              <h3 class="text-xl font-bold text-white font-display">Windows x64</h3>
              <p class="text-xs text-slate-400">
                Kiến trúc Tauri v2 siêu nhỏ nhẹ. Cài đặt trực tiếp qua bộ cài MSI.
              </p>
            </div>
            <a
              :href="windowsDownload"
              class="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-white transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              <Download class="w-4 h-4" />
              Tải file .msi
            </a>
          </div>

          <!-- macOS -->
          <div
            class="p-6 rounded-2xl border border-white/10 bg-slate-900 flex flex-col justify-between gap-6"
          >
            <div class="flex flex-col gap-2">
              <span class="text-xs font-mono text-purple-400 font-bold uppercase"
                >Desktop Companion</span
              >
              <h3 class="text-xl font-bold text-white font-display">macOS Client</h3>
              <p class="text-xs text-slate-400">
                Hỗ trợ cả máy chip Intel & Apple Silicon (M1/M2/M3).
              </p>
            </div>
            <a
              :href="macDownload"
              class="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-white transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              <Download class="w-4 h-4" />
              Tải file .dmg
            </a>
          </div>

          <!-- Android APK -->
          <div
            class="p-6 rounded-2xl border border-white/10 bg-slate-900 flex flex-col justify-between gap-6"
          >
            <div class="flex flex-col gap-2">
              <span class="text-xs font-mono text-teal-400 font-bold uppercase">Mobile Client</span>
              <h3 class="text-xl font-bold text-white font-display">Android Client</h3>
              <p class="text-xs text-slate-400">
                Cài đặt trực tiếp lên điện thoại hoặc máy tính bảng để sử dụng.
              </p>
            </div>
            <a
              :href="androidApk"
              class="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-black transition-all flex items-center justify-center gap-2 glow-subtle"
            >
              <Smartphone class="w-4 h-4" />
              Tải file APK
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-white/5 mt-auto bg-[#02050a] py-12 px-6">
      <div
        class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500"
      >
        <div class="flex items-center gap-2">
          <span class="text-slate-400 font-display font-medium">Android Stream Desk</span>
          <span>&copy; 2026. Mã nguồn mở MIT License.</span>
        </div>
        <div class="flex gap-6">
          <a :href="repoUrl" target="_blank" class="hover:text-white transition-colors"
            >GitHub Repository</a
          >
          <a :href="repoUrl + '/issues'" target="_blank" class="hover:text-white transition-colors"
            >Báo lỗi dự án</a
          >
        </div>
      </div>
    </footer>
  </div>
</template>
