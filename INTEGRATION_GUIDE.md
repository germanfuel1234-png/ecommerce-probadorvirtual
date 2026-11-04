# Guía de Integración de APIs - Virtual Try-On

## 🎯 Resumen Rápido

Este proyecto soporta múltiples proveedores de Virtual Try-On (VTON). Elige el que mejor se adapte a tus necesidades:

| Provider | Latencia | Precio | Documentación | Recomendado |
|----------|----------|--------|---------------|------------|
| **Mock** | 200-300ms | Gratis | ✅ Integrado | ✅ Desarrollo |
| **Replicate** | 5-15s | $0.005-0.01/pred | ✅ Excelente | ✅ Producción |
| **Fashn.ai** | 1-3s | Variable | ✅ Buena | ✅ Real-Time |
| **Decart/Anywear** | <1s | Contacto | ⚠️ Enterprise | 🏢 Enterprise |

---

## 1️⃣ Mock Client (Desarrollo Gratuito)

Perfecto para desarrollo local y testing. **No requiere API Keys**.

### Setup

```env
# .env.local
NEXT_PUBLIC_VTON_PROVIDER=mock
```

### Uso

```typescript
import { MockVTONClient } from '@/lib/api/mockVtonClient'

// Auto-usado por useVirtualTryOn hook
// O manualmente:
const mockClient = new MockVTONClient(300) // 300ms latencia simulada
mockClient.setProcessingDelay(500) // Ajusta para testing
```

### Ventajas
- ✅ No requiere autenticación
- ✅ Desarrollo offline
- ✅ Latencia predecible
- ✅ Testing fácil

### Limitaciones
- ❌ No aplica realmente la prenda (solo simula)
- ❌ No es para producción

---

## 2️⃣ Replicate API (Producción Recomendada)

Mejor relación precio/rendimiento. Modelos como **IDM-VTON** disponibles.

### Setup

#### Paso 1: Obtener API Key

1. Ve a https://replicate.com/account/api-tokens
2. Crea una nueva API token
3. Copia el token

#### Paso 2: Configurar Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_VTON_PROVIDER=replicate
REPLICATE_API_KEY=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VTON_MODEL_ID=sczhou/iidm-vton:8ee0c3c9a0fa3dd1e8b38f37e8a0fdb78c63cbea2a8fac8b8b2c5c8a9e8b8b8b
```

#### Paso 3: La integración está lista

El `useVirtualTryOn` hook automáticamente cargará `ReplicateVTONClient`.

### Código de Integración Manual

```typescript
import { ReplicateVTONClient } from '@/lib/api/replicateClient'

const client = new ReplicateVTONClient(process.env.REPLICATE_API_KEY!)

const response = await client.processFrame({
  frame: videoFrameBlob,
  clothingImage: clothingBlob,
  clothingType: 'shirt',
  userId: 'user-123'
})

if (response.success) {
  console.log(`Procesado en ${response.latency}ms`)
  displayImage(response.processedFrame)
} else {
  console.error(response.error)
}
```

### Modelos Disponibles en Replicate

```typescript
// IDM-VTON (Recomendado - mejor calidad)
sczhou/iidm-vton:8ee0c3c9a0fa3dd1e8b38f37e8a0fdb78c63cbea2a8fac8b8b2c5c8a9e8b8b8b

// Cat-VTON (Más rápido)
hhsinyi/cat-vton:latest

// OOTDiff (Outfitting Over Time)
ourongxing/ootd:latest
```

### Pricing

```
IDM-VTON: $0.0075 por predicción
5000 predicciones/mes = $37.50
```

### Ventajas
- ✅ Modelos de calidad premium
- ✅ Escalable automáticamente
- ✅ Buena documentación
- ✅ Soporte activo
- ✅ Webhook support para procesamiento async

### Limitaciones
- ❌ Latencia de 5-15 segundos
- ❌ No es tiempo real puro
- ❌ Requiere polling de estado

### Workflow Completo

```typescript
// 1. Crear predicción
const prediction = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${REPLICATE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    version: MODEL_ID,
    input: {
      image: frameBase64,
      cloth_image: clothingBase64,
      category: 'upper_body'
    }
  })
})

