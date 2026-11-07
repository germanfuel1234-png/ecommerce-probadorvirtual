/**
 * Tests de la geometría del probador.
 *
 * Toda la matemática que coloca la prenda sobre el cuerpo vive en un módulo
 * puro justamente para poder probarla sin cámara, sin DOM y sin modelo: es la
 * parte del motor donde un signo invertido se traduce en "la camiseta sale
 * girada" y no hay forma de verlo en un test de UI.
 *
 * Ejecutar con: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildBodyFrame,
  placeGarment,
  smoothBodyFrame,
  type BodyFrame,
  type Landmark,
} from '../lib/engines/poseGeometry.ts'

const CANVAS = { width: 960, height: 720 }
const UPPER_FIT = { widthScale: 1.62, heightScale: 1.28, verticalOffset: -0.2 }
const LOWER_FIT = { widthScale: 1.5, heightScale: 1.05, verticalOffset: -0.08 }

/** Los 33 landmarks de BlazePose; los no indicados quedan como no visibles. */
function landmarks(points: Record<number, [number, number]>): Landmark[] {
  return Array.from({ length: 33 }, (_, index) => {
    const point = points[index]
    return point
      ? { x: point[0] / CANVAS.width, y: point[1] / CANVAS.height, visibility: 0.95 }
      : { x: 0, y: 0, visibility: 0 }
  })
}

const UPRIGHT = landmarks({
  11: [540, 200],
  12: [420, 200],
  23: [520, 420],
  24: [440, 420],
})

const degrees = (radians: number) => (radians * 180) / Math.PI

describe('buildBodyFrame', () => {
  it('ancla el torso entre hombros y caderas', () => {
    const body = buildBodyFrame(UPRIGHT, 'upper', CANVAS, false, 0.5)

    assert.deepEqual(body, {
      top: { x: 480, y: 200 },
      bottom: { x: 480, y: 420 },
      across: 120,
    })
  })

  it('usa el ancho de caderas para la parte de abajo', () => {
    const withAnkles = landmarks({
      11: [540, 200],
      12: [420, 200],
      23: [520, 420],
      24: [440, 420],
      27: [515, 690],
      28: [445, 690],
    })

    const body = buildBodyFrame(withAnkles, 'lower', CANVAS, false, 0.5)

    assert.deepEqual(body?.top, { x: 480, y: 420 }, 'el pantalón cuelga de la cadera')
    assert.deepEqual(body?.bottom, { x: 480, y: 690 })
    assert.equal(body?.across, 80, 'cadera (80px), no hombros (120px)')
  })

  it('extrapola la pierna cuando los tobillos quedan fuera de cuadro', () => {
    const withKnees = landmarks({
      11: [540, 200],
      12: [420, 200],
      23: [520, 420],
      24: [440, 420],
      25: [515, 560],
      26: [445, 560],
    })

    const body = buildBodyFrame(withKnees, 'lower', CANVAS, false, 0.5)

    // Cadera 420 + 2×(rodilla 560 − cadera 420) = 700
    assert.deepEqual(body?.bottom, { x: 480, y: 700 })
  })

  it('devuelve null si faltan landmarks fiables, en vez de adivinar', () => {
    const noHips = landmarks({ 11: [540, 200], 12: [420, 200] })
    assert.equal(buildBodyFrame(noHips, 'upper', CANVAS, false, 0.5), null)

    const lowConfidence = UPRIGHT.map(point => ({ ...point, visibility: 0.2 }))
    assert.equal(buildBodyFrame(lowConfidence, 'upper', CANVAS, false, 0.5), null)
  })

  it('refleja la x en vista selfie y deja la escala intacta', () => {
    const offCenter = landmarks({ 11: [300, 200], 12: [200, 200], 23: [290, 420], 24: [210, 420] })

    const direct = buildBodyFrame(offCenter, 'upper', CANVAS, false, 0.5)
    const mirrored = buildBodyFrame(offCenter, 'upper', CANVAS, true, 0.5)

    assert.ok(direct && mirrored)
    assert.equal(direct.top.x + mirrored.top.x, CANVAS.width, 'el reflejo es simétrico')
    assert.equal(direct.across, mirrored.across, 'reflejar no cambia el tamaño')
    assert.equal(direct.top.y, mirrored.top.y, 'la vertical no se toca')
  })
})

