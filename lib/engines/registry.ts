/**
 * Fábrica de motores. Es el único sitio que conoce todas las implementaciones,
 * así que añadir un motor nuevo no toca ni la UI ni los hooks.
 */
import type { EngineId } from '@/lib/config/tryOn'
import { LocalPoseEngine } from './localPoseEngine'
import { MockEngine } from './mockEngine'
import { RemoteEngine } from './remoteEngine'
import type { TryOnEngine } from './types'

export function createEngine(id: EngineId): TryOnEngine {
  switch (id) {
    case 'local-pose':
      return new LocalPoseEngine()
    case 'remote':
      return new RemoteEngine()
    case 'mock':
      return new MockEngine()
  }
}

/**
 * Motor al que caer si el preferido no arranca (modelo sin descargar, sin red,
 * navegador sin WebGL…). `null` corta la cadena para no entrar en bucle.
 */
export function fallbackEngineFor(id: EngineId): EngineId | null {
  return id === 'mock' ? null : 'mock'
}
