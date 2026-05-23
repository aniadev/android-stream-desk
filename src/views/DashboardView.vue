<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useLayoutStore } from '../stores/layout';
import type { ButtonConfig, ActionType } from '../types';

const layoutStore = useLayoutStore();
const selectedButtonId = ref<string | null>(null);

const activeTab = ref<'shortcut' | 'media' | 'app'>('shortcut');

const serverIp = ref<string>('—');
const serverPort = ref<number>(8089);
const copyHint = ref<string>('');

const isRecording = ref(false);
const shortcutPresets = [
  { label: 'Copy (Ctrl+C)', value: 'Ctrl+C' },
  { label: 'Paste (Ctrl+V)', value: 'Ctrl+V' },
  { label: 'Undo (Ctrl+Z)', value: 'Ctrl+Z' },
  { label: 'Save (Ctrl+S)', value: 'Ctrl+S' },
  { label: 'Close App (Alt+F4)', value: 'Alt+F4' },
  { label: 'Switch Tab (Ctrl+Tab)', value: 'Ctrl+Tab' },
  { label: 'Task Manager (Ctrl+Shift+Escape)', value: 'Ctrl+Shift+Escape' },
  { label: 'Show Desktop (Win+D)', value: 'Win+D' }
];

const applyPreset = (value: string) => {
  if (selectedButton.value) {
    selectedButton.value.shortcutValue = value;
    saveButtonSettings();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isRecording.value || !selectedButton.value) return;
  e.preventDefault();
  e.stopPropagation();

  const modifiers: string[] = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.shiftKey) modifiers.push('Shift');
  if (e.altKey) modifiers.push('Alt');
  if (e.metaKey) modifiers.push('Win');

  let keyName = e.key;

  if (['Control', 'Shift', 'Alt', 'Meta'].includes(keyName)) {
    return;
  }

  if (keyName === ' ') keyName = 'Space';
  else if (keyName === 'Escape') keyName = 'Esc';
  else if (keyName.length === 1) {
    keyName = keyName.toUpperCase();
  }

  const shortcutString = [...modifiers, keyName].join('+');
  selectedButton.value.shortcutValue = shortcutString;
  
  isRecording.value = false;
  window.removeEventListener('keydown', handleKeyDown, true);
  saveButtonSettings();
};

const toggleRecording = () => {
  if (isRecording.value) {
    isRecording.value = false;
    window.removeEventListener('keydown', handleKeyDown, true);
  } else {
    isRecording.value = true;
    window.addEventListener('keydown', handleKeyDown, true);
  }
};

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown, true);
});

onMounted(async () => {
  try {
    // @ts-ignore
    if (window.__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      const info = await invoke<{ ip: string; port: number }>('get_server_info');
      serverIp.value = info.ip;
      serverPort.value = info.port;
    }
  } catch (e) {
    console.error('Failed to fetch server info:', e);
  }
});

const copyAddress = async () => {
  if (serverIp.value === '—') return;
  const addr = `${serverIp.value}:${serverPort.value}`;
  try {
    await navigator.clipboard.writeText(addr);
    copyHint.value = 'Đã sao chép!';
    setTimeout(() => (copyHint.value = ''), 1500);
  } catch (_) {
    copyHint.value = 'Sao chép thất bại';
  }
};

// Button selected helper
const selectedButton = computed(() => {
  return layoutStore.layout.buttons.find(btn => btn.id === selectedButtonId.value) || null;
});

// Update fields dynamically when selection updates
watch(selectedButton, (newVal) => {
  if (newVal) {
    activeTab.value = newVal.actionType;
  }
});

// Select a button grid to edit
const selectButton = (id: string) => {
  selectedButtonId.value = id;
};

// Row/Column update resizing handlers
const updateGridDimensions = (type: 'rows' | 'cols', delta: number) => {
  let newRows = layoutStore.layout.rows;
  let newCols = layoutStore.layout.cols;

  if (type === 'rows') newRows = Math.max(2, Math.min(6, newRows + delta));
  if (type === 'cols') newCols = Math.max(2, Math.min(8, newCols + delta));

  const totalButtonsNeeded = newRows * newCols;
  const currentButtons = [...layoutStore.layout.buttons];
  let newButtons: ButtonConfig[] = [];

  for (let i = 0; i < totalButtonsNeeded; i++) {
    if (currentButtons[i]) {
      newButtons.push(currentButtons[i]);
    } else {
      newButtons.push({
        id: `btn_${Date.now()}_${i}`,
        label: `Button ${i + 1}`,
        emoji: '🕹️',
        backgroundColor: '#1e293b',
        actionType: 'shortcut',
        shortcutValue: 'Ctrl+F1',
      });
    }
  }

  layoutStore.updateLayout({
    rows: newRows,
    cols: newCols,
    buttons: newButtons
  });
  
  if (selectedButtonId.value && !newButtons.some(b => b.id === selectedButtonId.value)) {
    selectedButtonId.value = null;
  }

  layoutStore.broadcastSync();
};

