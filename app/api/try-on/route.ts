import { NextResponse } from 'next/server'

import { findGarment } from '@/lib/catalog/garments'
import { checkRateLimit, clientIpFrom } from '@/lib/server/rateLimit'
import { garmentAsDataUri, readProviderConfig, runRemoteTryOn } from '@/lib/server/tryOnProvider'

/**
 * Proxy del motor remoto.
 *
 * Existe para que el navegador nunca toque una API key: el cliente manda el
 * frame aquí y es el servidor quien habla con el proveedor. El motor local no
 * pasa por esta ruta.
 */

export const runtime = 'nodejs'
// Lee el sistema de archivos y variables de entorno: nunca debe cachearse.
export const dynamic = 'force-dynamic'

/** Permite al cliente saber si merece la pena usar el motor remoto. */
export function GET() {
  const config = readProviderConfig()

  return NextResponse.json({
    configured: config !== null,
    provider: config?.id ?? null,
  })
}

const MAX_FRAME_BYTES = 8 * 1024 * 1024

export async function POST(request: Request) {
  // Cada pasada cuesta plata real (Fashn cobra por generación): antes que
  // nada, no sea que un bot rastreando la página o un link reenviado de más
  // se coma los créditos sin que nadie haya pedido probarse nada.
  const rateLimit = checkRateLimit(clientIpFrom(request))
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimit.retryAfterMs ?? 0) / 1000)
    return NextResponse.json(
      { error: 'Demasiadas pruebas en poco tiempo. Esperá un momento y volvé a intentar.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  const config = readProviderConfig()

  if (!config) {
    return NextResponse.json(
      { error: 'No hay proveedor remoto configurado. Define TRYON_PROVIDER y FASHN_API_KEY.' },
      { status: 503 }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Se esperaba multipart/form-data.' }, { status: 400 })
  }

  const frame = form.get('frame')
  const garmentId = form.get('garmentId')

  if (!(frame instanceof File) || typeof garmentId !== 'string') {
    return NextResponse.json({ error: 'Faltan los campos `frame` y `garmentId`.' }, { status: 400 })
  }

  if (frame.size === 0 || frame.size > MAX_FRAME_BYTES) {
    return NextResponse.json({ error: 'El frame está vacío o es demasiado grande.' }, { status: 413 })
  }

  // El id se resuelve contra el catálogo del servidor: así el cliente no puede
  // pedir que se procese una imagen arbitraria.
  const garment = findGarment(garmentId)

  if (!garment) {
    return NextResponse.json({ error: `Prenda desconocida: ${garmentId}` }, { status: 404 })
  }

  try {
    const frameBuffer = Buffer.from(await frame.arrayBuffer())
    const frameDataUri = `data:${frame.type || 'image/jpeg'};base64,${frameBuffer.toString('base64')}`

    const result = await runRemoteTryOn(
      config,
      frameDataUri,
      await garmentAsDataUri(garment.imageUrl),
      garment.region === 'lower' ? 'bottoms' : garment.region === 'full' ? 'one-pieces' : 'tops'
    )

    return new NextResponse(result, {
      status: 200,
      headers: {
        'Content-Type': result.type || 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    // El mensaje del proveedor es útil en local; en producción conviene
    // registrarlo y devolver algo genérico.
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[api/try-on]', message)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
