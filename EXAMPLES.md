# 💡 Ejemplos Prácticos - Virtual Try-On

Ejemplos reales de cómo extender y usar la plataforma.

---

## 1️⃣ Ejemplo: Cambiar de Proveedor en Runtime

```typescript
// components/VirtualTryOn/VirtualTryOnModal.tsx

import { useVirtualTryOn } from '@/lib/hooks/useVirtualTryOn'
import { ReplicateVTONClient } from '@/lib/api/replicateClient'
import { FashnVTONClient } from '@/lib/api/fashnClient'

export const VirtualTryOnModal = () => {
  const vton = useVirtualTryOn()
  
  // Cambiar a Replicate
  const switchToReplicate = () => {
    const client = new ReplicateVTONClient(process.env.REPLICATE_API_KEY!)
    vton.setVTONClient(client)
    alert('Ahora usando Replicate')
  }
  
  // Cambiar a Fashn
  const switchToFashn = () => {
    const client = new FashnVTONClient(process.env.FASHN_API_KEY!)
    vton.setVTONClient(client)
    alert('Ahora usando Fashn.ai')
  }
  
  return (
    <div>
      <button onClick={switchToReplicate}>Usar Replicate</button>
      <button onClick={switchToFashn}>Usar Fashn.ai</button>
      {/* ... resto del componente */}
    </div>
  )
}
```

---

## 2️⃣ Ejemplo: Agregar Prenda Personalizada

```typescript
// lib/constants/products.ts

export const CATALOG_CLOTHES = {
  // ... prendas existentes ...
  
  // Nueva prenda personalizada
  'custom-001': {
    id: 'custom-001',
    name: 'Mi Diseño Custom',
    category: 'shirt',
    price: 99.99,
    color: 'Personalizado',
    size: 'M',
    description: 'Camiseta con mi diseño único',
    imageUrl: '/images/clothes/custom-design.png',
  }
}
```

Uso en componente:

```typescript
import { CATALOG_CLOTHES } from '@/lib/constants/products'

const customClothing = CATALOG_CLOTHES['custom-001']
vton.selectClothing(customClothing)
```

---

## 3️⃣ Ejemplo: Persistencia del Carrito (localStorage)

```typescript
// lib/hooks/useCart.ts - Versión mejorada

import { useEffect } from 'react'

export const useCartStore = create<CartStore>((set, get) => ({
  // ... store inicial ...
  
  // Cargar del localStorage
  hydrate: () => {
    const stored = localStorage.getItem('cart')
    if (stored) {
      set(JSON.parse(stored))
    }
  },
  
  // Guardar en localStorage
  addItem: (item) => {
    set(state => {
      // ... lógica existente ...
      const newState = { /* ... */ }
      localStorage.setItem('cart', JSON.stringify(newState))
      return newState
    })
  }
}))

// En VirtualTryOnModal
useEffect(() => {
  useCartStore.getState().hydrate()
}, [])
```

---

## 4️⃣ Ejemplo: Integración con Backend

```typescript
// pages/api/vton/process.ts (Backend proxy)

import type { NextApiRequest, NextApiResponse } from 'next'
import { ReplicateVTONClient } from '@/lib/api/replicateClient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Protege API key en servidor
    const client = new ReplicateVTONClient(process.env.REPLICATE_API_KEY!)
    
    // Convierte FormData a buffer
    const frame = Buffer.from(req.body.frame, 'base64')
    const clothing = Buffer.from(req.body.clothing, 'base64')
    
    const response = await client.processFrame({
      frame: new Blob([frame]),
      clothingImage: new Blob([clothing]),
      clothingType: req.body.clothingType,
    })
    
    if (response.success) {
      const processedBase64 = await blobToBase64(response.processedFrame!)
      res.status(200).json({
        success: true,
        result: processedBase64,
        latency: response.latency
      })
    } else {
      res.status(400).json({ 
        success: false, 
        error: response.error 
      })
    }
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}

// Uso en cliente
export const processFrameViaBackend = async (
  frameBlob: Blob,
  clothingBlob: Blob,
  type: string
) => {
  const frameBase64 = await blobToBase64(frameBlob)
  const clothingBase64 = await blobToBase64(clothingBlob)
  
  const response = await fetch('/api/vton/process', {
    method: 'POST',
    body: JSON.stringify({
      frame: frameBase64,
      clothing: clothingBase64,
      clothingType: type
    })
  })
  
  return response.json()
}
```

