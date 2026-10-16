/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light, fintech-style foundation with a restrained teal security accent.
        obsidian: '#F5F7FB',
        surface: '#FFFFFF',
        elevated: '#F8FAFC',
        border: {
          DEFAULT: '#E2E8F0',
          light: '#CBD5E1',
        },
        ink: {
          primary: '#142033',
          muted: '#526176',
          dim: '#748198',
        },
        npcigreen: '#087F6E',
        amber: {
          warn: '#B45309',
        },
        crimson: {
          fraud: '#C6283D',
        },
        brand: {
          blue: '#1769E0',
          pale: '#EAF2FF',
          navy: '#102747',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '0.875rem',
        '3xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.045)',
        floating: '0 16px 42px rgba(15, 23, 42, 0.12)',
      },
      animation: {
        scanline: 'scanline 2s ease-in-out infinite',
        'pulse-fast': 'pulse 0.6s cubic-bezier(0.4,0,0.6,1) infinite',
        'flash-crimson': 'flashCrimson 0.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'grow-x': 'growX 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        ticker: 'ticker 30s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%,100%': { top: '10%' },
          '50%': { top: '85%' },
        },
        flashCrimson: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        growX: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        ticker: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
