import 'server-only'

import { readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'

/**
 * Proveedores remotos de try-on, **sólo servidor**.
 *
 * El `import 'server-only'` de arriba hace que el build falle si alguien
 * importa este módulo desde un componente cliente. Es la garantía estructural
 * de que no se repita el problema original: los clientes de Replicate y Fashn
 * se instanciaban en el navegador y leían `process.env.REPLICATE_API_KEY`, que
 * sin el prefijo `NEXT_PUBLIC_` siempre vale `undefined` en el cliente — y si
 * se le hubiera puesto el prefijo, la key habría quedado pública en el bundle.
 */

export type RemoteProviderId = 'fashn'

export interface RemoteProviderConfig {
  id: RemoteProviderId
  apiKey: string
  modelName: string
}

export function readProviderConfig(): RemoteProviderConfig | null {
  const id = process.env.TRYON_PROVIDER

  if (id !== 'fashn') {
    return null
  }

  const apiKey = process.env.FASHN_API_KEY
  if (!apiKey) {
    return null
  }

  return {
    id,
    apiKey,
    // `tryon-max` es el que Fashn recomienda como punto de partida ("el
    // endpoint de prueba recomendado para la mayoría de aplicaciones");
    // `tryon-v1.6` existe para integraciones en tiempo real sensibles al
    // costo, que no es nuestro caso — este motor ya es `snapshot`, no hay
    // ganancia en elegir el más barato en vez del más capaz.
    modelName: process.env.FASHN_MODEL_NAME ?? 'tryon-max',
  }
}

/**
 * Los modelos de Fashn no comparten nombre de campo para la prenda: `tryon-max`
 * espera `product_image`, los modelos anteriores (`tryon-v1.6` y previos)
 * esperan `garment_image`. Cambiar `FASHN_MODEL_NAME` sin esto haría que la
 * prenda se ignorase en silencio — contrastado contra la documentación
 * vigente (docs.fashn.ai/api-reference), no es una suposición.
 */
function garmentImageField(modelName: string): 'product_image' | 'garment_image' {
  return modelName.startsWith('tryon-max') ? 'product_image' : 'garment_image'
}

/**
 * Lee una imagen de /public y la devuelve como data URI.
 *
 * Un proveedor externo no puede resolver `http://localhost:3000/...`, así que
 * la prenda viaja embebida. Ojo: los modelos de difusión esperan ráster; si vas
 * a usar esta vía, sustituye los SVG del catálogo por PNG con transparencia.
 */
export async function garmentAsDataUri(imageUrl: string): Promise<string> {
  // `normalize` + comprobación de prefijo para que un `imageUrl` manipulado no
  // pueda salirse de /public con `../`.
  const relative = normalize(imageUrl).replace(/^(\.\.(\/|\\|$))+/, '')
  const absolute = join(process.cwd(), 'public', relative)

  if (!absolute.startsWith(join(process.cwd(), 'public'))) {
    throw new Error('Ruta de imagen fuera de /public')
  }

  const file = await readFile(absolute)
  const mime = relative.endsWith('.png')
    ? 'image/png'
    : relative.endsWith('.svg')
      ? 'image/svg+xml'
      : 'image/jpeg'

  return `data:${mime};base64,${file.toString('base64')}`
}

interface RunResponse {
  id?: string
  error?: string
}

interface StatusResponse {
  status: 'starting' | 'in_queue' | 'processing' | 'completed' | 'failed'
  output?: string[]
  error?: string | { message?: string }
}

const POLL_INTERVAL_MS = 1_000
const MAX_POLLS = 60

/**
 * Lanza una pasada en Fashn y espera el resultado.
 *
 * Re-contrastado contra la documentación vigente de Fashn (`/v1/run` +
 * `/v1/status/{id}`, docs.fashn.ai/api-reference) el 2026-11-08: endpoints,
 * campos y valores de `category` coinciden. Lo único que no se puede
 * verificar sin clave real es el comportamiento en vivo del proveedor (hoy
 * en in_queue por tiempo real, créditos agotados, etc.) — si falla ahí,
 * probá primero con una llamada suelta fuera de esta app antes de asumir que
 * el bug está acá.
 */
export async function runRemoteTryOn(
  config: RemoteProviderConfig,
  modelImageDataUri: string,
  garmentImageDataUri: string,
  category: string
): Promise<Blob> {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  }

  const run = await fetch('https://api.fashn.ai/v1/run', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model_name: config.modelName,
      inputs: {
        model_image: modelImageDataUri,
        [garmentImageField(config.modelName)]: garmentImageDataUri,
        category,
      },
    }),
  })

  if (!run.ok) {
    throw new Error(`El proveedor rechazó la petición (${run.status}): ${await run.text()}`)
  }

  const { id, error }: RunResponse = await run.json()

  if (error || !id) {
    throw new Error(error ?? 'El proveedor no devolvió un id de predicción')
  }

  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${id}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })

    if (!statusResponse.ok) {
      throw new Error(`No se pudo consultar el estado (${statusResponse.status})`)
    }

    const status: StatusResponse = await statusResponse.json()

    if (status.status === 'failed') {
      const detail = typeof status.error === 'string' ? status.error : status.error?.message
      throw new Error(detail ?? 'La predicción falló en el proveedor')
    }

    if (status.status === 'completed') {
      const imageUrl = status.output?.[0]

      if (!imageUrl) {
        throw new Error('La predicción terminó sin imagen de salida')
      }

      const image = await fetch(imageUrl)

      if (!image.ok) {
        throw new Error('No se pudo descargar la imagen resultante')
      }

      return image.blob()
    }
  }

  throw new Error('Se agotó el tiempo de espera del proveedor')
}
