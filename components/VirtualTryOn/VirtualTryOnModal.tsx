'use client'

import clsx from 'clsx'
import { Camera, Eye, EyeOff, Loader2, X, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import { findGarment, GARMENTS } from '@/lib/catalog/garments'
import type { EngineState } from '@/lib/domain/tryOn'
import { useCamera } from '@/lib/hooks/useCamera'
import { useTryOn } from '@/lib/hooks/useTryOn'
import { AddToCartButton } from './AddToCartButton'
import { GarmentSelector } from './GarmentSelector'
import { TryOnStage } from './TryOnStage'

interface VirtualTryOnModalProps {
  onClose: () => void
  /** Prenda con la que abrir el probador (la de la ficha de producto). */
  initialGarmentId?: string
}

/**
 * Orquestador del probador.
 *
 * El componente se monta sólo cuando el probador está abierto: así el modelo de
 * pose (≈5 MB) no se carga en la home de quien nunca lo abre.
 *
 * Es el **único** dueño de la cámara: crea el stream y baja el `videoRef` a
 * `TryOnStage`. El bucle de frames vive en `useTryOn`, no aquí, de modo que ya
 * no puede re-crearse en cada render como ocurría antes.
 */
export function VirtualTryOnModal({ onClose, initialGarmentId }: VirtualTryOnModalProps) {
  const camera = useCamera()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tryOn = useTryOn({
    videoRef: camera.videoRef,
    canvasRef,
    active: camera.isActive,
  })

  const [showGuidance, setShowGuidance] = useState(true)

  const { start: startCamera, stop: stopCamera } = camera
  const { selectGarment } = tryOn

  // Arrancar la cámara al abrir y apagarla al cerrar, en el mismo efecto, para
  // que no quede encendida si el componente se desmonta por otra vía.
  useEffect(() => {
    void startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  // La prenda inicial viene de la ficha de producto. Antes `productId` se
  // recibía y se ignoraba, y el probador abría siempre con la primera prenda.
  useEffect(() => {
    const initial = (initialGarmentId ? findGarment(initialGarmentId) : undefined) ?? GARMENTS[0]
    selectGarment(initial ?? null)
  }, [initialGarmentId, selectGarment])

  // Cerrar con Escape y bloquear el scroll del fondo.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  const isSnapshot = tryOn.engine?.mode === 'snapshot'

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-0 backdrop-blur-sm md:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Probador virtual"
    >
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden border border-gray-700 bg-slate-900 shadow-2xl md:h-auto md:rounded-2xl">
        <header className="flex items-center justify-between border-b border-gray-700 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <Zap className="text-orange-500" size={22} />
            <h2 className="text-lg font-bold text-white">Probador Virtual</h2>
            <StatusBadge state={tryOn.state} />
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar probador"
            className="text-gray-400 transition-colors hover:text-white"
          >
            <X size={26} />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row md:p-6">
          <div className="flex flex-1 flex-col gap-3">
            <TryOnStage
              videoRef={camera.videoRef}
              canvasRef={canvasRef}
              cameraState={camera.state}
              cameraError={camera.error}
              engineState={tryOn.state}
              onRetryCamera={startCamera}
              showGuidance={showGuidance}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-2">
                {tryOn.engine ? (
                  <>
                    <span className="rounded bg-slate-800 px-2 py-1 font-medium text-gray-300">
                      {tryOn.engine.label}
                    </span>
                    {tryOn.engine.mode === 'realtime' && tryOn.metrics.fps > 0 && (
                      <span>
                        {tryOn.metrics.fps.toFixed(0)} fps · {tryOn.metrics.latencyMs.toFixed(1)} ms/frame
                      </span>
                    )}
                  </>
                ) : (
                  <span>Iniciando motor…</span>
                )}
              </span>

              <button
                onClick={() => setShowGuidance(current => !current)}
                className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2 py-1 transition hover:bg-slate-700"
              >
                {showGuidance ? <EyeOff size={14} /> : <Eye size={14} />}
                {showGuidance ? 'Ocultar guía' : 'Mostrar guía'}
              </button>
            </div>

            {isSnapshot && (
              <div className="flex gap-2">
                <button
                  onClick={() => void tryOn.captureSnapshot()}
                  disabled={tryOn.isProcessing || !camera.isActive}
                  className="btn-primary inline-flex flex-1 items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tryOn.isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                  {tryOn.isProcessing ? 'Procesando…' : 'Capturar y probar'}
                </button>
                {tryOn.isFrozen && (
                  <button onClick={tryOn.resumePreview} className="btn-secondary text-sm">
                    Volver a la cámara
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="flex w-full flex-col gap-3 md:w-80">
            <div className="flex-1 rounded-xl border border-gray-700 bg-gray-800/30 p-4">
              <GarmentSelector onSelect={selectGarment} selectedId={tryOn.garment?.id} />
            </div>

            {tryOn.notice && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
                {tryOn.notice}
              </p>
            )}

            {(tryOn.error ?? camera.error) && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                {tryOn.error ?? camera.error}
              </p>
            )}

            {tryOn.state === 'no_body' && (
              <p className="rounded-lg border border-gray-700 bg-gray-800/30 p-3 text-xs text-gray-400">
                No te detecto en cuadro. Sepárate de la cámara hasta que se te vean hombros y
                cintura dentro del marco.
              </p>
            )}

            <AddToCartButton garment={tryOn.garment} />
          </aside>
        </div>
      </div>
    </div>
  )
}

const BADGES: Record<EngineState, { label: string; className: string }> = {
  idle: { label: 'EN ESPERA', className: 'bg-gray-500/20 text-gray-300' },
  loading: { label: 'CARGANDO', className: 'bg-blue-500/20 text-blue-300' },
  ready: { label: 'LISTO', className: 'bg-gray-500/20 text-gray-300' },
  tracking: { label: 'EN VIVO', className: 'bg-green-500/20 text-green-300' },
  no_body: { label: 'SIN CUERPO', className: 'bg-amber-500/20 text-amber-300' },
  error: { label: 'ERROR', className: 'bg-red-500/20 text-red-300' },
}

function StatusBadge({ state }: { state: EngineState }) {
  const badge = BADGES[state]

  return (
    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', badge.className)}>
      {badge.label}
    </span>
  )
}

export default VirtualTryOnModal
