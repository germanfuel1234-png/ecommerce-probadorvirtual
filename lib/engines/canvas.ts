/**
 * Utilidades de canvas compartidas por todos los motores y por el bucle de
 * render. Centralizarlas evita que cada motor decida por su cuenta cómo
 * espejar el vídeo, que es la fuente típica de que la prenda salga al revés.
 */
import type { GarmentPlacement } from './poseGeometry'

export function isVideoReady(source: HTMLVideoElement): boolean {
  return source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && source.videoWidth > 0
}

/**
 * Iguala el canvas a la resolución nativa del vídeo.
 * Devuelve `true` si hubo cambio de tamaño, para que el motor pueda descartar
 * el estado de suavizado (que está en píxeles y ya no es válido).
 */
export function syncCanvasSize(target: HTMLCanvasElement, source: HTMLVideoElement): boolean {
  if (target.width === source.videoWidth && target.height === source.videoHeight) {
    return false
  }

  target.width = source.videoWidth
  target.height = source.videoHeight
  return true
}

/** Pinta el frame actual del vídeo, reflejado si se pide vista selfie. */
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement,
  width: number,
  height: number,
  mirrored: boolean
): void {
  ctx.save()
  if (mirrored) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, 0, 0, width, height)
  ctx.restore()
}

/**
 * Cuántas franjas horizontales se usan para angostar la prenda a la cintura.
 * Esto corre todos los frames (a diferencia del segmentador, que tiene su
 * propio freno): en equipos débiles cada `drawImage` de más pesa, así que se
 * se mantiene bajo — igual se nota el angostamiento, sólo menos suave.
 */
const WARP_STRIPS = 12

function naturalSize(image: HTMLImageElement | HTMLCanvasElement): { width: number; height: number } {
  return image instanceof HTMLImageElement
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: image.width, height: image.height }
}

/**
 * Dibuja la prenda en el rectángulo orientado que ha calculado la geometría,
 * cortada en franjas horizontales cuyo ancho sigue `placement.widthAt` — así
 * la imagen se angosta en la cintura en vez de quedar como un bloque recto.
 * No es una malla real (eso pide deformar también por el eje X si el torso
 * gira), pero a este costo (un puñado de `drawImage` más) ya se nota la
 * diferencia contra pegar un único rectángulo.
 *
 * La opacidad se recibe por parámetro para que este módulo no dependa de la
 * configuración de ningún motor concreto.
 */
export function drawGarment(
  ctx: CanvasRenderingContext2D,
  placement: GarmentPlacement,
  image: HTMLImageElement | HTMLCanvasElement,
  opacity = 1
): void {
  const { width: srcWidth, height: srcHeight } = naturalSize(image)
  if (srcWidth === 0 || srcHeight === 0) {
    return
  }

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.translate(placement.anchor.x, placement.anchor.y)
  ctx.rotate(placement.rotation)

  const srcStripHeight = srcHeight / WARP_STRIPS
  // Un pelo más alta que `height / WARP_STRIPS` para que no queden líneas
  // transparentes entre franjas por redondeo de subpíxel.
  const destStripHeight = (placement.height / WARP_STRIPS) * 1.02

  for (let i = 0; i < WARP_STRIPS; i += 1) {
    const t = (i + 0.5) / WARP_STRIPS
    const stripWidth = placement.width * placement.widthAt(t)
    const srcY = i * srcStripHeight
    const destY = placement.offsetY + i * (placement.height / WARP_STRIPS)

    ctx.drawImage(
      image,
      0,
      srcY,
      srcWidth,
      srcStripHeight,
      -stripWidth / 2,
      destY,
      stripWidth,
      destStripHeight
    )
  }

  ctx.restore()
}

/** Captura el frame visible del canvas como JPEG, para enviarlo a un motor remoto. */
export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('No se pudo codificar el frame'))),
      'image/jpeg',
      quality
    )
  })
}
