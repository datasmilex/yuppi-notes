/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

// Theme-aware palette: every shade reads from a CSS variable (RGB triplet),
// so existing classes like bg-white, text-gray-700, bg-purple-600/20 follow the active theme.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const themed = (name) =>
  Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        handwriting: ['var(--font-handwriting)', 'Caveat', 'cursive'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
        serif: ['var(--font-serif)', 'Playfair Display', 'serif'],
      },
      colors: {
        gray: themed('g'),
        purple: themed('a'),
        pink: themed('b'),
        surface: 'rgb(var(--surface) / <alpha-value>)',
        app: 'rgb(var(--app) / <alpha-value>)',
      },
      // Only backgrounds named "white" become the theme surface; text-white stays white.
      backgroundColor: {
        white: 'rgb(var(--surface) / <alpha-value>)',
      },
      // Projede kullanılan ama Tailwind 3 varsayılanlarında olmayan (v4 tarzı) değerler
      opacity: {
        3: '0.03',
        6: '0.06',
        8: '0.08',
      },
      scale: {
        98: '.98',
        102: '1.02',
      },
      lineClamp: {
        7: '7',
        8: '8',
        9: '9',
        10: '10',
      },
      backdropBlur: {
        '2xs': '1px',
        xs: '2px',
      },
      boxShadow: {
        '2xs': '0 1px 0 0 rgb(0 0 0 / 0.05)',
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        postit: '0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
        'postit-hover': '0 16px 32px -6px rgba(0, 0, 0, 0.14), 0 6px 12px -2px rgba(0, 0, 0, 0.08)',
        'postit-active': '0 20px 40px -8px rgba(0, 0, 0, 0.2), 0 8px 16px -4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.outline-hidden': {
          outline: '2px solid transparent',
          'outline-offset': '2px',
        },
      });
    }),
  ],
};
