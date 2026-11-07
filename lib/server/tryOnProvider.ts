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
    modelName: process.env.FASHN_MODEL_NAME ?? 'tryon-v1.6',
  }
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
 * Contrastado con la API v1 documentada (`/v1/run` + `/v1/status/{id}`), pero
 * no se ha podido probar en vivo porque no hay API key en este entorno:
 * verifica los nombres de campo contra la documentación vigente antes de
 * confiar en esta vía en producción.
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
        garment_image: garmentImageDataUri,
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
