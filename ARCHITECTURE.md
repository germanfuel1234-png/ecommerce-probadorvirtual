# Arquitectura

Probador virtual en tiempo real sobre Next.js App Router, con el procesamiento
de IA **dentro del navegador**. Ni el vídeo ni los fotogramas salen del equipo.

## Capas

Las dependencias van siempre hacia abajo. Ninguna capa inferior conoce a las de
arriba, y el núcleo no conoce ni React ni el DOM.

```
┌──────────────────────────────────────────────────────────────┐
│ app/                        Rutas, layout, API route          │
│   page.tsx                  tienda + apertura del probador    │
│   api/try-on/route.ts       proxy servidor del motor remoto    │
├──────────────────────────────────────────────────────────────┤
│ components/                 UI. Sin lógica de negocio          │
│   shop/                     StoreHeader, GarmentCard, CartPanel│
│   VirtualTryOn/             Modal, TryOnStage, GuidanceOverlay,│
│                             GarmentSelector, AddToCartButton   │
├──────────────────────────────────────────────────────────────┤
│ lib/hooks/                  Adaptadores React                  │
│   useCamera                 dueño ÚNICO del MediaStream        │
│   useTryOn                  motor + bucle de render + métricas │
│   useCart                   store Zustand (sólo las líneas)    │
├──────────────────────────────────────────────────────────────┤
│ lib/engines/                Infraestructura de IA              │
│   types.ts                  interfaz TryOnEngine               │
│   registry.ts               fábrica + cadena de degradación    │
│   localPoseEngine           MediaPipe + canvas  ← activo       │
│   mockEngine                posición fija, sin IA              │
│   remoteEngine              habla con /api/try-on              │
│   poseGeometry              matemática pura (con tests)        │
│   canvas                    utilidades de <canvas>             │
├──────────────────────────────────────────────────────────────┤
│ lib/server/                 Sólo servidor (`import 'server-only'`)│
│   tryOnProvider             credenciales + llamada al proveedor│
├──────────────────────────────────────────────────────────────┤
│ lib/domain/                 Núcleo puro: sin React, DOM ni red │
│   garment, cart, tryOn                                         │
│ lib/catalog/  lib/config/   Datos y parámetros                 │
└──────────────────────────────────────────────────────────────┘
```

El criterio que ordena todo esto: **lo que se puede probar sin navegador vive en
`lib/domain` y `lib/engines/poseGeometry`**. Es donde están los errores que no se
ven mirando la pantalla (un signo invertido en la rotación, un total desfasado),
y es lo que cubre `npm test`.

## El pipeline por fotograma

```
<video>  (useCamera: único MediaStream)
   │
   ├─ el motor lo lee directamente, sin codificar a Blob
   ▼
PoseLandmarker (WASM local)  ──►  33 landmarks normalizados
   │
   ▼
poseGeometry.buildBodyFrame   hombros/caderas/piernas → px de canvas
   │                          null si no hay confianza suficiente
   ▼
poseGeometry.smoothBodyFrame  media exponencial (quita el temblor)
   │
   ▼
poseGeometry.placeGarment     rectángulo orientado según el eje del torso
   │
   ▼
<canvas>  vídeo reflejado + prenda compuesta  ← esto es lo que se ve
```

La interfaz del motor es `<video> → <canvas>`, no `Blob → Blob`. Codificar cada
fotograma a JPEG y volver a decodificarlo hace imposible sostener 30 fps; ese
era el cuello de botella del diseño anterior.

## Motores

Todos implementan `TryOnEngine`, así que la UI no cambia al cambiar de motor. Se
elige con `NEXT_PUBLIC_TRYON_ENGINE`.

| Motor | `mode` | Red | Qué hace |
|---|---|---|---|
| `local-pose` | `realtime` | No | MediaPipe en el navegador. ~30 fps, sin GPU dedicada. **Por defecto.** |
| `mock` | `realtime` | No | Prenda en posición fija. Para desarrollar UI y como degradación. |
| `remote` | `snapshot` | Sí | Difusión real vía `/api/try-on`. Segundos por pasada, no es tiempo real. |

