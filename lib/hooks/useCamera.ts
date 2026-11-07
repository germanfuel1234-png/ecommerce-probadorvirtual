'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import { CAMERA_CONFIG } from '@/lib/config/tryOn'
import type { CameraState } from '@/lib/domain/tryOn'

export interface UseCameraResult {
  /** Debe montarse en el único `<video>` de la pantalla. */
  videoRef: RefObject<HTMLVideoElement>
  state: CameraState
  error: string | null
  start: () => Promise<void>
  stop: () => void
  isActive: boolean
}

/**
 * Único propietario del MediaStream.
 *
 * Este hook se llama **una sola vez por pantalla** y el `videoRef` se pasa
 * hacia abajo. En la versión anterior lo llamaban a la vez el modal y
 * `CameraFeed`, con lo que existían dos streams y dos juegos de refs: los que
 * estaban montados en el DOM eran los del hijo, así que el padre intentaba
 * capturar frames de un `<video>` que valía `null`.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startingRef = useRef(false)
  /**
   * Se incrementa en cada `stop`. `start` compara el valor que capturó al
   * empezar: si no coincide, significa que le han pedido parar mientras
   * `getUserMedia` estaba en vuelo y hay que descartar ese stream.
   *
   * Hace falta porque con `reactStrictMode` React monta, desmonta y vuelve a
   * montar los efectos en desarrollo: sin esto, la primera petición resolvía
   * *después* del `stop` y dejaba una cámara encendida que ya nadie apagaba.
   */
  const generationRef = useRef(0)

  const [state, setState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    generationRef.current += 1

    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    startingRef.current = false
    setState('idle')
  }, [])

  const start = useCallback(async () => {
    // getUserMedia en paralelo abre varios streams; el guard evita dejar
    // cámaras huérfanas encendidas.
    if (startingRef.current || streamRef.current) {
      return
    }
    startingRef.current = true
    const generation = generationRef.current

    setState('starting')
    setError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported')
        setError(
          window.isSecureContext
            ? 'Este navegador no soporta acceso a la cámara.'
            : 'La cámara requiere HTTPS o localhost. Abre la app en http://localhost:3000'
        )
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAMERA_CONFIG.width },
          height: { ideal: CAMERA_CONFIG.height },
          facingMode: CAMERA_CONFIG.facingMode,
        },
        audio: false,
      })

      const video = videoRef.current

      // Nos han pedido parar (o el componente se desmontó) mientras el usuario
      // decidía sobre el permiso: descartamos el stream en vez de dejar la
      // cámara encendida.
      if (generation !== generationRef.current || !video) {
        stream.getTracks().forEach(track => track.stop())

        // Si fue un `stop` quien nos adelantó, ya dejó el estado en 'idle';
        // sólo lo tocamos cuando el motivo es que no hay `<video>` montado.
        if (generation === generationRef.current) {
          setState('idle')
        }
        return
      }

      streamRef.current = stream
      video.srcObject = stream
      await video.play().catch(() => {
        // Safari puede rechazar play() aunque el stream sea válido; el
        // atributo autoPlay del elemento se encarga.
      })

      setState('active')
    } catch (err) {
      setState(classifyCameraError(err))
      setError(describeCameraError(err))
    } finally {
      startingRef.current = false
    }
  }, [])

  // Al desmontar hay que apagar la cámara, o el LED se queda encendido.
  useEffect(() => stop, [stop])

  return {
    videoRef,
    state,
    error,
    start,
    stop,
    isActive: state === 'active',
  }
}

/**
 * El código original comparaba `error.message` con 'Permission', que depende
 * del idioma del navegador. `error.name` es parte del estándar.
 */
function classifyCameraError(err: unknown): CameraState {
  if (!(err instanceof DOMException)) {
    return 'error'
  }

  return err.name === 'NotAllowedError' || err.name === 'SecurityError'
    ? 'permission_denied'
    : 'error'
}

function describeCameraError(err: unknown): string {
  if (!(err instanceof DOMException)) {
    return err instanceof Error ? err.message : 'Error desconocido al abrir la cámara.'
  }

  switch (err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Has bloqueado el acceso a la cámara. Permítelo en el candado de la barra de direcciones.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No se ha encontrado ninguna cámara conectada.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'La cámara está en uso por otra aplicación (Zoom, Meet, OBS…). Ciérrala y reintenta.'
    case 'OverconstrainedError':
      return 'Tu cámara no soporta la resolución solicitada.'
    default:
      return err.message || 'No se pudo acceder a la cámara.'
  }
}

export default useCamera
