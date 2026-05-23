export type ActionType = 'shortcut' | 'media' | 'app';

export interface ButtonConfig {
  id: string;
  label: string;
  emoji: string;
  backgroundColor: string;
  actionType: ActionType;
  // Cho 'shortcut': ví dụ "Ctrl+Shift+Tab" hoặc phím rời như "Play"
  shortcutValue?: string;
  // Cho 'media': play_pause, volume_up, volume_down, mute, next, prev
  mediaAction?: string;
  // Cho 'app': path tới file .exe ví dụ "C:\\Windows\\notepad.exe"
  appPath?: string;
}

export interface Layout {
  rows: number;
  cols: number;
  buttons: ButtonConfig[];
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WSMessage {
  type: 'auth' | 'ping' | 'pong' | 'press' | 'sync_layout' | 'toast';
  payload?: any;
}
