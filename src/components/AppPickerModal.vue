<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import type { InstalledApp } from '../types';
import { Icon } from '@iconify/vue';
import Fuse from 'fuse.js';
import HighlightedText from './HighlightedText.vue';

const RECENTS_KEY = 'app-picker:recents';
const CACHE_KEY = 'app-picker:apps';
const MAX_RECENTS = 5;

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'select', path: string): void;
}>();

const apps = ref<InstalledApp[]>([]);
const query = ref('');
const loading = ref(false);
const selectedIndex = ref(0);
const cacheUpdated = ref(false);
let cacheTimer: ReturnType<typeof setTimeout> | null = null;
const searchInput = ref<HTMLInputElement | null>(null);

const fuse = computed(() => new Fuse(apps.value, {
  keys: ['name', 'publisher'],
  threshold: 0.4,
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 1,
}));

interface FuseMatchItem {
  indices: readonly (readonly [number, number])[];
  key: string;
}

interface FuseResultItem {
  item: InstalledApp;
  matches: readonly FuseMatchItem[];
}

function getMatches(result: FuseResultItem, key: string): readonly (readonly [number, number])[] {
  return result.matches.find(m => m.key === key)?.indices ?? [];
}

const filteredApps = computed(() => {
  if (!query.value.trim()) return apps.value;
  const results = fuse.value.search(query.value) as unknown as FuseResultItem[];
  return results.map(r => r.item);
});

const fuseResults = computed(() => {
  if (!query.value.trim()) return null;
  return fuse.value.search(query.value) as unknown as FuseResultItem[];
});

function getAppMatches(app: InstalledApp, key: string): readonly (readonly [number, number])[] {
  if (!fuseResults.value) return [];
  const result = fuseResults.value.find(r => r.item.path === app.path);
  return result ? getMatches(result, key) : [];
}

const recentPaths = ref<string[]>([]);

const recents = computed(() => {
  const paths = recentPaths.value;
  if (paths.length === 0) return [];
  return paths
    .map(p => apps.value.find(a => a.path === p))
    .filter(Boolean) as InstalledApp[];
});

function saveRecents() {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recentPaths.value));
  } catch {}
}

function addRecent(path: string) {
  recentPaths.value = [path, ...recentPaths.value.filter(p => p !== path)].slice(0, MAX_RECENTS);
  saveRecents();
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

async function refreshApps() {
  clearCache();
  apps.value = [];
  await loadApps();
}

function compareApps(a: InstalledApp[], b: InstalledApp[]): boolean {
  if (a.length !== b.length) return false;
  const aPaths = a.map(x => x.path).sort().join(',');
  const bPaths = b.map(x => x.path).sort().join(',');
  return aPaths === bPaths;
}

function showUpdatedBadge() {
  cacheUpdated.value = true;
  if (cacheTimer !== null) clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => { cacheUpdated.value = false; cacheTimer = null; }, 2000);
}

async function loadApps() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const fresh = await invoke<InstalledApp[]>('list_installed_apps');
    const changed = !compareApps(apps.value, fresh);
    if (changed) {
      apps.value = fresh;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch {}
      if (apps.value.length > 0) {
        showUpdatedBadge();
      }
    }
  } catch (e) {
    console.error('list_installed_apps failed:', e);
  } finally {
    loading.value = false;
  }
}

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        recentPaths.value = parsed.filter((p: unknown) => typeof p === 'string').slice(0, MAX_RECENTS);
      }
    }
  } catch {}
}

function loadCacheAndBootstrap() {
  loadRecents();
  let hitCache = false;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        apps.value = parsed as InstalledApp[];
        hitCache = true;
      }
    }
  } catch {}

  if (hitCache) {
    loading.value = false;
    loadApps();
  } else {
    loading.value = true;
    loadApps();
  }
}

function selectApp(app: InstalledApp) {
  addRecent(app.path);
  emit('select', app.path);
  close();
}

function close() {
  emit('update:modelValue', false);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const max = Math.max(0, filteredApps.value.length - 1);
    selectedIndex.value = Math.min(selectedIndex.value + 1, max);
    scrollToSelected();
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    scrollToSelected();
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const app = filteredApps.value[selectedIndex.value];
    if (app) selectApp(app);
    return;
  }

  // Fast type-ahead: if typing, reset selectedIndex
  if (e.key.length === 1 || e.key === 'Backspace') {
    selectedIndex.value = 0;
  }
}

function scrollToSelected() {
  nextTick(() => {
    const el = document.querySelector('.app-row--active');
    if (el) el.scrollIntoView({ block: 'nearest' });
  });
}

watch(query, () => {
  selectedIndex.value = 0;
});

watch(() => props.modelValue, async (open) => {
  if (open) {
    query.value = '';
    selectedIndex.value = 0;
    loading.value = false;
    cacheUpdated.value = false;
    apps.value = [];
    loadCacheAndBootstrap();
    nextTick(() => {
      searchInput.value?.focus();
    });
  }
});

onUnmounted(() => {
  if (cacheTimer !== null) clearTimeout(cacheTimer);
});
</script>

