/**
 * Motor de try-on local, 100% en el navegador.
 *
 * Pipeline por frame:
 *   <video> → MediaPipe PoseLandmarker (WASM, local) → landmarks
 *           → geometría (poseGeometry) → rectángulo orientado
 *           → composición de la prenda en <canvas>
 *
 * No hay red, no hay API key y no hace falta GPU dedicada: el WASM corre sobre
 * WebGL si está disponible y cae a CPU si no. A cambio no es difusión: la
 * prenda se deforma y se orienta sobre el cuerpo, no se re-renderiza, y no
 * resuelve oclusión (si cruzas los brazos, la prenda se dibuja encima).
 */
import type { PoseLandmarker } from '@mediapipe/tasks-vision'

import { LOCAL_ENGINE_CONFIG } from '@/lib/config/tryOn'
import type { Garment } from '@/lib/domain/garment'
import { drawGarment, drawVideoFrame, isVideoReady, syncCanvasSize } from './canvas'
import { buildBodyFrame, placeGarment, smoothBodyFrame, type BodyFrame } from './poseGeometry'
import { EngineInitError, type EngineInfo, type FrameRequest, type FrameResult, type TryOnEngine } from './types'

export class LocalPoseEngine implements TryOnEngine {
  readonly info: EngineInfo = {
    id: 'local-pose',
    label: 'Local · pose + canvas',
    mode: 'realtime',
    requiresNetwork: false,
  }

  private landmarker: PoseLandmarker | null = null
  private garment: Garment | null = null
  private garmentImage: HTMLImageElement | null = null
  private readonly imageCache = new Map<string, HTMLImageElement>()
  private smoothed: BodyFrame | null = null
  private lastTimestamp = -1

  async init(): Promise<void> {
    if (this.landmarker) {
      return
    }

    if (typeof window === 'undefined') {
      throw new EngineInitError('El motor local sólo puede inicializarse en el navegador.', 'unsupported')
    }

    // Comprobar el modelo antes de arrancar MediaPipe: si falta, el error que
    // lanza el WASM es ilegible, y la causa casi siempre es no haber corrido
    // `npm run setup:local-ai`.
    const probe = await fetch(LOCAL_ENGINE_CONFIG.modelPath, { method: 'HEAD' }).catch(() => null)
    if (!probe?.ok) {
      throw new EngineInitError(
        'No se encuentra el modelo de pose en /public/models. Ejecuta: npm run setup:local-ai',
        'assets_missing'
      )
    }

    const vision = await import('@mediapipe/tasks-vision')
    const fileset = await vision.FilesetResolver.forVisionTasks(LOCAL_ENGINE_CONFIG.wasmPath)

    const options = {
      runningMode: 'VIDEO' as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }

    try {
      this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: LOCAL_ENGINE_CONFIG.modelPath, delegate: 'GPU' },
      })
    } catch {
      // Sin WebGL utilizable; CPU va más lento pero funciona en cualquier equipo.
      this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: LOCAL_ENGINE_CONFIG.modelPath, delegate: 'CPU' },
      })
    }
  }

  async setGarment(garment: Garment | null): Promise<void> {
    this.garment = garment
    this.smoothed = null

    if (!garment) {
      this.garmentImage = null
      return
    }

    this.garmentImage = await this.loadImage(garment.imageUrl)
  }

  async renderFrame({ source, target, timestampMs, mirrored }: FrameRequest): Promise<FrameResult> {
    const startedAt = performance.now()

    const ctx = target.getContext('2d')

    if (!ctx || !isVideoReady(source)) {
      return { bodyDetected: false, latencyMs: performance.now() - startedAt }
    }

    if (syncCanvasSize(target, source)) {
      this.smoothed = null
    }

    const { width, height } = target
    drawVideoFrame(ctx, source, width, height, mirrored)

    if (!this.landmarker || !this.garment || !this.garmentImage) {
      return { bodyDetected: false, latencyMs: performance.now() - startedAt }
    }

    // MediaPipe aborta si el timestamp no avanza. Cuando eso pasa no podemos
    // pedir landmarks nuevos, pero sí repintar la prenda con los últimos
    // válidos: acabamos de redibujar el vídeo encima, así que si saltáramos sin
    // más la prenda desaparecería durante ese frame y se vería un parpadeo.
    if (timestampMs <= this.lastTimestamp) {
      if (this.smoothed) {
        drawGarment(
          ctx,
          placeGarment(this.smoothed, this.garment.fit),
          this.garmentImage,
          LOCAL_ENGINE_CONFIG.garmentOpacity
        )
      }

      return { bodyDetected: this.smoothed !== null, latencyMs: performance.now() - startedAt }
    }
    this.lastTimestamp = timestampMs

    const landmarks = this.landmarker.detectForVideo(source, timestampMs).landmarks.at(0)

    if (!landmarks) {
      this.smoothed = null
      return { bodyDetected: false, latencyMs: performance.now() - startedAt }
    }

    const body = buildBodyFrame(
      landmarks,
      this.garment.region,
      { width, height },
      mirrored,
      LOCAL_ENGINE_CONFIG.minVisibility
    )

    if (!body) {
      this.smoothed = null
      return { bodyDetected: false, latencyMs: performance.now() - startedAt }
    }

    this.smoothed = smoothBodyFrame(this.smoothed, body, LOCAL_ENGINE_CONFIG.smoothing)

    drawGarment(
      ctx,
      placeGarment(this.smoothed, this.garment.fit),
      this.garmentImage,
      LOCAL_ENGINE_CONFIG.garmentOpacity
    )

    return { bodyDetected: true, latencyMs: performance.now() - startedAt }
  }

  dispose(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.garment = null
    this.garmentImage = null
    this.imageCache.clear()
    this.smoothed = null
    this.lastTimestamp = -1
  }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    const cached = this.imageCache.get(src)
    if (cached) {
      return cached
    }

    const image = new Image()
    image.src = src

    try {
      await image.decode()
    } catch {
      throw new Error(`No se pudo cargar la imagen de la prenda: ${src}`)
    }

    this.imageCache.set(src, image)
    return image
  }
}

export default LocalPoseEngine
