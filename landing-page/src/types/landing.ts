export type ThemeName = 'cyber' | 'midnight' | 'ember';

export interface ThemeConfig {
  name: string;
  color: string;
  ring: string;
}

export type ThemeMap = Record<ThemeName, ThemeConfig>;
