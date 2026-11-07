/**
 * Contrato de los motores de try-on.
 *
 * Diseñado alrededor de `<video> → <canvas>` en vez de `Blob → Blob`: un motor
 * en tiempo real que tuviera que codificar cada frame a JPEG y volver a
 * decodificarlo no podría sostener 30fps. Los motores remotos (por tanda, no en
 * tiempo real) implementan la misma interfaz y declaran `mode: 'snapshot'`, y es
 * el hook quien decide si llamarlos en bucle o sólo a petición.
 */
import type { Garment } from '@/lib/domain/garment'
import type { EngineId } from '@/lib/config/tryOn'

export type EngineMode = 'realtime' | 'snapshot'

export interface EngineInfo {
  id: EngineId
  label: string
  mode: EngineMode
  requiresNetwork: boolean
}

export interface FrameRequest {
  source: HTMLVideoElement
  target: HTMLCanvasElement
  /** Reloj monótono; MediaPipe exige timestamps crecientes. */
  timestampMs: number
  /** Si el resultado debe verse en espejo (vista selfie). */
  mirrored: boolean
}

export interface FrameResult {
  /** `false` ⇒ el motor sólo ha pintado la cámara, sin prenda. */
  bodyDetected: boolean
  latencyMs: number
}

export interface TryOnEngine {
  readonly info: EngineInfo

  /** Carga modelos/recursos. Puede tardar; se llama una vez. */
  init(): Promise<void>

  /** Precarga la imagen de la prenda. `null` desactiva la composición. */
  setGarment(garment: Garment | null): Promise<void>

  /** Compone un frame de `source` dentro de `target`. */
  renderFrame(request: FrameRequest): Promise<FrameResult>

  /** Libera modelos y texturas. */
  dispose(): void
}

/** Error con causa identificable para que la UI pueda sugerir una salida. */
export class EngineInitError extends Error {
  constructor(
    message: string,
    readonly reason: 'assets_missing' | 'unsupported' | 'unknown'
  ) {
    super(message)
    this.name = 'EngineInitError'
  }
}
