'use client'

import { GUIDANCE_CONFIG } from '@/lib/config/tryOn'

interface GuidanceOverlayProps {
  visible?: boolean
  /** Se resalta cuando el motor pierde el cuerpo, para invitar a recolocarse. */
  highlight?: boolean
}

/**
 * Marco guía.
 *
 * Es DOM puro, no canvas: la versión anterior dibujaba en un canvas de 640×480
 * fijo sobre un vídeo responsive con `object-cover`, así que el marco no
 * coincidía con lo que el usuario veía. Con porcentajes el encaje es exacto a
 * cualquier tamaño y además se ve nítido en pantallas HiDPI.
 */
export function GuidanceOverlay({ visible = true, highlight = false }: GuidanceOverlayProps) {
  if (!visible) {
    return null
  }

  const margin = `${GUIDANCE_CONFIG.marginRatio * 100}%`
  const corner = `${GUIDANCE_CONFIG.cornerRatio * 100}%`
  const color = GUIDANCE_CONFIG.color

  const shade = 'absolute bg-black/35'
  const bracket = 'absolute'

  return (
    <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
      {/* Zona oscurecida: cuatro bandas que dejan libre el centro. */}
      <div className={shade} style={{ inset: `0 0 auto 0`, height: margin }} />
      <div className={shade} style={{ inset: `auto 0 0 0`, height: margin }} />
      <div className={shade} style={{ top: margin, bottom: margin, left: 0, width: margin }} />
      <div className={shade} style={{ top: margin, bottom: margin, right: 0, width: margin }} />

      {/* Marco y esquinas. */}
      <div
        className="absolute rounded-lg border transition-colors duration-300"
        style={{
          inset: margin,
          borderColor: color,
          opacity: highlight ? 0.9 : 0.35,
          borderWidth: highlight ? 2 : 1,
        }}
      >
        <span
          className={bracket}
          style={{ top: -2, left: -2, borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}`, width: corner, height: corner }}
        />
        <span
          className={bracket}
          style={{ top: -2, right: -2, borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}`, width: corner, height: corner }}
        />
        <span
          className={bracket}
          style={{ bottom: -2, left: -2, borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}`, width: corner, height: corner }}
        />
        <span
          className={bracket}
          style={{ bottom: -2, right: -2, borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}`, width: corner, height: corner }}
        />
      </div>

      <p
        className="absolute left-0 right-0 text-center text-xs font-medium tracking-wide drop-shadow"
        style={{ bottom: `calc(${margin} / 3)`, color }}
      >
        {GUIDANCE_CONFIG.label}
      </p>
    </div>
  )
}

export default GuidanceOverlay