describe('placeGarment', () => {
  it('no rota un cuerpo erguido', () => {
    const body = buildBodyFrame(UPRIGHT, 'upper', CANVAS, false, 0.5)!
    assert.equal(placeGarment(body, UPPER_FIT).rotation, 0)
  })

  it('cubre el torso dejando margen de mangas, cuello y bajo', () => {
    const body = buildBodyFrame(UPRIGHT, 'upper', CANVAS, false, 0.5)!
    const { anchor, width, height, offsetY } = placeGarment(body, UPPER_FIT)

    const left = anchor.x - width / 2
    const right = anchor.x + width / 2
    const top = anchor.y + offsetY

    assert.ok(left < 420 && right > 540, 'las mangas pasan de los hombros')
    assert.ok(top < 200, 'el cuello queda por encima de la línea de hombros')
    assert.ok(top + height > 420, 'el bajo pasa de la cadera')
  })

  it('sigue el eje del torso cuando el cuerpo se inclina', () => {
    const lean = (25 * Math.PI) / 180
    const pivot = { x: 480, y: 200 }
    const rotate = ([x, y]: [number, number]): [number, number] => {
      const dx = x - pivot.x
      const dy = y - pivot.y
      return [
        pivot.x + dx * Math.cos(lean) - dy * Math.sin(lean),
        pivot.y + dx * Math.sin(lean) + dy * Math.cos(lean),
      ]
    }

    const leaning = landmarks({
      11: rotate([540, 200]),
      12: rotate([420, 200]),
      23: rotate([520, 420]),
      24: rotate([440, 420]),
    })

    const body = buildBodyFrame(leaning, 'upper', CANVAS, false, 0.5)!
    assert.ok(Math.abs(degrees(placeGarment(body, UPPER_FIT).rotation) - 25) < 0.01)
  })

  it('escala la prenda con la distancia a la cámara', () => {
    const near = buildBodyFrame(UPRIGHT, 'upper', CANVAS, false, 0.5)!
    const far = buildBodyFrame(
      landmarks({ 11: [510, 260], 12: [450, 260], 23: [500, 370], 24: [460, 370] }),
      'upper',
      CANVAS,
      false,
      0.5
    )!

    const nearWidth = placeGarment(near, UPPER_FIT).width
    const farWidth = placeGarment(far, UPPER_FIT).width

    assert.ok(farWidth < nearWidth, 'más lejos ⇒ prenda más pequeña')
    assert.equal(farWidth / nearWidth, 0.5, 'la escala es proporcional al cuerpo')
  })

  it('aplica el ajuste propio de cada prenda', () => {
    const body = buildBodyFrame(UPRIGHT, 'upper', CANVAS, false, 0.5)!
    const wide = placeGarment(body, { ...UPPER_FIT, widthScale: 2 })

    assert.equal(wide.width, body.across * 2)
    assert.equal(placeGarment(body, LOWER_FIT).width, body.across * LOWER_FIT.widthScale)
  })
})

describe('smoothBodyFrame', () => {
  const previous: BodyFrame = { top: { x: 100, y: 100 }, bottom: { x: 100, y: 300 }, across: 100 }
  const current: BodyFrame = { top: { x: 200, y: 100 }, bottom: { x: 200, y: 300 }, across: 120 }

  it('deja pasar el primer frame sin filtrar', () => {
    assert.deepEqual(smoothBodyFrame(null, current, 0.45), current)
    assert.deepEqual(smoothBodyFrame(previous, current, 0), current)
  })

  it('interpola hacia el frame nuevo', () => {
    const smoothed = smoothBodyFrame(previous, current, 0.45)

    assert.equal(smoothed.top.x, 155, '55% del camino hacia el objetivo')
    assert.ok(smoothed.across > 100 && smoothed.across < 120)
  })

  it('nunca se congela, aunque se pida suavizado total', () => {
    // Un smoothing de 1 dejaría la prenda clavada en el primer frame para
    // siempre; el tope de 0.95 garantiza que siga convergiendo.
    const smoothed = smoothBodyFrame(previous, current, 1)
    assert.ok(smoothed.top.x > previous.top.x)
  })
})