let saveTimer: number | null = null;
const saveButtonSettings = () => {
  if (selectedButton.value) {
    selectedButton.value.actionType = activeTab.value;
  }
  layoutStore.updateLayout({ ...layoutStore.layout });
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    layoutStore.broadcastSync();
  }, 250);
};
</script>

<template>
  <div class="h-screen w-screen bg-brand-dark text-slate-100 flex flex-col p-6 overflow-hidden gap-4">
    <!-- Server Address HUD (FR-1 / AC-6) -->
    <div class="flex items-center justify-between gap-4 bg-brand-card border border-brand-border rounded-xl px-5 py-3">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🛰️</span>
        <div class="flex flex-col">
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400">Địa chỉ Server LAN</span>
          <span class="font-mono text-base font-semibold text-slate-100">
            {{ serverIp }}<span class="text-slate-500">:</span>{{ serverPort }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="copyHint" class="text-xs text-emerald-400">{{ copyHint }}</span>
        <button
          @click="copyAddress"
          class="text-xs font-bold px-3 py-1.5 rounded-md bg-brand-accent hover:bg-brand-accentHover text-white cursor-pointer disabled:opacity-50"
          :disabled="serverIp === '—'"
        >
          Sao chép
        </button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden gap-6">
    <!-- Left Configuration Panel -->
    <div class="w-80 flex flex-col bg-brand-card border border-brand-border rounded-xl p-4 gap-4 overflow-y-auto">
      <div class="border-b border-brand-border/60 pb-3">
        <h2 class="font-bold text-lg">Bố cục Grid</h2>
        <p class="text-xs text-slate-400 mt-1">Thay đổi số cột và hàng của bàn macro</p>
      </div>

      <!-- Resizer tools -->
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold text-slate-400">Rows (Hàng)</label>
          <div class="flex items-center justify-between border border-brand-border rounded-lg p-1 bg-brand-dark">
            <button @click="updateGridDimensions('rows', -1)" class="px-2 py-0.5 hover:bg-slate-700 rounded cursor-pointer">-</button>
            <span class="font-bold text-sm">{{ layoutStore.layout.rows }}</span>
            <button @click="updateGridDimensions('rows', 1)" class="px-2 py-0.5 hover:bg-slate-700 rounded cursor-pointer">+</button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-xs font-bold text-slate-400">Columns (Cột)</label>
          <div class="flex items-center justify-between border border-brand-border rounded-lg p-1 bg-brand-dark">
            <button @click="updateGridDimensions('cols', -1)" class="px-2 py-0.5 hover:bg-slate-700 rounded cursor-pointer">-</button>
            <span class="font-bold text-sm">{{ layoutStore.layout.cols }}</span>
            <button @click="updateGridDimensions('cols', 1)" class="px-2 py-0.5 hover:bg-slate-700 rounded cursor-pointer">+</button>
          </div>
        </div>
      </div>

      <!-- Button editor panel -->
      <div class="flex-1 flex flex-col border-t border-brand-border/60 pt-3 gap-3">
        <h3 class="font-bold text-sm text-slate-200">Biên tập Phím bấm</h3>
        
        <div v-if="selectedButton" class="flex flex-col gap-3">
          <!-- Text Label -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] uppercase font-bold text-slate-400">Nhãn nút</label>
            <input 
              v-model="selectedButton.label" 
              type="text" 
              class="w-full text-sm bg-brand-dark border border-brand-border rounded px-2.5 py-1.5 focus:outline-none focus:border-brand-accent text-slate-100"
              @input="saveButtonSettings"
            />
          </div>

          <!-- Color Customizer -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] uppercase font-bold text-slate-400">Thiết kế nút</label>
            <div class="flex gap-2">
              <input 
                v-model="selectedButton.emoji" 
                type="text" 
                placeholder="Emoji..."
                class="w-16 text-sm text-center bg-brand-dark border border-brand-border rounded px-2 py-1.5 focus:outline-none"
                @input="saveButtonSettings"
              />
              <input 
                v-model="selectedButton.backgroundColor" 
                type="color" 
                class="h-9 w-full bg-brand-dark border border-brand-border rounded px-1 cursor-pointer"
                @input="saveButtonSettings"
              />
            </div>
          </div>

          <!-- Action tabs -->
          <div class="flex flex-col gap-1.5 mt-2">
            <label class="text-[10px] uppercase font-bold text-slate-400">Loại hành động</label>
            <div class="flex border border-brand-border bg-brand-dark rounded p-0.5 relative text-xs">
              <button 
                v-for="tab in (['shortcut', 'media', 'app'] as ActionType[])" 
                :key="tab"
                @click="activeTab = tab; saveButtonSettings()"
                class="flex-1 text-center py-1 rounded cursor-pointer"
                :class="activeTab === tab ? 'bg-brand-accent font-bold text-white' : 'hover:bg-slate-700'"
              >
                {{ tab }}
              </button>
            </div>
          </div>

          <!-- Variable fields depending on tab -->
          <div class="bg-brand-dark/50 border border-brand-border/40 rounded p-2.5 mt-1 text-xs">
            <!-- Shortcut Panel -->
            <div v-if="activeTab === 'shortcut'" class="flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <span class="text-slate-400 font-medium">Tổ hợp phím tắt giả lập:</span>
                <div class="relative flex items-center">
                  <input 
                    v-model="selectedButton.shortcutValue" 
                    type="text" 
                    placeholder="Chọn mẫu hoặc gõ..."
                    class="w-full text-xs bg-brand-dark border border-brand-border rounded-l px-2.5 py-2.5 focus:outline-none text-slate-200"
                    @input="saveButtonSettings"
                    disabled
                  />
                  <button 
                    @click="toggleRecording"
                    class="px-3 py-2.5 text-xs font-bold rounded-r border border-l-0 border-brand-border cursor-pointer transition-colors duration-150"
                    :class="isRecording ? 'bg-amber-600 border-amber-600 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-100'"
                  >
                    {{ isRecording ? 'Đang Thu...' : 'Thu phím' }}
                  </button>
                </div>
                <p class="text-[10px] text-amber-500 font-medium select-none" v-if="isRecording">
                  Nhấn tổ hợp phím trên bàn phím của bạn để tự động lưu...
                </p>
              </div>

              <!-- Presets quick picker -->
              <div class="flex flex-col gap-1.5 pt-1 border-t border-brand-border/40">
                <span class="text-slate-400 font-medium text-[10px] uppercase tracking-wide">Mẫu phím tắt phổ biến:</span>
                <div class="grid grid-cols-2 gap-1.5">
                  <button 
                    v-for="preset in shortcutPresets" 
                    :key="preset.value"
                    @click="applyPreset(preset.value)"
                    class="text-[10px] text-left px-2 py-1.5 rounded bg-brand-dark hover:bg-slate-750 border border-brand-border/40 hover:border-brand-border transition-colors truncate cursor-pointer text-slate-300 hover:text-slate-100"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Media Panel -->
            <div v-else-if="activeTab === 'media'" class="flex flex-col gap-2">
              <span class="text-slate-400 font-medium">Chọn lệnh Audio/Media:</span>
              <select 
                v-model="selectedButton.mediaAction"
                class="w-full text-xs bg-brand-dark border border-brand-border rounded px-2 py-1 focus:outline-none text-slate-200"
                @change="saveButtonSettings"
              >
                <option value="play_pause">Play/Pause</option>
                <option value="volume_up">Volume Increase</option>
                <option value="volume_down">Volume Decrease</option>
                <option value="mute">Mute/Unmute</option>
                <option value="next">Next</option>
                <option value="prev">Previous</option>
              </select>
            </div>

            <!-- App Launcher Path -->
            <div v-else-if="activeTab === 'app'" class="flex flex-col gap-2">
              <span class="text-slate-400 font-medium">Đường dẫn tệp .exe:</span>
              <input 
                v-model="selectedButton.appPath" 
                type="text" 
                placeholder="e.g. C:\Windows\System32\cmd.exe"
                class="w-full text-xs bg-brand-dark border border-brand-border rounded px-2 py-1 focus:outline-none focus:border-brand-accent text-slate-200"
                @input="saveButtonSettings"
              />
            </div>
          </div>

        </div>
        <div v-else class="flex flex-col items-center justify-center p-6 text-center select-none flex-1 border border-dashed border-brand-border/40 rounded-xl my-4">
          <span class="text-3xl mb-1">👈</span>
          <span class="text-xs text-slate-400 font-medium leading-relaxed">
            Chọn bất kỳ ô nút nào bên lưới để bắt đầu biên tập hành động.
          </span>
        </div>
      </div>
    </div>

    <!-- Active Right Side Live Editor Grid preview -->
    <div class="flex-1 bg-brand-card border border-brand-border rounded-xl flex flex-col p-4 shadow-inner relative justify-center">
      <span class="absolute top-4 left-4 text-xs font-semibold uppercase tracking-widest text-slate-400 select-none">
        Mô hình lưới trực tiếp (Nhấn để biên tập)
      </span>
      
      <div class="w-full flex-1 flex items-center justify-center mt-6">
        <div 
          class="grid gap-3 w-full h-full max-w-4xl max-h-[75vh]"
          :style="{
            gridTemplateColumns: `repeat(${layoutStore.layout.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layoutStore.layout.rows}, minmax(0, 1fr))`,
          }"
        >
          <button 
            v-for="btn in layoutStore.layout.buttons" 
            :key="btn.id"
            @click="selectButton(btn.id)"
            class="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 border border-white/5 active:scale-95 transition-all text-xs outline-none select-none brightness-95"
            :class="selectedButtonId === btn.id ? 'outline-2 outline-brand-accent border-brand-accent scale-102 shadow-lg brightness-110' : 'hover:brightness-105 active:brightness-90'"
            :style="{ backgroundColor: btn.backgroundColor || '#1e293b' }"
          >
            <span class="text-3xl">{{ btn.emoji || '👾' }}</span>
            <span class="font-bold truncate text-[11px] max-w-full px-1 text-slate-100">{{ btn.label }}</span>
            <span class="text-[8px] opacity-35 uppercase tracking-wide">{{ btn.actionType }}</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
