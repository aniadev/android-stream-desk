import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  let initialKeepScreenOn = false;
  try {
    initialKeepScreenOn = JSON.parse(localStorage.getItem('settings:keepScreenOn') ?? 'false');
  } catch (_) {}

  let initialVibrate = true;
  try {
    initialVibrate = JSON.parse(localStorage.getItem('settings:vibrateOnClick') ?? 'true');
  } catch (_) {}

  let initialSound = true;
  try {
    initialSound = JSON.parse(localStorage.getItem('settings:soundOnClick') ?? 'true');
  } catch (_) {}

  const keepScreenOn = ref<boolean>(initialKeepScreenOn);
  const vibrateOnClick = ref<boolean>(initialVibrate);
  const soundOnClick = ref<boolean>(initialSound);

  watch(keepScreenOn, val => {
    localStorage.setItem('settings:keepScreenOn', JSON.stringify(val));
  });

  watch(vibrateOnClick, val => {
    localStorage.setItem('settings:vibrateOnClick', JSON.stringify(val));
  });

  watch(soundOnClick, val => {
    localStorage.setItem('settings:soundOnClick', JSON.stringify(val));
  });

  return { keepScreenOn, vibrateOnClick, soundOnClick };
});
