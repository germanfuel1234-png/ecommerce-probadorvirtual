'use client'

import { create } from 'zustand'
import type { Cart, CartItem } from '@/lib/types'

interface CartStore {
  items: CartItem[]
  total: number

  // Acciones
  addItem: (item: CartItem) => void
  removeItem: (clothingId: string) => void
  updateQuantity: (clothingId: string, quantity: number) => void
  clear: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

/**
 * Store global del carrito usando Zustand
 * Maneja el estado del carrito de compras de manera centralizada
 */
export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,

  addItem: (item: CartItem) => {
    set(state => {
      const existingItem = state.items.find(i => i.clothingId === item.clothingId)

      let updatedItems: CartItem[]
      if (existingItem) {
        updatedItems = state.items.map(i =>
          i.clothingId === item.clothingId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      } else {
        updatedItems = [...state.items, item]
      }

      return {
        items: updatedItems,
        total: get().getTotalPrice(),
      }
    })
  },

  removeItem: (clothingId: string) => {
    set(state => ({
      items: state.items.filter(i => i.clothingId !== clothingId),
      total: get().getTotalPrice(),
    }))
  },

  updateQuantity: (clothingId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(clothingId)
      return
    }

    set(state => ({
      items: state.items.map(i =>
        i.clothingId === clothingId ? { ...i, quantity } : i
      ),
      total: get().getTotalPrice(),
    }))
  },

  clear: () => {
    set({ items: [], total: 0 })
  },

  getTotalItems: () => {
    return get().items.reduce((acc, item) => acc + item.quantity, 0)
  },

  getTotalPrice: () => {
    return get().items.reduce((acc, item) => {
      // En producción, obtendría el precio del catálogo
      return acc + item.quantity * 50 // Precio dummy
    }, 0)
  },
}))

export default useCartStore
