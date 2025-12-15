/**
 * Tailwind CSS Configuration
 * 
 * @type {import('tailwindcss').Config}
 * 
 * Color Palette Usage Guide:
 * ─────────────────────────────────────────────────────────────────────
 * | Color     | Usage                                    | Text Color |
 * ─────────────────────────────────────────────────────────────────────
 * | primary   | Main actions, links, navigation          | white      |
 * | secondary | Less prominent actions, disabled states  | white      |
 * | success   | Confirmations, verified states           | white      |
 * | danger    | Errors, destructive actions, warnings    | white      |
 * | warning   | Cautions, pending states                 | gray-800   |
 * | info      | Informational messages, tips             | white      |
 * | purple    | Special features, premium indicators     | white      |
 * | orange    | Coach-only actions, admin functions      | white      |
 * ─────────────────────────────────────────────────────────────────────
 * 
 * Button Pattern (from style-guide.html):
 *   class="px-4 py-2 bg-{color} text-white rounded hover:bg-{color}-dark 
 *          min-w-[44px] min-h-[44px] font-semibold"
 * 
 * Note: warning uses text-gray-800 instead of text-white for contrast.
 * 
 * See: tests/components/style-guide.html for all button variants
 */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // ── Score Colors (archery target rings) ──────────────────────
        'score-gold': '#FFD700',   // X, 10, 9
        'score-red': '#DC143C',    // 8, 7
        'score-blue': '#4169E1',   // 6, 5
        'score-black': '#000000',  // 4, 3
        'score-white': '#FFFFFF',  // 2, 1, M
        'score-miss': '#e9ecef',   // Miss indicator

        // ── Brand Colors ─────────────────────────────────────────────
        // Primary: Main actions, links, navigation
        'primary': {
          DEFAULT: '#2d7dd9',
          dark: '#1b5bbf',
          light: '#e7f1ff',
        },
        // Secondary: Less prominent actions, disabled states
        'secondary': {
          DEFAULT: '#6c757d',
          dark: '#5a6268',
          light: '#e9ecef',
        },
        // Success: Confirmations, verified states
        'success': {
          DEFAULT: '#28a745',
          dark: '#1e7e34',
          light: '#d1e7dd',
        },
        // Danger: Errors, destructive actions
        'danger': {
          DEFAULT: '#d92d20',
          dark: '#b0241a',
          light: '#f8d7da',
        },
        // Warning: Cautions, pending states (use text-gray-800)
        'warning': {
          DEFAULT: '#ffc107',
          dark: '#d39e00',
          light: '#fff3cd',
        },
        // Info: Informational messages, tips
        'info': {
          DEFAULT: '#0dcaf0',
          dark: '#0a98b0',
          light: '#d0f7fa',
        },
        // Purple: Special features, premium indicators
        'purple': {
          DEFAULT: '#6f42c1',
          dark: '#563d7c',
          light: '#efebf5',
        },
        // Orange: Coach-only actions, admin functions
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