---

## 5️⃣ Ejemplo: Análisis de Latencia

```typescript
// lib/hooks/useLatencyMonitor.ts

import { useRef, useState } from 'react'

export const useLatencyMonitor = () => {
  const [stats, setStats] = useState({
    avg: 0,
    min: Infinity,
    max: 0,
    count: 0
  })
  
  const metricsRef = useRef<number[]>([])
  
  const recordLatency = (latency: number) => {
    const metrics = metricsRef.current
    metrics.push(latency)
    
    // Mantén últimas 100 mediciones
    if (metrics.length > 100) {
      metrics.shift()
    }
    
    const avg = metrics.reduce((a, b) => a + b, 0) / metrics.length
    const min = Math.min(...metrics)
    const max = Math.max(...metrics)
    
    setStats({ avg, min, max, count: metrics.length })
  }
  
  const getStats = () => stats
  const reset = () => {
    metricsRef.current = []
    setStats({ avg: 0, min: Infinity, max: 0, count: 0 })
  }
  
  return { recordLatency, getStats, reset }
}

// Uso
const latencyMonitor = useLatencyMonitor()

// En processFrame
const response = await client.processFrame(payload)
latencyMonitor.recordLatency(response.latency)

// Ver estadísticas
console.log(latencyMonitor.getStats())
// { avg: 243, min: 210, max: 280, count: 50 }
```

---

## 6️⃣ Ejemplo: Descargar Foto de Prueba

```typescript
// components/VirtualTryOn/VirtualTryOnModal.tsx

const handleDownloadSnapshot = async () => {
  if (!vton.processedFrame) {
    alert('No hay foto para descargar')
    return
  }
  
  // Convierte blob a URL descargable
  const url = URL.createObjectURL(vton.processedFrame)
  const a = document.createElement('a')
  a.href = url
  a.download = `tryonphoto-${Date.now()}.jpg`
  a.click()
  
  URL.revokeObjectURL(url)
  alert('Foto descargada')
}

// En el modal
<button 
  onClick={handleDownloadSnapshot}
  className="btn-secondary"
>
  📸 Descargar Foto
</button>
```

---

## 7️⃣ Ejemplo: Filtros Visuales (Brillo, Contraste)

```typescript
// lib/hooks/useVideoFilters.ts

export const useVideoFilters = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [filters, setFilters] = useState({
    brightness: 1,
    contrast: 1,
    saturation: 1,
  })
  
  const applyFilters = (ctx: CanvasRenderingContext2D) => {
    ctx.filter = `brightness(${filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturation})`
  }
  
  return {
    filters,
    setBrightness: (val: number) => setFilters(f => ({ ...f, brightness: val })),
    setContrast: (val: number) => setFilters(f => ({ ...f, contrast: val })),
    setSaturation: (val: number) => setFilters(f => ({ ...f, saturation: val })),
    applyFilters
  }
}

// Uso en CameraFeed
const videoFilters = useVideoFilters(canvasRef)

// Renderizar controles
<div>
  <label>
    Brillo: 
    <input 
      type="range" 
      min="0.5" 
      max="1.5" 
      step="0.1"
      value={videoFilters.filters.brightness}
      onChange={(e) => videoFilters.setBrightness(parseFloat(e.target.value))}
    />
  </label>
</div>
```

---

## 8️⃣ Ejemplo: Notificaciones Toast

