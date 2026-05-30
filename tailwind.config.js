/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211d",
        muted: "#607067",
        line: "#d8dfda",
        surface: "#f4f7f5",
        panel: "#ffffff",
        mint: "#0f8f6a",
        coral: "#d85f45",
        gold: "#9b7c21"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(23, 33, 29, 0.05)"
      }
    }
  },
  plugins: []
};
