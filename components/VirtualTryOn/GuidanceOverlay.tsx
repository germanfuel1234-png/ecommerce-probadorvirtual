'use client'

import React, { useEffect, useRef } from 'react'
import { GUIDANCE_OVERLAY_CONFIG } from '@/lib/constants/vtonConfig'

interface GuidanceOverlayProps {
  width: number
  height: number
  visible?: boolean
}

/**
 * Componente que renderiza una guía visual overlay en canvas
 * Muestra un marco indicador para posicionamiento del usuario
 */
export const GuidanceOverlay: React.FC<GuidanceOverlayProps> = ({
  width,
  height,
  visible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!visible || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas properties
    canvas.width = width
    canvas.height = height

    // Limpia canvas
    ctx.clearRect(0, 0, width, height)

    if (!GUIDANCE_OVERLAY_CONFIG.showGuide) return

    const margin = width * GUIDANCE_OVERLAY_CONFIG.marginPercent
    const boxWidth = width - margin * 2
    const boxHeight = height - margin * 2

    // Marco exterior semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(0, 0, width, height)

    // Área clara (donde debe estar el usuario)
    ctx.clearRect(margin, margin, boxWidth, boxHeight)

    // Borde del marco de guía
    ctx.strokeStyle = GUIDANCE_OVERLAY_CONFIG.guideColor
    ctx.lineWidth = GUIDANCE_OVERLAY_CONFIG.guideBorderWidth
    ctx.globalAlpha = GUIDANCE_OVERLAY_CONFIG.guideOpacity

    // Dibuja rectángulo
    ctx.strokeRect(margin, margin, boxWidth, boxHeight)

    // Esquinas redondeadas con decoradores
    const cornerSize = 30
    ctx.lineWidth = 3

    // Esquina superior izquierda
    ctx.beginPath()
    ctx.moveTo(margin, margin + cornerSize)
    ctx.lineTo(margin, margin)
    ctx.lineTo(margin + cornerSize, margin)
    ctx.stroke()

    // Esquina superior derecha
    ctx.beginPath()
    ctx.moveTo(width - margin - cornerSize, margin)
    ctx.lineTo(width - margin, margin)
    ctx.lineTo(width - margin, margin + cornerSize)
    ctx.stroke()

    // Esquina inferior izquierda
    ctx.beginPath()
    ctx.moveTo(margin, height - margin - cornerSize)
    ctx.lineTo(margin, height - margin)
    ctx.lineTo(margin + cornerSize, height - margin)
    ctx.stroke()

    // Esquina inferior derecha
    ctx.beginPath()
    ctx.moveTo(width - margin - cornerSize, height - margin)
    ctx.lineTo(width - margin, height - margin)
    ctx.lineTo(width - margin, height - margin - cornerSize)
    ctx.stroke()

    // Texto instructivo
    ctx.globalAlpha = 1
    ctx.fillStyle = GUIDANCE_OVERLAY_CONFIG.guideColor
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Posiciónate dentro del marco', width / 2, height - margin / 2)
  }, [width, height, visible])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  )
}

export default GuidanceOverlay
