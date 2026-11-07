# Estado del proyecto — 2026-11-07

Documento de situación. Qué hay hecho, qué está sin verificar y qué queda
pendiente, con el detalle necesario para retomarlo sin contexto previo.

- **Ubicación:** `~/Proyectos/ecommerce-probadorvirtual-main`
  (se movió desde `~/Descargas/` el 2026-11-07; nada se perdió)
- **Resumen en una línea:** código completo y revisado, **nunca ejecutado**.

---

## 1. Qué es

E-commerce con probador virtual en tiempo real. La detección de cuerpo y la
composición de la prenda ocurren **dentro del navegador**: sin API key, sin GPU
dedicada, y ni el vídeo ni los fotogramas salen del equipo.

Decisiones de alcance acordadas al principio:

| Decisión | Elegido | Motivo |
|---|---|---|
| Motor de IA | Local en navegador (MediaPipe + canvas) | Esta máquina no tiene GPU NVIDIA; difusión en tiempo real no era viable |
| Alcance | Probador + arquitectura, una sola página | Sin PDP por ruta ni checkout |
| Carrito | Ampliado a panel editable | Un carrito que no se puede inspeccionar no estaba "funcionando" |

---

## 2. De dónde partíamos

El proyecto original **no arrancaba** y, cuando lo hiciera, **el probador no
habría funcionado**. Lo más importante:

**No había IA.** El único cliente que se usaba era un mock que convertía el
fotograma a base64 y lo convertía de vuelta: devolvía la imagen sin tocar. Los
clientes de Replicate y Fashn nunca se instanciaban, y de haberlo hecho habrían
lanzado excepción, porque leían `process.env.REPLICATE_API_KEY` desde el
navegador — sin prefijo `NEXT_PUBLIC_` eso siempre vale `undefined`. Y con el
prefijo, la clave habría acabado pública en el bundle.

**El build era imposible:** sintaxis TypeScript dentro de archivos `.js`
(`next.config.js`, `tailwind.config.js`), faltaba la config de PostCSS, el
layout importaba un CSS que vivía en otra carpeta, no existía `public/` y el
catálogo apuntaba a imágenes inexistentes, y `useVirtualTryOn` devolvía
`isProcessing` dos veces (error TS1117).

**El probador no podía funcionar:** el modal y `CameraFeed` llamaban cada uno a
`useCamera`, así que existían dos streams y dos juegos de refs — los montados en
el DOM eran los del hijo, y el padre capturaba de un `<video>` nulo. El
fotograma procesado se guardaba en el estado de React y no se renderizaba en
ningún sitio. La prenda que se enviaba al motor era literalmente
`new Blob(['dummy'])`.

---

## 3. Arquitectura actual

Dependencias siempre hacia abajo. El núcleo no conoce React ni el DOM.

```
app/            rutas, layout, /api/try-on (proxy del motor remoto)
components/     UI  —  shop/ y VirtualTryOn/
lib/hooks/      adaptadores React  —  useCamera, useTryOn, useCart
lib/engines/    motores de IA + geometría de pose
lib/server/     credenciales del proveedor remoto (import 'server-only')
lib/domain/     núcleo puro: garment, cart, tryOn
lib/catalog/    lib/config/   datos y parámetros
tests/          tests del núcleo puro
scripts/        preparación de assets
```

El criterio que lo ordena: **lo que se puede probar sin navegador vive en
`lib/domain` y `lib/engines/poseGeometry`**. Ahí están los errores que no se ven
mirando la pantalla, y es lo que cubre `npm test`.

### Pipeline por fotograma

```
<video> → PoseLandmarker (WASM local) → 33 landmarks
        → buildBodyFrame   (hombros/caderas/piernas → px, null si no hay confianza)
        → smoothBodyFrame  (media exponencial, quita el temblor)
        → placeGarment     (rectángulo orientado según el eje del torso)
        → <canvas>  vídeo reflejado + prenda  ← esto es lo que se ve
```

La interfaz del motor es `<video> → <canvas>`, **no** `Blob → Blob`. Codificar
cada fotograma a JPEG y volver a decodificarlo hacía imposible el tiempo real;
ese era el cuello de botella del diseño anterior.

### Motores

| Motor | `mode` | Red | Estado |
|---|---|---|---|
| `local-pose` | `realtime` | No | **Por defecto.** MediaPipe en el navegador |
| `mock` | `realtime` | No | Posición fija, sin IA. Degradación automática |
| `remote` | `snapshot` | Sí | Difusión vía `/api/try-on`. **Sin probar: no hay API key** |

`mode` existe porque un motor de difusión no puede correr en bucle: `useTryOn`
lanza `requestAnimationFrame` para `realtime`, y para `snapshot` mantiene la
vista previa y sólo invoca el motor cuando el usuario pulsa «Capturar».

