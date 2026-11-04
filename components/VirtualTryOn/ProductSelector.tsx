'use client'

import React, { useRef, useEffect } from 'react'
import type { Clothing } from '@/lib/types'
import { CATALOG_CLOTHES } from '@/lib/constants/products'

interface ProductSelectorProps {
  onSelect: (clothing: Clothing) => void
  selectedId?: string
  category?: Clothing['category']
}

/**
 * Selector de prendas que permite cambiar entre diferentes artículos
 * Muestra thumbnails y permite cambio rápido ("hot-swapping")
 */
export const ProductSelector: React.FC<ProductSelectorProps> = ({
  onSelect,
  selectedId,
  category,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Filtra prendas por categoría si se especifica
  const clothes = Object.values(CATALOG_CLOTHES).filter(item => !category || item.category === category)

  const handleSelect = (clothing: Clothing) => {
    onSelect(clothing)
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Prendas Disponibles
        </h3>
      </div>

      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide"
      >
        {clothes.map(clothing => (
          <button
            key={clothing.id}
            onClick={() => handleSelect(clothing)}
            className={`flex-shrink-0 h-24 w-24 rounded-lg overflow-hidden transition-all transform hover:scale-105 ${
              selectedId === clothing.id
                ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-500/50'
                : 'ring-1 ring-gray-600 hover:ring-gray-500'
            }`}
            title={clothing.name}
          >
            {/* Placeholder de imagen (en producción usaría Image component) */}
            <div
              className="w-full h-full bg-gradient-to-br flex items-center justify-center text-xs text-center p-2"
              style={{
                backgroundImage: `linear-gradient(135deg, #1e40af, #7c3aed)`,
              }}
            >
              <span className="text-white font-medium truncate">{clothing.name}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Información de la prenda seleccionada */}
      {selectedId && clothes.find(c => c.id === selectedId) && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          {(() => {
            const selected = clothes.find(c => c.id === selectedId)!
            return (
              <>
                <h4 className="font-semibold text-white mb-2">{selected.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div>
                    <span className="block text-gray-500">Categoría</span>
                    <span className="text-white capitalize">{selected.category}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Color</span>
                    <span className="text-white">{selected.color}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Precio</span>
                    <span className="text-white font-semibold">${selected.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Talla</span>
                    <span className="text-white">{selected.size}</span>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default ProductSelector
