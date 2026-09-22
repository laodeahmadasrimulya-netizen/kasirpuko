/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        puko: {
          50: '#f2f9f4',
          100: '#e1f2e6',
          200: '#c5e5ce',
          300: '#99d2aa',
          400: '#67b781',
          500: '#409c5d',
          600: '#2f7e49',
          700: '#27643b',
          800: '#224f31',
          900: '#1d422a',
          950: '#0c2415',
        },
        avocado: {
          light: '#dcfce7',
          flesh: '#ecfccb',
          cream: '#fef08a',
          seed: '#78350f',
          dark: '#14532d',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 20px -2px rgba(27, 67, 50, 0.06)',
      }
    },
  },
  plugins: [],
}
