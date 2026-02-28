/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        campus: {
          950: "#0a0e1a",
          900: "#0f1629",
          850: "#131b34",
          800: "#182040",
          700: "#1e2d56",
          600: "#2a3f6e",
          500: "#3a5a8c",
          400: "#5b7fad",
          300: "#8aacd0",
          200: "#b4cde4",
          100: "#dce8f3",
          50:  "#f0f5fa",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
};
