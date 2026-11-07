#!/usr/bin/env node
/**
 * Genera las siluetas de las prendas en /public/garments.
 *
 * El catálogo original apuntaba a /images/clothes/*.png, que nunca existieron,
 * así que la tienda tapaba el 404 con un gradiente y el probador no tenía nada
 * que superponer.
 *
 * Convención que espera el motor: el arte se dibuja con la **línea de hombros
 * en el borde superior** del viewBox y la prenda cayendo hacia abajo. El motor
 * escala la imagen a (ancho de hombros × fit.widthScale) por (largo del torso ×
 * fit.heightScale) y la ancla en ese borde superior, así que cualquier margen
 * transparente arriba descoloca la prenda.
 *
 * Son siluetas vectoriales planas, no fotografías: suficiente para validar el
 * encaje y el seguimiento. Para una tienda real, sustituye estos archivos por
 * PNG con transparencia (flat-lay recortado) manteniendo la misma convención.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'garments')

const TOP_VIEWBOX = '0 0 200 240'
const PANTS_VIEWBOX = '0 0 200 300'

/** Camiseta/jersey: hombros arriba, mangas a los lados, bajo abajo. */
const TEE_BODY =
  'M45,12 C60,10 72,30 100,30 C128,30 140,10 155,12 L182,26 L197,88 L160,102 L160,236 L40,236 L40,102 L3,88 L18,26 Z'

/** Manga larga: la manga baja hasta la altura de la cadera. */
const LONG_SLEEVE_BODY =
  'M45,12 C60,10 72,30 100,30 C128,30 140,10 155,12 L184,28 L198,150 L160,158 L160,236 L40,236 L40,158 L2,150 L16,28 Z'

/** Chaqueta: hombros más anchos y bajo por debajo de la cadera. */
const JACKET_BODY =
  'M42,14 C58,12 70,34 100,34 C130,34 142,12 158,14 L188,30 L199,152 L162,160 L162,238 L38,238 L38,160 L1,152 L12,30 Z'

const PANTS_BODY = 'M30,4 L170,4 L180,92 L166,296 L114,296 L100,146 L86,296 L34,296 L20,92 Z'

const NECK_RIB = 'M45,12 C60,10 72,30 100,30 C128,30 140,10 155,12 L151,22 C138,20 126,40 100,40 C74,40 62,20 49,22 Z'

/** Cuello de la chaqueta, alineado con JACKET_BODY. */
const JACKET_COLLAR =
  'M42,14 C58,12 70,34 100,34 C130,34 142,12 158,14 L152,30 C138,28 126,48 100,48 C74,48 62,28 48,30 Z'

const HOOD = 'M62,16 C74,44 88,54 100,54 C112,54 126,44 138,16 L148,24 C136,62 118,74 100,74 C82,74 64,62 52,24 Z'

