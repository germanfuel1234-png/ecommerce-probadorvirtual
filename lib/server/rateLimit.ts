import 'server-only'

/**
 * Límite de uso simple para `/api/try-on`: cada pasada cuesta plata de verdad
 * (Fashn cobra por generación), así que la ruta no puede quedar abierta sin
 * freno en un dominio público — un bot rastreándola o alguien reenviando el
 * link la deja sin créditos.
 *
 * En memoria, por IP, ventana fija. No hace falta Redis ni base de datos para
 * esto: alcanza con frenar abuso básico. Si el deploy corre en más de una
 * instancia (varios procesos de Node detrás de un balanceador), cada una
 * lleva su propio conteo — el límite real pasa a ser `max × instancias`, que
 * para este caso sigue siendo una protección razonable, no una garantía
 * exacta.
 */

const WINDOW_MS = 10 * 60 * 1000 // 10 minutos
const MAX_REQUESTS_PER_WINDOW = 5

interface Bucket {
  count: number
  windowStart: number
}

const buckets = new Map<string, Bucket>()

// Evita que el Map crezca sin límite si pasan muchas IPs distintas a lo largo
// del tiempo en un proceso de vida larga: poda lo vencido cada tanto en vez
// de en cada request.
let lastSweep = Date.now()
const SWEEP_INTERVAL_MS = 30 * 60 * 1000

function sweepExpired(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) {
    return
  }
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) {
      buckets.delete(key)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  /** Sólo si `allowed` es `false`: cuánto falta para la próxima ventana. */
  retryAfterMs?: number
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  sweepExpired(now)

  const bucket = buckets.get(key)

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - bucket.windowStart) }
  }

  bucket.count += 1
  return { allowed: true }
}

/**
 * IP del cliente a partir de los headers que pone el proxy delante de Next
 * (Hostinger, Vercel, nginx...). `request.ip` no está garantizado en todos
 * los runtimes de despliegue, así que se lee del header — con un valor fijo
 * de reserva para que el rate limit no se caiga si algún día no está, sólo
 * se vuelve menos preciso (todo lo no identificado comparte balde).
 */
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}
