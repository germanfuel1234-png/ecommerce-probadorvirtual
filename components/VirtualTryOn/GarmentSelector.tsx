'use client'

import clsx from 'clsx'

import { garmentsByCategory } from '@/lib/catalog/garments'
import { formatPrice, type Garment, type GarmentCategory } from '@/lib/domain/garment'

interface GarmentSelectorProps {
  onSelect: (garment: Garment) => void
  selectedId?: string
  category?: GarmentCategory
}

/** Cambio de prenda en caliente, sin cerrar la cámara. */
export function GarmentSelector({ onSelect, selectedId, category }: GarmentSelectorProps) {
  // El filtrado vive en el catálogo, no replicado aquí.
  const garments = garmentsByCategory(category)
  const selected = garments.find(g => g.id === selectedId)

  return (
    <div className="flex h-full flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
        Prendas disponibles
      </h3>

      <div className="grid grid-cols-4 gap-2 md:grid-cols-3">
        {garments.map(garment => (
          <button
            key={garment.id}
            onClick={() => onSelect(garment)}
            aria-pressed={selectedId === garment.id}
            title={garment.name}
            className={clsx(
              'aspect-square overflow-hidden rounded-lg bg-slate-800 p-1 transition-all',
              selectedId === garment.id
                ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-500/30'
                : 'ring-1 ring-gray-700 hover:ring-gray-500'
            )}
          >
            <img
              src={garment.imageUrl}
              alt={garment.name}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
          <h4 className="mb-2 font-semibold text-white">{selected.name}</h4>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <Detail label="Categoría" value={selected.category} capitalize />
            <Detail label="Color" value={selected.color} />
            <Detail label="Precio" value={formatPrice(selected.price)} />
            <Detail label="Talla" value={selected.size} />
          </dl>
        </div>
      )}
    </div>
  )
}

function Detail({
  label,
  value,
  capitalize = false,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className={clsx('font-medium text-white', capitalize && 'capitalize')}>{value}</dd>
    </div>
  )
}

export default GarmentSelector
