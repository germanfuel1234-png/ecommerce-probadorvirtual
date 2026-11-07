'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { findGarment } from '@/lib/catalog/garments'
import type { CartLine } from '@/lib/domain/cart'
import { formatPrice } from '@/lib/domain/garment'
import { useCartStore, useCartTotal } from '@/lib/hooks/useCart'

/** Tope para que el `+` no permita cantidades absurdas. */
const MAX_QUANTITY = 99

/**
 * Contenido del carrito.
 *
 * Lee las líneas del store y resuelve nombre y precio contra el catálogo en el
 * momento de pintar. No guarda nada derivado, por el mismo motivo que el store
 * no guarda el total: cualquier copia se desincroniza.
 */
export function CartPanel() {
  const lines = useCartStore(state => state.lines)
  const updateQuantity = useCartStore(state => state.updateQuantity)
  const remove = useCartStore(state => state.remove)
  const clear = useCartStore(state => state.clear)
  const total = useCartTotal()

  if (lines.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-400">
        Tu carrito está vacío.
        <br />
        Pruébate una prenda y añádela desde el probador.
      </div>
    )
  }

  return (
    <div className="flex max-h-[70vh] flex-col">
      <ul className="divide-y divide-gray-700 overflow-y-auto">
        {lines.map(line => (
          <CartLineRow
            key={`${line.garmentId}-${line.size}`}
            line={line}
            onQuantityChange={quantity =>
              updateQuantity({ garmentId: line.garmentId, size: line.size }, quantity)
            }
            onRemove={() => remove({ garmentId: line.garmentId, size: line.size })}
          />
        ))}
      </ul>

      <footer className="border-t border-gray-700 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-gray-400">Total</span>
          <span className="text-lg font-bold text-white">{formatPrice(total)}</span>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            // El checkout queda fuera del alcance de esta versión local; el
            // botón está desactivado en vez de prometer algo que no ocurre.
            disabled
            title="El checkout no está implementado en esta versión local"
          >
            Finalizar compra
          </button>
          <button
            onClick={clear}
            className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white transition hover:bg-gray-600"
          >
            Vaciar
          </button>
        </div>
      </footer>
    </div>
  )
}

interface CartLineRowProps {
  line: CartLine
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

function CartLineRow({ line, onQuantityChange, onRemove }: CartLineRowProps) {
  const garment = findGarment(line.garmentId)

  // Una línea persistida en localStorage puede apuntar a una prenda que ya no
  // está en el catálogo. Se muestra para que se pueda quitar, en lugar de
  // desaparecer en silencio aportando 0 al total.
  if (!garment) {
    return (
      <li className="flex items-center justify-between gap-3 p-3">
        <span className="text-sm text-gray-500">
          Prenda descatalogada
          <span className="ml-1 text-xs">({line.garmentId})</span>
        </span>
        <RemoveButton onClick={onRemove} label="Quitar prenda descatalogada" />
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <img
        src={garment.imageUrl}
        alt={garment.name}
        className="h-14 w-14 flex-shrink-0 rounded bg-slate-800 object-contain p-1"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{garment.name}</p>
        <p className="text-xs text-gray-400">
          Talla {line.size} · {formatPrice(garment.price)}/ud
        </p>

        <div className="mt-1.5 flex items-center gap-1.5">
          <QuantityButton
            onClick={() => onQuantityChange(line.quantity - 1)}
            label="Reducir cantidad"
          >
            <Minus size={12} />
          </QuantityButton>

          <span className="min-w-6 text-center text-sm font-medium text-white">
            {line.quantity}
          </span>

          <QuantityButton
            onClick={() => onQuantityChange(line.quantity + 1)}
            label="Aumentar cantidad"
            disabled={line.quantity >= MAX_QUANTITY}
          >
            <Plus size={12} />
          </QuantityButton>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className="text-sm font-semibold text-orange-500">
          {formatPrice(garment.price * line.quantity)}
        </span>
        <RemoveButton onClick={onRemove} label={`Quitar ${garment.name}`} />
      </div>
    </li>
  )
}

function QuantityButton({
  onClick,
  label,
  disabled = false,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="rounded bg-slate-700 p-1 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="text-gray-500 transition-colors hover:text-red-400"
    >
      <Trash2 size={16} />
    </button>
  )
}

export default CartPanel
