/**
 * Tests del dominio del carrito.
 *
 * Cubren concretamente los dos fallos del carrito original: el precio fijo de
 * 50 € por unidad y el total guardado en el estado, que se recalculaba antes de
 * aplicar los items nuevos y por tanto iba siempre un paso por detrás.
 *
 * Ejecutar con: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  addLine,
  countItems,
  removeLine,
  setQuantity,
  totalPrice,
  type CartLine,
} from '../lib/domain/cart.ts'
import { defineGarment, type Garment } from '../lib/domain/garment.ts'

const SHIRT = defineGarment({
  id: 'shirt-001',
  name: 'Camiseta',
  description: '',
  category: 'shirt',
  color: 'Negro',
  colorHex: '#1C1C1E',
  size: 'M',
  price: 29.99,
  imageUrl: '/garments/tshirt-black.svg',
})

const JACKET = defineGarment({
  id: 'jacket-001',
  name: 'Chaqueta',
  description: '',
  category: 'jacket',
  color: 'Azul',
  colorHex: '#3B5B8C',
  size: 'M',
  price: 79.99,
  imageUrl: '/garments/jacket-denim.svg',
})

const CATALOG = new Map([SHIRT, JACKET].map(garment => [garment.id, garment]))
const find = (id: string): Garment | undefined => CATALOG.get(id)

const line = (garmentId: string, size: CartLine['size'], quantity: number): CartLine => ({
  garmentId,
  size,
  quantity,
})

describe('addLine', () => {
  it('acumula cantidad en la misma prenda y talla', () => {
    const lines = addLine(addLine([], line(SHIRT.id, 'M', 1)), line(SHIRT.id, 'M', 2))

    assert.equal(lines.length, 1)
    assert.equal(lines[0].quantity, 3)
  })

  it('trata cada talla como una línea independiente', () => {
    const lines = addLine(addLine([], line(SHIRT.id, 'M', 1)), line(SHIRT.id, 'L', 1))

    assert.equal(lines.length, 2)
    assert.equal(countItems(lines), 2)
  })

  it('no muta la lista de entrada', () => {
    const original = [line(SHIRT.id, 'M', 1)]
    const snapshot = structuredClone(original)

    addLine(original, line(SHIRT.id, 'M', 5))

    assert.deepEqual(original, snapshot)
  })
})

describe('totalPrice', () => {
  it('usa el precio del catálogo, no un valor fijo', () => {
    const lines = [line(SHIRT.id, 'M', 2), line(JACKET.id, 'M', 1)]

    assert.equal(totalPrice(lines, find).toFixed(2), (29.99 * 2 + 79.99).toFixed(2))
  })

  it('refleja el item nuevo en la misma operación', () => {
    const lines = [line(SHIRT.id, 'M', 1)]

    const before = totalPrice(lines, find)
    const after = totalPrice(addLine(lines, line(JACKET.id, 'M', 1)), find)

    assert.equal((after - before).toFixed(2), '79.99')
  })

  it('ignora prendas que ya no están en el catálogo', () => {
    assert.equal(totalPrice([line('descatalogada', 'M', 2)], find), 0)
  })

  it('un carrito vacío vale 0', () => {
    assert.equal(totalPrice([], find), 0)
    assert.equal(countItems([]), 0)
  })
})

describe('setQuantity y removeLine', () => {
  const lines = [line(SHIRT.id, 'M', 3), line(SHIRT.id, 'L', 1), line(JACKET.id, 'M', 1)]

  it('actualiza sólo la línea indicada', () => {
    const updated = setQuantity(lines, { garmentId: SHIRT.id, size: 'M' }, 1)

    assert.equal(countItems(updated), 3)
    assert.equal(updated.find(l => l.size === 'L')?.quantity, 1)
  })

  it('elimina la línea cuando la cantidad baja a 0 o menos', () => {
    for (const quantity of [0, -1]) {
      const updated = setQuantity(lines, { garmentId: SHIRT.id, size: 'M' }, quantity)

      assert.ok(!updated.some(l => l.garmentId === SHIRT.id && l.size === 'M'))
      assert.equal(updated.length, 2)
    }
  })

  it('elimina respetando las demás tallas de la misma prenda', () => {
    const updated = removeLine(lines, { garmentId: SHIRT.id, size: 'M' })

    assert.ok(updated.some(l => l.garmentId === SHIRT.id && l.size === 'L'))
    assert.ok(!updated.some(l => l.garmentId === SHIRT.id && l.size === 'M'))
  })
})

describe('defineGarment', () => {
  it('deriva la región del cuerpo a partir de la categoría', () => {
    assert.equal(SHIRT.region, 'upper')
    assert.equal(JACKET.region, 'upper')

    const jeans = defineGarment({ ...SHIRT, id: 'p', category: 'pants' })
    assert.equal(jeans.region, 'lower')

    const dress = defineGarment({ ...SHIRT, id: 'd', category: 'dress' })
    assert.equal(dress.region, 'full')
  })

  it('siempre completa el ajuste, y respeta los valores propios de la prenda', () => {
    assert.ok(SHIRT.fit.widthScale > 0 && SHIRT.fit.heightScale > 0)

    const custom = defineGarment({ ...SHIRT, id: 'c', fit: { widthScale: 9 } })

    assert.equal(custom.fit.widthScale, 9)
    assert.equal(custom.fit.heightScale, SHIRT.fit.heightScale, 'el resto mantiene el defecto')
  })
})
