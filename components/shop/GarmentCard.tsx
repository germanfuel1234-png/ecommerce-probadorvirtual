'use client'

import { ShoppingCart, Zap } from 'lucide-react'

import { formatPrice, type Garment } from '@/lib/domain/garment'
import { useCartStore } from '@/lib/hooks/useCart'

interface GarmentCardProps {
  garment: Garment
  onTryOn: (garmentId: string) => void
}

export function GarmentCard({ garment, onTryOn }: GarmentCardProps) {
  const add = useCartStore(state => state.add)

  return (
    <article className="group overflow-hidden rounded-xl border border-gray-700 bg-gray-800/50 transition-colors hover:border-orange-500">
      <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 p-6">
        {/* Las imágenes reales del catálogo. Antes el catálogo apuntaba a
            /images/clothes/*.png, que no existían, y las tarjetas mostraban un
            gradiente de relleno que tapaba el 404. */}
        <img
          src={garment.imageUrl}
          alt={garment.name}
          className="h-full w-full object-contain transition-transform group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <h3 className="mb-1 font-semibold text-white">{garment.name}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-gray-400">{garment.description}</p>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-bold text-orange-500">{formatPrice(garment.price)}</span>
          <span className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
            Talla {garment.size}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onTryOn(garment.id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 py-2 font-semibold text-white transition hover:bg-orange-600"
          >
            <Zap size={18} />
            Probarte
          </button>
          <button
            onClick={() => add(garment)}
            aria-label={`Añadir ${garment.name} al carrito`}
            className="rounded-lg bg-gray-700 px-3 py-2 text-white transition hover:bg-gray-600"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}

export default GarmentCard
