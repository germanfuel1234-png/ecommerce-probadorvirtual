#!/usr/bin/env node
/**
 * Prepara el motor de IA local para que funcione sin internet.
 *
 * 1. Copia el runtime WASM de MediaPipe desde node_modules a /public/mediapipe/wasm
 * 2. Descarga (una sola vez) el modelo de pose a /public/models
 *
 * Tras ejecutarse, el probador no vuelve a pedir red: todo se sirve desde /public.
 * Es idempotente y nunca aborta la instalación: si no hay red, avisa y sigue.
 */
import { createWriteStream } from 'node:fs'
import { access, cp, mkdir, stat, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WASM_SRC = join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const WASM_DEST = join(ROOT, 'public', 'mediapipe', 'wasm')

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const MODEL_DEST = join(ROOT, 'public', 'models', 'pose_landmarker_lite.task')
const MODEL_MIN_BYTES = 1_000_000

const SEGMENTATION_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite'
const SEGMENTATION_MODEL_DEST = join(ROOT, 'public', 'models', 'selfie_multiclass_256x256.tflite')
const SEGMENTATION_MODEL_MIN_BYTES = 1_000_000

const exists = (path) =>
  access(path).then(
    () => true,
    () => false
  )

async function copyWasmRuntime() {
  if (!(await exists(WASM_SRC))) {
    console.warn('[setup-local-ai] Falta @mediapipe/tasks-vision. Ejecuta "npm install" primero.')
    return false
  }

  await mkdir(dirname(WASM_DEST), { recursive: true })
  await cp(WASM_SRC, WASM_DEST, { recursive: true })
  console.log('[setup-local-ai] Runtime WASM copiado a public/mediapipe/wasm')
  return true
}

async function downloadModel(label, url, dest, minBytes) {
  if (await exists(dest)) {
    const { size } = await stat(dest)
    if (size >= minBytes) {
      console.log(`[setup-local-ai] ${label} ya presente, no se vuelve a descargar.`)
      return true
    }
    // Descarga previa truncada: la rehacemos.
    await unlink(dest)
  }

  await mkdir(dirname(dest), { recursive: true })

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) })
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    await pipeline(response.body, createWriteStream(dest))

    const { size } = await stat(dest)
    if (size < minBytes) {
      throw new Error(`descarga incompleta (${size} bytes)`)
    }

    console.log(`[setup-local-ai] ${label} descargado (${(size / 1e6).toFixed(1)} MB)`)
    return true
  } catch (error) {
    await unlink(dest).catch(() => {})
    console.warn(`[setup-local-ai] No se pudo descargar ${label}: ${error.message}`)
    console.warn('[setup-local-ai] Reintenta con: npm run setup:local-ai')
    return false
  }
}

const wasmOk = await copyWasmRuntime()
const poseModelOk = wasmOk
  ? await downloadModel('el modelo de pose', MODEL_URL, MODEL_DEST, MODEL_MIN_BYTES)
  : false

// La segmentación es una mejora (oclusión), no un requisito: si falla, el
// probador sigue funcionando con el motor de pose solo, como siempre lo hizo.
if (wasmOk) {
  await downloadModel(
    'el modelo de segmentación',
    SEGMENTATION_MODEL_URL,
    SEGMENTATION_MODEL_DEST,
    SEGMENTATION_MODEL_MIN_BYTES
  )
}

if (wasmOk && poseModelOk) {
  console.log('[setup-local-ai] Motor local listo. Arranca con "npm run dev".')
} else if (wasmOk) {
  console.warn('[setup-local-ai] El probador arrancará en modo "mock" hasta reintentar la descarga.')
}

// Nunca fallamos el install por esto.
process.exit(0)
