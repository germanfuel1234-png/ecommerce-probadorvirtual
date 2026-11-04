'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { VTONState } from '@/lib/types'

export interface CameraConfig {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}

export const useCamera = (config: CameraConfig = {}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState] = useState<VTONState>('idle')
  const [error, setError] = useState<string | null>(null)

  const { width = 640, height = 480, facingMode = 'user' } = config

  /**
   * Solicita acceso a la cámara del usuario
   */
  const startCamera = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      // Verifica soporte de mediaDevices
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a cámara')
      }

      const constraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setState('camera_active')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al acceder a la cámara'

      // Verifica si el usuario denegó permiso
      if (message.includes('Permission') || message.includes('NotAllowedError')) {
        setState('camera_permission_denied')
      } else {
        setState('error')
      }

      setError(message)
    }
  }, [width, height, facingMode])

  /**
   * Detiene la cámara y libera recursos
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setState('idle')
  }, [])

  /**
   * Captura el frame actual del video a un canvas
   */
  const captureFrame = useCallback(
    (format: 'jpeg' | 'webp' | 'png' = 'jpeg'): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        if (!videoRef.current || !canvasRef.current) {
          reject(new Error('Video o canvas no están disponibles'))
          return
        }

        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'))
          return
        }

        // Configura canvas con dimensiones del video
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight

        // Dibuja el frame actual
        ctx.drawImage(videoRef.current, 0, 0)

        // Convierte a blob con formato especificado
        const mimeType = `image/${format}`
        canvasRef.current.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Error capturando frame'))
              return
            }
            resolve(blob)
          },
          mimeType,
          format === 'jpeg' ? 0.85 : 0.9
        )
      })
    },
    []
  )

  /**
   * Captura frames continuamente a una frecuencia específica
   */
  const startFrameCapture = useCallback(
    (fps: number = 24, onFrame: (blob: Blob) => void) => {
      let animationId: number

      const intervalMs = 1000 / fps
      let lastCaptureTime = 0

      const captureLoop = async () => {
        const now = Date.now()

        if (now - lastCaptureTime >= intervalMs) {
          try {
            const frame = await captureFrame()
            onFrame(frame)
            lastCaptureTime = now
          } catch (err) {
            console.error('Error capturando frame:', err)
          }
        }

        animationId = requestAnimationFrame(captureLoop)
      }

      animationId = requestAnimationFrame(captureLoop)

      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId)
        }
      }
    },
    [captureFrame]
  )

  /**
   * Obtiene las dimensiones actuales del video
   */
  const getVideoDimensions = useCallback(() => {
    if (videoRef.current) {
      return {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      }
    }
    return { width: 0, height: 0 }
  }, [])

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    videoRef,
    canvasRef,
    state,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    startFrameCapture,
    getVideoDimensions,
    isActive: state === 'camera_active',
    isLoading: state === 'loading',
    isPermissionDenied: state === 'camera_permission_denied',
  }
}

export default useCamera
