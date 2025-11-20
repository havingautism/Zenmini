/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        shell: {
          DEFAULT: '#f5f3f0', // outer background
        },
        surface: {
          DEFAULT: '#f8f5f2', // inner card
        },
        bubble: {
          user: '#111827',
          bot: '#ffffff',
          hint: '#f3ebe2',
        },
        accent: {
          DEFAULT: '#111827',
          subtle: '#e5ded4',
        },
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        'soft-card': '0 18px 60px rgba(15,23,42,0.08)',
      },
    },
  },
  plugins: [],
}

