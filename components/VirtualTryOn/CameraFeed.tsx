'use client'

import React, { useEffect } from 'react'
import { useCamera } from '@/lib/hooks/useCamera'

interface CameraFeedProps {
  onReady?: () => void
  onError?: (error: string) => void
  autoStart?: boolean
  width?: number
  height?: number
}

/**
 * Componente que renderiza el feed de la cámara web
 * Maneja solicitud de permisos, errores y captura de frames
 */
export const CameraFeed: React.FC<CameraFeedProps> = ({
  onReady,
  onError,
  autoStart = true,
  width = 640,
  height = 480,
}) => {
  const camera = useCamera({ width, height })

  useEffect(() => {
    if (autoStart && camera.state === 'idle') {
      camera.startCamera()
    }
  }, [autoStart, camera.state, camera.startCamera])

  useEffect(() => {
    if (camera.isActive && onReady) {
      onReady()
    }
  }, [camera.isActive, onReady])

  useEffect(() => {
    if (camera.error && onError) {
      onError(camera.error)
    }
  }, [camera.error, onError])

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
      {/* Video element */}
      <video
        ref={camera.videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Hidden canvas para captura de frames */}
      <canvas
        ref={camera.canvasRef}
        className="hidden"
      />

      {/* Estado de carga */}
      {camera.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
        </div>
      )}

      {/* Permiso denegado */}
      {camera.isPermissionDenied && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="text-center">
            <p className="text-white font-semibold mb-2">Permiso de Cámara Denegado</p>
            <p className="text-gray-300 text-sm mb-4">
              Por favor, permite acceso a la cámara en la configuración de tu navegador
            </p>
            <button
              onClick={() => camera.startCamera()}
              className="btn-primary text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {camera.state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="text-center">
            <p className="text-red-400 font-semibold mb-2">Error de Cámara</p>
            <p className="text-gray-300 text-sm mb-4">{camera.error}</p>
            <button
              onClick={() => camera.startCamera()}
              className="btn-primary text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CameraFeed
