# Arquitectura Técnica - Virtual Try-On E-Commerce

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Next.js Frontend Application                │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  VirtualTryOnModal                              │ │   │
│  │  │  ├─ CameraFeed (navigator.mediaDevices)        │ │   │
│  │  │  ├─ GuidanceOverlay (Canvas overlay)           │ │   │
│  │  │  ├─ ProductSelector                            │ │   │
│  │  │  └─ CartButton (Floating action)               │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Hooks (React)                                   │ │   │
│  │  │  ├─ useCamera (MediaStream API)                │ │   │
│  │  │  ├─ useVirtualTryOn (VTON logic)               │ │   │
│  │  │  └─ useCart (Zustand store)                    │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼ (HTTP/Fetch)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Clients (lib/api/)                              │   │
│  │  ├─ MockVTONClient (Dev/Testing)                    │   │
│  │  ├─ ReplicateVTONClient                             │   │
│  │  ├─ FashnVTONClient                                 │   │
│  │  └─ DecartVTONClient                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐        ┌─────────┐       ┌─────────┐
   │Replicate│        │ Fashn  │       │ Decart  │
   │  API    │        │ API    │       │ API     │
   └────┬────┘        └────┬───┘       └────┬────┘
        │                  │               │
        └──────────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │   GPU Server  │
                    │  (Inference)  │
                    │  IDM-VTON,    │
                    │  Cat-VTON     │
                    └───────────────┘
```

## 📡 Flujo de Datos

### 1. **Captura de Video (Cliente)**

```typescript
// useCamera.ts
navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 480 },
  audio: false
})
↓
MediaStream
↓
<video> element (renderer)
↓
canvas.captureFrame() ← Cada N ms según FPS
↓
Blob (JPEG/WebP)
```

### 2. **Procesamiento VTON**

```typescript
// useVirtualTryOn.ts
{
  frameBlob: Blob,        // From canvas
  clothingImage: Blob,    // From catalog
  clothingType: string,   // shirt, jacket, etc
  userId: string,         // Session identifier
}
↓
VTONClient.processFrame()
↓
HTTP POST to Provider API
↓
Response: { processedFrame: Blob, latency: ms }
↓
Display on Canvas/Video overlay
```

### 3. **Carrito (Global State)**

```typescript
// useCart.ts (Zustand)
CartStore {
  items: CartItem[],
  total: number
}
↓
Acciones: addItem, removeItem, updateQuantity, clear
↓
Persistencia (localStorage o API)
```

## 🎯 Diagrama de Componentes

```
app/page.tsx (Home)
├── Header
├── HeroSection
├── CatalogGrid
│   └── ProductCard[]
│       └── onClick → VirtualTryOnModal
├── FeatureSection
└── Footer

VirtualTryOnModal
├── Header (close button)
├── MainContent
│   ├── LeftPanel (1/2)
│   │   ├── CameraFeed
│   │   │   ├── <video>
│   │   │   ├── <canvas> (hidden)
│   │   │   └── GuidanceOverlay
│   │   │       └── <canvas> (overlay)
│   │   └── LatencyDisplay
│   │
│   └── RightPanel (1/2)
│       ├── ProductSelector
│       │   └── ClothingThumbnail[]
│       ├── SuccessMessage
│       ├── ErrorMessage
│       └── InfoPanel
│
└── CartButton (fixed)
    └── ShoppingCart icon + count
```

## 🔄 Estado de Máquina (State Machine)

```
IDLE
  │
  └─→ startCamera() ──→ LOADING
                          │
                          ├─ camera ready ──→ CAMERA_ACTIVE
                          │
                          └─ permission denied ──→ CAMERA_PERMISSION_DENIED
                                                       │
                                                       └─ retry ──→ LOADING
CAMERA_ACTIVE
  │
  ├─→ selectClothing() → startFrameCapture()
  │   │
  │   └─→ each frame ──→ PROCESSING_FRAME
  │                        │
  │                        ├─ success ──→ STREAM_ACTIVE
  │                        │              │
  │                        │              └─ (repeat loop)
  │                        │
  │                        └─ error ──→ ERROR
  │
  └─→ stopCamera() ──→ IDLE
