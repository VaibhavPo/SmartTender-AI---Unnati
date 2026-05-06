/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Stitch Design — Navy brand
        brand: {
          50:  '#EEF2FF',
          100: '#D6DFFF',
          200: '#B6C4FF',
          300: '#7B94FF',
          400: '#2E66FF',
          500: '#00205B',
          600: '#001849',
          700: '#001036',
          800: '#0A0F24',
          900: '#060912',
        },
        // Semantic colors
        accent: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        // Surface colors — light mode
        surface: {
          50:  '#FFFFFF',
          100: '#FBF9F8',
          200: '#F6F3F2',
          300: '#ECEAE9',
          400: '#D1CFCE',
          500: '#757681',
          600: '#4A4B57',
          700: '#2D2E3A',
          800: '#1B1C1C',
          900: '#0D1322',
        },
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ["'DM Sans'", 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "'Liberation Mono'", "'Courier New'", 'monospace'],
      },
      borderRadius: {
        'sm': '2px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
