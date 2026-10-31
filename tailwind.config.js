/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#245CE2',
          light: '#4A7DF0',
          dark: '#1A45B0',
          subtle: '#EEF3FF',
        },
        secondary: {
          DEFAULT: '#64748B',
          light: '#94A3B8',
          dark: '#475569',
        },
        background: '#F6F8FC',
        card: '#FFFFFF',
        textColor: {
          DEFAULT: '#172033',
          muted: '#64748B',
          light: '#94A3B8',
        },
        success: {
          DEFAULT: '#16A36A',
          light: '#E7F7EF',
          dark: '#118053',
        },
        warning: {
          DEFAULT: '#E5A23B',
          light: '#FEF8EC',
          dark: '#B77F2C',
        },
        danger: {
          DEFAULT: '#E05D5D',
          light: '#FDECEC',
          dark: '#B84545',
        },
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        card: '0 4px 12px 0 rgba(23, 32, 51, 0.05)',
        elevated: '0 10px 25px -5px rgba(36, 92, 226, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        dropdown: '0 12px 30px -4px rgba(23, 32, 51, 0.12)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      }
    },
  },
  plugins: [],
}
