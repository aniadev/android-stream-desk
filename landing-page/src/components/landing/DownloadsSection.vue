<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import { Icon } from '@iconify/vue';
import { Code, Download, Smartphone } from 'lucide-vue-next';
import AndroidApkModal from '@/components/AndroidApkModal.vue';
import UbuntuInstallModal from '@/components/UbuntuInstallModal.vue';
import { useSectionAnimation } from '@/composables/useSectionAnimation';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

defineProps<{
  accentColor: string;
}>();

const repoUrl = 'https://github.com/aniadev/android-stream-desk';
const fallbackVersion = 'v1.5.1';
const isAndroidApkModalOpen = shallowRef(false);
const isUbuntuInstallModalOpen = shallowRef(false);
const sectionRef = useTemplateRef<HTMLElement>('sectionRef');

useSectionAnimation(sectionRef, { stagger: 0.08 });

function releaseAssetBaseUrl(tag: string) {
  return `${repoUrl}/releases/download/${tag}`;
}

function semanticVersionTag(tag: string) {
  return tag.match(/^v\d+(?:\.\d+){1,3}/)?.[0] ?? tag;
}

function versionNumber(tag: string) {
  return semanticVersionTag(tag).replace(/^v/, '');
}

function apkVersionSlug(tag: string) {
  return semanticVersionTag(tag).replace(/\./g, '_');
}

function windowsMsiFileName(tag: string) {
  return `Android.Stream.Desk_${versionNumber(tag)}_x64_en-US.msi`;
}

function windowsSetupFileName(tag: string) {
  return `Android.Stream.Desk_${versionNumber(tag)}_x64-setup.exe`;
}

function macDmgFileName(tag: string) {
  return `Android.Stream.Desk_${versionNumber(tag)}_universal.dmg`;
}

function linuxDebFileName(tag: string) {
  return `Android.Stream.Desk_${versionNumber(tag)}_amd64.deb`;
}

function linuxAppImageFileName(tag: string) {
  return `Android.Stream.Desk_${versionNumber(tag)}_amd64.AppImage`;
}

function findReleaseAssetUrl(
  assets: ReleaseAsset[] | undefined,
  matcher: (name: string) => boolean,
) {
  return assets?.find(asset => matcher(asset.name))?.browser_download_url;
}

const currentVersion = ref(fallbackVersion);
const windowsDownload = ref(
  `${releaseAssetBaseUrl(fallbackVersion)}/${windowsMsiFileName(fallbackVersion)}`,
);
const macDownload = ref(
  `${releaseAssetBaseUrl(fallbackVersion)}/${macDmgFileName(fallbackVersion)}`,
);
const linuxDebDownload = ref(
  `${releaseAssetBaseUrl(fallbackVersion)}/${linuxDebFileName(fallbackVersion)}`,
);
const linuxAppImageDownload = ref(
  `${releaseAssetBaseUrl(fallbackVersion)}/${linuxAppImageFileName(fallbackVersion)}`,
);
const androidArm64Download = ref(
  `${releaseAssetBaseUrl(fallbackVersion)}/android-stream-desk-${apkVersionSlug(fallbackVersion)}-arm64.apk`,
);
const androidArmDownload = ref(
  `${releaseAssetBaseUrl(fallbackVersion)}/android-stream-desk-${apkVersionSlug(fallbackVersion)}-arm.apk`,
);
const androidVersion = ref(fallbackVersion);

const androidApkOptions = computed(() => {
  const versionSlug = apkVersionSlug(androidVersion.value);

  return [
    {
      id: 'arm64' as const,
      title: 'APK arm64',
      abi: 'arm64-v8a (64-bit)',
      fileName: `android-stream-desk-${versionSlug}-arm64.apk`,
      href: androidArm64Download.value,
      recommendation: 'Khuyến nghị cho hầu hết điện thoại và tablet Android đời 2015 trở lại đây.',
      support:
        'Dành cho máy Android 64-bit hiện đại, hiệu năng tốt hơn và là lựa chọn nên thử trước.',
      examples:
        'Samsung Galaxy S8/S10/S20/S21/S23/S24, A52/A54; Xiaomi Redmi Note 8/9/10/11/12, POCO; Google Pixel; OPPO/Realme/Vivo đời mới; OnePlus; Galaxy Tab S6/S7/S8/S9.',
      badge: 'Khuyến nghị',
      preferred: true,
    },
    {
      id: 'arm' as const,
      title: 'APK arm',
      abi: 'armeabi-v7a (32-bit)',
      fileName: `android-stream-desk-${versionSlug}-arm.apk`,
      href: androidArmDownload.value,
      recommendation:
        'Chỉ dùng khi máy quá cũ hoặc đã thử arm64 nhưng Android báo ứng dụng không tương thích.',
      support:
        'Dành cho thiết bị 32-bit, máy Android Go giá rẻ rất cũ hoặc tablet đời 2014 trở về trước.',
      examples:
        'Samsung Galaxy S4/S5, J1/J2/Grand Prime; máy Android Go cũ; tablet Android đời 2014 trở về trước.',
      badge: 'Fallback',
      preferred: false,
    },
  ];
});

