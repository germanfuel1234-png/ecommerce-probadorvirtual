/**
 * Motor de try-on local, 100% en el navegador.
 *
 * Pipeline por frame:
 *   <video> → MediaPipe PoseLandmarker (WASM, local) → landmarks
 *           → geometría (poseGeometry) → rectángulo orientado
 *           → composición de la prenda en <canvas>
 *           → ImageSegmenter (opcional) → recorte de oclusión
 *
 * No hay red, no hay API key y no hace falta GPU dedicada: el WASM corre sobre
 * WebGL si está disponible y cae a CPU si no. A cambio no es difusión: la
 * prenda se deforma y se orienta sobre el cuerpo, no se re-renderiza.
 *
 * La oclusión (que un brazo cruzado por delante del torso no quede tapado) se
 * resuelve con un segundo modelo, `ImageSegmenter` multiclase, que separa
 * pelo/piel/cara del resto del frame. Es una mejora, no un requisito: si el
 * modelo no está descargado o falla al cargar, el motor sigue funcionando
 * exactamente como antes, sin recorte.
 */
import type { ImageSegmenter, PoseLandmarker } from '@mediapipe/tasks-vision'

import { LOCAL_ENGINE_CONFIG } from '@/lib/config/tryOn'
import type { Garment } from '@/lib/domain/garment'
import { drawGarment, drawVideoFrame, isVideoReady, syncCanvasSize } from './canvas'
import { tintGarmentImage } from './colorize'
import { OcclusionMask } from './occlusionMask'
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
  private segmenter: ImageSegmenter | null = null
  private garment: Garment | null = null
  private garmentImage: HTMLImageElement | null = null
  private readonly imageCache = new Map<string, HTMLImageElement>()
  private smoothed: BodyFrame | null = null
  private lastTimestamp = -1
  private lastSegmentTimestamp = -1
  private frameCounter = 0

  /** Media móvil del costo de un frame completo; decide si hay margen para seguir segmentando. */
  private avgFrameMs = 0
  private segmentationSuspended = false

  /** Capa aparte para poder recortar la prenda sin tocar el frame ya pintado. */
  private garmentLayer: HTMLCanvasElement | null = null
  private readonly occlusion = new OcclusionMask()

  private tintColor: string | null = null
  private tintedImage: HTMLCanvasElement | null = null

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
      console.info('[local-pose] Landmarker de pose en GPU (WebGL).')
    } catch {
      // Sin WebGL utilizable; CPU va más lento pero funciona en cualquier equipo.
      this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: LOCAL_ENGINE_CONFIG.modelPath, delegate: 'CPU' },
      })
      console.info('[local-pose] Sin WebGL utilizable: landmarker de pose en CPU (más lento).')
    }

    this.garmentLayer = document.createElement('canvas')
    this.segmenter = await this.initSegmenter(vision, fileset)
  }

  /**
   * La oclusión es una mejora, no un requisito: a diferencia del `landmarker`
   * (que si falla aborta todo el motor), un fallo aquí sólo se registra y el
   * resto sigue funcionando sin recorte, como antes de que existiera esto.
   */
  private async initSegmenter(
    vision: typeof import('@mediapipe/tasks-vision'),
    fileset: Awaited<ReturnType<typeof import('@mediapipe/tasks-vision').FilesetResolver.forVisionTasks>>
  ): Promise<ImageSegmenter | null> {
    const probe = await fetch(LOCAL_ENGINE_CONFIG.segmentationModelPath, { method: 'HEAD' }).catch(() => null)
    if (!probe?.ok) {
      console.warn(
        '[local-pose] No se encuentra el modelo de segmentación; sigue sin oclusión. Ejecuta: npm run setup:local-ai'
      )
      return null
    }

    const segmenterOptions = {
      runningMode: 'VIDEO' as const,
      outputCategoryMask: true,
      outputConfidenceMasks: false,
      baseOptions: { modelAssetPath: LOCAL_ENGINE_CONFIG.segmentationModelPath, delegate: 'GPU' as const },
    }

    try {
      const segmenter = await vision.ImageSegmenter.createFromOptions(fileset, segmenterOptions)
      console.info('[local-pose] Segmentador de oclusión en GPU (WebGL).')
      return segmenter
    } catch {
      try {
        const segmenter = await vision.ImageSegmenter.createFromOptions(fileset, {
          ...segmenterOptions,
          baseOptions: { ...segmenterOptions.baseOptions, delegate: 'CPU' },
        })
        console.info(
          '[local-pose] Sin WebGL utilizable: segmentador de oclusión en CPU (más lento, ya corre cada ' +
            `${LOCAL_ENGINE_CONFIG.segmentEveryNFrames} frames para compensar).`
        )
        return segmenter
      } catch (err) {
        console.warn('[local-pose] No se pudo iniciar el segmentador; sigue sin oclusión.', err)
        return null
      }
    }
  }

  async setGarment(garment: Garment | null): Promise<void> {
    this.garment = garment
    this.smoothed = null

    if (!garment) {
      this.garmentImage = null
      this.tintedImage = null
      return
    }

    this.garmentImage = await this.loadImage(garment.imageUrl)
    // El tinte se eligió para "lo que tengo puesto, sea lo que sea": si ya
    // había un color activo, se re-aplica sobre la prenda nueva.
    this.tintedImage = this.tintColor ? tintGarmentImage(this.garmentImage, this.tintColor) : null
  }

  /** Tinta en vivo la imagen activa. `null` vuelve a la foto/silueta original. */
  setTint(hex: string | null): void {
    this.tintColor = hex
    this.tintedImage = hex && this.garmentImage ? tintGarmentImage(this.garmentImage, hex) : null
  }

  private get activeImage(): HTMLImageElement | HTMLCanvasElement | null {
    return this.tintedImage ?? this.garmentImage
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
      if (this.smoothed && this.activeImage) {
        drawGarment(
          ctx,
          placeGarment(this.smoothed, this.garment.fit),
          this.activeImage,
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

    this.compositeGarment(ctx, source, placeGarment(this.smoothed, this.garment.fit), width, height, mirrored, timestampMs)

    const elapsed = performance.now() - startedAt
    // Media móvil exponencial: no hace falta guardar un historial de muestras,
    // y pesa más lo reciente — si el fps cae ahora, que reaccione ahora.
    this.avgFrameMs = this.avgFrameMs === 0 ? elapsed : this.avgFrameMs * 0.8 + elapsed * 0.2

    return { bodyDetected: true, latencyMs: elapsed }
  }

  /**
   * Pinta la prenda y, si hay segmentador disponible, la recorta antes de
   * componerla: se dibuja en una capa aparte, se recorta con la máscara de
   * pelo/piel de ese mismo frame y recién entonces se vuelca al canvas visible.
   */
  private compositeGarment(
    ctx: CanvasRenderingContext2D,
    source: HTMLVideoElement,
    placement: ReturnType<typeof placeGarment>,
    width: number,
    height: number,
    mirrored: boolean,
    timestampMs: number
  ): void {
    const image = this.activeImage
    if (!image) {
      return
    }

    if (!this.segmenter || !this.garmentLayer) {
      drawGarment(ctx, placement, image, LOCAL_ENGINE_CONFIG.garmentOpacity)
      return
    }

    const layer = this.garmentLayer
    if (layer.width !== width || layer.height !== height) {
      layer.width = width
      layer.height = height
    }

    const layerCtx = layer.getContext('2d')
    if (!layerCtx) {
      drawGarment(ctx, placement, image, LOCAL_ENGINE_CONFIG.garmentOpacity)
      return
    }

    layerCtx.clearRect(0, 0, width, height)
    drawGarment(layerCtx, placement, image, LOCAL_ENGINE_CONFIG.garmentOpacity)

    this.updateSegmentationSuspension()

    // El segmentador es un segundo modelo de IA: correrlo todos los frames
    // duplica el costo de inferencia por frame. Se actualiza cada N frames
    // (segmentEveryNFrames) y se reaplica la última máscara calculada en los
    // frames intermedios — barato, sólo un drawImage — así la oclusión no
    // parpadea aunque la IA no la recalcule todos los frames. Si el equipo ya
    // viene renqueando (`segmentationSuspended`), ni eso: se deja de pedir
    // oclusión nueva hasta que el fps se recupere solo.
    this.frameCounter += 1
    const dueForSegment =
      !this.segmentationSuspended && this.frameCounter % LOCAL_ENGINE_CONFIG.segmentEveryNFrames === 0

    // El segmentador tiene su propio reloj de timestamps crecientes: es un
    // modelo WASM distinto del landmarker, no comparte estado con él.
    if (dueForSegment && timestampMs > this.lastSegmentTimestamp) {
      this.lastSegmentTimestamp = timestampMs
      const result = this.segmenter.segmentForVideo(source, timestampMs)
      if (result.categoryMask) {
        this.occlusion.update(result.categoryMask, LOCAL_ENGINE_CONFIG.occludingCategories, mirrored, width, height)
      }
      result.close()
    }

    this.occlusion.applyTo(layer)

    ctx.drawImage(layer, 0, 0)
  }

  /**
   * Umbral con histéresis (apaga por encima de `perfDegradeMs`, recupera por
   * debajo de `perfRecoverMs`, ambos distintos) para no prender y apagar la
   * oclusión en cada frame si el costo promedio queda justo en el límite.
   */
  private updateSegmentationSuspension(): void {
    if (this.avgFrameMs === 0) {
      return // todavía no hay una muestra real de cuánto tarda un frame.
    }

    if (!this.segmentationSuspended && this.avgFrameMs > LOCAL_ENGINE_CONFIG.perfDegradeMs) {
      this.segmentationSuspended = true
      console.info(
        `[local-pose] ${this.avgFrameMs.toFixed(0)}ms/frame, muy lento: oclusión desactivada sola para no empeorarlo.`
      )
    } else if (this.segmentationSuspended && this.avgFrameMs < LOCAL_ENGINE_CONFIG.perfRecoverMs) {
      this.segmentationSuspended = false
      console.info(`[local-pose] ${this.avgFrameMs.toFixed(0)}ms/frame, rendimiento recuperado: oclusión reactivada.`)
    }
  }

  /** Fuerza al siguiente frame válido a fijar la prenda sin arrastrar el suavizado anterior. */
  recalibrate(): void {
    this.smoothed = null
  }

  dispose(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.segmenter?.close()
    this.segmenter = null
    this.garmentLayer = null
    this.garment = null
    this.garmentImage = null
    this.tintedImage = null
    this.tintColor = null
    this.imageCache.clear()
    this.smoothed = null
    this.lastTimestamp = -1
    this.lastSegmentTimestamp = -1
    this.frameCounter = 0
    this.avgFrameMs = 0
    this.segmentationSuspended = false
    this.occlusion.reset()
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
