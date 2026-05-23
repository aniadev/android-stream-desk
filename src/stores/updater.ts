import { defineStore } from "pinia";
import { ref, shallowRef, computed } from "vue";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process"; // Tauri v2 standard
import { getVersion } from "@tauri-apps/api/app";

export type UpdaterState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error"
  | "no-update";

export const useUpdaterStore = defineStore("updater", () => {
  const state = ref<UpdaterState>("idle");
  const update = shallowRef<Update | null>(null);
  const downloadedBytes = ref(0);
  const totalBytes = ref(0);
  const errorMsg = ref<string | null>(null);
  const modalOpen = ref(false);
  const toastMessage = ref<string | null>(null);
  let toastTimer: number | null = null;

  const progressPct = computed(() => {
    if (totalBytes.value <= 0) return 0;
    return Math.min(100, Math.round((downloadedBytes.value / totalBytes.value) * 100));
  });

  function showToast(msg: string, ms = 2200) {
    toastMessage.value = msg;
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastMessage.value = null;
      toastTimer = null;
    }, ms);
  }

  async function checkForUpdates(opts: { silent: boolean } = { silent: false }) {
    if (state.value === "checking" || state.value === "downloading") return;
    state.value = "checking";
    errorMsg.value = null;
    try {
      // 1. Try Tauri v2 standard updater check
      const upd = await check();
      if (upd) {
        update.value = upd;
        state.value = "available";
        modalOpen.value = true;
        return;
      } else {
        state.value = "no-update";
        if (!opts.silent) showToast("Ứng dụng đã ở phiên bản mới nhất!");
        return;
      }
    } catch (tauriError) {
      console.warn("Tauri updater failed, checking GitHub releases...", tauriError);
      
      // 2. Manual fallback check via GitHub API
      try {
        const res = await fetch("https://api.github.com/repos/aniadev/android-stream-desk/releases/latest");
        if (!res.ok) throw tauriError;
        
        const data = await res.json();
        const latestTag = data.tag_name;
        if (!latestTag) throw tauriError;
        
        const latestVersion = latestTag.replace(/^v/, "");
        const currentVersion = await getVersion();
        
        if (latestVersion === currentVersion) {
          state.value = "no-update";
          if (!opts.silent) showToast("Ứng dụng đã ở phiên bản mới nhất!");
          return;
        } else {
          update.value = {
            version: latestVersion,
            currentVersion: currentVersion,
            body: data.body || "",
            isManual: true,
          } as any;
          state.value = "available";
          modalOpen.value = true;
          return;
        }
      } catch (e) {
        errorMsg.value = "Không thể kiểm tra bản cập nhật. Vui lòng kiểm tra lại mạng.";
        state.value = "error";
      }
    }
  }

  async function startInstall() {
    if (!update.value) return;
    state.value = "downloading";
    downloadedBytes.value = 0;
    totalBytes.value = 0;
    try {
      await update.value.downloadAndInstall((event: any) => {
        if (event.event === "Started") {
          totalBytes.value = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloadedBytes.value += event.data.chunkLength;
        } else if (event.event === "Finished") {
          state.value = "ready";
        }
      });
      await relaunch();
    } catch (e) {
      console.error("Install update failed:", e);
      errorMsg.value = String(e);
      state.value = "error";
    }
  }

  return {
    state,
    update,
    downloadedBytes,
    totalBytes,
    progressPct,
    errorMsg,
    modalOpen,
    toastMessage,
    checkForUpdates,
    startInstall,
  };
});
