/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        night: {
          800: '#1a1a2e',
          900: '#16213e',
          950: '#0f1419',
        },
        mystic: {
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',
          900: '#4c1d95',
        },
        'accent-pink': '#ec4899',
        'accent-cyan': '#06b6d4',
      },
    },
  },
  plugins: [],
}
