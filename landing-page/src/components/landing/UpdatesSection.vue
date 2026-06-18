<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue';
import { Paintbrush, MonitorSmartphone, Copy, Cpu, CheckCircle } from 'lucide-vue-next';
import { useSectionAnimation } from '@/composables/useSectionAnimation';

defineProps<{
  accentColor: string;
}>();

const sectionRef = useTemplateRef<HTMLElement>('sectionRef');
useSectionAnimation(sectionRef, { stagger: 0.1 });

type TabId = 'theme' | 'preview' | 'clipboard' | 'monitor';

interface UpdateItem {
  id: TabId;
  title: string;
  badge: string;
  description: string;
  icon: any;
  screenshot: string;
  highlights: string[];
}

const activeTab = ref<TabId>('theme');

const updates = ref<UpdateItem[]>([
  {
    id: 'theme',
    title: 'Giao diện Genshin & Anime',
    badge: 'MỚI - THEME',
    description:
      'Thổi hồn vào bộ phím bấm với theme Genshin Impact 01 cá tính đầy đủ hình nền và theme Anime tông màu pastel mềm mại, bo góc lớn dịu mắt.',
    icon: Paintbrush,
    screenshot: '/screenshots/client-theme-genshin-01.png',
    highlights: [
      'Genshin 01: Thiết kế giao diện cổ điển, viền vàng kim, họa tiết tinh xảo và đồng bộ hình nền.',
      'Anime theme: Tông màu hồng phấn/oải hương lãng mạn, sử dụng font chữ SF Pro Rounded dễ thương.',
      'Khả năng tự động kế thừa: Client thay đổi theme tức thời khi chọn trên Companion.',
    ],
  },
  {
    id: 'preview',
    title: 'Nhận diện Thiết bị & Tỉ lệ Preview',
    badge: 'MỚI - THUẬT TOÁN',
    description:
      'Companion tự động nhận diện thiết bị client (iPad, Android, macOS, Windows) và điều chỉnh khung xem trước (Preview) theo đúng tỷ lệ Aspect Ratio thực tế.',
    icon: MonitorSmartphone,
    screenshot: '/screenshots/companion-theme-genshin-01.png',
    highlights: [
      'Không bóp méo hình dạng phím bấm: Preview co giãn thông minh theo tỉ lệ thực tế của client.',
      'Xoay màn hình tự động: Client xoay ngang/dọc, Companion cập nhật tỉ lệ ngay lập tức.',
      'Chế độ fallback an toàn: Tự động đưa tỷ lệ về mặc định 1.6 khi mất kết nối.',
    ],
  },
  {
    id: 'clipboard',
    title: 'Sao Chép & Nhân Bản Phím',
    badge: 'MỚI - HIỆU SUẤT',
    description:
      'Bổ sung clipboard in-memory cho cấu hình phím. Hỗ trợ thao tác Copy, Paste và Duplicate cấu hình nút phím bấm trực tiếp trên Companion Dashboard cực kỳ tiện lợi.',
    icon: Copy,
    screenshot: '/screenshots/copy-feature.png',
    highlights: [
      'Nhân bản nhanh phím: Duplicate phím sang ô trống kế tiếp chỉ bằng một cú click chuột.',
      'Bảo toàn cấu hình Monitor: Copy/Paste giữ nguyên loại phím (Action hoặc Monitor) cùng config.',
      'Shortcut thông minh: Phím tắt Ctrl/Cmd+C và Ctrl/Cmd+V thông minh, tự động bỏ qua khi đang gõ chữ.',
    ],
  },
  {
    id: 'monitor',
    title: 'Cải tiến Nút Giám Sát CPU/RAM',
    badge: 'NÂNG CẤP - UX',
    description:
      'Giao diện nút monitor hệ thống được thiết kế lại hoàn toàn. Nâng cấp hiển thị trực quan mức độ tải hệ thống realtime giúp streamer dễ dàng bao quát máy tính.',
    icon: Cpu,
    screenshot: '/screenshots/monitoring-feature.png',
    highlights: [
      'Vòng tiến trình (Progress Ring) SVG: Hiển thị mức tải xung quanh icon chính cực chất.',
      'Cảnh báo 3 mức màu sắc: Tự động đổi màu phím theo tải Normal (<70%), Warning (70-90%), Critical (>90%).',
      'Độ mượt cao: Sử dụng CSS transitions mượt mà khi cập nhật phần trăm mà không gây lag máy.',
    ],
  },
]);

const currentUpdate = computed(() => updates.value.find(item => item.id === activeTab.value)!);
</script>

