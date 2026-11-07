/**
 * Catálogo local. Sustituye a una llamada a CMS/Shopify: misma forma de datos,
 * así que cambiar a un backend real sólo afecta a este archivo.
 */
import { defineGarment, type Garment, type GarmentCategory } from '@/lib/domain/garment'

export const GARMENTS: readonly Garment[] = [
  defineGarment({
    id: 'shirt-001',
    name: 'Camiseta Clásica Negra',
    description: 'Camiseta de algodón 100% premium, corte regular.',
    category: 'shirt',
    color: 'Negro',
    size: 'M',
    price: 29.99,
    imageUrl: '/garments/tshirt-black.svg',
  }),
  defineGarment({
    id: 'shirt-002',
    name: 'Camiseta Blanca Premium',
    description: 'Algodón pima de alta calidad, tacto suave.',
    category: 'shirt',
    color: 'Blanco',
    size: 'M',
    price: 32.99,
    imageUrl: '/garments/tshirt-white.svg',
  }),
  defineGarment({
    id: 'jacket-001',
    name: 'Chaqueta Denim Clásica',
    description: 'Denim vintage resistente con botonadura metálica.',
    category: 'jacket',
    color: 'Azul',
    size: 'M',
    price: 79.99,
    imageUrl: '/garments/jacket-denim.svg',
    // Las chaquetas abren más de hombros y caen por debajo de la cadera.
    fit: { widthScale: 1.78, heightScale: 1.36 },
  }),
  defineGarment({
    id: 'jacket-002',
    name: 'Chaqueta Puffer Negra',
    description: 'Acolchada e impermeable, con volumen en el torso.',
    category: 'jacket',
    color: 'Negro',
    size: 'M',
    price: 129.99,
    imageUrl: '/garments/jacket-puffer.svg',
    fit: { widthScale: 1.92, heightScale: 1.34 },
  }),
  defineGarment({
    id: 'sweater-001',
    name: 'Suéter Gris Oscuro',
    description: 'Lana merino suave, cuello redondo.',
    category: 'sweater',
    color: 'Gris',
    size: 'M',
    price: 54.99,
    imageUrl: '/garments/sweater-grey.svg',
    fit: { widthScale: 1.7 },
  }),
  defineGarment({
    id: 'sweater-002',
    name: 'Sudadera Hoodie Roja',
    description: 'Algodón orgánico con capucha y bolsillo canguro.',
    category: 'sweater',
    color: 'Rojo',
    size: 'M',
    price: 49.99,
    imageUrl: '/garments/hoodie-red.svg',
    fit: { widthScale: 1.8, heightScale: 1.32 },
  }),
  defineGarment({
    id: 'pants-001',
    name: 'Jeans Azul Claro',
    description: 'Denim premium de corte skinny.',
    category: 'pants',
    color: 'Azul',
    size: 'M',
    price: 59.99,
    imageUrl: '/garments/jeans-light.svg',
  }),
  defineGarment({
    id: 'pants-002',
    name: 'Pantalón Chino Negro',
    description: 'Chino ajustado de algodón elástico.',
    category: 'pants',
    color: 'Negro',
    size: 'M',
    price: 64.99,
    imageUrl: '/garments/chino-black.svg',
  }),
]

const BY_ID = new Map(GARMENTS.map(g => [g.id, g]))

export function findGarment(id: string): Garment | undefined {
  return BY_ID.get(id)
}

export function garmentsByCategory(category?: GarmentCategory): readonly Garment[] {
  return category ? GARMENTS.filter(g => g.category === category) : GARMENTS
}
