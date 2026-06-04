<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { Cpu, Download, Info, Smartphone, X } from 'lucide-vue-next';

interface ApkOption {
  id: 'arm64' | 'arm';
  title: string;
  abi: string;
  fileName: string;
  href: string;
  recommendation: string;
  support: string;
  examples: string;
  badge: string;
  preferred: boolean;
}

defineProps<{
  options: ApkOption[];
  version: string;
  accentColor: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

let originalBodyOverflow = '';

function closeModal() {
  emit('close');
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeModal();
  }
}

onMounted(() => {
  originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.body.style.overflow = originalBodyOverflow;
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-end justify-center bg-[#000212]/80 px-3 py-3 backdrop-blur-md sm:items-center sm:p-6" @click.self="closeModal">
      <section class="w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#060818] shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-3rem)]">
        <div class="flex items-start justify-between gap-3 sm:gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-6">
          <div class="min-w-0">
            <div class="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/60">
              <Smartphone class="h-3.5 w-3.5" :style="{ color: accentColor }" />
              Android APK {{ version }}
            </div>
            <h2 class="text-lg font-semibold text-white sm:text-xl">Chọn đúng APK cho thiết bị Android</h2>
            <p class="mt-1 max-w-2xl text-xs leading-relaxed text-white/50 sm:text-sm">
              APK hiện được tách theo kiến trúc CPU để file nhẹ hơn. Gần như mọi máy hiện nay dùng arm64; chỉ chọn arm khi máy quá cũ hoặc arm64 báo không tương thích.
            </p>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Đóng modal chọn APK"
            @click="closeModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="grid gap-3 sm:gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <article
            v-for="option in options"
            :key="option.id"
            class="flex min-h-[280px] sm:min-h-[310px] flex-col rounded-xl border bg-white/[0.025] p-4"
            :class="option.preferred ? 'border-white/[0.14]' : 'border-white/[0.08]'"
            :style="option.preferred ? { borderColor: `${accentColor}55` } : {}"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]" :style="{ color: option.preferred ? accentColor : 'rgba(255,255,255,0.72)' }">
                  <Cpu class="h-5 w-5" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-white">{{ option.title }}</h3>
                  <p class="font-mono text-[11px] text-white/40">{{ option.abi }}</p>
                </div>
              </div>
              <span class="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-white/55">
                {{ option.badge }}
              </span>
            </div>

            <div class="mt-4 space-y-3 text-xs leading-relaxed text-white/55">
              <p class="text-white/70">{{ option.recommendation }}</p>
              <p>{{ option.support }}</p>
              <p>
                <span class="text-white/40">Ví dụ:</span>
                {{ option.examples }}
              </p>
            </div>

            <div class="mt-auto pt-5">
              <p class="mb-2 truncate font-mono text-[11px] text-white/35" :title="option.fileName">
                {{ option.fileName }}
              </p>
              <a
                :href="option.href"
                class="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold text-[#000212] transition-opacity hover:opacity-90"
                :style="{ backgroundColor: option.preferred ? accentColor : '#f3f4f6' }"
              >
                <Download class="h-3.5 w-3.5" />
                Tải {{ option.id === 'arm64' ? 'APK arm64' : 'APK arm' }}
              </a>
            </div>
          </article>
        </div>

        <div class="flex gap-2 border-t border-white/[0.08] px-4 py-4 text-xs leading-relaxed text-white/45 sm:px-6">
          <Info class="mt-0.5 h-4 w-4 shrink-0" :style="{ color: accentColor }" />
          <p>
            Nếu release chỉ có bản chưa ký, GitHub Assets có thể dùng hậu tố <span class="font-mono text-white/60">-unsigned.apk</span>. Không chắc máy 32-bit hay 64-bit thì thử arm64 trước; nếu Android báo không tương thích mới chuyển sang arm.
          </p>
        </div>
      </section>
    </div>
  </Teleport>
</template>