<template>
  <section
    id="updates"
    ref="sectionRef"
    class="relative z-10 py-16 px-4 sm:py-20 sm:px-6 lg:py-24 border-t border-white/[0.06] bg-[#020419]/5"
  >
    <!-- Ambient background glows -->
    <div
      class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[160px] opacity-10 bg-indigo-500"
    />

    <div class="max-w-5xl mx-auto">
      <!-- Section Header -->
      <div data-reveal class="max-w-2xl mb-12 sm:mb-16 text-left">
        <span
          class="text-[11px] font-semibold tracking-wider uppercase transition-colors duration-500"
          :style="{ color: accentColor }"
        >
          phiên bản mới v1.6.0
        </span>
        <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
          Có gì mới trong phiên bản phát hành v1.6.0?
        </h2>
        <p class="text-xs text-white/40 mt-2 max-w-xl leading-relaxed">
          Chúng tôi mang đến các cải tiến đột phá về tùy biến giao diện, khả năng nhận diện thiết bị
          và tăng hiệu suất thiết lập lưới nút macro.
        </p>
      </div>

      <!-- Main Showcase Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Mobile/Tablet Tabs: Horizontal Scrollable Row (visible on < lg) -->
        <div
          data-reveal
          class="lg:hidden flex flex-row overflow-x-auto gap-2 pb-2 no-scrollbar w-full scroll-smooth snap-x"
        >
          <button
            v-for="item in updates"
            :key="item.id"
            type="button"
            class="snap-start flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-semibold transition-colors duration-200 shrink-0 outline-none"
            :class="
              activeTab === item.id
                ? 'bg-white/[0.04]'
                : 'bg-transparent border-white/[0.04] text-white/50 hover:text-white/80'
            "
            :style="activeTab === item.id ? { borderColor: accentColor, color: accentColor } : {}"
            @click="activeTab = item.id"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.title }}</span>
          </button>
        </div>

        <!-- Mobile description (visible on < lg) -->
        <div
          data-reveal
          class="lg:hidden text-xs sm:text-sm leading-relaxed text-white/70 mt-1 mb-4 px-1"
        >
          {{ currentUpdate.description }}
        </div>

        <!-- Left Side: Interactive Update Selector List (visible on lg+) -->
        <div class="hidden lg:grid grid-cols-1 gap-3 lg:col-span-5">
          <button
            v-for="item in updates"
            :key="item.id"
            data-reveal
            type="button"
            class="group w-full text-left p-4 sm:p-5 rounded-2xl border transition-colors duration-300 relative overflow-hidden outline-none"
            :class="
              activeTab === item.id
                ? 'bg-white/[0.03] shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                : 'bg-transparent border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.01]'
            "
            :style="activeTab === item.id ? { borderColor: `${accentColor}40` } : {}"
            @click="activeTab = item.id"
          >
            <!-- Highlight bar -->
            <div
              class="absolute left-0 top-0 bottom-0 w-[3px] transition-transform duration-300"
              :class="activeTab === item.id ? 'scale-y-100' : 'scale-y-0'"
              :style="{ backgroundColor: accentColor }"
            />

            <div class="flex items-start gap-4">
              <!-- Icon Container -->
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-300"
                :class="
                  activeTab === item.id ? 'bg-white/[0.04]' : 'bg-white/[0.01] border-white/[0.06]'
                "
                :style="
                  activeTab === item.id
                    ? { color: accentColor, borderColor: `${accentColor}33` }
                    : {}
                "
              >
                <component
                  :is="item.icon"
                  class="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                />
              </div>

              <!-- Text Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="text-[9px] font-bold tracking-wider uppercase transition-colors"
                    :class="activeTab === item.id ? '' : 'text-white/30'"
                    :style="activeTab === item.id ? { color: accentColor } : {}"
                  >
                    {{ item.badge }}
                  </span>
                </div>
                <h3
                  class="text-sm font-semibold mt-0.5 transition-colors"
                  :class="
                    activeTab === item.id ? 'text-white' : 'text-white/50 group-hover:text-white/80'
                  "
                >
                  {{ item.title }}
                </h3>
                <p
                  class="text-[11px] leading-relaxed mt-1.5 transition-colors line-clamp-2"
                  :class="activeTab === item.id ? 'text-white/70' : 'text-white/35'"
                >
                  {{ item.description }}
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Right Side: Live Screenshot & Highlights -->
        <div data-reveal class="lg:col-span-7 flex flex-col gap-6">
          <!-- Screenshot Card -->
          <div
            class="relative rounded-2xl border border-white/[0.08] bg-[#030718]/90 overflow-hidden shadow-2xl group flex flex-col"
          >
            <!-- Header bar mock -->
            <div
              class="flex items-center gap-1.5 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]"
            >
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span class="text-[9px] font-mono text-white/20 ml-2 uppercase tracking-widest"
                >Screenshot Live Preview</span
              >
            </div>

            <!-- Image Wrap -->
            <div
              class="relative overflow-hidden aspect-[16/10] bg-[#020412] p-3 sm:p-5 flex items-center justify-center"
            >
              <transition name="fade" mode="out-in">
                <img
                  :key="currentUpdate.id"
                  :src="currentUpdate.screenshot"
                  :alt="currentUpdate.title"
                  class="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg transition-transform duration-700 hover:scale-[1.02]"
                />
              </transition>
            </div>
          </div>

          <!-- Highlight Lists -->
          <div class="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-5 sm:p-6">
            <h4
              class="text-xs font-bold uppercase tracking-wider text-white/70 mb-3 flex items-center gap-2"
            >
              <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: accentColor }" />
              Đặc điểm nổi bật
            </h4>
            <ul class="flex flex-col gap-2.5">
              <li
                v-for="(hl, idx) in currentUpdate.highlights"
                :key="idx"
                class="flex items-start gap-2.5 text-[11.5px] leading-relaxed text-white/60"
              >
                <CheckCircle class="w-4 h-4 shrink-0 mt-0.5" :style="{ color: accentColor }" />
                <span>{{ hl }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
