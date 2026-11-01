/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  corePlugins: { preflight: false }, // le reset de Tailwind perturbe Leaflet
  theme: {
    extend: {
      boxShadow: {
        float: '0 2px 6px rgba(60,64,67,.3), 0 1px 2px rgba(60,64,67,.15)',
        sheet: '0 -2px 12px rgba(60,64,67,.25)'
      }
    }
  }
};

