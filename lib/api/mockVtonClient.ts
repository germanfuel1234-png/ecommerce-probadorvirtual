import VTONClientBase from './vtonClient'
import type { VTONResponse, VTONRequestPayload } from '@/lib/types'

/**
 * Cliente Mock para desarrollo y testing
 * Simula respuestas de una API de Virtual Try-On sin necesidad de llamadas reales
 */
export class MockVTONClient extends VTONClientBase {
  private processingDelay: number = 200 // ms

  constructor(processingDelay: number = 200) {
    super('mock-key', 'mock-endpoint')
    this.processingDelay = processingDelay
  }

  /**
   * Simula el procesamiento de un frame
   * En producción, esto enviaría a una API real
   */
  async processFrame(payload: VTONRequestPayload): Promise<VTONResponse> {
    this.validatePayload(payload)

    const startTime = performance.now()

    // Simula latencia de procesamiento
    await this.simulateProcessing(this.processingDelay)

    // Convierte el frame original a base64 para retornar como "procesado"
    // En producción, aquí estaría la magia de IA de Replicate/Fashn
    const frameBase64 = await this.blobToBase64(payload.frame)

    // Retorna el blob procesado (en mock, es el mismo frame)
    const processedFrame = this.base64ToBlob(frameBase64, 'image/jpeg')

    const latency = performance.now() - startTime

    return {
      success: true,
      processedFrame,
      timestamp: Date.now(),
      latency,
    }
  }

  /**
   * Simula una pausa de procesamiento
   */
  private simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Setter para ajustar la latencia simulada
   */
  setProcessingDelay(ms: number): void {
    this.processingDelay = Math.max(50, Math.min(ms, 2000))
  }
}

export default MockVTONClient
