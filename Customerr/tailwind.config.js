/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}',
    './src/**/*.{js,ts,jsx,tsx,html}', // This single line should cover everything recursively
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))', // Ensure Tailwind recognizes the CSS variable
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
      },
    },
  },
  plugins: [],
};
