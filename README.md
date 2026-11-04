# E-commerce Virtual Try-On

Este es un proyecto completo de **Probador Virtual en Tiempo Real** para una tienda de ropa en línea, inspirado en soluciones como Anywear (Decart AI).

## ✨ Características Principales

- **Probador Virtual en Tiempo Real**: Captura de vídeo en vivo mediante `navigator.mediaDevices.getUserMedia()`
- **IA de Virtual Try-On**: Integración con APIs como Replicate, Fashn.ai o Decart AI
- **Selector de Prendas**: Hot-swapping de artículos sin cerrar la cámara
- **Guía Visual Overlay**: Marco de posicionamiento interactivo en canvas
- **Carrito de Compras**: Gestión de estado global con Zustand
- **Interfaz Moderna**: Diseño limpio con Tailwind CSS y componentes React

## 📋 Stack Tecnológico

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (State Management)
- **Lucide React** (Icons)

### APIs & Servicios
- **Replicate API** - Virtual Try-On con modelos IDM-VTON
- **Fashn.ai API** - VTON optimizado para baja latencia
- **Decart AI / Anywear** - API profesional de Virtual Try-On
- **Mock Client** - Para desarrollo y testing

## 📁 Estructura del Proyecto

```
ecomer-virtual-tryon/
├── app/
│   ├── layout.tsx              # Layout raíz con metadata
│   ├── page.tsx                # Página de inicio con catálogo
│   └── globals.css             # Estilos globales
├── components/
│   ├── VirtualTryOn/
│   │   ├── VirtualTryOnModal.tsx       # Componente principal
│   │   ├── CameraFeed.tsx              # Captura de vídeo
│   │   ├── GuidanceOverlay.tsx         # Overlay de guía visual
│   │   ├── ProductSelector.tsx         # Selector de prendas
│   │   └── CartButton.tsx              # Botón flotante del carrito
│   └── Common/
│       └── (componentes comunes)
├── lib/
│   ├── api/
│   │   ├── vtonClient.ts       # Clase base abstracta
│   │   ├── mockVtonClient.ts   # Cliente Mock
│   │   ├── replicateClient.ts  # Integración Replicate
│   │   └── fashnClient.ts      # Integración Fashn.ai
│   ├── hooks/
│   │   ├── useCamera.ts        # Hook para cámara web
│   │   ├── useVirtualTryOn.ts  # Hook para VTON
│   │   └── useCart.ts          # Hook del carrito (Zustand)
│   ├── constants/
│   │   ├── products.ts         # Catálogo ficticio
│   │   ├── vtonConfig.ts       # Configuración de VTON
│   │   └── uiConfig.ts         # Configuración UI
│   └── types/
│       └── index.ts            # Tipos TypeScript
├── public/
│   └── images/clothes/         # Imágenes de prendas
├── styles/
│   └── globals.css             # Tailwind + custom styles
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── .env.local                  # Variables de entorno
```

## 🚀 Instalación

### 1. Clonar o preparar el proyecto

```bash
cd ecomer-virtual-tryon
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` con:

```env
# VTON Provider (mock, replicate, fashn, decart)
NEXT_PUBLIC_VTON_PROVIDER=mock

# Replicate (opcional)
REPLICATE_API_KEY=your_replicate_key
VTON_MODEL_ID=sczhou/iidm-vton:8ee0c3c9a0fa3dd1e8b38f37e8a0fdb78c63cbea2a8fac8b8b2c5c8a9e8b8b8b

# Fashn.ai (opcional)
FASHN_API_KEY=your_fashn_key

# Decart AI (opcional)
DECART_API_KEY=your_decart_key
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎮 Uso

1. **Haz clic en "Abrir Probador Virtual"** o en el botón "Probarte" de cualquier prenda
2. **Permite acceso a la cámara** cuando tu navegador lo solicite
3. **Posiciónate dentro del marco guía** (overlay naranja)
4. **Selecciona una prenda** del panel derecho
5. **Observa la transformación en vivo** - la IA aplica la prenda sobre ti
6. **Cambia de prendas** con hot-swapping sin cerrar la cámara
7. **Añade al carrito** mediante el botón flotante naranja

## 🔗 Integración de APIs

### Opción A: Mock (Desarrollo)

El cliente Mock simula una API de VTON. Perfecto para desarrollo sin costos:

```typescript
import { MockVTONClient } from '@/lib/api/mockVtonClient'

const client = new MockVTONClient(300) // 300ms de latencia simulada
```

### Opción B: Replicate

Usa modelos como `sczhou/iidm-vton`:

```env
NEXT_PUBLIC_VTON_PROVIDER=replicate
REPLICATE_API_KEY=your_token
```

[Documentación de Replicate](https://replicate.com/)

### Opción C: Fashn.ai

API especializada en VTON con baja latencia:

```env
NEXT_PUBLIC_VTON_PROVIDER=fashn
FASHN_API_KEY=your_key
```

[Documentación de Fashn.ai](https://fashn.ai/)

### Opción D: Decart AI / Anywear

Solución empresarial profesional:

```env
NEXT_PUBLIC_VTON_PROVIDER=decart
DECART_API_KEY=your_key
```

## 📊 Estados de la Aplicación

```
┌─────────────┐
│    idle     │ (Inicial)
└──────┬──────┘
       │ startCamera()
┌──────▼─────────────────────┐
│      loading / active       │
└──────┬──────────────────────┘
       │ Se capturan frames
┌──────▼──────────────────┐
│  processing_frame       │ (Enviando a IA)
└──────┬───────────────────┘
       │ Respuesta recibida
┌──────▼──────────────────┐
│   stream_active         │ (En vivo)
└─────────────────────────┘
       │ (Loop continuo)
```

## 🎨 Personalización

### Cambiar colores

Edita `lib/constants/uiConfig.ts` y `tailwind.config.js`:

```typescript
colors: {
  primary: '#0F172A',
  accent: '#F97316',  // Naranja
  success: '#10B981',
}
```

### Ajustar latencia simulada

```typescript
const client = new MockVTONClient(500) // 500ms en lugar de 300ms
client.setProcessingDelay(800)
```

### Modificar resolución de cámara

```typescript
const camera = useCamera({ width: 1280, height: 720 })
```

## 🔐 Seguridad

- ✅ Variables de entorno protegidas en `.env.local`
- ✅ Claves de API nunca expuestas en el cliente (usar proxy backend en producción)
- ✅ CORS configurado correctamente en APIs de terceros
- ✅ Validación de datos en ambos lados

## ⚡ Optimizaciones de Rendimiento

- **Frame Rate Control**: Limita FPS para reducir carga
- **Lazy Loading**: Carga de componentes bajo demanda
- **Canvas Optimization**: Renderizado eficiente en canvas
- **Buffer de Frames**: Previene acumulación de latencia
- **WebP/JPEG Compression**: Compresión automática de imágenes

## 🧪 Testing

```bash
# Ejecutar linter
npm run lint

# Type checking
npm run type-check
```

## 📦 Despliegue

### Vercel (Recomendado)

```bash
npm i -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t vton-app .
docker run -p 3000:3000 vton-app
```

## 📚 Documentación de APIs

- [Replicate API Docs](https://replicate.com/docs)
- [Fashn.ai Docs](https://fashn.ai/docs)
- [Decart AI Docs](https://decart.ai/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## ✉️ Soporte

Para soporte, contacta a través de:
- Issues en GitHub
- Email: support@tryonia.com
- Discord Community: [Enlace]

---

**TryOnIA** - Probador Virtual con IA para E-commerce. Construido con ❤️ para revolutionar las compras en línea.
