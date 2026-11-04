import VTONClientBase from './vtonClient'
import type { VTONResponse, VTONRequestPayload } from '@/lib/types'
import { REPLICATE_CONFIG } from '@/lib/constants/vtonConfig'

/**
 * Cliente para Replicate API
 * Utiliza modelos como sczhou/iidm-vton para procesamiento de prendas en tiempo real
 *
 * Documentación: https://replicate.com/
 */
export class ReplicateVTONClient extends VTONClientBase {
  private pollInterval: number = 500 // ms entre polls
  private maxPollAttempts: number = 60 // máximo 30 segundos

  constructor(apiKey: string = REPLICATE_CONFIG.apiKey!) {
    if (!apiKey) {
      throw new Error('REPLICATE_API_KEY no está configurada')
    }
    super(apiKey, 'https://api.replicate.com/v1')
  }

  /**
   * Procesa un frame usando Replicate API
   * Crea una predicción y espera el resultado
   */
  async processFrame(payload: VTONRequestPayload): Promise<VTONResponse> {
    this.validatePayload(payload)

    const startTime = performance.now()

    try {
      // Convierte imágenes a base64
      const frameBase64 = await this.blobToBase64(payload.frame)
      const clothingBase64 = await this.blobToBase64(payload.clothingImage)

      // Crea predicción en Replicate
      const prediction = await this.createPrediction({
        version: REPLICATE_CONFIG.vtonModel,
        input: {
          image: `data:image/jpeg;base64,${frameBase64}`,
          cloth_image: `data:image/png;base64,${clothingBase64}`,
          category: payload.clothingType,
        },
      })

      // Espera a que se complete
      const result = await this.pollPrediction(prediction.id)

      if (!result.output || result.status === 'failed') {
        throw new Error(result.error || 'Predicción fallida en Replicate')
      }

      // Descarga la imagen resultante
      const processedFrame = await this.downloadImage(result.output[0])

      const latency = performance.now() - startTime

      return {
        success: true,
        processedFrame,
        timestamp: Date.now(),
        latency,
      }
    } catch (error) {
      const latency = performance.now() - startTime
      return {
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Error en Replicate',
        latency,
      }
    }
  }

  /**
   * Crea una predicción en Replicate
   */
  private async createPrediction(payload: {
    version: string
    input: Record<string, any>
  }): Promise<{ id: string; status: string }> {
    const response = await fetch(`${this.endpoint}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Error de Replicate: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Espera a que una predicción se complete
   */
  private async pollPrediction(
    predictionId: string,
    attempts: number = 0
  ): Promise<{ status: string; output?: string[]; error?: string }> {
    if (attempts >= this.maxPollAttempts) {
      throw new Error('Timeout en predicción de Replicate')
    }

    await new Promise(resolve => setTimeout(resolve, this.pollInterval))

    const response = await fetch(`${this.endpoint}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    })

    const prediction = await response.json()

    if (prediction.status === 'processing') {
      return this.pollPrediction(predictionId, attempts + 1)
    }

    return prediction
  }

  /**
   * Descarga una imagen desde URL
   */
  private async downloadImage(imageUrl: string): Promise<Blob> {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error('Error descargando imagen procesada')
    }
    return response.blob()
  }
}

export default ReplicateVTONClient