onMounted(() => {
  fetch('https://api.github.com/repos/aniadev/android-stream-desk/releases')
    .then(res => res.json())
    .then(releases => {
      if (releases && Array.isArray(releases) && releases.length > 0) {
        // The first release in the list is the latest overall version
        const latestRelease = releases[0];
        if (latestRelease && latestRelease.tag_name) {
          currentVersion.value = latestRelease.tag_name;
        }

        // Find Windows asset
        let winUrl = '';
        for (const rel of releases) {
          const tag = rel.tag_name;
          const msi = windowsMsiFileName(tag);
          const setup = windowsSetupFileName(tag);
          const url = findReleaseAssetUrl(rel.assets, name => name === msi || name === setup);
          if (url) {
            winUrl = url;
            break;
          }
        }

        // Find macOS asset
        let macUrl = '';
        for (const rel of releases) {
          const tag = rel.tag_name;
          const dmg = macDmgFileName(tag);
          const url = findReleaseAssetUrl(rel.assets, name => name === dmg);
          if (url) {
            macUrl = url;
            break;
          }
        }

        // Find Linux Deb asset
        let debUrl = '';
        for (const rel of releases) {
          const tag = rel.tag_name;
          const deb = linuxDebFileName(tag);
          const url = findReleaseAssetUrl(rel.assets, name => name === deb);
          if (url) {
            debUrl = url;
            break;
          }
        }

        // Find Linux AppImage asset
        let appImageUrl = '';
        for (const rel of releases) {
          const tag = rel.tag_name;
          const appImage = linuxAppImageFileName(tag);
          const url = findReleaseAssetUrl(rel.assets, name => name === appImage);
          if (url) {
            appImageUrl = url;
            break;
          }
        }

        // Find Android APK assets
        let apkArm64Url = '';
        let apkArmUrl = '';
        let apkTag = '';
        for (const rel of releases) {
          const tag = rel.tag_name;
          const versionSlug = apkVersionSlug(tag);
          const arm64Name = `android-stream-desk-${versionSlug}-arm64.apk`;
          const armName = `android-stream-desk-${versionSlug}-arm.apk`;
          const u64 = findReleaseAssetUrl(rel.assets, name => name === arm64Name);
          const uArm = findReleaseAssetUrl(rel.assets, name => name === armName);
          if (u64 && uArm) {
            apkArm64Url = u64;
            apkArmUrl = uArm;
            apkTag = tag;
            break;
          }
        }

        // Update refs if found
        if (winUrl) windowsDownload.value = winUrl;
        if (macUrl) macDownload.value = macUrl;
        if (debUrl) linuxDebDownload.value = debUrl;
        if (appImageUrl) linuxAppImageDownload.value = appImageUrl;
        if (apkArm64Url && apkArmUrl) {
          androidArm64Download.value = apkArm64Url;
          androidArmDownload.value = apkArmUrl;
          androidVersion.value = apkTag;
        }
      }
    })
    .catch(err => console.warn(`Failed to fetch version, using fallback ${fallbackVersion}:`, err));
});
</script>

