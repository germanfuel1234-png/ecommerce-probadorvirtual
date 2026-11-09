/**
 * Catálogo local. Sustituye a una llamada a CMS/Shopify: misma forma de datos,
 * así que cambiar a un backend real sólo afecta a este archivo.
 *
 * Todas las prendas son fotos reales de producto (no siluetas vectoriales),
 * procesadas con `scripts/import-photos/process_photos.py --mode on-model`
 * a partir de un subset de Kaggle (paramaggarwal/fashion-product-images,
 * licencia MIT). Son fotos de catálogo con alguien puesta la prenda: el
 * segmentador de ropa (el mismo ImageSegmenter que usa el motor para la
 * oclusión) aisló sólo la prenda y descartó a la persona.
 *
 * El color no se elige por producto: el probador lo tiñe en vivo sobre
 * cualquier prenda activa (ver components/VirtualTryOn/ColorSwatches.tsx y
 * lib/engines/colorize.ts). `colorHex` acá es sólo el color real de la foto.
 */
import { defineGarment, type Garment, type GarmentCategory } from '@/lib/domain/garment'

export const GARMENTS: readonly Garment[] = [
  defineGarment({
    id: 'jacket-003',
    name: 'Trench Forever New Crudo',
    description: 'Trench clásico con cinturón, foto de catálogo real.',
    category: 'jacket',
    color: 'Crudo',
    colorHex: '#E8DCC8',
    size: 'M',
    price: 94.99,
    imageUrl: '/garments/jacket-cream-6889.png',
    fit: { widthScale: 1.85, heightScale: 1.35 },
  }),
  defineGarment({
    id: 'jacket-004',
    name: 'Campera Adidas Originals Verde',
    description: 'Campera deportiva con franjas laterales, foto de catálogo real.',
    category: 'jacket',
    color: 'Verde',
    colorHex: '#3C8C4B',
    size: 'M',
    price: 89.99,
    imageUrl: '/garments/jacket-green-19744.png',
    fit: { widthScale: 1.85, heightScale: 1.35 },
  }),
  defineGarment({
    id: 'shirt-003',
    name: 'Polo Puma Gris',
    description: 'Polo deportivo con logo bordado, foto de catálogo real.',
    category: 'shirt',
    color: 'Gris',
    colorHex: '#8A99A3',
    size: 'M',
    price: 39.99,
    imageUrl: '/garments/shirt-grey-polo-53759.png',
  }),
  defineGarment({
    id: 'shirt-004',
    name: 'Camisa a Cuadros Azul Marino',
    description: 'Camisa de manga corta a cuadros, foto de catálogo real.',
    category: 'shirt',
    color: 'Azul Marino',
    colorHex: '#2B3A55',
    size: 'M',
    price: 44.99,
    imageUrl: '/garments/shirt-navy-blue-15970.png',
  }),
  defineGarment({
    id: 'shirt-005',
    name: 'Camisa Jealous 21 Violeta',
    description: 'Camisa de mujer manga corta, foto de catálogo real.',
    category: 'shirt',
    color: 'Violeta',
    colorHex: '#6B3F57',
    size: 'M',
    price: 42.99,
    imageUrl: '/garments/shirt-purple-26960.png',
  }),
  defineGarment({
    id: 'sweater-003',
    name: 'Buzo Adidas Celeste',
    description: 'Buzo deportivo con capucha, foto de catálogo real.',
    category: 'sweater',
    color: 'Celeste',
    colorHex: '#4FB5D6',
    size: 'M',
    price: 69.99,
    imageUrl: '/garments/sweater-blue-23876.png',
    fit: { widthScale: 1.75, heightScale: 1.3 },
  }),
]

const BY_ID = new Map(GARMENTS.map(g => [g.id, g]))

export function findGarment(id: string): Garment | undefined {
  return BY_ID.get(id)
}

export function garmentsByCategory(category?: GarmentCategory): readonly Garment[] {
  return category ? GARMENTS.filter(g => g.category === category) : GARMENTS
}