const garments = [
  {
    file: 'tshirt-black.svg',
    viewBox: TOP_VIEWBOX,
    body: TEE_BODY,
    fill: '#1C1C1E',
    shade: '#000000',
    details: [{ d: NECK_RIB, fill: '#3A3A3C' }],
  },
  {
    file: 'tshirt-white.svg',
    viewBox: TOP_VIEWBOX,
    body: TEE_BODY,
    fill: '#F4F4F5',
    shade: '#C8C8CC',
    details: [{ d: NECK_RIB, fill: '#D9D9DE' }],
  },
  {
    file: 'sweater-grey.svg',
    viewBox: TOP_VIEWBOX,
    body: LONG_SLEEVE_BODY,
    fill: '#4B5563',
    shade: '#2F3640',
    details: [
      { d: NECK_RIB, fill: '#6B7280' },
      { d: 'M40,224 L160,224 L160,236 L40,236 Z', fill: '#374151' },
    ],
  },
  {
    file: 'hoodie-red.svg',
    viewBox: TOP_VIEWBOX,
    body: LONG_SLEEVE_BODY,
    fill: '#B91C1C',
    shade: '#7F1D1D',
    details: [
      { d: HOOD, fill: '#991B1B' },
      // Bolsillo canguro.
      { d: 'M62,160 L138,160 L138,206 L62,206 Z', fill: '#9F1239', opacity: 0.75 },
      { d: 'M98,52 L102,52 L102,150 L98,150 Z', fill: '#F9FAFB', opacity: 0.8 },
    ],
  },
  {
    file: 'jacket-denim.svg',
    viewBox: TOP_VIEWBOX,
    body: JACKET_BODY,
    fill: '#3B5B8C',
    shade: '#27405F',
    details: [
      { d: JACKET_COLLAR, fill: '#4C6FA5' },
      // Botonadura central.
      { d: 'M97,48 L103,48 L103,238 L97,238 Z', fill: '#27405F' },
      { d: 'M56,110 L92,110 L92,140 L56,140 Z', fill: '#34527A' },
      { d: 'M108,110 L144,110 L144,140 L108,140 Z', fill: '#34527A' },
    ],
  },
  {
    file: 'jacket-puffer.svg',
    viewBox: TOP_VIEWBOX,
    body: JACKET_BODY,
    fill: '#17181C',
    shade: '#000000',
    details: [
      { d: JACKET_COLLAR, fill: '#2C2E34' },
      // Costuras del acolchado.
      ...[78, 112, 146, 180, 214].map(y => ({
        d: `M38,${y} L162,${y} L162,${y + 4} L38,${y + 4} Z`,
        fill: '#34363D',
      })),
      { d: 'M98,48 L102,48 L102,238 L98,238 Z', fill: '#44464E' },
    ],
  },
  {
    file: 'jeans-light.svg',
    viewBox: PANTS_VIEWBOX,
    body: PANTS_BODY,
    fill: '#6E97C7',
    shade: '#4E7099',
    details: [
      { d: 'M30,4 L170,4 L172,28 L28,28 Z', fill: '#5B83B0' },
      { d: 'M46,40 L82,40 L78,74 L50,74 Z', fill: '#5B83B0', opacity: 0.8 },
      { d: 'M118,40 L154,40 L150,74 L122,74 Z', fill: '#5B83B0', opacity: 0.8 },
    ],
  },
  {
    file: 'chino-black.svg',
    viewBox: PANTS_VIEWBOX,
    body: PANTS_BODY,
    fill: '#1F1F23',
    shade: '#000000',
    details: [
      { d: 'M30,4 L170,4 L172,26 L28,26 Z', fill: '#2E2E34' },
      { d: 'M98,26 L102,26 L102,146 L98,146 Z', fill: '#2E2E34' },
    ],
  },
]

function renderSvg({ viewBox, body, fill, shade, details }) {
  const [, , width, height] = viewBox.split(' ')
  const gradientId = 'g'

  const detailShapes = details
    .map(
      detail =>
        `  <path d="${detail.d}" fill="${detail.fill}"${
          detail.opacity ? ` opacity="${detail.opacity}"` : ''
        }/>`
    )
    .join('\n')

  // El `clipPath` recorta los detalles a la silueta para que nada sobresalga
  // del contorno de la prenda.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${fill}"/>
      <stop offset="100%" stop-color="${shade}"/>
    </linearGradient>
    <clipPath id="silhouette">
      <path d="${body}"/>
    </clipPath>
  </defs>
  <path d="${body}" fill="url(#${gradientId})"/>
  <g clip-path="url(#silhouette)">
${detailShapes}
  </g>
  <path d="${body}" fill="none" stroke="${shade}" stroke-width="2" stroke-linejoin="round"/>
</svg>
`
}

await mkdir(OUT_DIR, { recursive: true })

for (const garment of garments) {
  await writeFile(join(OUT_DIR, garment.file), renderSvg(garment), 'utf8')
}

console.log(`[garment-assets] ${garments.length} siluetas escritas en public/garments`)
