'use client'

import { ShoppingBag, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { formatPrice } from '@/lib/domain/garment'
import { useCartCount, useCartHydrated, useCartTotal } from '@/lib/hooks/useCart'
import { CartPanel } from './CartPanel'

export function StoreHeader() {
  const hydrated = useCartHydrated()
  const count = useCartCount()
  const total = useCartTotal()

  const [isOpen, setIsOpen] = useState(false)
  // El ref envuelve botón + panel: si sólo cubriera el panel, pulsar el botón
  // contaría como "click fuera" y el cierre pelearía con el toggle.
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <header className="border-b border-gray-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Zap className="text-orange-500" size={30} />
          <span className="text-2xl font-bold text-white">TryOnIA</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Nada derivado del carrito se pinta antes de rehidratar
              localStorage: el HTML del servidor (vacío) y el del cliente no
              coincidirían y React avisaría de hydration mismatch. */}
          <span className="hidden text-sm text-gray-400 sm:inline">
            {hydrated && count > 0 ? formatPrice(total) : ''}
          </span>

          <div className="relative" ref={containerRef}>
            <button
              onClick={() => setIsOpen(open => !open)}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              className="relative flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600"
            >
              <ShoppingBag size={20} />
              <span className="font-medium">Carrito</span>
              {hydrated && count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold">
                  {count}
                </span>
              )}
            </button>

            {isOpen && hydrated && (
              <div
                role="dialog"
                aria-label="Carrito de la compra"
                className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-700 bg-slate-900 shadow-2xl sm:w-96"
              >
                <CartPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default StoreHeader
