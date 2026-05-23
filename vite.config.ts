import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || true, // Listen on all local IPs or dynamic Tauri dev host internally
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : {
          protocol: 'ws',
          port: 1421,
        },
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`, layout JSONs and markdown files
      // saves from layout writes triggering dynamic loop reload
      ignored: ['**/src-tauri/**', '**/*.json', '**/*.md'],
    },
  },
});
