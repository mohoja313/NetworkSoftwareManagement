/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Vazirmatn', 'system-ui', 'sans-serif'],
        fa: ['Vazirmatn', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdbff',
          300: '#8ec2ff',
          400: '#598fff',
          500: '#3366ff',
          600: '#1d46f5',
          700: '#1633e2',
          800: '#172cb6',
          900: '#182c8e',
        },
      },
      boxShadow: {
        lift: '0 12px 32px -12px rgba(51, 102, 255, 0.35)',
        card: '0 8px 24px -8px rgba(0, 0, 0, 0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
