'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { findGarment } from '@/lib/catalog/garments'
import { addLine, countItems, removeLine, setQuantity, totalPrice, type CartLine } from '@/lib/domain/cart'
import type { Garment, GarmentSize } from '@/lib/domain/garment'

type LineKey = Pick<CartLine, 'garmentId' | 'size'>

interface CartStore {
  /** Única fuente de verdad. Unidades y total se derivan, nunca se guardan. */
  lines: CartLine[]
  add: (garment: Garment, quantity?: number, size?: GarmentSize) => void
  remove: (target: LineKey) => void
  updateQuantity: (target: LineKey, quantity: number) => void
  clear: () => void
}

/**
 * Store del carrito.
 *
 * El `total` ya no se guarda en el estado: antes se recalculaba *dentro* del
 * `set` llamando a `get()`, que todavía veía los items anteriores, así que el
 * total iba siempre un paso por detrás. Y el precio era un `50` fijo; ahora
 * sale del catálogo.
 */
export const useCartStore = create<CartStore>()(
  persist(
    set => ({
      lines: [],

      add: (garment, quantity = 1, size = garment.size) =>
        set(state => ({
          lines: addLine(state.lines, { garmentId: garment.id, size, quantity }),
        })),

      remove: target => set(state => ({ lines: removeLine(state.lines, target) })),

      updateQuantity: (target, quantity) =>
        set(state => ({ lines: setQuantity(state.lines, target, quantity) })),

      clear: () => set({ lines: [] }),
    }),
    {
      name: 'tryon-cart',
      // Se rehidrata a mano desde `useCartHydrated`: si Zustand leyera
      // localStorage durante el primer render, el HTML del servidor (carrito
      // vacío) no coincidiría con el del cliente y React avisaría de
      // hydration mismatch.
      skipHydration: true,
    }
  )
)

/**
 * Lee localStorage después del primer render y dice si ya está listo, para que
 * la UI pueda no mostrar el contador hasta entonces.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    void useCartStore.persist.rehydrate()
    setHydrated(true)
  }, [])

  return hydrated
}

/** Unidades totales. Primitivo, así que no provoca re-renders de más. */
export const useCartCount = (): number => useCartStore(state => countItems(state.lines))

/** Importe total resuelto contra el catálogo. */
export const useCartTotal = (): number =>
  useCartStore(state => totalPrice(state.lines, findGarment))

export default useCartStore
