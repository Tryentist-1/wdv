/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Score Colors (from your existing system)
        'score-gold': '#FFD700',
        'score-red': '#DC143C',
        'score-blue': '#4169E1',
        'score-black': '#000000',
        'score-white': '#FFFFFF',
        'score-miss': '#e9ecef',

        // Brand Colors (from your tokens)
        'primary': {
          DEFAULT: '#2d7dd9',
          dark: '#1b5bbf',
          light: '#e7f1ff',
        },
        'secondary': {
          DEFAULT: '#6c757d',
          dark: '#5a6268',
          light: '#e9ecef',
        },
        'success': {
          DEFAULT: '#28a745',
          dark: '#1e7e34',
          light: '#d1e7dd',
        },
        'danger': {
          DEFAULT: '#d92d20',
          dark: '#b0241a',
          light: '#f8d7da',
        },
        'warning': {
          DEFAULT: '#ffc107',
          dark: '#d39e00',
          light: '#fff3cd',
        },
        'info': {
          DEFAULT: '#0dcaf0',
          dark: '#0a98b0',
          light: '#d0f7fa',
        },
        'purple': {
          DEFAULT: '#6f42c1',
          dark: '#563d7c',
          light: '#efebf5',
        },
        'orange': {
          DEFAULT: '#f28c18',
          dark: '#e8690b',
          light: '#fff4e8',
        },
      },
      spacing: {
        '128': '32rem',
      },
      minHeight: {
        'touch': '44px', // iOS/Android minimum touch target
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}

