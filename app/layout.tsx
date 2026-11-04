import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Probador Virtual - E-Commerce de Moda',
  description: 'Experimenta nuestro probador virtual en tiempo real con IA. Pruébate prendas antes de comprar.',
  keywords: 'virtual try-on, moda, ropa, IA, probador virtual',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-slate-950 text-gray-100">
        {children}
      </body>
    </html>
  )
}
