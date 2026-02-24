/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#2563eb",   // Blue 600
          dark: "#1e40af",      // Blue 800
          deep: "#1e1b4b",      // Indigo 950 (Fundo Sidebar)
          accent: "#60a5fa",    // Blue 400
        }
      }
    },
  },
  plugins: [],
}