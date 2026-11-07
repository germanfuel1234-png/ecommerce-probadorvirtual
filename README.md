# TryOnIA — Probador virtual local

E-commerce con probador virtual en tiempo real. La detección de cuerpo y la
composición de la prenda ocurren **en el navegador**: no hay API key, no hace
falta GPU dedicada y ni el vídeo ni los fotogramas salen de tu equipo.

## Arrancar

```bash
npm install          # el postinstall prepara el motor local (WASM + modelo, ~5 MB)
npm run dev          # http://localhost:3000
```

Abre **http://localhost:3000**, no `127.0.0.1` ni una IP de red: `getUserMedia`
sólo funciona en contextos seguros (HTTPS o `localhost`).

Si el `postinstall` no pudo descargar el modelo (sin internet en ese momento):

```bash
npm run setup:local-ai
```

Sin el modelo el probador sigue abriendo, pero degradado al motor `mock`
(prenda en posición fija) y avisándolo en pantalla.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests del dominio y de la geometría del probador (sin navegador) |
| `npm run type-check` | TypeScript en modo estricto |
| `npm run lint` | ESLint |
| `npm run setup:local-ai` | Descarga/copia los assets del motor local |
| `npm run generate:garments` | Regenera las siluetas de `public/garments` |

## Cómo usarlo

1. Pulsa **Probarte** en cualquier prenda (o **Abrir probador virtual**).
2. Acepta el permiso de cámara.
3. Colócate de forma que **se te vean hombros y cintura** dentro del marco. El
   motor necesita ambos para calcular la escala; si sólo se te ve la cara, la
   insignia pasa a `SIN CUERPO` y no se superpone nada.
4. Cambia de prenda con las miniaturas, sin cerrar la cámara.

La insignia de la cabecera indica el estado real: `CARGANDO` (modelo),
`EN VIVO` (cuerpo detectado), `SIN CUERPO`, `ERROR`. Debajo del vídeo se ven los
fps y los ms por fotograma.

El botón **Carrito** abre un panel con las líneas, cantidades editables y el
total. El carrito persiste en `localStorage`. **No hay checkout**: el botón de
finalizar compra está desactivado a propósito en esta versión local.

## Motores

Se elige con `NEXT_PUBLIC_TRYON_ENGINE` en `.env.local` (ver `.env.example`):

- **`local-pose`** (por defecto) — MediaPipe en el navegador, tiempo real, sin red.
- **`mock`** — prenda en posición fija, sin IA. Útil para trabajar la UI.
- **`remote`** — difusión real (Fashn) a través de `/api/try-on`. Requiere API
  key y **no es tiempo real**: son segundos por pasada, así que el flujo cambia
  a «capturar → procesar → ver resultado».

### Lo que el motor local sí y no hace

Sigue tu cuerpo, escala la prenda con la distancia a la cámara y acompaña la
inclinación del torso. **No es difusión**: deforma la prenda sobre ti en vez de
re-renderizarla, así que no hay drapeado ni sombras reales, y si cruzas los
brazos la prenda se dibuja encima. Para fotorrealismo hace falta difusión —
motor `remote`, o GPU propia con ComfyUI (CatVTON/IDM-VTON).

## Estructura

```
app/            rutas, layout y /api/try-on (proxy del motor remoto)
components/     UI (shop/ y VirtualTryOn/)
lib/domain/     núcleo puro: prendas, carrito, estados
lib/engines/    motores de try-on + geometría de pose
lib/hooks/      useCamera, useTryOn, useCart
lib/server/     credenciales del proveedor remoto (sólo servidor)
tests/          tests del núcleo puro
scripts/        preparación de assets
```

Los detalles de diseño y el por qué de cada decisión están en
[ARCHITECTURE.md](ARCHITECTURE.md).

**Si retomas el proyecto, empieza por [ESTADO.md](ESTADO.md)**: documenta qué
está verificado, qué no lo está, y qué queda pendiente.

## Privacidad

Con el motor por defecto no hay ninguna petición de red con tu imagen: el modelo
se sirve desde `/public` y la inferencia corre en WASM dentro de la pestaña. El
único motor que envía fotogramas a un tercero es `remote`, y sólo cuando lo
activas explícitamente y pulsas «Capturar».
