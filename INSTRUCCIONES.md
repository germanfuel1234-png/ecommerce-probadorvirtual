# 🎯 INSTRUCCIONES DE USO - PROBADOR VIRTUAL

**Bienvenido a TryOnIA** - Tu plataforma de Probador Virtual con IA para E-commerce de Moda.

---

## 📖 TABLA DE CONTENIDOS

1. [Instalación (3 pasos)](#instalación)
2. [Primeros pasos](#primeros-pasos)
3. [Personalización](#personalización)
4. [Integración API Real](#integración-api-real)
5. [Solución de problemas](#solución-de-problemas)
6. [Próximos pasos](#próximos-pasos)

---

## 🔧 Instalación

### Paso 1: Descargar/Clonar el Proyecto

El proyecto ya está en:
```
C:\Users\Gernet\ecomer nuevo probador
```

### Paso 2: Instalar Dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto descargará ~500MB de librerías. Espera 2-5 minutos.

### Paso 3: Configurar Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

**Para desarrollo (sin API keys):**

```env
# .env.local
NEXT_PUBLIC_VTON_PROVIDER=mock
```

¡Listo! Ya puedes usar el cliente Mock para desarrollo sin costos.

---

## 🚀 Primeros Pasos

### 1. Iniciar el Servidor

```bash
npm run dev
```

Verás:
```
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
```

### 2. Abrir en el Navegador

Abre [http://localhost:3000](http://localhost:3000)

Deberías ver la página principal con:
- Logo "TryOnIA"
- Título "Pruébate la Ropa en Tiempo Real"
- Botón "Abrir Probador Virtual"
- Grid de 8 prendas disponibles

### 3. Probar el Probador Virtual

**Haz clic en "Abrir Probador Virtual"**

Se abrirá un modal con:
- Lado izquierdo: Video en vivo de tu cámara
- Lado derecho: Selector de prendas
- Botón flotante naranja: Añadir al carrito

### 4. Permitir Acceso a Cámara

Tu navegador pedirá permiso:
- **Chrome/Edge**: Aparece a la derecha de la URL
- **Firefox**: Aparece una barra negra arriba
- **Safari**: Ventana de diálogo

**Haz clic en "Permitir"**

### 5. Seleccionar Prenda

En el panel derecho, haz clic en una prenda (ej: "Camiseta Clásica Negra")

Verás:
- La prenda se resalta (borde naranja)
- Su información aparece abajo (precio, talla, color)
- En el video aparece un "procesando..." momentáneamente

### 6. ¡Observa la Transformación!

Con el Mock Client:
- Latencia simulada: 200-300ms
- La IA "aplica" la prenda (simula visualmente)
- Cambia mientras te mueves

### 7. Cambiar de Prenda

Haz clic en otra prenda = cambio inmediato (hot-swapping)

No necesitas cerrar la cámara.

### 8. Añadir al Carrito

Haz clic en el botón flotante naranja:
- **Ícono**: Carrito de compras
- **Texto**: "Añadir"
- **Contador**: Muestra items en carrito

Verás un mensaje: "¡Añadido al carrito!"

### 9. Cerrar el Probador

Haz clic en la "X" arriba a la derecha del modal.

---

## 🎨 Personalización

### Cambiar el Nombre de la Tienda

Edita `app/page.tsx` línea 1:

```typescript
// Antes
<h1 className="text-3xl font-bold text-white">TryOnIA</h1>

// Después
<h1 className="text-3xl font-bold text-white">Mi Tienda</h1>
```

Reinicia con `npm run dev`.

### Cambiar Colores

Edita `tailwind.config.js`:

```javascript
colors: {
  primary: '#0F172A',      // Azul oscuro (fondo)
  accent: '#F97316',       // Naranja (botones)
  success: '#10B981',      // Verde (éxito)
}
```

Cambio instantáneo, sin reiniciar.

### Agregar Nueva Prenda

Edita `lib/constants/products.ts`:

```typescript
export const CATALOG_CLOTHES = {
  // ... prendas existentes ...
  
  // Nueva prenda
  'sweater-003': {
    id: 'sweater-003',
    name: 'Suéter Azul Marino',
    category: 'sweater',
    price: 59.99,
    color: 'Azul',
    size: 'M',
    description: 'Suéter 100% lana merino',
    imageUrl: '/images/clothes/sweater-navy.png',
  }
}
```

Guardas y aparece automáticamente.

### Cambiar Latencia del Mock

Para simular latencia diferente, edita `lib/api/mockVtonClient.ts`:

```typescript
// Línea 14 - Cambiar 300 por otro valor (en milisegundos)
constructor(processingDelay: number = 500) // Ahora 500ms en lugar de 300ms
```

---

## 🔌 Integración API Real

### Opción A: Usar Replicate (Recomendado)

#### Paso 1: Crear Cuenta en Replicate

1. Ve a https://replicate.com
2. Haz clic en "Sign Up"
3. Completa registro (email/contraseña)
4. Verifica tu email

#### Paso 2: Obtener API Key

1. Entra a tu cuenta
2. Ve a https://replicate.com/account/api-tokens
3. Haz clic en "Create Token"
4. Copia el token (es algo como `r8_xxxxxxxxxxxxx`)

#### Paso 3: Configurar en tu Proyecto

Edita `.env.local`:

```env
NEXT_PUBLIC_VTON_PROVIDER=replicate
REPLICATE_API_KEY=r8_xxxxxxxxxxxxx
VTON_MODEL_ID=sczhou/iidm-vton:8ee0c3c9a0fa3dd1e8b38f37e8a0fdb78c63cbea2a8fac8b8b2c5c8a9e8b8b8b
```

**Importante:** Reemplaza `r8_xxxxxxxxxxxxx` con tu token real.

#### Paso 4: Reinicia Servidor

```bash
# Presiona Ctrl+C para detener
# Luego ejecuta
npm run dev
```

#### Paso 5: Prueba

Abre http://localhost:3000 y prueba el probador.

**Nota:** Replicate es más lento (5-15 segundos por frame) pero genera resultados reales.

### Opción B: Usar Fashn.ai

#### Paso 1: Registrarse en Fashn.ai

1. Ve a https://fashn.ai
2. Completa el formulario de registro
3. Revisa tu email para verificación

#### Paso 2: Obtener API Key

1. Entra al dashboard de Fashn
2. Ve a "API Keys"
3. Genera una nueva key
4. Copia

#### Paso 3: Configurar

Edita `.env.local`:

```env
NEXT_PUBLIC_VTON_PROVIDER=fashn
FASHN_API_KEY=tu_key_aqui
VTON_ENDPOINT=https://api.fashn.ai/v1/try-on
```

#### Paso 4: Reinicia

```bash
npm run dev
```

**Ventaja:** Fashn.ai es más rápido que Replicate (1-3 segundos).

---

## 🐛 Solución de Problemas

### Problema: "Permiso de Cámara Denegado"

**Síntomas:**
- Modal dice "Permiso de Cámara Denegado"
- Botón "Reintentar" disponible

**Soluciones:**

**Chrome/Edge:**
1. Haz clic en el icono de candado a la izquierda de la URL
2. Busca "Cámara"
3. Selecciona "Permitir"
4. Recarga la página (F5)

**Firefox:**
1. Barra negra arriba que dice "Este sitio quiere acceder a tu cámara"
2. Haz clic en "Permitir"

**Safari:**
1. Ve a System Preferences → Security & Privacy → Camera
2. Busca Safari en la lista
3. Marca el checkbox

Luego vuelve a intentar.

### Problema: "Cámara no funciona"

**Síntomas:**
- Video negro
- Sin error específico

**Soluciones:**

1. **Verifica que tu cámara funciona:**
   - Abre tu aplicación de videollamada (Zoom, Teams)
   - ¿Funciona la cámara ahí? Si no, es un problema del hardware

2. **Reinicia el navegador:**
   ```
   Cierra completamente el navegador
   Abre de nuevo
   Vuelve a http://localhost:3000
   ```

3. **Usa HTTPS:**
   - Algunos navegadores en móvil requieren HTTPS
   - En desarrollo (localhost) funciona con HTTP

4. **Prueba otro navegador:**
   - Chrome suele ser más confiable para acceso a cámara

### Problema: "Error de API: Replicate"

**Síntomas:**
- Aparece error rojo en pantalla
- "Error en Replicate" o "Invalid token"

**Soluciones:**

1. **Verifica la API Key:**
   ```bash
   # Abre .env.local
   REPLICATE_API_KEY=r8_xxxxxxxxxxxxx
   ```
   - ¿Empieza con `r8_`?
   - ¿No tiene espacios?

2. **Copia la key de nuevo:**
   - A veces se copia mal
   - Ve a https://replicate.com/account/api-tokens
   - Copia nuevamente, muy cuidadosamente

3. **Reinicia el servidor:**
   ```bash
   Ctrl+C  # Detener
   npm run dev  # Iniciar de nuevo
   ```

### Problema: "npm install falla"

**Soluciones:**

```bash
# Limpiar cache
npm cache clean --force

# Intentar de nuevo
npm install
```

Si aún falla:
```bash
# Usar yarn en su lugar
npm install -g yarn
yarn install
```

### Problema: "Puerto 3000 ya en uso"

**Síntomas:**
```
Error: Port 3000 is already in use
```

**Soluciones:**

```bash
# Usar otro puerto
npm run dev -- -p 3001
```

O cierra lo que está usando el puerto 3000:
```bash
# En Windows (Command Prompt como admin)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📚 Próximos Pasos

### Corto Plazo (Hoy)

- [ ] Instala el proyecto (`npm install`)
- [ ] Prueba con Mock (`NEXT_PUBLIC_VTON_PROVIDER=mock`)
- [ ] Explora la interfaz
- [ ] Lee `QUICKSTART.md`

### Mediano Plazo (Esta Semana)

- [ ] Obtén API Key de Replicate/Fashn
- [ ] Integra una API real
- [ ] Personaliza colores y nombre
- [ ] Añade más prendas al catálogo

### Largo Plazo (Este Mes)

- [ ] Conecta a base de datos
- [ ] Implementa checkout
- [ ] Deploy a producción
- [ ] Integra con Shopify/WooCommerce

---

## 📞 Recursos Útiles

### Dentro del Proyecto

- **QUICKSTART.md** - Guía rápida (5 minutos)
- **ARCHITECTURE.md** - Cómo funciona internamente
- **INTEGRATION_GUIDE.md** - Detalles de cada API
- **EXAMPLES.md** - 10 ejemplos de código

### Online

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Replicate API**: https://replicate.com/docs
- **Fashn.ai**: https://fashn.ai/

### Comunidad

- Stack Overflow (tags: next.js, react)
- Discord comunidades de Next.js
- GitHub Discussions

---

## ✅ Checklist de Deployment

Cuando estés listo para producción:

- [ ] Integra API real (Replicate/Fashn)
- [ ] Protege API keys en backend
- [ ] Agrega logging/monitoring
- [ ] Testa en múltiples dispositivos
- [ ] Optimiza imágenes y assets
- [ ] Configura CDN
- [ ] Deploy a Vercel/AWS/tu servidor
- [ ] Configura dominio personalizado
- [ ] Configura SSL/HTTPS
- [ ] Monitorea performance

---

## 🎉 ¡Lo Hiciste!

Ahora tienes un Probador Virtual funcional con IA.

**Próximo paso:** 
```bash
npm install && npm run dev
```

Luego abre http://localhost:3000 y ¡comienza!

---

**Gracias por usar TryOnIA. ¡A revolucionar el e-commerce! 🚀**

¿Preguntas? Revisa los archivos `.md` en la carpeta raíz.
