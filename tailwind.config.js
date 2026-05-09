/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1d7a6b",
          dark: "#0f3f3a",
          deeper: "#11594d",
        },
        accent: "#d74732",
      },
      boxShadow: {
        portal: "0 12px 36px rgba(24, 34, 48, 0.08)",
      },
    },
  },
  plugins: [],
};
