/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    {
      pattern: /from-(cyan|lime|amber|pink)-(500|600)/, // espressione regolare per includere un set di classi
    },
    {
      pattern: /to-(cyan|lime|amber|pink)-(500|600)/, // espressione regolare per includere un set di classi
    },
  ],
}