Si el motor preferido no arranca (falta el modelo, sin WebGL, sin proveedor),
`registry.fallbackEngineFor` degrada a `mock` y la UI lo avisa.

---

## 4. Correcciones de fondo

Más allá de los errores de build:

- **Un solo propietario del MediaStream.** `useCamera` se llama una vez por
  pantalla y el `videoRef` baja por props.
- **El canvas compuesto se pinta en pantalla** (`TryOnStage`), encima del
  `<video>`. El vídeo se queda en el layout, no en `display:none`, porque
  algunos navegadores dejan de decodificar fotogramas de un vídeo oculto.
- **El bucle de render vive en un efecto y se encadena** (`await` y luego
  `requestAnimationFrame`). Antes dependía de estado que cambiaba en cada
  fotograma, así que se creaba un bucle nuevo por fotograma sin cancelar el
  anterior.
- **Métricas acumuladas en refs**, publicadas cada 250 ms, en vez de un
  `setState` por fotograma.
- **Errores de cámara por `error.name`**, no comparando `error.message` con
  `'Permission'` (que dependía del idioma del navegador).
- **Contador de generación en `useCamera`**: con `reactStrictMode` los efectos
  corren dos veces en desarrollo, y sin esto el `getUserMedia` en vuelo
  sobrevivía al `stop` y dejaba la cámara encendida.
- **Marco guía en DOM con porcentajes.** Un canvas de 640×480 fijo sobre un
  vídeo responsive con `object-cover` no coincidía con lo que el usuario veía.
- **Carrito con precios del catálogo** y total derivado de las líneas. Antes el
  precio era `50` fijo por unidad y el total se recalculaba dentro del `set`
  llamando a `get()`, que aún veía los items anteriores: iba un paso por detrás.
- **Parpadeo de la prenda:** si dos fotogramas caían en el mismo timestamp,
  MediaPipe no podía dar landmarks nuevos y se salía *después* de repintar el
  vídeo, borrando la prenda ese fotograma. Ahora repinta con los últimos
  landmarks válidos.
- **Flujo `snapshot` roto:** `captureSnapshot` espera segundos a la red y ponía
  `isFrozen` después; React confirma el estado de forma asíncrona, así que el
  bucle seguía pintando el vídeo encima y el resultado habría aparecido un
  instante antes de borrarse. Se corrigió con un ref síncrono
  (`previewPausedRef`) marcado antes de cualquier `await`.

### Credenciales

Las llamadas a proveedores remotos pasan por `/api/try-on`.
`lib/server/tryOnProvider.ts` empieza con `import 'server-only'`: **el build
falla** si alguien lo importa desde un componente cliente. La ruta resuelve el
`garmentId` contra el catálogo del servidor, así que el cliente no puede pedir
el procesado de una imagen arbitraria. Las variables del proveedor no llevan
prefijo `NEXT_PUBLIC_`, a propósito.

---

## 5. Qué está verificado y qué no

Esta es la parte importante del documento.

### Verificado ejecutándolo

- **25/25 tests** sobre dominio y geometría (`npm test`). Cubren rotación con el
  torso inclinado, simetría del espejo, escalado con la distancia,
  extrapolación de pierna cuando los tobillos salen de cuadro, y que el total
  del carrito refleje el item nuevo en la misma operación.
- **URL del modelo de pose**: viva, HTTP 200, 5,78 MB.
- **Paquete de MediaPipe**: descargado el tarball de `0.10.35` y confirmado que
  trae `wasm/` con 6 archivos — la ruta que copia el script de setup existe.
- **Uso de la API de MediaPipe**, contra el `vision.d.ts` real: `detectForVideo`
  tiene sobrecarga síncrona, `landmarks` es `NormalizedLandmark[][]`, `delegate`
  acepta `"CPU" | "GPU"`, y las cuatro opciones de confianza existen.
- **Cero símbolos exportados sin usar** en todo el proyecto.

### NO verificado

- **`tsc --noEmit` nunca ha corrido** sobre las ~3.200 líneas de TS/TSX. No hay
  `node_modules`, así que no hubo compilador en ningún momento. Es razonable
  esperar errores de tipos la primera vez.
- **El motor local no se ha ejecutado en un navegador.** Carga de MediaPipe,
  permisos de cámara y bucle de render están revisados a mano, nunca vistos
  funcionando.
- **El motor `remote` no se ha probado en vivo** (no hay API key). Los nombres
  de campo de la API de Fashn deberían contrastarse con su documentación
  vigente antes de confiar en esa vía.
- **No hay `package-lock.json`**: `npm install` nunca se ejecutó, así que las
  versiones exactas no están fijadas.

---

## 6. Pendiente

