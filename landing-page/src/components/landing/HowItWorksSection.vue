<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useSectionAnimation } from '@/composables/useSectionAnimation';

defineProps<{
  accentColor: string;
}>();

const sectionRef = useTemplateRef<HTMLElement>('sectionRef');

useSectionAnimation(sectionRef, { stagger: 0.11 });
</script>

<template>
  <section id="how-it-works" ref="sectionRef" class="relative z-10 py-16 px-4 sm:py-20 sm:px-6 lg:py-24 border-t border-white/[0.06]">
    <div class="max-w-5xl mx-auto">
      <div data-reveal class="text-center max-w-2xl mx-auto mb-10 sm:mb-14 lg:mb-16 flex flex-col items-center">
        <span class="text-[11px] font-semibold tracking-wider uppercase mb-1 transition-colors duration-500" :style="{ color: accentColor }">
          ba bước giản đơn
        </span>
        <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Thiết lập dễ dàng chỉ trong 3 phút
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div data-reveal class="rounded-xl border border-white/[0.04] bg-white/[0.005] p-5 sm:p-6 flex flex-col">
          <span class="text-xs font-mono text-white/30 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-full w-7 h-7 flex items-center justify-center">01</span>
          <h3 class="text-sm font-semibold tracking-tight text-white mb-2">Tải Companion Server</h3>
          <p class="text-xs text-white/50 leading-relaxed">
            Tải phiên bản phù hợp với hệ điều hành của máy tính bạn (Windows .msi, macOS .dmg hoặc Ubuntu .deb/AppImage) trực tiếp tại mục tải xuống bên dưới.
          </p>
        </div>

        <div data-reveal class="rounded-xl border border-white/[0.04] bg-white/[0.005] p-5 sm:p-6 flex flex-col">
          <span class="text-xs font-mono text-white/30 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-full w-7 h-7 flex items-center justify-center">02</span>
          <h3 class="text-sm font-semibold tracking-tight text-white mb-2">Quét kết nối QR Code</h3>
          <p class="text-xs text-white/50 leading-relaxed font-normal">
            Cài đặt mobile client bằng cách tải file APK trên Android. Bạn chỉ cần quét mã QR được sinh tự động trên màn hình máy chủ để liên kết LAN.
          </p>
        </div>

        <div data-reveal class="rounded-xl border border-white/[0.04] bg-white/[0.005] p-5 sm:p-6 flex flex-col">
          <span class="text-xs font-mono text-white/30 mb-4 bg-white/[0.02] border border-white/[0.05] rounded-full w-7 h-7 flex items-center justify-center">03</span>
          <h3 class="text-sm font-semibold tracking-tight text-white mb-2">Tùy biến phím bấm & Sử dụng</h3>
          <p class="text-xs text-white/50 leading-relaxed">
            Giờ đây, bạn có thể tự do mở rộng trang nút bấm, gán lệnh Windows Hotkeys, Scripts, mở phần mềm tùy ý và gán các icon sắc nét.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
