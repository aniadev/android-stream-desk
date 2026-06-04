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
          bg: '#030712', // Deep Dark (slate-950)
          card: 'rgba(10, 11, 20, 0.7)', // Sleek card background
          border: 'rgba(255, 255, 255, 0.08)', // Fine border
          accent: {
            cyber: '#00d4ff', // Cyber Cyan
            midnight: '#a855f7', // Midnight Purple
            ember: '#f97316', // Ember Orange
          },
          text: {
            primary: '#f3f4f6', // Slate-100
            secondary: '#9ca3af', // Slate-400
            muted: '#6b7280', // Slate-500
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
