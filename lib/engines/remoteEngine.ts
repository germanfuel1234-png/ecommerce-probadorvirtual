/**
 * Motor remoto (difusión real: Fashn, Replicate, Decart…).
 *
 * Trabaja por tandas, no en tiempo real: una pasada tarda del orden de
 * segundos, así que `mode` es `'snapshot'` y el hook lo invoca sólo cuando el
 * usuario pide una captura.
 *
 * Importante: este motor nunca ve una API key. Habla con `/api/try-on`, que
 * corre en el servidor; las credenciales se quedan allí.
 */
import type { Garment } from '@/lib/domain/garment'
import { canvasToBlob, drawVideoFrame, isVideoReady, syncCanvasSize } from './canvas'
import { EngineInitError, type EngineInfo, type FrameRequest, type FrameResult, type TryOnEngine } from './types'

export class RemoteEngine implements TryOnEngine {
  readonly info: EngineInfo = {
    id: 'remote',
    label: 'Remoto · difusión por API',
    mode: 'snapshot',
    requiresNetwork: true,
  }

  private garment: Garment | null = null

  async init(): Promise<void> {
    const response = await fetch('/api/try-on', { method: 'GET' }).catch(() => null)

    if (!response?.ok) {
      throw new EngineInitError('La ruta /api/try-on no responde.', 'unknown')
    }

    const status: { configured?: boolean; provider?: string } = await response.json()

    if (!status.configured) {
      throw new EngineInitError(
        'No hay proveedor remoto configurado. Define TRYON_PROVIDER y su API key en .env.local',
        'assets_missing'
      )
    }
  }

  async setGarment(garment: Garment | null): Promise<void> {
    this.garment = garment
  }

  async renderFrame({ source, target, mirrored }: FrameRequest): Promise<FrameResult> {
    const startedAt = performance.now()
    const ctx = target.getContext('2d')

    if (!ctx || !isVideoReady(source) || !this.garment) {
      return { bodyDetected: false, latencyMs: performance.now() - startedAt }
    }

    syncCanvasSize(target, source)
    drawVideoFrame(ctx, source, target.width, target.height, mirrored)

    // El frame que se envía es el ya reflejado: es lo que el usuario ve.
    const frame = await canvasToBlob(target)

    const body = new FormData()
    body.append('frame', frame, 'frame.jpg')
    body.append('garmentId', this.garment.id)

    const response = await fetch('/api/try-on', { method: 'POST', body })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(detail || `El proveedor devolvió ${response.status}`)
    }

    const resultBlob = await response.blob()
    const bitmap = await createImageBitmap(resultBlob)

    try {
      ctx.drawImage(bitmap, 0, 0, target.width, target.height)
    } finally {
      bitmap.close()
    }

    return { bodyDetected: true, latencyMs: performance.now() - startedAt }
  }

  dispose(): void {
    this.garment = null
  }
}

export default RemoteEngine