<template>
  <section id="downloads" ref="sectionRef" class="relative z-10 py-16 px-4 sm:py-20 sm:px-6 lg:py-24 border-t border-white/[0.06]">
    <div class="max-w-5xl mx-auto">
      <div data-reveal class="text-center max-w-2xl mx-auto mb-10 sm:mb-14 lg:mb-16 flex flex-col items-center">
        <span class="text-[11px] font-semibold tracking-wider uppercase mb-1 transition-colors duration-500" :style="{ color: accentColor }">
          sẵn sàng khởi tạo
        </span>
        <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Nhận phiên bản mới nhất
        </h2>
        <p class="text-xs sm:text-sm text-white/50 mt-1 font-normal">
          Bản cập nhật mới nhất: <span class="font-mono font-bold" :style="{ color: accentColor }">{{ currentVersion }}</span>. Hoàn toàn miễn phí.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div data-reveal class="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-5 sm:p-6 flex flex-col justify-between min-h-[230px] sm:min-h-[250px] transition-transform duration-300 hover:-translate-y-1">
          <div data-glow class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#00a4ef]/10 blur-3xl"></div>
          <div class="relative">
            <div class="mb-4 sm:mb-5 flex h-14 w-32 items-center justify-center rounded-xl border border-white/70 bg-[#f7f8fb] shadow-[0_16px_35px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Icon icon="logos:microsoft-windows-icon" class="h-8 w-16 object-contain" aria-hidden="true" />
            </div>
            <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-white/30 opacity-70">Desktop Server</span>
            <h3 class="text-lg font-semibold tracking-tight text-white mt-1">Windows Setup</h3>
            <p class="text-xs text-white/50 mt-2 leading-relaxed">
              Tương thích Windows 10/11 x64, khởi chạy nhẹ, hỗ trợ startup tự động.
            </p>
          </div>
          <a :href="windowsDownload" class="relative w-full h-10 rounded-lg font-medium text-xs text-white bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5 mt-6 sm:mt-7">
            <Download class="w-3.5 h-3.5" />
            Tải bộ cài .msi
          </a>
        </div>

        <div data-reveal class="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-5 sm:p-6 flex flex-col justify-between min-h-[230px] sm:min-h-[250px] transition-transform duration-300 hover:-translate-y-1">
          <div data-glow class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/[0.08] blur-3xl"></div>
          <div class="relative">
            <div class="mb-4 sm:mb-5 flex h-14 w-32 items-center justify-center rounded-xl border border-white/70 bg-[#f7f8fb] shadow-[0_16px_35px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Icon icon="logos:macos" class="h-8 w-16 object-contain" aria-hidden="true" />
            </div>
            <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-white/30 opacity-70">Desktop Server</span>
            <h3 class="text-lg font-semibold tracking-tight text-white mt-1">macOS Disk Image</h3>
            <p class="text-xs text-white/50 mt-2 leading-relaxed">
              Hỗ trợ cả máy chip Intel & Apple Silicon (M1/M2/M3/M4).
            </p>
          </div>
          <a :href="macDownload" class="relative w-full h-10 rounded-lg font-medium text-xs text-white bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5 mt-6 sm:mt-7">
            <Download class="w-3.5 h-3.5" />
            Tải tệp tin .dmg
          </a>
        </div>

        <div data-reveal class="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-5 sm:p-6 flex flex-col justify-between min-h-[230px] sm:min-h-[250px] transition-transform duration-300 hover:-translate-y-1">
          <div data-glow class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#e95420]/12 blur-3xl"></div>
          <div class="relative">
            <div class="mb-4 sm:mb-5 flex h-14 w-32 items-center justify-center rounded-xl border border-white/70 bg-[#f7f8fb] shadow-[0_16px_35px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Icon icon="logos:ubuntu" class="h-8 w-16 object-contain" aria-hidden="true" />
            </div>
            <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-white/30 opacity-70">Desktop Server</span>
            <h3 class="text-lg font-semibold tracking-tight text-white mt-1">Ubuntu Linux</h3>
            <p class="text-xs text-white/50 mt-2 leading-relaxed">
              Hỗ trợ Ubuntu x64 qua gói .deb hoặc AppImage portable, khuyến nghị phiên đăng nhập X11.
            </p>
          </div>
          <div class="relative mt-6 sm:mt-7 grid grid-cols-2 gap-2">
            <a :href="linuxDebDownload" class="h-10 rounded-lg font-medium text-xs text-white bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5">
              <Download class="w-3.5 h-3.5" />
              .deb
            </a>
            <button type="button" class="h-10 rounded-lg font-medium text-xs text-white bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.08] transition-colors flex items-center justify-center gap-1.5" @click="isUbuntuInstallModalOpen = true">
              <Code class="w-3.5 h-3.5" />
              Hướng dẫn
            </button>
          </div>
        </div>

        <div data-reveal class="group relative overflow-hidden rounded-2xl border bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-5 sm:p-6 flex flex-col justify-between min-h-[230px] sm:min-h-[250px] transition-transform duration-300 hover:-translate-y-1" :style="{ borderColor: `${accentColor}44` }">
          <div data-glow class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl" :style="{ backgroundColor: `${accentColor}1f` }"></div>
          <div class="relative">
            <div class="mb-4 sm:mb-5 flex h-14 w-32 items-center justify-center rounded-xl border border-white/70 bg-[#f7f8fb] shadow-[0_16px_35px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Icon icon="logos:android" class="h-8 w-16 object-contain" aria-hidden="true" />
            </div>
            <span class="text-[9px] font-mono font-bold uppercase tracking-wider transition-colors duration-500" :style="{ color: accentColor }">
              Mobile Client
            </span>
            <h3 class="text-lg font-semibold tracking-tight text-white mt-1">Android Client App</h3>
            <p class="text-xs text-white/50 mt-2 leading-relaxed">
              Cài đặt trực tiếp trên Tablet/Phone để làm giao diện phím tắt.
            </p>
          </div>
          <button type="button" class="relative w-full h-10 rounded-lg font-medium text-xs text-[#000212] transition-opacity duration-300 flex items-center justify-center gap-1.5 mt-6 sm:mt-7 hover:opacity-90" :style="{ backgroundColor: accentColor }" @click="isAndroidApkModalOpen = true">
            <Smartphone class="w-3.5 h-3.5" />
            Chọn APK Android
          </button>
        </div>
      </div>
    </div>
  </section>

  <AndroidApkModal
    v-if="isAndroidApkModalOpen"
    :options="androidApkOptions"
    :version="androidVersion"
    :accent-color="accentColor"
    @close="isAndroidApkModalOpen = false"
  />

  <UbuntuInstallModal
    v-if="isUbuntuInstallModalOpen"
    :deb-href="linuxDebDownload"
    :app-image-href="linuxAppImageDownload"
    :accent-color="accentColor"
    @close="isUbuntuInstallModalOpen = false"
  />
</template>
