/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f172a', // Slate-900 (Đồng bộ Cyberpunk theme gốc)
          card: 'rgba(2, 6, 14, 0.92)', // Đồng bộ --theme-btn-bg
          accent: '#00d4ff', // Neon Cyan gốc --theme-accent
          purple: '#c084fc', // Light purple
        }
      }
    },
  },
  plugins: [],
}
