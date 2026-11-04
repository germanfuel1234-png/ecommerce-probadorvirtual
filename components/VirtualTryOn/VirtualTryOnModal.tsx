'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useCamera } from '@/lib/hooks/useCamera'
import { useVirtualTryOn } from '@/lib/hooks/useVirtualTryOn'
import { useCartStore } from '@/lib/hooks/useCart'
import { CameraFeed } from './CameraFeed'
import { GuidanceOverlay } from './GuidanceOverlay'
import { ProductSelector } from './ProductSelector'
import { CartButton } from './CartButton'
import { X, Zap } from 'lucide-react'
import type { Clothing } from '@/lib/types'
import { CATALOG_CLOTHES } from '@/lib/constants/products'

interface VirtualTryOnModalProps {
  isOpen: boolean
  onClose: () => void
  productId?: string
}

/**
 * Modal principal para Virtual Try-On
 * Integra cámara, selector de prendas y procesamiento de IA
 */
export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  isOpen,
  onClose,
  productId,
}) => {
  const camera = useCamera({ width: 640, height: 480 })
  const vton = useVirtualTryOn()
  const { getTotalItems } = useCartStore()

  const [showGuidance, setShowGuidance] = useState(true)
  const [lastFrameTime, setLastFrameTime] = useState(0)
  const frameIntervalRef = useRef<(() => void) | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Obtiene la primera prenda disponible por defecto
  useEffect(() => {
    if (vton.selectedClothing === null && Object.keys(CATALOG_CLOTHES).length > 0) {
      const firstClothing = Object.values(CATALOG_CLOTHES)[0]
      vton.selectClothing(firstClothing)
    }
  }, [])

  /**
   * Inicia captura de frames cuando la cámara está lista
   */
  const handleCameraReady = useCallback(() => {
    if (frameIntervalRef.current) {
      frameIntervalRef.current()
    }

    frameIntervalRef.current = camera.startFrameCapture(12, async (frameBlob) => {
      const now = Date.now()

      // Limita a máximo 1 frame cada 200ms
      if (now - lastFrameTime < 200) return
      setLastFrameTime(now)

      if (vton.selectedClothing && !vton.isProcessing) {
        // Crea blob dummy de la prenda (en producción, sería la imagen real)
        const dummyClothingBlob = new Blob(['dummy'], { type: 'image/png' })

        await vton.processFrame(
          frameBlob,
          dummyClothingBlob,
          vton.selectedClothing
        )
      }
    })
  }, [camera, vton, lastFrameTime])

  /**
   * Maneja errores de cámara
   */
  const handleCameraError = useCallback((error: string) => {
    console.error('Camera error:', error)
  }, [])

  /**
   * Maneja selección de prenda
   */
  const handleSelectClothing = useCallback((clothing: Clothing) => {
    vton.selectClothing(clothing)
    // Reset de frame timer para procesar inmediatamente
    setLastFrameTime(0)
  }, [vton])

  /**
   * Maneja confirmación de añadir al carrito
   */
  const handleAddSuccess = useCallback(() => {
    setSuccessMessage('¡Añadido al carrito!')
    setTimeout(() => setSuccessMessage(''), 3000)
  }, [])

  /**
   * Cierre del modal
   */
  const handleClose = useCallback(() => {
    if (frameIntervalRef.current) {
      frameIntervalRef.current()
      frameIntervalRef.current = null
    }
    camera.stopCamera()
    vton.reset()
    onClose()
  }, [camera, vton, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Modal container */}
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full h-full max-h-screen max-w-6xl overflow-hidden border border-gray-700 flex flex-col md:h-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Zap className="text-orange-500" size={24} />
            <h2 className="text-xl font-bold text-white">Probador Virtual</h2>
            <span className="text-xs font-semibold px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full">
              EN VIVO
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row gap-4 p-4 md:p-6">
          {/* Left: Camera feed */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Camera */}
            <div className="relative flex-1 min-h-96 md:min-h-0">
              <CameraFeed
                onReady={handleCameraReady}
                onError={handleCameraError}
                autoStart={true}
              />

              {/* Overlay de guía */}
              <div className="absolute inset-0 pointer-events-none">
                <GuidanceOverlay
                  width={640}
                  height={480}
                  visible={showGuidance}
                />
              </div>

              {/* Estado de procesamiento */}
              {vton.isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">Procesando...</p>
                    <p className="text-gray-400 text-xs mt-1">{vton.latency.toFixed(0)}ms</p>
                  </div>
                </div>
              )}

              {/* Toggle guía */}
              <button
                onClick={() => setShowGuidance(!showGuidance)}
                className="absolute top-3 right-3 px-2 py-1 bg-gray-800/80 text-white text-xs rounded hover:bg-gray-700 transition"
              >
                {showGuidance ? 'Ocultar' : 'Mostrar'} Guía
              </button>
            </div>

            {/* Información de latencia */}
            <div className="text-center text-sm text-gray-400">
              {vton.isStreaming && (
                <>
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  En vivo • {vton.latency.toFixed(0)}ms latencia
                </>
              )}
            </div>
          </div>

          {/* Right: Controls panel */}
          <div className="w-full md:w-80 flex flex-col gap-4">
            {/* Selector de prendas */}
            <div className="flex-1 bg-gray-800/30 rounded-xl p-4 border border-gray-700">
              <ProductSelector
                onSelect={handleSelectClothing}
                selectedId={vton.selectedClothing?.id}
              />
            </div>

            {/* Mensaje de éxito */}
            {successMessage && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm text-center animate-pulse">
                {successMessage}
              </div>
            )}

            {/* Error message */}
            {vton.error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                ⚠️ {vton.error}
              </div>
            )}

            {/* Información */}
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700 text-sm text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span>Prendas en carrito:</span>
                <span className="font-semibold text-white">{getTotalItems()}</span>
              </div>
              <div className="text-xs text-gray-400">
                ℹ️ Selecciona una prenda y muévete dentro del marco guía para ver la
                transformación en vivo.
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="btn-secondary flex-1 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cart button */}
      <CartButton
        clothing={vton.selectedClothing}
        onAddSuccess={handleAddSuccess}
      />
    </div>
  )
}

export default VirtualTryOnModal
