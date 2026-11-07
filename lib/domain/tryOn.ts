/**
 * Dominio: estados del probador.
 *
 * Se separan deliberadamente el estado de la *cámara* y el del *motor de IA*:
 * en el código original un solo enum mezclaba ambos, así que "cámara lista" y
 * "modelo cargado" no se podían distinguir.
 */

export type CameraState =
  | 'idle'
  | 'starting'
  | 'active'
  | 'permission_denied'
  | 'unsupported'
  | 'error'

export type EngineState =
  | 'idle'
  /** Descargando/compilando el modelo. Ocurre una vez por sesión. */
  | 'loading'
  /** Modelo cargado, esperando frames. */
  | 'ready'
  /** Renderizando y con cuerpo detectado. */
  | 'tracking'
  /** Renderizando pero sin cuerpo en cuadro: se muestra la cámara tal cual. */
  | 'no_body'
  | 'error'

/** Métricas de rendimiento que la UI muestra al usuario. */
export interface TryOnMetrics {
  /** Coste de procesar el último frame, en ms. */
  latencyMs: number
  /** Frames compuestos por segundo, media móvil. */
  fps: number
}

export const EMPTY_METRICS: TryOnMetrics = { latencyMs: 0, fps: 0 }
