import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  let initial = false;
  try {
    initial = JSON.parse(localStorage.getItem('settings:keepScreenOn') ?? 'false');
  } catch (_) {}

  const keepScreenOn = ref<boolean>(initial);

  watch(keepScreenOn, val => {
    localStorage.setItem('settings:keepScreenOn', JSON.stringify(val));
  });

  return { keepScreenOn };
});
