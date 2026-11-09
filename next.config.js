/**
 * Config de Next.
 *
 * En CommonJS a propósito: `package.json` no declara `"type": "module"`, y Next
 * resuelve `next.config.js` antes que `.mjs`/`.ts`. El archivo original tenía
 * sintaxis TypeScript (`import type`, `const nextConfig: NextConfig`) dentro de
 * un `.js`, así que Node fallaba al parsearlo y la app no arrancaba.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,

  images: {
    formats: ['image/webp'],
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // El probador necesita la cámara; el micrófono no se usa nunca.
          // anywear.decart.ai: prueba del widget de try-on por difusión (ver
          // app/layout.tsx) — su panel corre en un iframe de otro origen y,
          // sin delegarle permiso acá, el navegador le niega la cámara aunque
          // el usuario la autorice dentro del widget.
          {
            key: 'Permissions-Policy',
            value: 'camera=(self "https://anywear.decart.ai"), microphone=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
