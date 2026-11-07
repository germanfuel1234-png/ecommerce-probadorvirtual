/**
 * Dominio: prendas.
 *
 * Capa pura: sin React, sin DOM, sin red. Define qué es una prenda y cómo debe
 * anclarse al cuerpo. El motor de try-on consume `GarmentFit` para colocar la
 * imagen sobre los puntos de pose; no sabe nada de precios ni de UI.
 */

export type GarmentCategory = 'shirt' | 'jacket' | 'sweater' | 'dress' | 'pants'

export type GarmentSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

/** Tramo del cuerpo al que se ancla la prenda. */
export type BodyRegion = 'upper' | 'lower' | 'full'

/**
 * Cómo se coloca la imagen de la prenda sobre el cuerpo detectado.
 * Todas las magnitudes son relativas al cuerpo, nunca píxeles: así el ajuste
 * vale igual a 480p que a 1080p y a cualquier distancia de la cámara.
 */
export interface GarmentFit {
  /** Ancho de la prenda como múltiplo del ancho de hombros (o caderas si es `lower`). */
  widthScale: number
  /** Largo como múltiplo de la longitud del tramo anclado (hombros→caderas, etc.). */
  heightScale: number
  /** Desplazamiento vertical, en múltiplos del ancho de hombros. Negativo = sube. */
  verticalOffset: number
}

export interface Garment {
  id: string
  name: string
  description: string
  category: GarmentCategory
  color: string
  size: GarmentSize
  /** Precio en la moneda de la tienda, en unidades (no céntimos). */
  price: number
  /** PNG/SVG con fondo transparente, servido desde /public. */
  imageUrl: string
  /** Derivado de `category`, pero explícito para que el motor no tenga que mapear. */
  region: BodyRegion
  fit: GarmentFit
}

export const REGION_BY_CATEGORY: Record<GarmentCategory, BodyRegion> = {
  shirt: 'upper',
  sweater: 'upper',
  jacket: 'upper',
  dress: 'full',
  pants: 'lower',
}

/**
 * Ajuste por defecto de cada tramo. Los valores salen de que la silueta de las
 * imágenes del catálogo se dibuja con el borde superior a la altura de la línea
 * de hombros.
 */
export const DEFAULT_FIT_BY_REGION: Record<BodyRegion, GarmentFit> = {
  upper: { widthScale: 1.62, heightScale: 1.28, verticalOffset: -0.2 },
  lower: { widthScale: 1.5, heightScale: 1.05, verticalOffset: -0.08 },
  full: { widthScale: 1.6, heightScale: 1.05, verticalOffset: -0.18 },
}

/** Entrada del catálogo: sólo lo que cambia por prenda. */
export type GarmentInput = Omit<Garment, 'region' | 'fit'> & {
  fit?: Partial<GarmentFit>
}

/**
 * Completa una entrada del catálogo con su región y su ajuste.
 * Centralizar esto evita que una prenda nueva se quede sin `fit` y aparezca
 * descolocada sobre el cuerpo.
 */
export function defineGarment(input: GarmentInput): Garment {
  const region = REGION_BY_CATEGORY[input.category]
  const { fit: overrides, ...rest } = input

  return {
    ...rest,
    region,
    fit: { ...DEFAULT_FIT_BY_REGION[region], ...overrides },
  }
}

export function formatPrice(price: number, currency = 'EUR', locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(price)
}
