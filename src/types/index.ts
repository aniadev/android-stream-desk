export type ActionType = 'shortcut' | 'media' | 'app' | 'command';

export interface ButtonConfig {
  id: string;
  label: string;
  icon: string; // Thay thế emoji bằng icon (e.g., "mdi:play", "lucide:settings")
  emoji?: string; // Tương thích ngược cấu hình cũ
  backgroundColor: string;
  actionType: ActionType;
  // Cho 'shortcut': ví dụ "Ctrl+Shift+Tab" hoặc phím rời như "Play"
  shortcutValue?: string;
  // Cho 'media': play_pause, volume_up, volume_down, mute, next, prev
  mediaAction?: string;
  // Cho 'app': path tới file .exe ví dụ "C:\\Windows\\notepad.exe"
  appPath?: string;
  // Cho 'command': chuỗi shell thô (sh -c hoặc cmd /C), chạy với quyền user
  commandValue?: string;
}

export interface Layout {
  rows: number;
  cols: number;
  buttons: ButtonConfig[];
  theme?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface InstalledApp {
  name: string;
  path: string;
  icon?: string;
  publisher?: string;
}

export interface WSMessage {
  type: 'auth' | 'ping' | 'pong' | 'press' | 'sync_layout' | 'toast';
  payload?: any;
}