`mode` existe porque un motor de difusión no puede correr en bucle: `useTryOn`
lanza el bucle de `requestAnimationFrame` para `realtime`, y para `snapshot`
mantiene la vista previa en vivo y sólo invoca el motor cuando el usuario pulsa
«Capturar».

Si el motor preferido no arranca (falta el modelo, no hay WebGL, no hay
proveedor configurado), `registry.fallbackEngineFor` degrada a `mock` y la UI lo
avisa en lugar de quedarse en blanco.

### Qué hace y qué no hace el motor local

Hace: detecta el cuerpo, escala la prenda con la distancia a la cámara, sigue la
inclinación del torso, suaviza el temblor del detector y distingue torso de
piernas.

No hace: no es difusión, así que **deforma** la prenda sobre el cuerpo en vez de
re-renderizarla — no hay drapeado, sombras ni físicas de tela. Y no resuelve
oclusión: si cruzas los brazos por delante, la prenda se dibuja encima. El
siguiente paso natural sería añadir `ImageSegmenter` (segmentación de persona) y
usar la máscara para recortar la prenda; se puede hacer dentro de
`localPoseEngine` sin tocar nada más.

Para fotorrealismo hace falta difusión, y eso implica o GPU propia (ComfyUI con
CatVTON/IDM-VTON) o el motor `remote`.

## Dónde viven las credenciales

`lib/server/tryOnProvider.ts` empieza con `import 'server-only'`: el build falla
si alguien lo importa desde un componente cliente. El navegador sólo habla con
`/api/try-on`, que resuelve el `garmentId` contra el catálogo del servidor para
que el cliente no pueda pedir el procesado de una imagen arbitraria.

Las variables del proveedor **no** llevan prefijo `NEXT_PUBLIC_`, a propósito:
con el prefijo acabarían en el bundle del navegador.

## Assets del motor local

`npm run setup:local-ai` (se ejecuta solo en el `postinstall`):

1. Copia el runtime WASM de `node_modules/@mediapipe/tasks-vision/wasm` a
   `public/mediapipe/wasm`.
2. Descarga `pose_landmarker_lite.task` (~5 MB) a `public/models`.

Se sirve todo desde `/public`, sin CDN, para que el probador funcione sin
internet. Ambas carpetas están en `.gitignore`: son artefactos regenerables.

`npm run generate:garments` reconstruye las siluetas de `public/garments`. La
convención que espera el motor: **la línea de hombros va en el borde superior**
del arte y la prenda cae hacia abajo; cualquier margen transparente arriba
descoloca la prenda. Para una tienda real, sustituye los SVG por PNG recortados
respetando esa convención y ajusta `fit` en el catálogo.

## Decisiones que conviene no revertir

- **Un solo dueño de la cámara.** `useCamera` se llama una vez por pantalla y el
  `videoRef` baja por props. Dos llamadas al hook = dos streams y dos juegos de
  refs, y el que captura fotogramas se queda con un `<video>` nulo.
- **El bucle de render vive en un efecto, no en un callback.** Si la función que
  arranca la captura depende de estado que cambia en cada fotograma, se crea un
  bucle nuevo por fotograma sin cancelar el anterior.
- **Las métricas se acumulan en refs** y se publican cada 250 ms. Un `setState`
  por fotograma re-renderiza el modal entero 30 veces por segundo.
- **El carrito guarda sólo las líneas.** Unidades, total y datos de la prenda se
  derivan del catálogo en cada lectura; un total almacenado se desincroniza.
  `CartPanel` resuelve nombre y precio al pintar, y muestra las líneas cuya
  prenda ya no existe en el catálogo para que se puedan quitar, en vez de
  ocultarlas aportando 0.
- **El marco guía es DOM, no canvas.** Un canvas de tamaño fijo sobre un vídeo
  responsive con `object-cover` no coincide con lo que el usuario ve.
