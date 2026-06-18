export type ThemeName = 'cyber' | 'midnight' | 'ember' | 'genshin-01';

export interface ThemeConfig {
  name: string;
  color: string;
  ring: string;
}

export type ThemeMap = Record<ThemeName, ThemeConfig>;
