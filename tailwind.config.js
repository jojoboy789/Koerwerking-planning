
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  future: {
    // Disable oklch color space
    respectDefaultRingColor: true,
    disableOklch: true,
  },
}
