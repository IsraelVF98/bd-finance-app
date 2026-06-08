/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F111A",
        surface: "#161922",
        surface2: "#1E2235",
        border: "#2a2d3e",
        green: "#00E676",
        red: "#e74c3c",
        muted: "#a3a8b4",
        subtle: "#6a7180",
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}
