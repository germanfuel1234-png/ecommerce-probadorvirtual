import type { VTONAPIConfig } from '@/lib/types'

// Configuración de Virtual Try-On
export const VTON_CONFIG: VTONAPIConfig = {
  provider: process.env.NEXT_PUBLIC_VTON_PROVIDER as any || 'mock',
  apiKey: process.env.VTON_API_KEY,
  endpoint: process.env.VTON_ENDPOINT,
  modelId: process.env.VTON_MODEL_ID,
  wsUrl: process.env.VTON_WS_URL,
}

// Configuración de Replicate (si se usa)
export const REPLICATE_CONFIG = {
  apiKey: process.env.REPLICATE_API_KEY,
  vtonModel: 'sczhou/iidm-vton:8ee0c3c9a0fa3dd1e8b38f37e8a0fdb78c63cbea2a8fac8b8b2c5c8a9e8b8b8b',
}

// Configuración de Fashn.ai (si se usa)
export const FASHN_CONFIG = {
  apiKey: process.env.FASHN_API_KEY,
  endpoint: 'https://api.fashn.ai/v1/try-on',
}

// Configuración de Decart AI / Anywear (si se usa)
export const DECART_CONFIG = {
  apiKey: process.env.DECART_API_KEY,
  endpoint: 'https://api.decart.ai/v1/virtual-try-on',
}

// Opciones de procesamiento de video
export const VIDEO_PROCESSING_CONFIG = {
  frameWidth: 640,
  frameHeight: 480,
  frameRate: 24, // FPS objetivo
  jpegQuality: 0.85,
  maxLatency: 500, // ms máximo aceptable
  bufferSize: 3, // frames en buffer
}

// Configuración de guía visual
export const GUIDANCE_OVERLAY_CONFIG = {
  showGuide: true,
  guideOpacity: 0.3,
  guideColor: '#F97316', // Color accent (naranja)
  guideBorderWidth: 3,
  marginPercent: 0.1, // 10% margen desde los bordes
}
