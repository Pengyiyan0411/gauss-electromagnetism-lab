/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        slate: { 900: '#0f172a', 800: '#1e293b' },
        emerald: { 50: '#ecfdf5', 600: '#059669', 800: '#065f46' }
      }
    },
  },
  plugins: [],
}