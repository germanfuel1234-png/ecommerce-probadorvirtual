'use client'

import { Zap } from 'lucide-react'
import { useState } from 'react'

import { GarmentCard } from '@/components/shop/GarmentCard'
import { StoreHeader } from '@/components/shop/StoreHeader'
import { VirtualTryOnModal } from '@/components/VirtualTryOn/VirtualTryOnModal'
import { GARMENTS } from '@/lib/catalog/garments'

export default function Home() {
  /** `null` = probador cerrado; string vacío = abierto sin prenda concreta. */
  const [tryOnGarmentId, setTryOnGarmentId] = useState<string | null>(null)

  return (
    <div className="min-h-screen">
      <StoreHeader />

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="mb-20 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Pruébate la ropa en tiempo real
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-400">
            El probador detecta tu cuerpo con la cámara y ajusta la prenda sobre ti, fotograma a
            fotograma. Todo el procesamiento ocurre en tu navegador: ni la imagen ni el vídeo salen
            de tu equipo.
          </p>
          <button
            onClick={() => setTryOnGarmentId('')}
            className="btn-primary inline-flex items-center gap-2 text-lg"
          >
            <Zap size={22} />
            Abrir probador virtual
          </button>
        </section>

        <section>
          <h2 className="mb-10 text-center text-2xl font-bold text-white">Catálogo</h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {GARMENTS.map(garment => (
              <GarmentCard key={garment.id} garment={garment} onTryOn={setTryOnGarmentId} />
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        TryOnIA · Probador virtual local
      </footer>

      {/* Se monta sólo al abrir: así el modelo de pose no se descarga en la
          home de quien nunca usa el probador. */}
      {tryOnGarmentId !== null && (
        <VirtualTryOnModal
          initialGarmentId={tryOnGarmentId || undefined}
          onClose={() => setTryOnGarmentId(null)}
        />
      )}
    </div>
  )
}
