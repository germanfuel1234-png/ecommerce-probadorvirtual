/**
 * Parámetros del probador. Todo lo ajustable vive aquí para no tener números
 * mágicos repartidos por los componentes.
 */

/** Qué motor usa el cliente. Se valida en vez de castear a ciegas. */
export const ENGINE_IDS = ['local-pose', 'mock', 'remote'] as const
export type EngineId = (typeof ENGINE_IDS)[number]

function readEngineId(): EngineId {
  const raw = process.env.NEXT_PUBLIC_TRYON_ENGINE
  return ENGINE_IDS.includes(raw as EngineId) ? (raw as EngineId) : 'local-pose'
}

export const TRYON_ENGINE: EngineId = readEngineId()

export const CAMERA_CONFIG = {
  width: 960,
  height: 720,
  facingMode: 'user' as const,
  /** Vista selfie: el vídeo se refleja para que el usuario se vea como en un espejo. */
  mirrored: true,
}

export const LOCAL_ENGINE_CONFIG = {
  /** Copiados por `npm run setup:local-ai`; se sirven desde /public, sin CDN. */
  wasmPath: '/mediapipe/wasm',
  modelPath: '/models/pose_landmarker_lite.task',
  /**
   * Suavizado exponencial de los puntos de anclaje (0 = sin suavizar, 1 = congelado).
   * Sin esto la prenda tiembla con el ruido del detector.
   */
  smoothing: 0.45,
  /** Por debajo de esta confianza se considera que no hay cuerpo en cuadro. */
  minVisibility: 0.5,
  /** Opacidad de la prenda compuesta. Algo menor que 1 integra mejor los bordes. */
  garmentOpacity: 0.95,
  /**
   * Modelo multiclase de `ImageSegmenter` (pelo/piel/cara/ropa/fondo) usado para
   * la oclusión: si falta o no carga, el motor sigue funcionando sin ella, igual
   * que degradaba antes de que existiera esta opción.
   */
  segmentationModelPath: '/models/selfie_multiclass_256x256.tflite',
  /**
   * Índices de categoría del modelo que deben pintarse **encima** de la prenda
   * (piel/pelo/cara), así un brazo cruzado por delante del torso no queda
   * tapado. `4` (ropa) y `0` (fondo) se dejan debajo a propósito.
   */
  occludingCategories: [1, 2, 3] as const,
}

export const GUIDANCE_CONFIG = {
  color: '#F97316',
  /** Margen del marco guía como fracción del lado corto. */
  marginRatio: 0.08,
  cornerRatio: 0.07,
  label: 'Colócate dentro del marco, de cuerpo medio',
}
