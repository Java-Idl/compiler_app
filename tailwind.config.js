/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        panel: '#1e1e1e',
        primary: '#f8f8f2',
        secondary: '#a1a1a1',
        accent: '#00d4aa'
      }
    },
  },
  plugins: [],
}
