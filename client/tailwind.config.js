/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tesla-inspired monochrome palette
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        border: '#E5E5E5',
        muted: '#737373',
        primary: '#171717',
        accent: '#171717', // Monochrome accent
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
