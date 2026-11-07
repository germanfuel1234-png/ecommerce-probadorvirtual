/**
 * Motor de reserva sin IA: coloca la prenda en una posición fija del cuadro,
 * asumiendo un cuerpo centrado. Sirve para desarrollar la UI sin cargar el
 * modelo y como degradación si el modelo de pose no está disponible.
 */
import type { Garment } from '@/lib/domain/garment'
import { drawGarment, drawVideoFrame, isVideoReady, syncCanvasSize } from './canvas'
import { placeGarment, type BodyFrame } from './poseGeometry'
import type { EngineInfo, FrameRequest, FrameResult, TryOnEngine } from './types'

/** Proporciones de un torso "medio" encuadrado dentro del marco guía. */
const ASSUMED = {
  shoulderY: 0.34,
  hipY: 0.78,
  legEndY: 1.18,
  acrossRatio: 0.3,
}

function assumedBody(garment: Garment, width: number, height: number): BodyFrame {
  const centerX = width / 2
  const across = width * ASSUMED.acrossRatio

  if (garment.region === 'lower') {
    return {
      top: { x: centerX, y: height * ASSUMED.hipY },
      bottom: { x: centerX, y: height * ASSUMED.legEndY },
      across,
    }
  }

  return {
    top: { x: centerX, y: height * ASSUMED.shoulderY },
    bottom: {
      x: centerX,
      y: height * (garment.region === 'full' ? ASSUMED.legEndY : ASSUMED.hipY),
    },
    across,
  }
}

export class MockEngine implements TryOnEngine {
  readonly info: EngineInfo = {
    id: 'mock',
    label: 'Mock · posición fija, sin IA',
    mode: 'realtime',
    requiresNetwork: false,
  }

  private garment: Garment | null = null
  private garmentImage: HTMLImageElement | null = null

  async init(): Promise<void> {
    // Nada que cargar.
  }

  async setGarment(garment: Garment | null): Promise<void> {
    this.garment = garment

    if (!garment) {
      this.garmentImage = null
      return
    }

    const image = new Image()
    image.src = garment.imageUrl
    await image.decode()
    this.garmentImage = image
  }

  async renderFrame({ source, target, mirrored }: FrameRequest): Promise<FrameResult> {
    const startedAt = performance.now()
    const ctx = target.getContext('2d')

    if (!ctx || !isVideoReady(source)) {
      return { bodyDetected: false, latencyMs: performance.now() - startedAt }
    }

    syncCanvasSize(target, source)
    const { width, height } = target
    drawVideoFrame(ctx, source, width, height, mirrored)

    if (!this.garment || !this.garmentImage) {
      return { bodyDetected: false, latencyMs: performance.now() - startedAt }
    }

    const placement = placeGarment(assumedBody(this.garment, width, height), this.garment.fit)
    drawGarment(ctx, placement, this.garmentImage)

    // Nunca detecta cuerpo de verdad: la UI debe poder decírselo al usuario.
    return { bodyDetected: false, latencyMs: performance.now() - startedAt }
  }

  dispose(): void {
    this.garment = null
    this.garmentImage = null
  }
}

export default MockEngine
