/**
 * Dominio: carrito.
 *
 * Funciones puras sobre líneas de carrito. El store de Zustand sólo guarda
 * `CartLine[]`; todo lo derivado (unidades, total) se calcula aquí a partir del
 * catálogo, de modo que no puede quedarse desincronizado con los items.
 */
import type { Garment, GarmentSize } from './garment'

export interface CartLine {
  garmentId: string
  size: GarmentSize
  quantity: number
}

/** Una prenda en dos tallas distintas son dos líneas distintas. */
function sameLine(a: CartLine, b: CartLine): boolean {
  return a.garmentId === b.garmentId && a.size === b.size
}

export function addLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find(l => sameLine(l, line))

  if (!existing) {
    return [...lines, line]
  }

  return lines.map(l =>
    sameLine(l, line) ? { ...l, quantity: l.quantity + line.quantity } : l
  )
}

export function removeLine(lines: readonly CartLine[], target: Pick<CartLine, 'garmentId' | 'size'>): CartLine[] {
  return lines.filter(l => !sameLine(l, { ...target, quantity: 0 }))
}

export function setQuantity(
  lines: readonly CartLine[],
  target: Pick<CartLine, 'garmentId' | 'size'>,
  quantity: number
): CartLine[] {
  if (quantity <= 0) {
    return removeLine(lines, target)
  }

  return lines.map(l => (sameLine(l, { ...target, quantity: 0 }) ? { ...l, quantity } : l))
}

export function countItems(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0)
}

/**
 * Total real, resuelto contra el catálogo. Una línea cuyo `garmentId` ya no
 * exista aporta 0 en lugar de romper el cálculo.
 */
export function totalPrice(
  lines: readonly CartLine[],
  findGarment: (id: string) => Garment | undefined
): number {
  return lines.reduce((total, line) => {
    const garment = findGarment(line.garmentId)
    return garment ? total + garment.price * line.quantity : total
  }, 0)
}
