'use client'

import clsx from 'clsx'
import { Ban } from 'lucide-react'

/** Paleta fija: básicos + primarios + un par de neutros extra. */
const PALETTE: ReadonlyArray<{ label: string; hex: string }> = [
  { label: 'Negro', hex: '#1C1C1E' },
  { label: 'Blanco', hex: '#F4F4F5' },
  { label: 'Rojo', hex: '#DC2626' },
  { label: 'Amarillo', hex: '#F5C518' },
  { label: 'Azul', hex: '#2563EB' },
  { label: 'Violeta', hex: '#7C3AED' },
  { label: 'Marrón', hex: '#6F4E37' },
]

interface ColorSwatchesProps {
  selected: string | null
  onSelect: (hex: string | null) => void
}

/**
 * Columna de círculos de color a la izquierda del vídeo, visible para
 * cualquier prenda activa (no sólo una con variantes pre-generadas): tiñe en
 * vivo la misma imagen que ya está puesta, no cambia a "una prenda nueva".
 * Ver `lib/engines/colorize.ts` para cómo se calcula el tinte.
 */
export function ColorSwatches({ selected, onSelect }: ColorSwatchesProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/30 p-2"
      aria-label="Colores disponibles"
    >
      <button
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        aria-label="Color original"
        title="Color original"
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 ring-offset-2 ring-offset-gray-800 transition-transform hover:scale-110',
          selected === null ? 'ring-2 ring-orange-500' : 'ring-1 ring-gray-600'
        )}
      >
        <Ban size={16} className="text-gray-400" />
      </button>

      {PALETTE.map(({ label, hex }) => (
        <button
          key={hex}
          onClick={() => onSelect(hex)}
          aria-pressed={selected === hex}
          aria-label={label}
          title={label}
          className={clsx(
            'h-8 w-8 shrink-0 rounded-full ring-offset-2 ring-offset-gray-800 transition-transform hover:scale-110',
            selected === hex ? 'ring-2 ring-orange-500' : 'ring-1 ring-gray-600'
          )}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  )
}

export default ColorSwatches
