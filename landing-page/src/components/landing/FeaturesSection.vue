<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { Cpu, Layers, ShieldCheck, Zap } from 'lucide-vue-next';
import { useSectionAnimation } from '@/composables/useSectionAnimation';

defineProps<{
  accentColor: string;
}>();

const sectionRef = useTemplateRef<HTMLElement>('sectionRef');

useSectionAnimation(sectionRef, { stagger: 0.1 });
</script>

<template>
  <section id="features" ref="sectionRef" class="relative z-10 py-16 px-4 sm:py-20 sm:px-6 lg:py-24 border-t border-white/[0.06] bg-[#020419]/10">
    <div class="max-w-5xl mx-auto">
      <div data-reveal class="max-w-2xl mb-10 sm:mb-14 lg:mb-16 text-left">
        <span class="text-[11px] font-semibold tracking-wider uppercase transition-colors duration-500" :style="{ color: accentColor }">
          kiến trúc đột phá
        </span>
        <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
          Một Stream Desk bền bỉ, an toàn, được tạo ra cho lập trình viên & streamers.
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div data-reveal class="md:col-span-2">
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5 sm:p-8 flex flex-col justify-between min-h-[220px] sm:min-h-[250px] relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div data-glow class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-0 group-hover:opacity-[0.04] pointer-events-none transition-all duration-500 bg-emerald-500"></div>
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500" :style="{ color: accentColor, borderColor: `${accentColor}33` }">
                <Zap class="w-5 h-5" />
              </div>
              <span class="text-[10px] font-mono text-white/30 px-2 py-0.5 rounded border border-white/[0.04]">0ms delay</span>
            </div>
            <div class="mt-8 sm:mt-12">
              <h3 class="text-lg font-medium text-white mb-2">Tốc độ tức thì (LAN WebSockets)</h3>
              <p class="text-xs text-white/50 leading-relaxed max-w-lg">
                Sử dụng kết nối trực tiếp WebSocket nội bộ mà không cần máy chủ lưu trữ thứ ba. Các sự kiện phím tắt và macro được phát động tức thì với độ trễ thấp đến mức không thể cảm nhận.
              </p>
            </div>
          </div>
        </div>

        <div data-reveal>
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.014] p-5 sm:p-8 flex flex-col justify-between min-h-[220px] sm:min-h-[250px] overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500 self-start" :style="{ color: accentColor, borderColor: `${accentColor}33` }">
              <Layers class="w-5 h-5" />
            </div>
            <div class="mt-7 sm:mt-8">
              <h3 class="text-lg font-medium text-white mb-2">Tùy biến không giới hạn</h3>
              <p class="text-xs text-white/50 leading-relaxed">
                Tự do thiết kế menu nút bấm cá nhân, cấu hình kích thước lưới 4x3 đến 8x6, chọn biểu tượng trong kho dữ liệu phong phú và tùy biến lệnh hoạt động.
              </p>
            </div>
          </div>
        </div>

        <div data-reveal>
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5 sm:p-8 flex flex-col justify-between min-h-[220px] sm:min-h-[250px] overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500 self-start" :style="{ color: accentColor, borderColor: `${accentColor}33` }">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <div class="mt-7 sm:mt-8">
              <h3 class="text-lg font-medium text-white mb-2">Bảo mật hệ thống tối đa</h3>
              <p class="text-xs text-white/50 leading-relaxed font-normal">
                Không thu thập thông tin gõ phím hay gửi dữ liệu qua Internet. Phần mềm chạy hoàn toàn trong mạng gia đình an toàn của bạn.
              </p>
            </div>
          </div>
        </div>

        <div data-reveal class="md:col-span-2">
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.014] p-5 sm:p-8 flex flex-col justify-between min-h-[220px] sm:min-h-[250px] relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div data-glow class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-0 group-hover:opacity-[0.05] pointer-events-none transition-all duration-500" :style="{ backgroundColor: `${accentColor}44` }"></div>
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center transition-colors duration-500" :style="{ color: accentColor, borderColor: `${accentColor}33` }">
                <Cpu class="w-5 h-5" />
              </div>
              <span class="text-[10px] font-mono text-white/30 px-2 py-0.5 rounded border border-white/[0.04]">Tauri v2 + Rust</span>
            </div>
            <div class="mt-8 sm:mt-12">
              <h3 class="text-lg font-medium text-white mb-2">Companion Server siêu gọn nhẹ</h3>
              <p class="text-xs text-white/50 leading-relaxed max-w-lg">
                Được lập trình bằng Rust và Tauri v2 thay vì Electron. Tiêu thụ chưa đầy 15MB RAM và gần như 0% tài nguyên CPU khi chạy nền, đảm bảo chơi game mượt mà nhất.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