<template>
  <transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      @keydown="onKeydown"
    >
      <div class="app-picker-modal w-[480px] max-w-full max-h-[85vh] flex flex-col p-5 gap-4 relative">
        <!-- Header -->
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 shadow-[0_0_16px_rgba(6,182,212,0.2)] flex items-center justify-center">
            <Icon icon="lucide:search" class="text-base text-white" />
          </div>
          <div class="flex-1">
            <h2 class="text-xs font-bold text-slate-50 uppercase tracking-wider">
              Browse Installed Apps
              <span
                v-if="cacheUpdated"
                class="ml-2 text-[9px] font-mono text-emerald-400 animate-pulse"
              >Updated</span>
              <span
                v-if="loading"
                class="ml-2 inline-block w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin align-middle"
              ></span>
            </h2>
            <p class="text-[8px] text-slate-500 mt-0.5">Select an application to set its path</p>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Refresh list"
            @click="refreshApps"
          >
            <Icon icon="lucide:refresh-cw" class="text-sm" />
          </button>
          <button
            type="button"
            class="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Close"
            @click="close"
          >
            <Icon icon="lucide:x" class="text-lg" />
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative">
          <Icon
            icon="lucide:search"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none"
          />
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            placeholder="Search apps..."
            spellcheck="false"
            class="w-full pl-9 pr-4 py-2.5 text-[11px] font-semibold bg-slate-900/80 border border-cyan-400/10 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-all"
          />
        </div>

        <!-- Loading spinner -->
        <div
          v-if="loading && apps.length === 0"
          class="flex flex-col items-center justify-center py-12 gap-3"
        >
          <div class="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scanning installed apps...</span>
        </div>

        <!-- App list -->
        <div
          v-else-if="apps.length > 0"
          class="flex-1 overflow-y-auto -mx-1 px-1 space-y-3"
        >
          <!-- Recents -->
          <div v-if="recents.length > 0 && !query.trim()" class="flex flex-col gap-1">
            <span class="text-[8px] font-bold uppercase tracking-widest text-slate-500 px-2">Recent</span>
            <div class="flex flex-col gap-0.5">
              <button
                v-for="(app, idx) in recents"
                :key="'recent-' + app.path"
                type="button"
                class="app-row flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-left transition-all"
                :class="selectedIndex === idx && !query.trim() ? 'app-row--active' : ''"
                @click="selectApp(app)"
              >
                <Icon icon="lucide:app-window" class="text-sm text-cyan-400 shrink-0" />
                <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span class="text-[11px] font-semibold text-slate-200 truncate">{{ app.name }}</span>
                  <span v-if="app.publisher" class="text-[8px] text-slate-500 truncate">{{ app.publisher }}</span>
                </div>
              </button>
            </div>
            <div class="mx-2 border-t border-cyan-400/6"></div>
          </div>

          <!-- All apps -->
          <div class="flex flex-col gap-0.5">
            <span
              v-if="!query.trim()"
              class="text-[8px] font-bold uppercase tracking-widest text-slate-500 px-2"
            >All apps ({{ apps.length }})</span>
            <button
              v-for="(app, idx) in filteredApps"
              :key="app.path"
              type="button"
              class="app-row flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-left transition-all"
              :class="selectedIndex === idx ? 'app-row--active' : ''"
              @click="selectApp(app)"
            >
              <Icon icon="lucide:app-window" class="text-sm text-cyan-400 shrink-0" />
              <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                <span v-if="fuseResults" class="text-[11px] font-semibold text-slate-200 truncate">
                  <HighlightedText :text="app.name" :indices="getAppMatches(app, 'name')" />
                </span>
                <span v-else class="text-[11px] font-semibold text-slate-200 truncate">{{ app.name }}</span>
                <span
                  v-if="app.publisher"
                  class="text-[8px] text-slate-500 truncate"
                >
                  <template v-if="fuseResults">
                    <HighlightedText :text="app.publisher" :indices="getAppMatches(app, 'publisher')" />
                  </template>
                  <template v-else>{{ app.publisher }}</template>
                </span>
              </div>
            </button>
            <p
              v-if="filteredApps.length === 0"
              class="col-span-1 text-[9px] text-slate-500 font-bold text-center py-8 uppercase"
            >
              No apps found
            </p>
          </div>
        </div>

        <!-- Empty state (no apps on platform, after load) -->
        <div
          v-else-if="!loading"
          class="flex flex-col items-center justify-center py-10 gap-2"
        >
          <Icon icon="lucide:monitor-off" class="text-xl text-slate-600" />
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App browsing not available on this platform</span>
          <span class="text-[8px] text-slate-600">Windows registry scan only</span>
        </div>

        <!-- Keyboard hint -->
        <div class="flex items-center gap-4 text-[8px] text-slate-600 font-bold uppercase tracking-wider px-1">
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 text-[7px] bg-slate-800 rounded border border-slate-700">↑↓</kbd> Navigate
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 text-[7px] bg-slate-800 rounded border border-slate-700">Enter</kbd> Select
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 text-[7px] bg-slate-800 rounded border border-slate-700">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.app-picker-modal {
  background: rgba(4, 10, 24, 0.95);
  border: 1px solid rgba(0, 240, 255, 0.12);
  box-shadow:
    0 0 0 1px rgba(0, 240, 255, 0.03),
    0 16px 48px -16px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.015);
  border-radius: 16px;
  backdrop-filter: blur(16px);
}

.app-row {
  background: transparent;
  border: 1px solid transparent;
}

.app-row:hover {
  background: rgba(0, 240, 255, 0.04);
  border-color: rgba(0, 240, 255, 0.06);
}

.app-row--active,
.app-row--active:hover {
  background: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.14);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.04);
}
</style>
