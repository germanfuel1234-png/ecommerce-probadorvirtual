'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import type { VTONState, VTONResponse, Clothing } from '@/lib/types'
import MockVTONClient from '@/lib/api/mockVtonClient'

/**
 * Hook para gestionar el procesamiento de Virtual Try-On
 * Maneja estados, control de latencia, y comunicación con la API de VTON
 */
export const useVirtualTryOn = () => {
  const [state, setState] = useState<VTONState>('idle')
  const [selectedClothing, setSelectedClothing] = useState<Clothing | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [latency, setLatency] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [processedFrame, setProcessedFrame] = useState<Blob | null>(null)

  // Client API
  const clientRef = useRef(new MockVTONClient(300))

  /**
   * Procesa un frame con la prenda seleccionada
   */
  const processFrame = useCallback(
    async (frameBlob: Blob, clothingImage: Blob, clothingData: Clothing) => {
      if (isProcessing) return

      setIsProcessing(true)
      setState('processing_frame')
      setError(null)

      try {
        const response = await clientRef.current.processFrame({
          frame: frameBlob,
          clothingImage: clothingImage,
          clothingType: clothingData.category,
          sessionId: `session-${Date.now()}`,
        })

        if (response.success && response.processedFrame) {
          setProcessedFrame(response.processedFrame)
          setLatency(response.latency)
          setState('stream_active')
        } else {
          throw new Error(response.error || 'Error procesando frame')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        setState('error')
      } finally {
        setIsProcessing(false)
      }
    },
    [isProcessing]
  )

  /**
   * Selecciona una prenda para probar
   */
  const selectClothing = useCallback((clothing: Clothing) => {
    setSelectedClothing(clothing)
    setError(null)
  }, [])

  /**
   * Cambia el provider de VTON (para debug/testing)
   */
  const setVTONClient = useCallback((client: any) => {
    clientRef.current = client
  }, [])

  /**
   * Reset de estado
   */
  const reset = useCallback(() => {
    setState('idle')
    setSelectedClothing(null)
    setIsProcessing(false)
    setLatency(0)
    setError(null)
    setProcessedFrame(null)
  }, [])

  return {
    // Estados
    state,
    selectedClothing,
    isProcessing,
    latency,
    error,
    processedFrame,

    // Métodos
    processFrame,
    selectClothing,
    setVTONClient,
    reset,

    // Banderas
    isReady: state === 'idle' || state === 'stream_active',
    isProcessing,
    hasError: state === 'error',
    isStreaming: state === 'stream_active',
  }
}

export default useVirtualTryOn
