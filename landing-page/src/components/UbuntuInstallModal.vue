<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { Code, Download, Info, X } from 'lucide-vue-next';

defineProps<{
  debHref: string;
  appImageHref: string;
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
              <Code class="h-3.5 w-3.5" :style="{ color: accentColor }" />
              Ubuntu Companion
            </div>
            <h2 class="text-lg font-semibold text-white sm:text-xl">Cài Android Stream Desk trên Ubuntu</h2>
            <p class="mt-1 max-w-2xl text-xs leading-relaxed text-white/50 sm:text-sm">
              Khuyến nghị dùng gói .deb trên Ubuntu. AppImage phù hợp khi bạn muốn chạy dạng portable, không cần cài vào hệ thống.
            </p>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Đóng hướng dẫn Ubuntu"
            @click="closeModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="grid gap-3 sm:gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <article class="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <h3 class="text-sm font-semibold text-white">Cách 1: cài bằng .deb</h3>
            <p class="mt-2 text-xs leading-relaxed text-white/55">
              Tải file .deb, mở Terminal tại thư mục Downloads rồi chạy:
            </p>
            <pre class="mt-3 overflow-x-auto rounded-lg border border-white/[0.08] bg-black/30 p-3 text-[11px] leading-relaxed text-white/70"><code>sudo dpkg -i &lt;ten_file&gt;.deb
sudo apt-get install -f</code></pre>
            <a
              :href="debHref"
              class="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold text-[#000212] transition-opacity hover:opacity-90"
              :style="{ backgroundColor: accentColor }"
            >
              <Download class="h-3.5 w-3.5" />
              Tải gói .deb
            </a>
          </article>

          <article class="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <h3 class="text-sm font-semibold text-white">Cách 2: chạy AppImage</h3>
            <p class="mt-2 text-xs leading-relaxed text-white/55">
              Tải file AppImage, cấp quyền thực thi rồi chạy trực tiếp:
            </p>
            <pre class="mt-3 overflow-x-auto rounded-lg border border-white/[0.08] bg-black/30 p-3 text-[11px] leading-relaxed text-white/70"><code>chmod +x &lt;ten_file&gt;.AppImage
./&lt;ten_file&gt;.AppImage</code></pre>
            <a
              :href="appImageHref"
              class="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              <Download class="h-3.5 w-3.5" />
              Tải AppImage
            </a>
          </article>
        </div>

        <div class="space-y-3 border-t border-white/[0.08] px-4 py-4 text-xs leading-relaxed text-white/45 sm:px-6">
          <div class="flex gap-2">
            <Info class="mt-0.5 h-4 w-4 shrink-0" :style="{ color: accentColor }" />
            <p>
              Runtime dependency tối thiểu: <span class="font-mono text-white/60">libwebkit2gtk-4.1-dev</span>, <span class="font-mono text-white/60">libgtk-3-dev</span>, <span class="font-mono text-white/60">libxdo-dev</span>, <span class="font-mono text-white/60">libappindicator3-dev</span>, <span class="font-mono text-white/60">librsvg2-dev</span>.
            </p>
          </div>
          <p class="pl-6">
            Lưu ý: giả lập phím qua enigo ổn định nhất trên phiên đăng nhập X11. Wayland thuần có thể hạn chế một số hotkey hệ thống.
          </p>
        </div>
      </section>
    </div>
  </Teleport>
</template>
