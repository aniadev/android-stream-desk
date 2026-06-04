<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { ChevronRight, Download, RadioTower, ShieldCheck, Sparkles, Zap } from 'lucide-vue-next';
import { useSectionAnimation } from '@/composables/useSectionAnimation';
import ShinyText from '@/components/landing/ShinyText.vue';

defineProps<{
  accentColor: string;
}>();

const sectionRef = useTemplateRef<HTMLElement>('sectionRef');

useSectionAnimation(sectionRef, { start: 'top 92%', stagger: 0.09 });
</script>

<template>
  <section
    ref="sectionRef"
    class="relative z-10 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-24 lg:pb-32 max-w-6xl mx-auto flex flex-col items-center text-center"
  >
    <div
      data-reveal
      class="inline-flex max-w-full items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] text-xs text-white/70 mb-5 sm:mb-6 backdrop-blur-sm transition-all duration-300"
      :style="{ borderColor: `${accentColor}22` }"
    >
      <Sparkles class="w-3.5 h-3.5 text-white/80 animate-pulse" :style="{ color: accentColor }" />
      <span class="text-[11px] font-medium tracking-tight"
        >Mã nguồn mở miễn phí &bull; Dung lượng cực nhẹ</span
      >
    </div>

    <h1
      data-reveal
      class="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-white max-w-4xl font-sans"
    >
      Biến điện thoại của bạn thành
      <ShinyText
        class="block sm:inline"
        :color="`linear-gradient(135deg, #ffffff 0%, ${accentColor} 44%, #81fc30 100%)`"
        shine-color="rgba(255,255,255,0.95)"
        :speed="3.6"
      >
        Stream Desk không dây
      </ShinyText>
    </h1>

    <p
      data-reveal
      class="text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mt-5 sm:mt-6 leading-relaxed font-normal"
    >
      Tận dụng thiết bị di động cũ để làm bàn phím Macro Pad cao cấp. Kết nối siêu tốc độ mạng LAN
      không dây, không có trung gian đám mây, an toàn tuyệt đối.
    </p>

    <div data-reveal class="mt-6 sm:mt-7 grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-3">
      <div
        class="flex h-11 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2 sm:px-3 text-[10px] sm:text-[11px] font-medium text-white/65 backdrop-blur-sm"
      >
        <RadioTower class="h-4 w-4 shrink-0" :style="{ color: accentColor }" />
        <span>LAN local</span>
      </div>
      <div
        class="flex h-11 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2 sm:px-3 text-[10px] sm:text-[11px] font-medium text-white/65 backdrop-blur-sm"
      >
        <Zap class="h-4 w-4 shrink-0" :style="{ color: accentColor }" />
        <span>0 ms</span>
      </div>
      <div
        class="flex h-11 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2 sm:px-3 text-[10px] sm:text-[11px] font-medium text-white/65 backdrop-blur-sm"
      >
        <ShieldCheck class="h-4 w-4 shrink-0" :style="{ color: accentColor }" />
        <span>Self-hosted</span>
      </div>
    </div>

    <div
      data-reveal
      class="flex flex-col sm:flex-row items-center gap-3 mt-8 sm:mt-10 w-full justify-center"
    >
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

    <div data-reveal class="relative mt-12 sm:mt-16 w-full max-w-6xl">
      <div
        class="pointer-events-none absolute -inset-x-6 -top-8 h-36 rounded-full blur-3xl opacity-30"
        :style="{ backgroundColor: `${accentColor}26` }"
      ></div>
      <figure
        class="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.018] shadow-[0_32px_120px_rgba(0,0,0,0.42)]"
      >
        <picture>
          <source srcset="/hero-banner.jpg" type="image/jpeg" />
          <img
            src="/hero-banner.png"
            width="2752"
            height="1536"
            alt="Android Stream Desk hoạt động trên Android, Windows, macOS và Ubuntu"
            class="h-[220px] w-full object-cover object-center sm:h-[360px] lg:h-[470px]"
            fetchpriority="high"
          />
        </picture>
        <div
          class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,2,18,0)_45%,rgba(0,2,18,0.5)_100%)]"
        ></div>
      </figure>
    </div>

    <div
      data-reveal
      class="grid grid-cols-3 gap-3 sm:gap-8 md:gap-16 pt-6 sm:pt-8 mt-12 sm:mt-16 border-t border-white/[0.06] w-full max-w-2xl text-center sm:text-left"
    >
      <div>
        <div class="text-lg sm:text-2xl font-semibold text-white tracking-tight uppercase">
          0 ms
        </div>
        <div class="text-[11px] text-white/40 mt-1">Độ trễ truyền mạng LAN</div>
      </div>
      <div>
        <div class="text-lg sm:text-2xl font-semibold text-white tracking-tight uppercase">
          MIỄN PHÍ
        </div>
        <div class="text-[11px] text-white/40 mt-1">100% Mã nguồn mở</div>
      </div>
      <div>
        <div class="text-lg sm:text-2xl font-semibold text-white tracking-tight uppercase">
          RUST
        </div>
        <div class="text-[11px] text-white/40 mt-1">Tauri v2 làm Backend</div>
      </div>
    </div>
  </section>
</template>