```typescript
// lib/hooks/useToast.ts

import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

export const useToastStore = create<{
  toasts: Toast[]
  show: (message: string, type: Toast['type']) => void
  remove: (id: string) => void
}>((set) => ({
  toasts: [],
  
  show: (message, type) => {
    const id = Math.random().toString(36)
    set(state => ({
      toasts: [...state.toasts, { id, message, type, duration: 3000 }]
    }))
    
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }))
    }, 3000)
  },
  
  remove: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  }
}))

// Componente Toast
export const ToastContainer = () => {
  const { toasts, remove } = useToastStore()
  
  return (
    <div className="fixed top-4 right-4 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg text-white animate-in ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          }`}
        >
          {toast.message}
          <button 
            onClick={() => remove(toast.id)}
            className="ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

// Uso
const { show } = useToastStore()
show('¡Prenda añadida al carrito!', 'success')
```

---

## 9️⃣ Ejemplo: Búsqueda y Filtrado de Prendas

```typescript
// lib/hooks/useClothingSearch.ts

import { useState, useMemo } from 'react'
import { CATALOG_CLOTHES } from '@/lib/constants/products'
import type { Clothing } from '@/lib/types'

export const useClothingSearch = () => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  
  const results = useMemo(() => {
    return Object.values(CATALOG_CLOTHES).filter(item => {
      // Búsqueda por nombre/descripción
      const matchesQuery = 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      
      // Filtro por categoría
      const matchesCategory = !category || item.category === category
      
      // Filtro por precio
      const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1]
      
      return matchesQuery && matchesCategory && matchesPrice
    })
  }, [query, category, priceRange])
  
  return {
    query,
    setQuery,
    category,
    setCategory,
    priceRange,
    setPriceRange,
    results
  }
}

// Componente de búsqueda
export const ClothingSearch = () => {
  const search = useClothingSearch()
  
  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Buscar prendas..."
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white"
      />
      
      <select 
        value={search.category || ''}
        onChange={(e) => search.setCategory(e.target.value || null)}
        className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white"
      >
        <option value="">Todas las categorías</option>
        <option value="shirt">Camisetas</option>
        <option value="jacket">Chaquetas</option>
      </select>
      
      <div>
        <label>Rango de precio: ${search.priceRange[0]} - ${search.priceRange[1]}</label>
        <input
          type="range"
          min="0"
          max="1000"
          value={search.priceRange[1]}
          onChange={(e) => search.setPriceRange([0, parseInt(e.target.value)])}
        />
      </div>
      
      <div>
        Resultados: {search.results.length} prendas
      </div>
    </div>
  )
}
```

---

## 🔟 Ejemplo: Modo Oscuro/Claro

```typescript
// lib/hooks/useTheme.ts

import { create } from 'zustand'

type Theme = 'light' | 'dark'

export const useThemeStore = create<{
  theme: Theme
  toggle: () => void
  set: (theme: Theme) => void
}>((set) => ({
  theme: 'dark',
  
  toggle: () => {
    set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }))
  },
  
  set: (theme) => {
    set({ theme })
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }
}))

// Componente tema
export const ThemeToggle = () => {
  const { theme, toggle } = useThemeStore()
  
  return (
    <button
      onClick={toggle}
      className="px-4 py-2 rounded-lg bg-gray-800 text-white"
    >
      {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
    </button>
  )
}
```

---

## 📝 Resumen

Estos 10 ejemplos te muestran cómo:

1. ✅ Cambiar providers dinámicamente
2. ✅ Agregar nuevas prendas
3. ✅ Persistencia con localStorage
4. ✅ Backend proxy para API keys
5. ✅ Monitorear latencia
6. ✅ Descargar resultados
7. ✅ Aplicar filtros visuales
8. ✅ Mostrar notificaciones
9. ✅ Buscar y filtrar prendas
10. ✅ Implementar tema oscuro

Combina estos ejemplos para crear características avanzadas.

---

**¡Diviértete extendiendo TryOnIA!** 🚀
