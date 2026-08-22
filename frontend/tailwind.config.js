/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#090d16',
          900: '#0f172a',
          850: '#151e32',
          800: '#1e293b',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-green': 'glowGreen 2s infinite alternate',
        'glow-red': 'glowRed 1.5s infinite alternate',
      },
      keyframes: {
        glowGreen: {
          '0%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)' },
        },
        glowRed: {
          '0%': { boxShadow: '0 0 5px rgba(244, 63, 94, 0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(244, 63, 94, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
