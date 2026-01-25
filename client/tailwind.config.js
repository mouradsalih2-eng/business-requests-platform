/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Modern dark mode palette with CSS variables
      colors: {
        background: 'var(--bg-primary)',
        surface: 'var(--bg-secondary)',
        elevated: 'var(--bg-elevated)',
        border: 'var(--border-primary)',
        muted: 'var(--text-secondary)',
        primary: 'var(--text-primary)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        },
        'accent-secondary': {
          DEFAULT: 'var(--accent-secondary)',
          hover: 'var(--accent-secondary-hover)',
          muted: 'var(--accent-secondary-muted)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
      },
      // Smooth transitions
      transitionDuration: {
        DEFAULT: '200ms',
      },
      // Subtle shadows
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
