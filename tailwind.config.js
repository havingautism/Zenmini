/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "Inter",
          "ui-sans-serif",
          "sans-serif",
        ],
      },
      colors: {
        shell: "var(--color-shell)",
        surface: "var(--color-surface)",
        highlight: "var(--color-highlight)",
        bubble: {
          user: "var(--color-bubble-user)",
          bot: "var(--color-bubble-bot)",
          hint: "var(--color-surface)", // fallback or specific hint color
          "text-user": "var(--color-text-bubble-user)",
          "text-bot": "var(--color-text-bubble-bot)",
        },
        accent: {
          DEFAULT: "var(--color-text-main)",
          subtle: "var(--color-text-muted)",
        },
        border: "var(--color-border)",
        input: "var(--color-input-bg)",
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        "soft-card": "0 18px 60px rgba(0,0,0,0.08)",
        "dark-card": "0 18px 60px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};
