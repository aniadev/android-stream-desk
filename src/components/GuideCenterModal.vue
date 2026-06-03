<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Icon } from '@iconify/vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    activeTopic?: 'browser' | 'shortcut' | 'firewall';
  }>(),
  {
    activeTopic: 'browser',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'apply-template', command: string): void;
}>();

const activeTab = ref<'browser' | 'shortcut' | 'firewall'>('browser');

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      activeTab.value = props.activeTopic || 'browser';
    }
  }
);

watch(
  () => props.activeTopic,
  (newTopic) => {
    if (newTopic) {
      activeTab.value = newTopic;
    }
  }
);

const isMac = computed(() => {
  return (
    navigator.userAgent.toLowerCase().includes('mac') ||
    navigator.platform.toLowerCase().includes('mac')
  );
});

const winCommand = 'start "" chrome "https://facebook.com"';
const macCommand = 'open -a "Google Chrome" "https://facebook.com"';

function close() {
  emit('update:modelValue', false);
}

function applyTemplate(cmd: string) {
  emit('apply-template', cmd);
  close();
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
      @click.self="close"
    >
      <div class="guide-modal w-[640px] max-w-full max-h-[80vh] flex flex-col p-5 gap-4 relative">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-cyan-500/15">
          <div class="flex items-center gap-2.5">
            <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 shadow-[0_0_16px_rgba(6,182,212,0.2)] flex items-center justify-center">
              <Icon icon="lucide:help-circle" class="text-base text-white" />
            </div>
            <div>
              <h2 class="text-xs font-bold text-slate-50 uppercase tracking-wider">
                Trung tâm trợ giúp (Guide Center)
              </h2>
              <p class="text-[8px] text-slate-500 mt-0.5">Hướng dẫn thiết lập mạng, phím tắt & mở ứng dung nhanh</p>
            </div>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Đóng"
            @click="close"
          >
            <Icon icon="lucide:x" class="text-lg" />
          </button>
        </div>

        <!-- Body Layout -->
        <div class="flex flex-1 min-h-0 gap-4 overflow-hidden">
          <!-- Left Navigation Menu -->
          <nav class="w-1/3 flex flex-col gap-1 border-r border-cyan-500/10 pr-3">
            <button
              type="button"
              class="menu-btn flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-[10px] font-bold uppercase transition-all"
              :class="activeTab === 'browser' ? 'menu-btn--active' : ''"
              @click="activeTab = 'browser'"
            >
              <Icon icon="lucide:chrome" class="text-xs text-cyan-400 shrink-0" />
              <span>Mở Trình Duyệt Web</span>
            </button>
            <button
              type="button"
              class="menu-btn flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-[10px] font-bold uppercase transition-all"
              :class="activeTab === 'shortcut' ? 'menu-btn--active' : ''"
              @click="activeTab = 'shortcut'"
            >
              <Icon icon="lucide:external-link" class="text-xs text-cyan-400 shrink-0" />
              <span>Dán (.lnk) Shortcut</span>
            </button>
            <button
              type="button"
              class="menu-btn flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-[10px] font-bold uppercase transition-all"
              :class="activeTab === 'firewall' ? 'menu-btn--active' : ''"
              @click="activeTab = 'firewall'"
            >
              <Icon icon="lucide:shield-alert" class="text-xs text-rose-450 shrink-0 animate-pulse" />
              <span>Tường Lửa & Cổng mạng</span>
            </button>
          </nav>

          <!-- Right Content Container -->
          <div class="flex-1 overflow-y-auto pl-1 pr-1 flex flex-col gap-4 text-slate-350">
            <!-- Tab: Browser commands -->
            <div v-if="activeTab === 'browser'" class="flex flex-col gap-4">
              <div>
                <h3 class="text-[11px] font-bold text-slate-205 uppercase tracking-wide mb-1 text-cyan-400">
                  Tự động mở trình duyệt Web
                </h3>
                <p class="text-[9px] text-slate-400 leading-relaxed">
                  Thiết lập macro để tự động kích hoạt trình duyệt web Google Chrome và truy cập vào đường dẫn định sẵn. Dưới đây là các câu lệnh mẫu dùng cho mục gán <strong>Lệnh shell (Command)</strong>.
                </p>
              </div>

              <!-- MacOS Segment -->
              <div
                class="os-box p-3 rounded-lg border flex flex-col gap-2"
                :class="isMac ? 'bg-cyan-500/5 border-cyan-400/30' : 'bg-slate-900/40 border-slate-800'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[9px] font-bold uppercase flex items-center gap-1" :class="isMac ? 'text-cyan-400' : 'text-slate-400'">
                    <Icon icon="lucide:apple" /> macOS
                    <span v-if="isMac" class="ml-1 px-1.5 py-0.5 text-[8px] bg-cyan-500/20 text-cyan-400 rounded-full font-semibold normal-case">Đang sử dụng</span>
                  </span>
                  <button
                    type="button"
                    class="use-template-btn text-[9px] font-bold px-2 py-1 rounded border border-cyan-400 cursor-pointer"
                    @click="applyTemplate(macCommand)"
                  >
                    Dùng mẫu này
                  </button>
                </div>
                <code class="text-[10px] font-mono bg-black/40 p-2 rounded block whitespace-pre-wrap select-all select-text border border-black/40">
                  {{ macCommand }}
                </code>
              </div>

              <!-- Windows Segment -->
              <div
                class="os-box p-3 rounded-lg border flex flex-col gap-2"
                :class="!isMac ? 'bg-cyan-500/5 border-cyan-400/30' : 'bg-slate-900/40 border-slate-800'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[9px] font-bold uppercase flex items-center gap-1" :class="!isMac ? 'text-cyan-400' : 'text-slate-400'">
                    <Icon icon="lucide:monitor" /> Windows
                    <span v-if="!isMac" class="ml-1 px-1.5 py-0.5 text-[8px] bg-cyan-500/20 text-cyan-400 rounded-full font-semibold normal-case">Đang sử dụng</span>
                  </span>
                  <button
                    type="button"
                    class="use-template-btn text-[9px] font-bold px-2 py-1 rounded border border-cyan-400 cursor-pointer"
                    @click="applyTemplate(winCommand)"
                  >
                    Dùng mẫu này
                  </button>
                </div>
                <code class="text-[10px] font-mono bg-black/40 p-2 rounded block whitespace-pre-wrap select-all select-text border border-black/40">
                  {{ winCommand }}
                </code>
              </div>
            </div>

            <!-- Tab: Shortcut link copy-as-path instructions -->
            <div v-else-if="activeTab === 'shortcut'" class="flex flex-col gap-4 text-[9px] leading-relaxed">
              <div>
                <h3 class="text-[11px] font-bold text-slate-205 uppercase tracking-wide mb-1 text-cyan-400">
                  Phím tắt ứng dụng & Copy as path
                </h3>
                <p class="text-slate-400">
                  Hướng dẫn chi tiết cách kéo thả phím tắt (.lnk) hoặc lấy đường dẫn tệp tin ứng dụng chính xác trên Windows để Companion tự động phân tích và kích hoạt nhanh.
                </p>
              </div>

              <!-- Step Guide List -->
              <div class="flex flex-col gap-2.5">
                <div class="step-card flex gap-3 p-2.5 rounded bg-slate-900/30 border border-slate-800">
                  <span class="step-num text-xs font-bold text-cyan-400 w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">1</span>
                  <div>
                    <span class="font-bold text-slate-200 block text-[10px] mb-0.5">Tìm phím tắt ứng dụng (.lnk) hoặc file gốc (.exe)</span>
                    <span class="text-slate-400">Mở File Explorer, tìm đến phím tắt ngoài Desktop hoặc trong thư mục cài đặt gốc.</span>
                  </div>
                </div>

                <div class="step-card flex gap-3 p-2.5 rounded bg-slate-900/30 border border-slate-800">
                  <span class="step-num text-xs font-bold text-cyan-400 w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">2</span>
                  <div>
                    <span class="font-bold text-slate-200 block text-[10px] mb-0.5">Sao chép đường dẫn (Copy as path)</span>
                    <span class="text-slate-400">Chuột phải vào tệp phím tắt, chọn <strong>"Copy as path"</strong> (hoặc giữ phím <code>Shift</code> + chuột phải và chọn "Copy as path" trên phiên bản Windows 10 trở xuống).</span>
                  </div>
                </div>

                <div class="step-card flex gap-3 p-2.5 rounded bg-slate-900/30 border border-slate-800">
                  <span class="step-num text-xs font-bold text-cyan-400 w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">3</span>
                  <div>
                    <span class="font-bold text-slate-200 block text-[10px] mb-0.5">Chuyển sang tab cấu hình App</span>
                    <span class="text-slate-400">Click chọn ô lưới muốn gán ở Companion, tạo/chuyển qua tab cấu hình loại <strong>"App"</strong>.</span>
                  </div>
                </div>

                <div class="step-card flex gap-3 p-2.5 rounded bg-slate-900/30 border border-slate-800">
                  <span class="step-num text-xs font-bold text-cyan-400 w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">4</span>
                  <div>
                    <span class="font-bold text-slate-200 block text-[10px] mb-0.5">Dán đường dẫn và lưu trữ</span>
                    <span class="text-slate-400">Dán (Ctrl + V) trực tiếp vào ô nhập đường dẫn. Client tự động loại bỏ dấu ngoặc kép kép nếu có và thực hiện mở rộng tệp logic dưới backend khi kích hoạt.</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab: LAN / Firewall Troubleshooting -->
            <div v-else-if="activeTab === 'firewall'" class="flex flex-col gap-4 text-[9px] leading-relaxed">
              <div>
                <h3 class="text-[11px] font-bold text-rose-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Icon icon="lucide:shield-alert" class="text-xs shrink-0" />
                  Khắc phục lỗi Tường lửa & Trùng cổng mạng
                </h3>
                <p class="text-slate-400">
                  Khi socket Companion bị chặn hoặc đụng độ cổng mạng (Address already in use), thiết bị nhận tin của bạn sẽ hiển thị ngoại tuyến.
                </p>
              </div>

              <!-- Step Guide List -->
              <div class="flex flex-col gap-2.5">
                <div class="step-card flex gap-3 p-2.5 rounded bg-slate-900/30 border border-slate-800">
                  <span class="step-num text-xs font-bold text-rose-450 w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">1</span>
                  <div>
                    <span class="font-bold text-slate-200 block text-[10px] mb-0.5">Cho phép Companion qua Windows Defender Firewall</span>
                    <span class="text-slate-400">Khi khởi chạy Companion lần đầu, hãy click <strong>"Allow access"</strong> trên bảng thông báo Windows. Nếu đã lỡ bỏ qua, hãy vào <em>Control Panel -> Windows Defender Firewall -> Allow an app through firewall</em>, tìm <code>android-stream-desk</code> và bật tick chọn cho cả <strong>Private</strong> và <strong>Public</strong>.</span>
                  </div>
                </div>

                <div class="step-card flex gap-3 p-2.5 rounded bg-slate-900/30 border border-slate-800">
                  <span class="step-num text-xs font-bold text-rose-400 w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">2</span>
                  <div>
                    <span class="font-bold text-slate-200 block text-[10px] mb-0.5">Thay đổi số cổng WebSocket (Port Conflict)</span>
                    <span class="text-slate-400">Nếu có ứng dụng khác đang chiếm dụng cổng mặc định 8089, bạn cần đổi sang một cổng khác hoạt động (ví dụ: 8090, 8092, v.v.). Đi tới phần <strong>Cài đặt kết nối hệ thống Companion</strong> bên dưới mục trạng thái mạng của Dashboard để sửa lại cổng và lưu.</span>
                  </div>
                </div>

                <div class="step-card flex gap-3 p-2.5 rounded bg-slate-900/30 border border-slate-800">
                  <span class="step-num text-xs font-bold text-rose-400 w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">3</span>
                  <div>
                    <span class="font-bold text-slate-200 block text-[10px] mb-0.5">Xác nhận Wi-Fi & LAN cùng subnet (AP isolation)</span>
                    <span class="text-slate-400">Đảm bảo cả máy tính Companion lẫn thiết bị Android Client của bạn kết nối vào cùng 1 Router/Access Point mạng LAN. Hãy tắt chế độ "AP Isolation / Guest Network" nếu được bật trên router của bạn.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.guide-modal {
  background: rgba(4, 10, 24, 0.95);
  border: 1px solid rgba(0, 240, 255, 0.12);
  box-shadow:
    0 0 0 1px rgba(0, 240, 255, 0.03),
    0 16px 48px -16px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.015);
  border-radius: 16px;
  backdrop-filter: blur(16px);
}

.menu-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid transparent;
}

.menu-btn:hover {
  background: rgba(0, 240, 255, 0.04);
  color: rgba(255, 255, 255, 0.9);
}

.menu-btn--active,
.menu-btn--active:hover {
  background: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.14);
  color: #fff;
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.04);
}

.use-template-btn {
  background: rgba(6, 182, 212, 0.08);
  color: rgb(34, 211, 238);
  border-color: rgba(6, 182, 212, 0.3);
  transition: all 0.2s;
}

.use-template-btn:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: rgb(34, 211, 238);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.25);
}

.step-card {
  transition: border-color 0.2s;
}
.step-card:hover {
  border-color: rgba(0, 240, 255, 0.15);
}
</style>