### 6.1 Limpieza y arranque (bloqueante)

Hay **22 archivos sin trackear** en el disco: 15 de código legacy y 7 docs
obsoletos. El `rm` del código **no es opcional** para `npm run build`:
`useVirtualTryOn.ts` tiene el TS1117 y los tres componentes viejos llaman a APIs
que ya no existen. `npm run dev` sí funciona sin borrarlos, porque nada los
importa.

```bash
cd ~/Proyectos/ecommerce-probadorvirtual-main

rm -rf lib/api lib/constants lib/types styles
rm -f components/VirtualTryOn/{CameraFeed,ProductSelector,CartButton}.tsx \
      lib/hooks/useVirtualTryOn.ts next.config.mjs tailwind.config.ts

npm install && npm run dev     # el postinstall descarga el modelo, ~5 MB
```

Nota sobre los duplicados de config: Next y Tailwind resuelven `*.config.js`
**antes** que `.mjs`/`.ts`. Como los `.js` originales no se podían borrar, se
convirtieron en los autoritativos (CommonJS válido) y los `.mjs`/`.ts` quedaron
muertos — de ahí que estén en la lista de borrado.

Después, lo que falta por comprobar:

```bash
npm run type-check     # primera vez que corre un compilador sobre esto
npm test               # debe seguir dando 25/25
```

Y abrir **http://localhost:3000** (no `127.0.0.1` ni una IP de red:
`getUserMedia` sólo funciona en HTTPS o `localhost`).

### 6.2 Push a GitHub (a medias)

| | |
|---|---|
| Remoto | `github.com/germanfuel1234-png/ecommerce-probadorvirtual` (**público**) |
| Commit remoto | `4fa565c` — el scaffold original, subido el 2026-11-04 |
| Commit local | `d4ac73d` — 51 archivos, toda la arquitectura nueva |
| Problema | **No hay ancestro común**: `d4ac73d` es huérfano |

Un `git push` normal será rechazado, y un `--force` borraría el historial del
repo. El plan acordado es re-parentar el trabajo sobre el commit existente:

```bash
git reset --soft origin/main
git add EXAMPLES.md INDEX.md INICIO.txt INSTRUCCIONES.md \
        INTEGRATION_GUIDE.md QUICKSTART.md SUMMARY.md   # preservar los docs
git commit -F <mensaje>
git push origin main
```

Así se conserva el historial y el diff cuenta el refactor: los 15 legacy
aparecen como borrados y la arquitectura nueva como añadida.

Dos avisos antes de completarlo: el repo es **público**, y lo que se publique
será código revisado pero **no verificado**.

### 6.3 Decisión pendiente

Los 7 docs obsoletos (`INDEX.md`, `INSTRUCCIONES.md`, `QUICKSTART.md`,
`SUMMARY.md`, `EXAMPLES.md`, `INTEGRATION_GUIDE.md`, `INICIO.txt`) describen la
arquitectura vieja y ahora **contradicen el código**. Se han preservado porque
borrarlos no está aprobado. Los vigentes son `README.md`, `ARCHITECTURE.md` y
este archivo.

---

## 7. Fuera de alcance (deliberado, no olvido)

- **Sin checkout.** El botón de finalizar compra está desactivado a propósito,
  con `title` explicándolo, en vez de prometer algo que no ocurre.
- **Sin página de producto por ruta** ni listado con filtros.
- **Sin oclusión.** El motor local deforma la prenda sobre el cuerpo, no la
  re-renderiza: no hay drapeado ni sombras, y si cruzas los brazos la prenda se
  dibuja encima. El siguiente paso natural es añadir `ImageSegmenter` y usar la
  máscara de persona para recortar la prenda; cabe dentro de `localPoseEngine`
  sin tocar nada más.
- **Catálogo con siluetas vectoriales**, no fotos. Para una tienda real hay que
  sustituir los SVG de `public/garments/` por PNG recortados respetando la
  convención del motor: **la línea de hombros va en el borde superior** del arte
  y la prenda cae hacia abajo. Cualquier margen transparente arriba la
  descoloca. Luego hay que ajustar `fit` en el catálogo.

---

## 8. Para fotorrealismo

El motor local no puede dar calidad de difusión. Las dos vías reales:

1. **Motor `remote`** — API key de Fashn en `.env.local`,
   `NEXT_PUBLIC_TRYON_ENGINE=remote`. Segundos por pasada, no es tiempo real.
2. **GPU propia** — ComfyUI con CatVTON o IDM-VTON. Requiere NVIDIA con ~8 GB
   de VRAM, que esta máquina no tiene.

La arquitectura ya contempla ambas: implementar `TryOnEngine` y registrarlo en
`lib/engines/registry.ts`, sin tocar la UI.
