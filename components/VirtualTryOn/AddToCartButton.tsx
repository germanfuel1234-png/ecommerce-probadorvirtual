'use client'

import { Check, ShoppingCart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { formatPrice, type Garment } from '@/lib/domain/garment'
import { useCartStore } from '@/lib/hooks/useCart'

interface AddToCartButtonProps {
  garment: Garment | null
}

/** Botón de compra siempre disponible mientras el probador está abierto. */
export function AddToCartButton({ garment }: AddToCartButtonProps) {
  const add = useCartStore(state => state.add)
  const [justAdded, setJustAdded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Sin esto, cerrar el modal justo después de añadir deja un setState
  // pendiente sobre un componente desmontado.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (!garment) {
    return null
  }

  const handleAdd = () => {
    add(garment)
    setJustAdded(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setJustAdded(false), 2000)
  }

  return (
    <button
      onClick={handleAdd}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
    >
      {justAdded ? <Check size={20} /> : <ShoppingCart size={20} />}
      <span>{justAdded ? '¡Añadido!' : `Añadir · ${formatPrice(garment.price)}`}</span>
    </button>
  )
}

export default AddToCartButton
