import type { VTONResponse, VTONRequestPayload, Clothing } from '@/lib/types'

/**
 * Clase abstracta base para clientes de Virtual Try-On
 * Implementa la interfaz común que todos los proveedores deben cumplir
 */
export abstract class VTONClientBase {
  protected apiKey: string
  protected endpoint: string

  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey
    this.endpoint = endpoint
  }

  /**
   * Procesa un frame de video con una prenda
   * @param payload - Datos del frame y la prenda
   * @returns Promesa con el frame procesado
   */
  abstract processFrame(payload: VTONRequestPayload): Promise<VTONResponse>

  /**
   * Valida que los datos de entrada sean correctos
   */
  protected validatePayload(payload: VTONRequestPayload): void {
    if (!payload.frame || !(payload.frame instanceof Blob)) {
      throw new Error('Frame debe ser un Blob válido')
    }
    if (!payload.clothingImage || !(payload.clothingImage instanceof Blob)) {
      throw new Error('Imagen de ropa debe ser un Blob válido')
    }
    if (!payload.clothingType) {
      throw new Error('Tipo de ropa es requerido')
    }
  }

  /**
   * Convierte Blob a Base64 para transmisión
   */
  protected async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Convierte Base64 a Blob
   */
  protected base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }
}

export default VTONClientBase
