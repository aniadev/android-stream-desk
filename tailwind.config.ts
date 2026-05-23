import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',    // slate-900
          card: '#1e293b',    // slate-800
          border: '#334155',  // slate-700
          accent: '#3b82f6',  // blue-500
          accentHover: '#2563eb' // blue-600
        }
      }
    },
  },
  plugins: [],
} satisfies Config