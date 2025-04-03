/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scannt deine React-Komponenten
    "./public/index.html"      // Scannt die Haupt-HTML-Datei
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')], // Keine zusätzlichen Plugins (wie DaisyUI) erstmal
} 