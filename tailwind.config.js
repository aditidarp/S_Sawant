/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0b1423",
        navy: "#101d31",
        champagne: "#c9aa70",
        ivory: "#f3efe6",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Manrope", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
