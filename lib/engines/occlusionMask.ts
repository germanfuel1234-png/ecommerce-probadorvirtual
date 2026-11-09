/**
 * Recorte de oclusión a partir de la máscara de `ImageSegmenter`.
 *
 * El modelo multiclase (`selfie_multiclass_256x256`) devuelve, por píxel, una
 * categoría: fondo, pelo, piel de cuerpo, piel de cara, ropa u otros. La capa
 * de la prenda se pinta aparte y luego se recorta con esa máscara mediante
 * `destination-in`, así los píxeles de pelo/piel quedan transparentes en la
 * prenda y se ve el vídeo de debajo — que es lo que hace que un brazo cruzado
 * por delante del torso no quede tapado.
 *
 * `update` (cara: corre el segmentador y reconstruye la máscara escalada) y
 * `applyTo` (barata: sólo recompone con la máscara ya calculada) están separados
 * a propósito — el motor llama a `update` cada N frames y a `applyTo` en todos,
 * para no pagar una segunda inferencia de IA por frame. Ver
 * `LOCAL_ENGINE_CONFIG.segmentEveryNFrames`.
 */
import type { MPMask } from '@mediapipe/tasks-vision'

export class OcclusionMask {
  private readonly maskCanvas = document.createElement('canvas')
  private readonly scaledCanvas = document.createElement('canvas')
  private hasMask = false

  /** Reconstruye la máscara escalada a partir de un resultado nuevo del segmentador. */
  update(
    categoryMask: MPMask,
    occludingCategories: readonly number[],
    mirrored: boolean,
    destWidth: number,
    destHeight: number
  ): void {
    const { width: maskWidth, height: maskHeight } = categoryMask
    const maskCtx = this.maskCanvas.getContext('2d')
    const scaledCtx = this.scaledCanvas.getContext('2d')

    if (!maskCtx || !scaledCtx || maskWidth === 0 || maskHeight === 0) {
      return
    }

    // Paso 1: la categoría por píxel se convierte en alfa — opaco donde la
    // prenda debe seguir visible, transparente donde hay que dejar ver la piel
    // o el pelo de debajo.
    this.maskCanvas.width = maskWidth
    this.maskCanvas.height = maskHeight
    const categories = categoryMask.getAsUint8Array()
    const maskImage = maskCtx.createImageData(maskWidth, maskHeight)

    for (let i = 0; i < categories.length; i += 1) {
      const occludes = occludingCategories.includes(categories[i])
      const offset = i * 4
      maskImage.data[offset] = 255
      maskImage.data[offset + 1] = 255
      maskImage.data[offset + 2] = 255
      maskImage.data[offset + 3] = occludes ? 0 : 255
    }
    maskCtx.putImageData(maskImage, 0, 0)

    // Paso 2: escalar la máscara (resolución fija del modelo) al tamaño del
    // canvas real, con el mismo espejado que el vídeo, para que coincida.
    this.scaledCanvas.width = destWidth
    this.scaledCanvas.height = destHeight
    scaledCtx.save()
    scaledCtx.clearRect(0, 0, destWidth, destHeight)
    if (mirrored) {
      scaledCtx.translate(destWidth, 0)
      scaledCtx.scale(-1, 1)
    }
    scaledCtx.drawImage(this.maskCanvas, 0, 0, destWidth, destHeight)
    scaledCtx.restore()

    this.hasMask = true
  }

  /**
   * Recorta `layer` in-place con la última máscara calculada (no vuelve a
   * correr el segmentador). Sin `update` previo no hace nada.
   */
  applyTo(layer: HTMLCanvasElement): void {
    if (!this.hasMask) {
      return
    }

    const layerCtx = layer.getContext('2d')
    if (!layerCtx) {
      return
    }

    layerCtx.globalCompositeOperation = 'destination-in'
    layerCtx.drawImage(this.scaledCanvas, 0, 0, layer.width, layer.height)
    layerCtx.globalCompositeOperation = 'source-over'
  }

  /** Vuelve al estado "sin máscara todavía" — p.ej. al cambiar de prenda o cerrar. */
  reset(): void {
    this.hasMask = false
  }
}

export default OcclusionMask
