import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Probador Virtual - E-Commerce de Moda',
  description:
    'Probador virtual en tiempo real que corre entero en tu navegador. Pruébate prendas con la cámara antes de comprar.',
  keywords: ['virtual try-on', 'probador virtual', 'moda', 'IA local'],
}

// En App Router el viewport va en su propio export; dentro de `metadata` Next
// avisa de deprecación, y los `<meta>` a mano en <head> son redundantes.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-gray-100">
        {children}

        {/*
          Prueba del widget de Anywear (anywear.decart.ai): try-on con un
          modelo de difusión de video en la nube de Decart, no local. Gratis
          durante su beta. Es un experimento aparte del motor propio — no
          toca lib/engines/localPoseEngine.ts ni nada de lo que ya funciona.
        */}
        <Script
          src="https://anywear.decart.ai/widget/latest/anywear.js?domain=localhost"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
