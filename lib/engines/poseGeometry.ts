/**
 * Geometría pura: de landmarks de pose a un rectángulo orientado donde dibujar
 * la prenda. Sin DOM ni canvas, para poder razonarlo (y testearlo) aparte del
 * motor.
 */
import type { BodyRegion, GarmentFit } from '@/lib/domain/garment'

export interface Point {
  x: number
  y: number
}

/** Landmark normalizado (0..1) tal como lo devuelve MediaPipe. */
export interface Landmark extends Point {
  visibility?: number
}

/** Índices del modelo BlazePose (33 puntos). */
export const POSE_LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

/** Rectángulo orientado, en píxeles de canvas. */
export interface GarmentPlacement {
  /** Punto de anclaje superior (centro de hombros o de caderas). */
  anchor: Point
  width: number
  height: number
  /** Rotación en radianes a aplicar antes de dibujar. */
  rotation: number
  /** Desplazamiento vertical ya resuelto a píxeles. */
  offsetY: number
}

/** Puntos de referencia del cuerpo, ya en píxeles de canvas. */
export interface BodyFrame {
  /** Borde superior del tramo (hombros, o caderas si es `lower`). */
  top: Point
  /** Borde inferior del tramo (caderas, rodillas o tobillos). */
  bottom: Point
  /** Anchura transversal del tramo (entre hombros o entre caderas). */
  across: number
}

const dist = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y)

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
})

/**
 * Pasa un landmark normalizado a píxeles de canvas. Si la imagen se muestra en
 * espejo hay que reflejar la x, porque los landmarks vienen del vídeo original.
 */
export function toCanvasPoint(
  landmark: Landmark,
  width: number,
  height: number,
  mirrored: boolean
): Point {
  return {
    x: (mirrored ? 1 - landmark.x : landmark.x) * width,
    y: landmark.y * height,
  }
}

function isVisible(landmark: Landmark | undefined, minVisibility: number): landmark is Landmark {
  return landmark !== undefined && (landmark.visibility ?? 1) >= minVisibility
}

/**
 * Extrae los puntos de referencia del tramo pedido.
 * Devuelve `null` si faltan landmarks imprescindibles: entonces el motor pinta
 * sólo la cámara en vez de colocar la prenda en un sitio inventado.
 */
export function buildBodyFrame(
  landmarks: readonly Landmark[],
  region: BodyRegion,
  canvas: { width: number; height: number },
  mirrored: boolean,
  minVisibility: number
): BodyFrame | null {
  const at = (index: number): Landmark | undefined => landmarks[index]
  const px = (landmark: Landmark): Point =>
    toCanvasPoint(landmark, canvas.width, canvas.height, mirrored)

  const leftShoulder = at(POSE_LANDMARK.leftShoulder)
  const rightShoulder = at(POSE_LANDMARK.rightShoulder)
  const leftHip = at(POSE_LANDMARK.leftHip)
  const rightHip = at(POSE_LANDMARK.rightHip)

  // Hombros y caderas son obligatorios en los tres tramos: dan la escala.
  if (
    !isVisible(leftShoulder, minVisibility) ||
    !isVisible(rightShoulder, minVisibility) ||
    !isVisible(leftHip, minVisibility) ||
    !isVisible(rightHip, minVisibility)
  ) {
    return null
  }

  const shoulderMid = mid(px(leftShoulder), px(rightShoulder))
  const hipMid = mid(px(leftHip), px(rightHip))
  const shoulderWidth = dist(px(leftShoulder), px(rightShoulder))
  const hipWidth = dist(px(leftHip), px(rightHip))

  if (shoulderWidth < 1) {
    return null
  }

  if (region === 'upper') {
    return { top: shoulderMid, bottom: hipMid, across: shoulderWidth }
  }

  // Para piernas se prefieren tobillos; si están fuera de cuadro se extrapola
  // desde las rodillas (el muslo y la pantorrilla miden aproximadamente igual).
  const leftAnkle = at(POSE_LANDMARK.leftAnkle)
  const rightAnkle = at(POSE_LANDMARK.rightAnkle)
  const leftKnee = at(POSE_LANDMARK.leftKnee)
  const rightKnee = at(POSE_LANDMARK.rightKnee)

  let legEnd: Point | null = null

  if (isVisible(leftAnkle, minVisibility) && isVisible(rightAnkle, minVisibility)) {
    legEnd = mid(px(leftAnkle), px(rightAnkle))
  } else if (isVisible(leftKnee, minVisibility) && isVisible(rightKnee, minVisibility)) {
    const kneeMid = mid(px(leftKnee), px(rightKnee))
    legEnd = lerpPoint(hipMid, kneeMid, 2)
  }

  if (!legEnd) {
    return null
  }

  if (region === 'lower') {
    return { top: hipMid, bottom: legEnd, across: Math.max(hipWidth, 1) }
  }

  // 'full': desde los hombros hasta el final de la pierna.
  return { top: shoulderMid, bottom: legEnd, across: shoulderWidth }
}

/** Suaviza el cuerpo detectado contra el frame anterior (media exponencial). */
export function smoothBodyFrame(
  previous: BodyFrame | null,
  current: BodyFrame,
  smoothing: number
): BodyFrame {
  if (!previous || smoothing <= 0) {
    return current
  }

  const t = 1 - Math.min(Math.max(smoothing, 0), 0.95)

  return {
    top: lerpPoint(previous.top, current.top, t),
    bottom: lerpPoint(previous.bottom, current.bottom, t),
    across: lerp(previous.across, current.across, t),
  }
}

/**
 * Convierte el cuerpo detectado y el ajuste de la prenda en el rectángulo
 * orientado final. La rotación sigue el eje del torso (hombros→caderas), no la
 * línea de hombros, para que la prenda acompañe la inclinación del cuerpo.
 */
export function placeGarment(body: BodyFrame, fit: GarmentFit): GarmentPlacement {
  const axisAngle = Math.atan2(body.bottom.y - body.top.y, body.bottom.x - body.top.x)
  const span = dist(body.top, body.bottom)

  return {
    anchor: body.top,
    width: body.across * fit.widthScale,
    height: span * fit.heightScale,
    // El eje del torso apunta "hacia abajo"; restamos 90° para que el alto de
    // la imagen se dibuje a lo largo de ese eje.
    rotation: axisAngle - Math.PI / 2,
    offsetY: body.across * fit.verticalOffset,
  }
}