```

## 📊 Estructuras de Datos

### Clothing

```typescript
interface Clothing {
  id: string                    // Unique ID
  name: string                  // Display name
  category: 'shirt'|'jacket'    // Type
  imageUrl: string              // URL to PNG image
  price: number                 // Price in USD
  description: string           // Product description
  color: string                 // Color name
  size: 'XS'|'S'|'M'|'L'...    // Size
}
```

### CartItem

```typescript
interface CartItem {
  clothingId: string            // Reference to Clothing
  quantity: number              // How many
  selectedSize: string          // User's size choice
  selectedColor: string         // User's color choice
}
```

### VTONResponse

```typescript
interface VTONResponse {
  success: boolean              // Operation success
  processedFrame?: Blob         // Output image
  timestamp: number             // When processed
  error?: string                // Error message
  latency: number               // Processing time (ms)
}
```

## 🎬 Ciclo de Vida del Componente

### VirtualTryOnModal

```
MOUNT
  ├─ useCamera.startCamera()
  ├─ vton.selectClothing(first_item)
  └─ Set up frame capture loop
      │
      ▼
ON_CAMERA_READY
  ├─ Get video dimensions
  └─ Start requestAnimationFrame loop
      │
      ├─→ Check if 200ms elapsed
      │
      └─→ canvas.captureFrame()
          │
          └─→ vton.processFrame(frame, clothing)
              │
              ├─→ API request
              │
              └─→ Response received
                  │
                  ├─→ setProcessedFrame(blob)
                  └─→ setState('stream_active')
      │
      ├─→ selectClothing(newClothing)
      │   └─→ Reset timer for immediate processing
      │
      └─→ (repeat)

ON_UNMOUNT
  ├─ Cancel frameInterval
  ├─ camera.stopCamera()
  ├─ vton.reset()
  └─ Cleanup
```

## ⚡ Performance Considerations

### Frame Capture Strategy

```typescript
// Target: ~24 FPS input, 12 FPS to API
const FPS_TARGET = 24
const API_CALL_FPS = 12
const MIN_FRAME_INTERVAL = 1000 / API_CALL_FPS  // 83ms

requestAnimationFrame(() => {
  now = performance.now()
  
  if (now - lastFrameTime >= MIN_FRAME_INTERVAL) {
    // Process frame
    vton.processFrame(...)
    lastFrameTime = now
  }
})
```

### Canvas Optimization

```typescript
// Use OffscreenCanvas if available (better performance)
if (typeof OffscreenCanvas !== 'undefined') {
  const offscreen = canvas.transferControlToOffscreen()
  worker.postMessage({ canvas: offscreen })
} else {
  // Fallback: main thread canvas
}
```

### Image Compression

```typescript
// JPEG at 85% quality for good balance
canvas.toBlob(
  blob => { /* ... */ },
  'image/jpeg',
  0.85
)

// WebP support fallback
canvas.toBlob(
  blob => { /* ... */ },
  'image/webp',
  0.85
)
```

## 🔐 Seguridad

### Client-Side

- ✅ Frame capture happens locally (no upload to unknown servers)
- ✅ WebRTC offers ICE candidates validation
- ✅ CORS headers prevent cross-origin abuse

### API Communication

- ✅ Use HTTPS/WSS only
- ✅ Validate API responses
- ✅ Implement rate limiting
- ✅ Never expose API keys in client code

```typescript
// WRONG (Client-side)
const response = await fetch(API_URL, {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
})

// RIGHT (Via Backend Proxy)
const response = await fetch('/api/vton/process', {
  method: 'POST',
  body: formData
})
// Backend then calls external API with secret key
```

## 📈 Scalability

### Horizontal Scaling

```
Load Balancer
├─ Next.js Instance 1
├─ Next.js Instance 2
└─ Next.js Instance N
        │
        └─→ VTON Worker Pool
            ├─ GPU Server 1
            ├─ GPU Server 2
            └─ GPU Server N
```

### Caching Strategy

```typescript
// Cache processed results (Redis)
const cacheKey = `vton:${hash(frame + clothing)}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)  // Instant response
} else {
  const result = await vtonAPI.process(...)
  await redis.setex(cacheKey, 3600, JSON.stringify(result))
  return result
}
```

## 🚀 Deployment

### Vercel (Recommended)

```yaml
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_VTON_PROVIDER": "replicate",
    "REPLICATE_API_KEY": "@REPLICATE_KEY"
  }
}
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Referencias Técnicas

- **MediaDevices API**: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **WebRTC**: https://webrtc.org/
- **Replicate Documentation**: https://replicate.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Next.js 14 App Router**: https://nextjs.org/docs/app
