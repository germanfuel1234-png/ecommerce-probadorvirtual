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
 * Dibuja la prenda en el rectángulo orientado que ha calculado la geometría.
 * La opacidad se recibe por parámetro para que este módulo no dependa de la
 * configuración de ningún motor concreto.
 */
export function drawGarment(
  ctx: CanvasRenderingContext2D,
  placement: GarmentPlacement,
  image: CanvasImageSource,
  opacity = 1
): void {
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.translate(placement.anchor.x, placement.anchor.y)
  ctx.rotate(placement.rotation)
  ctx.drawImage(image, -placement.width / 2, placement.offsetY, placement.width, placement.height)
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