// 2. Poll hasta completar (ReplicateVTONClient lo hace automáticamente)
while (prediction.status === 'processing') {
  await sleep(500)
  prediction = await getPrediction(prediction.id)
}

// 3. Usar resultado
if (prediction.status === 'succeeded') {
  const outputUrl = prediction.output[0]
  const blob = await fetch(outputUrl).then(r => r.blob())
}
```

---

## 3️⃣ Fashn.ai (Virtual Try-On Especializado)

Plataforma especializada en VTON con **baja latencia** (1-3s).

### Setup

#### Paso 1: Registrarse

1. Ve a https://fashn.ai/
2. Regístrate para acceso a API
3. Obtén tu API Key en el dashboard

#### Paso 2: Configurar

```env
# .env.local
NEXT_PUBLIC_VTON_PROVIDER=fashn
FASHN_API_KEY=your_fashn_api_key
VTON_ENDPOINT=https://api.fashn.ai/v1/try-on
```

#### Paso 3: Listo

```typescript
import { FashnVTONClient } from '@/lib/api/fashnClient'

const client = new FashnVTONClient(process.env.FASHN_API_KEY!)

const response = await client.processFrame({
  frame: videoBlob,
  clothingImage: clothingBlob,
  clothingType: 'shirt'
})
```

### API Request Format (Fashn.ai)

```typescript
// Fashn usa FormData (binary files)
const formData = new FormData()
formData.append('image', frameBlob)
formData.append('clothing', clothingBlob)
formData.append('category', 'upper_body')

