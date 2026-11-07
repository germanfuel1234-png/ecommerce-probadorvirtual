/**
 * Config de Tailwind, en CommonJS por el mismo motivo que `next.config.js`:
 * Tailwind resuelve `tailwind.config.js` antes que `.ts`, y el original traía
 * `import type { Config }` dentro de un `.js`.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        accent: '#F97316',
        success: '#10B981',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      },
    },
  },
  plugins: [],
}
