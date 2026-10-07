/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        handwriting: ['var(--font-handwriting)', 'Caveat', 'cursive'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
        serif: ['var(--font-serif)', 'Playfair Display', 'serif'],
      },
      colors: {
        note: {
          yellow: { bg: '#FEF9C3', card: '#FEF08A', border: '#FDE047', text: '#713F12' },
          lavender: { bg: '#F3E8FF', card: '#E9D5FF', border: '#D8B4FE', text: '#581C87' },
          pink: { bg: '#FCE7F3', card: '#FBCFE8', border: '#F472B6', text: '#831843' },
          mint: { bg: '#D1FAE5', card: '#A7F3D0', border: '#6EE7B7', text: '#064E3B' },
          blue: { bg: '#E0F2FE', card: '#BAE6FD', border: '#7DD3FC', text: '#0C4A6E' },
          peach: { bg: '#FFEDD5', card: '#FED7AA', border: '#FDBA74', text: '#7C2D12' },
          coral: { bg: '#FFE4E6', card: '#FECDD3', border: '#FDA4AF', text: '#881337' },
          neutral: { bg: '#F8FAFC', card: '#F1F5F9', border: '#CBD5E1', text: '#1E293B' },
        }
      },
      boxShadow: {
        'postit': '0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
        'postit-hover': '0 16px 32px -6px rgba(0, 0, 0, 0.14), 0 6px 12px -2px rgba(0, 0, 0, 0.08)',
        'postit-active': '0 20px 40px -8px rgba(0, 0, 0, 0.2), 0 8px 16px -4px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};
