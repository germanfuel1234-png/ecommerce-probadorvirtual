# 🚀 Guía de Inicio Rápido

Bienvenido a **TryOnIA** - Probador Virtual con IA para E-commerce de Moda.

## ⚡ En 5 Minutos

### 1. **Instalar Dependencias**

```bash
npm install
```

### 2. **Crear `.env.local`**

Para desarrollo rápido, usa el cliente Mock (sin API keys):

```bash
# .env.local
NEXT_PUBLIC_VTON_PROVIDER=mock
```

O copia desde `.env.example`:

```bash
cp .env.example .env.local
```

### 3. **Ejecutar Desarrollo**

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador.

### 4. **Permitir Acceso a Cámara**

Cuando apareça el modal del probador, **permite acceso a tu cámara web**.

### 5. **¡Pruébate Ropa!**

- Selecciona una prenda del panel derecho
- Observa cómo se simula en tu video en vivo
- Cambia entre prendas libremente
- Añade al carrito

---

## 📦 Estructura Básica

```
Tu Proyecto
├── app/page.tsx           ← Página principal (que ves)
├── components/
│   └── VirtualTryOn/
│       └── VirtualTryOnModal.tsx  ← Probador virtual (componente principal)
├── lib/
│   ├── api/               ← Clientes API
│   ├── hooks/             ← Custom React hooks
│   └── constants/         ← Configuración
└── public/images/         ← Imágenes de prendas
```

---

## 🎮 Cómo Funciona

### Flujo Usuario

```
1. Haz clic en "Abrir Probador Virtual"
          ↓
2. Permite acceso a cámara
          ↓
3. Selecciona una prenda
          ↓
4. La IA aplica la prenda sobre ti
          ↓
5. Cambia entre prendas sin cerrar
          ↓
6. Añade al carrito
```

### Arquitectura Técnica

```
┌─────────────────────────┐
│  Tu Navegador (React)   │
│  ┌───────────────────┐  │
│  │  Video Element    │  │ ← Tu cámara
│  │  + Canvas Overlay │  │ ← Guía visual
│  └───────────────────┘  │
└────────────┬────────────┘
             │ (Frames cada 200ms)
             ↓
    ┌────────────────────┐
    │  API de VTON (IA)  │  ← Mock/Replicate/Fashn
    │  Procesa la prenda │
    └────────────┬───────┘
                 │
             ↓ (Resultado)
    ┌────────────────────┐
    │  Mostrar en Pantalla│
    └────────────────────┘
```

---

## 🎨 Personalizar

### Cambiar Prendas del Catálogo

Edita `lib/constants/products.ts`:

```typescript
export const CATALOG_CLOTHES = {
  'shirt-001': {
    id: 'shirt-001',
    name: 'Tu Camiseta',
    price: 29.99,
    // ... más propiedades
  },
  // Añade más prendas aquí
}
```

### Cambiar Colores

Edita `tailwind.config.js`:

```javascript
colors: {
  primary: '#0F172A',
  accent: '#FF6B35',    // Cambia a otro color
  success: '#10B981',
}
```

### Ajustar Latencia (Mock)

En `components/VirtualTryOn/VirtualTryOnModal.tsx`:

```typescript
// Línea ~50
const mockClient = new MockVTONClient(500) // 500ms en lugar de 300ms
```

---

## 🔌 Usar API Real (Opcional)

### Opción: Replicate (Recomendado)

1. **Obtén API Key** en https://replicate.com/account/api-tokens
2. **Configura `.env.local`**:
   ```env
   NEXT_PUBLIC_VTON_PROVIDER=replicate
   REPLICATE_API_KEY=r8_xxxxxxxxxxxxx
   ```
3. **Reinicia servidor** (`npm run dev`)
4. **¡Listo!** Usa el probador con IA real

### Opción: Fashn.ai

1. **Regístrate** en https://fashn.ai/
2. **Obtén API Key**
3. **Configura**:
   ```env
   NEXT_PUBLIC_VTON_PROVIDER=fashn
   FASHN_API_KEY=your_key
   ```

Ver `INTEGRATION_GUIDE.md` para más detalles.

---

## 🐛 Troubleshooting

### "Permiso de Cámara Denegado"

**Solución:**
- Chrome/Edge: Verificar permisos en URL bar → Camera
- Firefox: Verificar preferencias de sitios
- Safari: System Preferences → Security & Privacy → Camera

### "No funciona la cámara"

**Solución:**
- Asegúrate de que tu navegador soporta `getUserMedia()`
- Prueba en HTTPS (localhost funciona)
- Reinicia el navegador

### "API Key no válida"

**Solución:**
- Verifica que está en `.env.local` (no `.env`)
- Reinicia servidor después de cambiar variables
- Comprueba que no tiene espacios extra

### "Lentitud/Lag en el video"

**Solución:**
- Verifica tu conexión a internet
- Aumenta `FRAME_INTERVAL_MS` en `useVirtualTryOn.ts`
- Reduce la resolución de cámara

---

## 📚 Documentación Completa

- **`README.md`** - Descripción general y features
- **`ARCHITECTURE.md`** - Arquitectura técnica y diagramas
- **`INTEGRATION_GUIDE.md`** - Guía detallada de APIs
- **`QUICKSTART.md`** - Este archivo

---

## 💡 Próximos Pasos

### Para Aprender

- [ ] Lee `ARCHITECTURE.md` para entender el diseño
- [ ] Explora `components/VirtualTryOn/` para ver componentes
- [ ] Revisa `lib/hooks/` para custom hooks
- [ ] Estudia `lib/api/` para ver integraciones

### Para Mejorar

- [ ] Añade más prendas al catálogo
- [ ] Personaliza colores y tema
- [ ] Integra con un backend real
- [ ] Añade persistencia (localStorage/DB)
- [ ] Implementa checkout

### Para Producción

- [ ] Configura API Key real (Replicate/Fashn)
- [ ] Implementa backend proxy para proteger API keys
- [ ] Agrega analytics
- [ ] Configura CDN para imágenes
- [ ] Deploy a Vercel/AWS/tu servidor

---

## 🤝 Contribuir

¿Encontraste un bug? ¿Tienes una idea?

1. Abre un issue
2. Fork el proyecto
3. Crea una rama feature
4. Haz un PR

---

## 📞 Soporte

- **Documentación:** Lee los archivos `.md` en la raíz
- **Código:** Comentarios explicativos en archivos
- **Ejemplos:** Revisa `lib/api/mockVtonClient.ts`

---

## 🎉 ¡Éxito!

Has instalado con éxito **TryOnIA**. Ahora:

```bash
npm run dev
```

Abre http://localhost:3000 y **¡comienza a probar ropa con IA!**

---

**Hecho con ❤️ para revolucionar el e-commerce de moda.**

v1.0.0 | 2024
