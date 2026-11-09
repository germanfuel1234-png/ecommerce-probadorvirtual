/**
 * Recoloreado en vivo de la imagen de una prenda: pedido porque cambiar de
 * color no debía abrir "una prenda nueva" (una imagen pre-generada distinta)
 * sino tintar la misma imagen que ya está puesta.
 *
 * No es recoloreado fotorrealista — eso exigiría separar material de
 * iluminación. Es una aproximación por HSL: se toma el matiz y la saturación
 * del color elegido, y el brillo de cada píxel se acerca al brillo del color
 * elegido sin perder del todo el relieve (pliegues, sombras) del original.
 * Funciona bien en prendas de color sólido; en estampados o logos de otro
 * color el resultado pierde parte del contraste original — limitación
 * conocida, no un bug.
 */

interface Hsl {
  h: number
  s: number
  l: number
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) {
    return { h: 0, s: 0, l }
  }

  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  switch (max) {
    case rN:
      h = ((gN - bN) / d) % 6
      break
    case gN:
      h = (bN - rN) / d + 2
      break
    default:
      h = (rN - gN) / d + 4
  }
  h *= 60
  if (h < 0) {
    h += 360
  }

  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    ;[r, g, b] = [c, x, 0]
  } else if (h < 120) {
    ;[r, g, b] = [x, c, 0]
  } else if (h < 180) {
    ;[r, g, b] = [0, c, x]
  } else if (h < 240) {
    ;[r, g, b] = [0, x, c]
  } else if (h < 300) {
    ;[r, g, b] = [x, 0, c]
  } else {
    ;[r, g, b] = [c, 0, x]
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

/**
 * Cuánto se acerca el brillo de cada píxel al brillo del color elegido
 * (1 = todo el relieve se pierde, queda un color plano; 0 = no cambiaría
 * nada el brillo). 0.5 deja ver pliegues/sombras sin que el negro o el
 * blanco del swatch terminen siendo un gris a medio camino.
 */
const LIGHTNESS_PULL = 0.65

export function tintImageData(frame: ImageData, hex: string): void {
  const [tr, tg, tb] = hexToRgb(hex)
  const target = rgbToHsl(tr, tg, tb)
  const data = frame.data

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha === 0) {
      continue
    }

    const { l: originalLightness } = rgbToHsl(data[i], data[i + 1], data[i + 2])
    const lightness = originalLightness + (target.l - originalLightness) * LIGHTNESS_PULL
    const [r, g, b] = hslToRgb(target.h, target.s, lightness)

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}

/** Dibuja `image` tintada en un canvas nuevo, al tamaño natural de la imagen. */
export function tintGarmentImage(image: HTMLImageElement, hex: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.drawImage(image, 0, 0)
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
  tintImageData(frame, hex)
  ctx.putImageData(frame, 0, 0)

  return canvas
}
