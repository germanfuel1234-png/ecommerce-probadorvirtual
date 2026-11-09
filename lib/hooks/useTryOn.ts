'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import { CAMERA_CONFIG, TRYON_ENGINE, type EngineId } from '@/lib/config/tryOn'
import type { Garment } from '@/lib/domain/garment'
import { EMPTY_METRICS, type EngineState, type TryOnMetrics } from '@/lib/domain/tryOn'
import { drawVideoFrame, isVideoReady, syncCanvasSize } from '@/lib/engines/canvas'
import { createEngine, fallbackEngineFor } from '@/lib/engines/registry'
import type { EngineInfo, TryOnEngine } from '@/lib/engines/types'

/** Cada cuánto se publican las métricas a React, en ms. */
const METRICS_INTERVAL_MS = 250

export interface UseTryOnOptions {
  videoRef: RefObject<HTMLVideoElement>
  canvasRef: RefObject<HTMLCanvasElement>
  /** El bucle sólo corre con la cámara activa y el probador abierto. */
  active: boolean
  engineId?: EngineId
}

export interface UseTryOnResult {
  engine: EngineInfo | null
  state: EngineState
  error: string | null
  /** Aviso no bloqueante, p.ej. que se ha degradado a otro motor. */
  notice: string | null
  metrics: TryOnMetrics
  garment: Garment | null
  selectGarment: (garment: Garment | null) => void
  /** Sólo para motores `snapshot`: lanza una pasada y congela el resultado. */
  captureSnapshot: () => Promise<void>
  resumePreview: () => void
  /** Descarta el suavizado acumulado; el motor vuelve a fijar la prenda desde cero. */
  recalibrate: () => void
  /** Color con el que se tiñe en vivo la prenda activa; `null` = color original. */
  color: string | null
  setColor: (hex: string | null) => void
  isFrozen: boolean
  isProcessing: boolean
}

/**
 * Orquesta motor + bucle de render.
 *
 * El bucle se encadena (`await` y luego `requestAnimationFrame`) en vez de
 * programar un frame nuevo incondicionalmente, así que nunca hay dos pasadas
 * solapadas ni se acumulan bucles al re-renderizar.
 */
