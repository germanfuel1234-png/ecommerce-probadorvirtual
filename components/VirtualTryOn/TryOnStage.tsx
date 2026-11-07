'use client'

import clsx from 'clsx'
import { CameraOff, Loader2, RefreshCw } from 'lucide-react'
import type { RefObject } from 'react'

import { CAMERA_CONFIG } from '@/lib/config/tryOn'
import type { CameraState, EngineState } from '@/lib/domain/tryOn'
import { GuidanceOverlay } from './GuidanceOverlay'

interface TryOnStageProps {
  videoRef: RefObject<HTMLVideoElement>
  canvasRef: RefObject<HTMLCanvasElement>
  cameraState: CameraState
  cameraError: string | null
  engineState: EngineState
  onRetryCamera: () => void
  showGuidance: boolean
}

/**
 * El escenario del probador: vídeo crudo, canvas compuesto y marco guía,
 * apilados.
 *
 * El `<canvas>` va **encima** del `<video>` y es lo que el usuario ve: aquí es
 * donde se pinta el resultado del motor. En la versión anterior el frame
 * procesado se guardaba en el estado de React y no se renderizaba en ningún
 * sitio, así que la IA no podía verse ni funcionando.
 *
 * El vídeo se queda en el layout (no `display:none`) porque algunos navegadores
 * dejan de decodificar frames de un vídeo oculto, y el motor necesita leerlo.
 */
export function TryOnStage({
  videoRef,
  canvasRef,
  cameraState,
  cameraError,
  engineState,
  onRetryCamera,
  showGuidance,
}: TryOnStageProps) {
  const busy = cameraState === 'starting' || engineState === 'loading'
  const blocked =
    cameraState === 'permission_denied' || cameraState === 'unsupported' || cameraState === 'error'

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        className={clsx(
          'absolute inset-0 h-full w-full object-cover',
          CAMERA_CONFIG.mirrored && 'scale-x-[-1]'
        )}
        playsInline
        muted
        autoPlay
      />

      {/* Resultado compuesto. Transparente hasta el primer frame, de modo que
          mientras el modelo carga se ve la cámara sin cortes. */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

      {cameraState === 'active' && (
        <GuidanceOverlay visible={showGuidance} highlight={engineState === 'no_body'} />
      )}

      {busy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
          <Loader2 className="animate-spin text-orange-500" size={36} />
          <p className="text-sm text-gray-200">
            {engineState === 'loading' ? 'Cargando el modelo de pose…' : 'Abriendo la cámara…'}
          </p>
        </div>
      )}

      {blocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
          <CameraOff className="text-red-400" size={36} />
          <p className="font-semibold text-white">
            {cameraState === 'permission_denied' ? 'Cámara bloqueada' : 'No se pudo abrir la cámara'}
          </p>
          <p className="max-w-sm text-sm text-gray-300">{cameraError}</p>
          {cameraState !== 'unsupported' && (
            <button onClick={onRetryCamera} className="btn-primary inline-flex items-center gap-2 text-sm">
              <RefreshCw size={16} />
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TryOnStage
