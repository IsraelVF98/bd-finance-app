/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Suas cores originais mantidas
        bg: "#0F111A",
        surface: "#161922",
        surface2: "#1E2235",
        border: "#2a2d3e",
        green: "#00E676",
        red: "#e74c3c",
        muted: "#a3a8b4",
        subtle: "#6a7180",
        
        // UPGRADE: Adicionadas as cores oficiais da sua marca
        brand: {
          brown: "#6f5439",      // O marrom elegante da logo
          brownHover: "#59422b", // Tom mais escuro para o hover
          gray: "#747570",       // O cinza da logo
        },
      },
      // Suas fontes originais mantidas
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}