export function useTryOn({
  videoRef,
  canvasRef,
  active,
  engineId = TRYON_ENGINE,
}: UseTryOnOptions): UseTryOnResult {
  const engineRef = useRef<TryOnEngine | null>(null)

  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [engineReady, setEngineReady] = useState(false)
  const [state, setState] = useState<EngineState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [garment, setGarment] = useState<Garment | null>(null)
  const [metrics, setMetrics] = useState<TryOnMetrics>(EMPTY_METRICS)
  const [isFrozen, setIsFrozen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [color, setColorState] = useState<string | null>(null)

  // Las métricas se acumulan en refs: publicarlas en cada frame provocaría un
  // re-render a 30fps de todo el modal.
  const samplesRef = useRef({ frames: 0, latencyTotal: 0, since: 0 })

  /**
   * Corta la vista previa de los motores `snapshot`, y lo hace de forma
   * síncrona.
   *
   * No sirve apoyarse en `isFrozen` para esto: `captureSnapshot` tarda segundos
   * esperando al proveedor y React no confirma el cambio de estado hasta
   * después, así que el bucle seguiría pintando el vídeo por encima y el
   * resultado aparecería sólo un instante antes de ser borrado.
   */
  const previewPausedRef = useRef(false)

  // ---------------------------------------------------------------- motor ----
  useEffect(() => {
    let disposed = false

    const boot = async () => {
      let candidateId: EngineId | null = engineId
      let degradedFrom: string | null = null

      while (candidateId) {
        const candidate = createEngine(candidateId)
        setState('loading')

        try {
          await candidate.init()

          if (disposed) {
            candidate.dispose()
            return
          }

          engineRef.current = candidate
          setEngine(candidate.info)
          setEngineReady(true)
          setState('ready')
          setError(null)
          setNotice(degradedFrom)
          return
        } catch (err) {
          candidate.dispose()

          const message = err instanceof Error ? err.message : 'Error al iniciar el motor.'
          const next: EngineId | null = fallbackEngineFor(candidateId)

          if (disposed) {
            return
          }

          if (!next) {
            setState('error')
            setError(message)
            return
          }

          degradedFrom = `${message} Se ha activado el motor de reserva.`
          candidateId = next
        }
      }
    }

    void boot()

    return () => {
      disposed = true
      engineRef.current?.dispose()
      engineRef.current = null
      setEngineReady(false)
      setEngine(null)
      setState('idle')
    }
  }, [engineId])

  // -------------------------------------------------------------- prenda ----
  useEffect(() => {
    const current = engineRef.current
    if (!current || !engineReady) {
      return
    }

    let cancelled = false

    current.setGarment(garment).catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la prenda.')
      }
    })

    return () => {
      cancelled = true
    }
  }, [garment, engineReady])

  // ----------------------------------------------------------- tinte color ----
  useEffect(() => {
    engineRef.current?.setTint?.(color)
  }, [color, engineReady])

  // --------------------------------------------------------- bucle render ----
  useEffect(() => {
    if (!active || !engineReady || isFrozen) {
      return
    }

    let cancelled = false
    let frameId = 0

    samplesRef.current = { frames: 0, latencyTotal: 0, since: performance.now() }

    const tick = async () => {
      if (cancelled) {
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const current = engineRef.current

      if (video && canvas && current) {
        try {
          if (current.info.mode === 'snapshot') {
            // Vista previa en vivo; la pasada de IA la pide el usuario.
            const ctx = canvas.getContext('2d')
            if (ctx && !previewPausedRef.current && isVideoReady(video)) {
              syncCanvasSize(canvas, video)
              drawVideoFrame(ctx, video, canvas.width, canvas.height, CAMERA_CONFIG.mirrored)
            }
          } else {
            const result = await current.renderFrame({
              source: video,
              target: canvas,
              timestampMs: performance.now(),
              mirrored: CAMERA_CONFIG.mirrored,
            })

            if (cancelled) {
              return
            }

            samplesRef.current.frames += 1
            samplesRef.current.latencyTotal += result.latencyMs
            setState(result.bodyDetected ? 'tracking' : 'no_body')
          }
        } catch (err) {
          if (!cancelled) {
            setState('error')
            setError(err instanceof Error ? err.message : 'Error procesando el frame.')
          }
          return
        }
      }

      if (!cancelled) {
        frameId = requestAnimationFrame(() => void tick())
      }
    }

    frameId = requestAnimationFrame(() => void tick())

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
    }
  }, [active, engineReady, isFrozen, videoRef, canvasRef])

  // ------------------------------------------------------------- métricas ----
  useEffect(() => {
    // Congelado ⇒ no se acumulan frames, y publicar ceros borraría la latencia
    // de la última pasada que la UI está mostrando.
    if (!active || !engineReady || isFrozen) {
      return
    }

    const interval = setInterval(() => {
      const { frames, latencyTotal, since } = samplesRef.current
      const elapsed = performance.now() - since

      if (frames === 0 || elapsed <= 0) {
        setMetrics(EMPTY_METRICS)
        return
      }

      setMetrics({
        latencyMs: latencyTotal / frames,
        fps: (frames * 1000) / elapsed,
      })

      samplesRef.current = { frames: 0, latencyTotal: 0, since: performance.now() }
    }, METRICS_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [active, engineReady, isFrozen])

  // Al cerrar el probador se descongela, o al reabrir se vería el frame viejo.
  // El tinte también se resetea: cada apertura arranca con el color original.
  useEffect(() => {
    if (!active) {
      previewPausedRef.current = false
      setIsFrozen(false)
      setMetrics(EMPTY_METRICS)
      setColorState(null)
    }
  }, [active])

  const selectGarment = useCallback((next: Garment | null) => {
    setGarment(next)
    setError(null)
    previewPausedRef.current = false
    setIsFrozen(false)
  }, [])

  const captureSnapshot = useCallback(async () => {
    const current = engineRef.current
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!current || !video || !canvas || current.info.mode !== 'snapshot') {
      return
    }

    // Antes de cualquier await: congela la vista previa ya.
    previewPausedRef.current = true
    setIsProcessing(true)
    setError(null)

    try {
      const result = await current.renderFrame({
        source: video,
        target: canvas,
        timestampMs: performance.now(),
        mirrored: CAMERA_CONFIG.mirrored,
      })

      setMetrics({ latencyMs: result.latencyMs, fps: 0 })
      setIsFrozen(true)
      setState(result.bodyDetected ? 'tracking' : 'no_body')
    } catch (err) {
      // Si falló no hay resultado que conservar: volvemos a la cámara en vivo.
      previewPausedRef.current = false
      setError(err instanceof Error ? err.message : 'El proveedor remoto falló.')
      setState('error')
    } finally {
      setIsProcessing(false)
    }
  }, [videoRef, canvasRef])

  const resumePreview = useCallback(() => {
    previewPausedRef.current = false
    setIsFrozen(false)
  }, [])

  const recalibrate = useCallback(() => {
    engineRef.current?.recalibrate?.()
  }, [])

  const setColor = useCallback((hex: string | null) => {
    setColorState(hex)
  }, [])

  return {
    engine,
    state,
    error,
    notice,
    metrics,
    garment,
    selectGarment,
    captureSnapshot,
    resumePreview,
    recalibrate,
    color,
    setColor,
    isFrozen,
    isProcessing,
  }
}

export default useTryOn