const response = await fetch('https://api.fashn.ai/v1/try-on', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${FASHN_API_KEY}`
  },
  body: formData
})

const data = await response.json()
const resultImage = base64ToBlob(data.result)
```

### Categorías Soportadas

```typescript
'upper_body' | 'lower_body' | 'full_body' | 'shoe' | 'accessory'
```

### Pricing

```
Modelo: Custom pricing
Contacta con sales para volumen
```

### Ventajas
- ✅ Especializado en VTON
- ✅ Latencia más baja que Replicate
- ✅ Buena documentación
- ✅ Soporte técnico dedicado

### Limitaciones
- ⚠️ Menos modelos pre-entrenados
- ⚠️ Custom pricing (no públicamente disponible)

---

## 4️⃣ Decart AI / Anywear (Enterprise)

Solución de **máxima calidad** de Decart AI (creadores de Anywear).
Latencia <1s con modelos SOTA.

### Setup

#### Paso 1: Contactar Decart

1. Ve a https://decart.ai/
2. Solicita acceso a API
3. Recibe credenciales custom

#### Paso 2: Configurar

```env
# .env.local
NEXT_PUBLIC_VTON_PROVIDER=decart
DECART_API_KEY=your_decart_key
DECART_ENDPOINT=https://api.decart.ai/v1/virtual-try-on
```

#### Paso 3: Implementar

```typescript
// Crear DecartVTONClient similar a ReplicateVTONClient
import VTONClientBase from '@/lib/api/vtonClient'

class DecartVTONClient extends VTONClientBase {
  async processFrame(payload) {
    // Implementación específica para Decart API
    // Típicamente usa WebRTC para streaming en tiempo real
  }
}
```

### WebSocket para Streaming en Tiempo Real

```typescript
// Decart soporta WebSocket para conexiones en vivo
const ws = new WebSocket(process.env.VTON_WS_URL)

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'frame',
    frame: frameBase64,
    clothing: clothingBase64
  }))
}

ws.onmessage = (event) => {
  const { result } = JSON.parse(event.data)
  displayProcessedFrame(result)
}
```

### Ventajas
- ✅ Máxima calidad y velocidad
- ✅ Tiempo real puro (<1s)
- ✅ WebRTC/WebSocket support
- ✅ Modelos proprietarios avanzados
- ✅ Soporte premium

### Limitaciones
- ❌ Requiere acuerdo comercial
- ❌ Pricing custom (generalmente alto)
- ❌ Documentación limited (privada)

---

## 🔄 Cambiar Entre Providers

### Dinámicamente

```typescript
import { useVirtualTryOn } from '@/lib/hooks/useVirtualTryOn'
import { ReplicateVTONClient } from '@/lib/api/replicateClient'
import { FashnVTONClient } from '@/lib/api/fashnClient'

const vton = useVirtualTryOn()

// Cambiar a Replicate
const replicateClient = new ReplicateVTONClient(API_KEY)
vton.setVTONClient(replicateClient)

// Cambiar a Fashn
const fashnClient = new FashnVTONClient(API_KEY)
vton.setVTONClient(fashnClient)
```

### En Configuración

```env
# Cambiar solo esta variable
NEXT_PUBLIC_VTON_PROVIDER=replicate # o fashn, decart
```

---

## 🛡️ Mejores Prácticas

### 1. Proteger API Keys

```typescript
// ❌ INCORRECTO - Expone la key
const response = await fetch('/api/vton', {
  headers: { 'X-API-Key': process.env.API_KEY }
})

// ✅ CORRECTO - Backend proxy
// client.ts
const response = await fetch('/api/vton/process', {
  method: 'POST',
  body: formData
})

// /pages/api/vton/process.ts
export default async function handler(req, res) {
  const apiKey = process.env.REPLICATE_API_KEY // Server-side
  const response = await fetch(REPLICATE_API, {
    headers: { 'Authorization': `Token ${apiKey}` }
  })
  res.json(await response.json())
}
```

### 2. Manejo de Errores

```typescript
try {
  const response = await client.processFrame(payload)
  
  if (!response.success) {
    // Log error pero no expongas detalles
    console.error('[VTON Error]', response.error)
    
    // Muestra mensaje amigable al usuario
    showUserError('La prenda no se pudo procesar. Intenta de nuevo.')
  }
} catch (error) {
  // Network error, timeout, etc
  handleNetworkError(error)
}
```

### 3. Rate Limiting

```typescript
// Evita saturar la API
const FRAME_INTERVAL_MS = 200 // Max 5 frames/sec
const MAX_CONCURRENT_REQUESTS = 1

let lastProcessTime = 0
let isProcessing = false

async function processFrameSafe(frame) {
  if (isProcessing) return
  
  const now = Date.now()
  if (now - lastProcessTime < FRAME_INTERVAL_MS) return
  
  isProcessing = true
  lastProcessTime = now
  
  try {
    await client.processFrame(frame)
  } finally {
    isProcessing = false
  }
}
```

### 4. Caching de Resultados

```typescript
// Cache results in browser memory
const frameCache = new Map()

function getCacheKey(frame, clothing) {
  return `${frame.size}-${clothing.id}`
}

async function processWithCache(frame, clothing) {
  const key = getCacheKey(frame, clothing)
  
  if (frameCache.has(key)) {
    return frameCache.get(key)
  }
  
  const result = await client.processFrame({
    frame,
    clothingImage: clothing
  })
  
  frameCache.set(key, result)
  
  // Limit cache size
  if (frameCache.size > 50) {
    const firstKey = frameCache.keys().next().value
    frameCache.delete(firstKey)
  }
  
  return result
}
```

---

## 📊 Comparativa Final

### Tabla de Decisión

```
¿Necesitas tiempo real?
├─ SI → Decart/Anywear (Enterprise)
└─ NO ↓

¿Tienes presupuesto limitado?
├─ SI → Replicate
└─ NO → Fashn.ai (mejor balance)

¿Está en desarrollo/testing?
├─ SI → Mock Client
└─ NO → Ver arriba
```

### Latencia Esperada

```
Mock:    200-300ms (simulado)
Fashn:   1-3 segundos
Replicate: 5-15 segundos
Decart:  <1 segundo (WebRTC)
```

### Costo Mensual (Estimado)

```
Mock:     $0
Replicate: $30-100 (5,000-15,000 predicciones)
Fashn:    $50-200 (según plan)
Decart:   $500+ (custom enterprise)
```

---

## ✅ Checklist de Deployment

- [ ] Elegir provider
- [ ] Obtener API Key
- [ ] Configurar `.env.local`
- [ ] Testear en desarrollo
- [ ] Implementar error handling
- [ ] Agregar rate limiting
- [ ] Proteger API keys en backend
- [ ] Monitorear latencia
- [ ] Configurar alertas
- [ ] Deploy a producción

---

## 📞 Support & Recursos

- **Replicate**: https://support.replicate.com/
- **Fashn.ai**: support@fashn.ai
- **Decart AI**: https://decart.ai/contact
- **Este Proyecto**: GitHub Issues

