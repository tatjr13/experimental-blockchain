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
        'cyber-dark': '#0a0e27',
        'cyber-darker': '#070a1a',
        'neon-blue': '#4158D0',
        'neon-purple': '#C850C0',
        'neon-green': '#00FF88',
        'neon-red': '#FF4444',
        'neon-gold': '#FFD700',
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(65, 88, 208, 0.6)',
        'neon-purple': '0 0 20px rgba(200, 80, 192, 0.6)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.6)',
        'neon-gold': '0 0 20px rgba(255, 215, 0, 0.6)',
        'glow': '0 0 30px currentColor',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(65, 88, 208, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(65, 88, 208, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
