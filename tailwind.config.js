/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1', // Indigo 500
          hover: '#4f46e5',   // Indigo 600
          light: '#e0e7ff',   // Indigo 100
        },
        secondary: {
          DEFAULT: '#ec4899', // Pink 500
        },
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f8fafc',     // Slate 50
          dark: '#1e293b',    // Slate 800
        },
        text: {
          main: '#0f172a',    // Slate 900
          muted: '#64748b',   // Slate 500
          inverted: '#ffffff',
        },
        border: '#e2e8f0',    // Slate 200
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}

