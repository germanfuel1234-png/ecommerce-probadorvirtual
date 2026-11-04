# Prompt / PRD de Arquitectura: Integración de Virtual Try-On (VTON) en Tiempo Real para E-Commerce

## Contexto e Identificación de Herramientas
El sistema mostrado en el vídeo utiliza la plataforma **Anywear** (desarrollada por **Decart AI**), la cual emplea el modelo fundacional de IA de vídeo en tiempo real **Lucy V-TON**. 

A diferencia de las herramientas tradicionales de cambio de ropa por IA (que toman fotos estáticas y requieren de 10 a 30 segundos de renderizado por servidor), esta solución:
1. Lee el stream de la cámara web/móvil en tiempo real (`MediaDevices API`).
2. Utiliza un modelo de IA de renderizado continuo (Real-Time Video-to-Video Diffusion / V-TON).
3. Adapta la prenda (imagen de producto) sobre el cuerpo del usuario en tiempo real con simulación de drapeado y física al moverse.

---

## Objetivo del Proyecto
Construir una tienda e-commerce funcional (Shopify App / React + Next.js / WooCommerce Widget) que integre un módulo de **Probador Virtual en Tiempo Real (Real-Time AI Virtual Try-On)** en las páginas de producto (PDP - Product Detail Page).

---

## Especificaciones de Arquitectura y Stack Tecnológico

### 1. Frontend (Interfaz de Usuario & Cámara)
- **Framework:** Next.js (React) o HTML/Tailwind embed.
- **Captura de Vídeo:** HTML5 `navigator.mediaDevices.getUserMedia()` con pipeline de renderizado en `canvas`.
- **UI Components:**
  - Botón "Probártelo (Try-On)" en la ficha del producto.
  - Modal/Widget superpuesto con el stream de la cámara.
  - Silueta/Guía visual en pantalla (*Bounding Box/Outline*) para instruir al usuario a posicionarse a la distancia adecuada.
  - Carrusel o lista de prendas seleccionables rápidamente para cambiar de atuendo en caliente (*hot-swapping*).

### 2. Backend & IA (Engine)
Hay dos formas de implementar este backend:

#### Opción A: Integración de API Existente (Recomendado para Producción)
- **API Provider:** Decart AI / Anywear API o proveedores similares de Real-Time VTON (e.g., Fashn.ai, Kling AI, Replicate API con modelos VTON optimizados como IDM-VTON en modo *fast-inference*).
- **Protocolo de Transmisión:** WebRTC o WebSockets para flujo constante de fotogramas sin latencia acumulada.

#### Opción B: Implementación Open-Source / Servidor Propio
- **Modelos IA Recomendados:**
  - *IDM-VTON* (Improved Diffusion Models for Virtual Try-On)
  - *Cat-VTON* (Lightweight Try-On Model)
  - *OOTDiff* (Outfitting Over Time)
- **Infraestructura de Inferencia:** Servidor GPU en la nube (RunPod, Modal.com, o Replicate) ejecutando ComfyUI / PyTorch con soporte para TensorRT para acelerar los *frames per second* (FPS).

---

## Requisitos Funcionales (Paso a Paso del Flujo de Usuario)

1. **Selección de Producto:**
   - El cliente navega por la tienda e-commerce y hace clic en "Probarse esta prenda".

2. **Permiso y Guía de Cámara:**
   - El navegador solicita acceso a la cámara.
   - Aparece un marco visual (Overlay HTML Canvas) para indicarle al cliente dónde colocar el torso/cuerpo.

3. **Inyección de la Prenda:**
   - El sistema toma la imagen plana o recortada (*flat-lay* / PNG con fondo transparente) del catálogo de ropa.
   - Envía el *stream* de vídeo (frames del cliente) + la imagen de la prenda al pipeline de IA.

4. **Renderizado en Tiempo Real:**
   - La IA reemplaza la prenda actual del cliente por la prenda seleccionada, conservando la pose, sombras y movimiento natural.

5. **Interactividad:**
   - El cliente puede cambiar entre diferentes prendas del catálogo haciendo clic en miniaturas dentro del mismo visor sin cerrar la cámara.
   - Botón directo "Añadir al Carrito" disponible durante toda la experiencia de probador.

---

## Prompt Directo para Desarrollador / Agente de IA

Copie el siguiente bloque de texto y envíelo a su IA de código (Cursor, Claude, Copilot):

```text
Actúa como un Arquitecto de Software Senior y Desarrollador Full-Stack experto en Inteligencia Artificial y E-Commerce.

Quiero construir una tienda de ropa en línea (o un módulo/plugin reutilizable para Shopify/Next.js) que integre un Probador Virtual en Tiempo Real (Real-Time Virtual Try-On) inspirado en soluciones como Anywear (Decart AI).

Por favor, ayúdame a estructurar y codificar este proyecto siguiendo estas pautas:

1. ESTRUCTURA DEL PROYECTO:
   - Frontend: Next.js (App Router), Tailwind CSS y React.
   - Cámara: Componente React que acceda a la cámara del usuario vía `navigator.mediaDevices.getUserMedia` y renderice el feedback en vivo en un `<video>` o `<canvas>`.
   - Selector de Productos: Un panel donde el usuario pueda hacer clic en distintas prendas de un catálogo ficticio (camisetas, sudaderas, abrigos) y aplicar la prenda instantáneamente al feed.

2. INTEGRACIÓN DE IA:
   - Crea un cliente API modular (Service Layer) que pueda conectar con APIs de Virtual Try-On (como Replicate, Fashn.ai o una API propia por WebSockets/WebRTC).
   - Incluye manejo de estados: `loading`, `camera_permission_denied`, `processing_frame`, `active_stream`.

3. INTERFAZ Y EXPERIENCIA DE USUARIO (UX/UI):
   - Diseño moderno, limpio y tipo e-commerce de moda.
   - Marco de guía visual overlay para encuadrar al usuario.
   - Botón flotante "Añadir al carrito" que mantenga la prenda seleccionada.

Por favor, proporciona la estructura de carpetas sugerida y el código completo del componente principal del probador virtual en React/Next.js.
```