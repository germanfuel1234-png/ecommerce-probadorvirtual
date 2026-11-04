'use client'

import React from 'react'
import { useCartStore } from '@/lib/hooks/useCart'
import type { Clothing } from '@/lib/types'
import { ShoppingCart } from 'lucide-react'

interface CartButtonProps {
  clothing: Clothing | null
  onAddSuccess?: () => void
}

/**
 * Botón flotante "Añadir al Carrito"
 * Aparece cuando hay una prenda seleccionada
 */
export const CartButton: React.FC<CartButtonProps> = ({
  clothing,
  onAddSuccess,
}) => {
  const { addItem, getTotalItems } = useCartStore()
  const totalItems = getTotalItems()

  const handleAddToCart = () => {
    if (!clothing) return

    addItem({
      clothingId: clothing.id,
      quantity: 1,
      selectedSize: clothing.size,
      selectedColor: clothing.color,
    })

    if (onAddSuccess) {
      onAddSuccess()
    }
  }

  if (!clothing) {
    return null
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={handleAddToCart}
        className={`
          fixed bottom-8 right-8 
          flex items-center gap-3
          px-6 py-4
          bg-orange-500 hover:bg-orange-600
          text-white font-semibold rounded-full
          shadow-xl hover:shadow-2xl
          transition-all transform hover:scale-110
          z-50
        `}
      >
        <ShoppingCart size={24} />
        <span>Añadir</span>
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-red-500 rounded-full text-xs font-bold">
            {totalItems}
          </span>
        )}
      </button>
    </>
  )
}

export default CartButton
