import { ref } from 'vue';

export type ThemeName = 'cyber' | 'midnight' | 'ember';

export const THEMES: Record<ThemeName, { label: string; accentH: number; previewColor: string }> = {
  cyber:    { label: 'Cyber',    accentH: 187, previewColor: '#00d4ff' },
  midnight: { label: 'Midnight', accentH: 271, previewColor: '#a855f7' },
  ember:    { label: 'Ember',    accentH: 28,  previewColor: '#f97316' },
};

export function isValidTheme(name: string | null | undefined): name is ThemeName {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(THEMES, name);
}

// Initialize from localStorage so GridButton computed uses correct hue before onMounted
const _savedTheme = (() => {
  try { return localStorage.getItem('theme'); } catch (_) { return null; }
})();
export const currentAccentH = ref<number>(
  isValidTheme(_savedTheme) ? THEMES[_savedTheme].accentH : 187,
);

export function applyTheme(name: ThemeName): void {
  document.documentElement.setAttribute('data-theme', name);
  try { localStorage.setItem('theme', name); } catch (_) {}
  currentAccentH.value = THEMES[name].accentH;
}
