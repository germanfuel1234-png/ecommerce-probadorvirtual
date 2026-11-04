import VTONClientBase from './vtonClient'
import type { VTONResponse, VTONRequestPayload } from '@/lib/types'
import { FASHN_CONFIG } from '@/lib/constants/vtonConfig'

/**
 * Cliente para Fashn.ai API
 * Especialmente optimizado para Virtual Try-On en tiempo real
 * 
 * Documentación: https://fashn.ai/
 */
export class FashnVTONClient extends VTONClientBase {
  private timeout: number = 10000 // 10 segundos timeout

  constructor(apiKey: string = FASHN_CONFIG.apiKey!) {
    if (!apiKey) {
      throw new Error('FASHN_API_KEY no está configurada')
    }
    super(apiKey, FASHN_CONFIG.endpoint!)
  }

  /**
   * Procesa un frame usando Fashn.ai API
   * Fashn.ai está optimizado para baja latencia
   */
  async processFrame(payload: VTONRequestPayload): Promise<VTONResponse> {
    this.validatePayload(payload)

    const startTime = performance.now()

    try {
      // Crea FormData para enviar archivos binarios
      const formData = new FormData()
      formData.append('image', payload.frame, 'frame.jpg')
      formData.append('clothing', payload.clothingImage, 'clothing.png')
      formData.append('category', payload.clothingType)

      if (payload.userId) {
        formData.append('user_id', payload.userId)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Error de Fashn.ai: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Convierte base64 a Blob
      const processedFrame = this.base64ToBlob(data.result, 'image/jpeg')

      const latency = performance.now() - startTime

      return {
        success: true,
        processedFrame,
        timestamp: Date.now(),
        latency,
      }
    } catch (error) {
      const latency = performance.now() - startTime

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          timestamp: Date.now(),
          error: 'Timeout: Fashn.ai tardó demasiado',
          latency,
        }
      }

      return {
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Error en Fashn.ai',
        latency,
      }
    }
  }

  /**
   * Setter para configurar timeout personalizado
   */
  setTimeout(ms: number): void {
    this.timeout = Math.max(1000, Math.min(ms, 30000))
  }
}

export default FashnVTONClient
