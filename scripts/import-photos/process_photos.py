#!/usr/bin/env python3
"""
Convierte fotos de producto sueltas (cualquier tamaño/fondo) en los PNG con
transparencia que el motor local espera, siguiendo la convención documentada
en `scripts/generate-garment-assets.mjs`: la prenda recortada *pegada* al
borde superior de la imagen, sin margen — ese borde es la línea de hombros
que el motor usa para anclar la prenda al cuerpo. Cualquier aire por encima
de la prenda la descoloca en el probador.

Dos modos, según el tipo de foto que traiga el cliente:

  --mode product (default)
    Prenda sola sobre fondo liso, colgada, en maniquí o flat-lay. Quita el
    fondo con `rembg` (quitafondos genérico): se queda con el objeto
    principal de la foto, que en este caso es la prenda.

  --mode on-model
    Foto de una persona puesta la prenda (lo más común en catálogos reales).
    `rembg` ahí se queda con la persona entera, no con la prenda — hace falta
    el segmentador multiclase (`selfie_multiclass_256x256`, el mismo modelo
    que ya usa el motor del probador para la oclusión) para quedarse sólo con
    los píxeles clasificados como "ropa" y descartar piel/pelo/fondo.
    Limitación real, no de implementación: si la foto tiene varias prendas
    puestas a la vez (una campera sobre una blusa, por ejemplo), el modelo no
    distingue cuál es el producto que se vende — se queda con todas. Mejor
    resultado cuanto más aislada esté la prenda en la toma.

Uso:
    .venv/bin/python process_photos.py <carpeta-entrada> [--category shirt] [--mode on-model]

Por cada imagen de <carpeta-entrada>:
  1. Quita el fondo (rembg, o el segmentador de ropa en --mode on-model).
     Corre local tras la primera vez que cada modelo se descarga.
  2. Recorta al cuadro delimitador del contenido opaco.
  3. La reubica en un lienzo donde la fila superior del recorte queda en
     la fila 0 (sin margen arriba) — la convención que pide el motor.
  4. Guarda el PNG en /public/garments/<slug>.png.
  5. Agrega una entrada borrador al catálogo generado
     (scripts/import-photos/catalog.generated.json) para revisar a mano
     antes de pegarla en lib/catalog/garments.ts — el color y la categoría
     son una adivinanza barata (nombre de archivo / carpeta), no análisis
     de imagen.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "garments"
CATALOG_OUT = Path(__file__).resolve().parent / "catalog.generated.json"

# Mismo modelo que usa lib/engines/localPoseEngine.ts en el navegador para la
# oclusión — se reutiliza acá server-side para separar la prenda de la
# persona. Categoría 4 = "clothes" en este modelo (ver lib/config/tryOn.ts).
SEGMENTATION_MODEL_PATH = ROOT / "public" / "models" / "selfie_multiclass_256x256.tflite"
CLOTHES_CATEGORY = 4

# Mismos defaults de encaje que ya usa el catálogo a mano, por categoría.
FIT_DEFAULTS = {
    "jacket": {"widthScale": 1.85, "heightScale": 1.35},
    "sweater": {"widthScale": 1.75, "heightScale": 1.3},
    "shirt": None,
    "pants": None,
}

CATEGORY_KEYWORDS = {
    "jacket": ["jacket", "chaqueta", "campera", "blazer", "coat", "abrigo"],
    "sweater": ["sweater", "hoodie", "sudadera", "suéter", "sueter", "buzo", "pullover"],
    "pants": ["pants", "jean", "pantalon", "pantalón", "trouser", "chino"],
    "shirt": ["shirt", "camiseta", "remera", "tshirt", "t-shirt", "polo", "top"],
}


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "garment"


def guess_category(filename: str, folder_hint: str | None) -> str:
    haystack = f"{folder_hint or ''} {filename}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return category
    return "shirt"


def make_clothes_remover():
    """Arma un `remove(imagen) -> imagen` con la misma firma que `rembg.remove`,
    pero quedándose sólo con los píxeles de categoría "ropa" en vez del objeto
    saliente genérico — es lo que hace falta para no llevarse a la persona
    entera en una foto on-model."""
    import numpy as np
    import mediapipe as mp
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python.core.base_options import BaseOptions

    if not SEGMENTATION_MODEL_PATH.exists():
        raise SystemExit(
            f"Falta el modelo de segmentación en {SEGMENTATION_MODEL_PATH}. "
            "Ejecutá: npm run setup:local-ai"
        )

    options = vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=str(SEGMENTATION_MODEL_PATH)),
        running_mode=vision.RunningMode.IMAGE,
        output_category_mask=True,
    )
    segmenter = vision.ImageSegmenter.create_from_options(options)

    def remove(image: Image.Image) -> Image.Image:
        rgb_image = image.convert("RGB")
        rgb = np.array(rgb_image)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = segmenter.segment(mp_image)
        mask = result.category_mask.numpy_view()
        clothes = (mask[:, :, 0] if mask.ndim == 3 else mask) == CLOTHES_CATEGORY
        alpha = np.where(clothes, 255, 0).astype(np.uint8)
        rgba = np.dstack([rgb, alpha])
        return Image.fromarray(rgba, mode="RGBA")

    return remove


def tight_crop_to_top(image: Image.Image) -> Image.Image:
    """Recorta al bbox del alfa y reubica el contenido pegado al borde superior."""
    bbox = image.getbbox()
    if bbox is None:
        return image
    cropped = image.crop(bbox)

    canvas = Image.new("RGBA", cropped.size, (0, 0, 0, 0))
    canvas.paste(cropped, (0, 0), cropped)
    return canvas


# Las fotos de catálogo reales (Kaggle, o lo que mande un cliente) suelen venir
# en resolución de impresión (2000px+). El motor las dibuja escaladas al torso
# detectado, nunca a tamaño nativo, así que no hay ganancia visual en servir
# más de esto — sólo carga más lenta. 900px de lado mayor alcanza de sobra.
MAX_DIMENSION = 900


def process_one(src: Path, out_dir: Path, category_hint: str | None, remove_background) -> dict:
    raw = Image.open(src).convert("RGBA")
    cut = remove_background(raw)
    garment = tight_crop_to_top(cut)

    if max(garment.size) > MAX_DIMENSION:
        ratio = MAX_DIMENSION / max(garment.size)
        new_size = (round(garment.width * ratio), round(garment.height * ratio))
        garment = garment.resize(new_size, Image.LANCZOS)

    slug = slugify(src.stem)
    dest = out_dir / f"{slug}.png"
    garment.save(dest, "PNG", optimize=True)

    category = category_hint or guess_category(src.name, src.parent.name)

    entry = {
        "id": slug,
        "name": src.stem.replace("_", " ").replace("-", " ").title(),
        "description": "COMPLETAR: descripción del producto.",
        "category": category,
        "color": "COMPLETAR",
        "size": "M",
        "price": 0,
        "imageUrl": f"/garments/{slug}.png",
    }
    fit = FIT_DEFAULTS.get(category)
    if fit:
        entry["fit"] = fit

    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input_dir", type=Path, help="Carpeta con las fotos crudas a procesar")
    parser.add_argument(
        "--category",
        choices=sorted(CATEGORY_KEYWORDS),
        default=None,
        help="Fuerza la categoría para todas las fotos de esta corrida (si no, se adivina por nombre)",
    )
    parser.add_argument(
        "--mode",
        choices=["product", "on-model"],
        default="product",
        help="product = prenda sola (default). on-model = foto de una persona con la prenda puesta.",
    )
    args = parser.parse_args()

    if not args.input_dir.is_dir():
        print(f"No existe la carpeta: {args.input_dir}", file=sys.stderr)
        return 1

    images = sorted(
        p
        for p in args.input_dir.rglob("*")
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    if not images:
        print(f"No se encontraron imágenes en {args.input_dir}", file=sys.stderr)
        return 1

    # Import diferido: cada modelo tarda varios segundos en cargar la primera
    # vez, no tiene sentido pagar ese costo si no hay nada que hacer.
    if args.mode == "on-model":
        remove_background = make_clothes_remover()
    else:
        from rembg import remove as remove_background

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = []
    for src in images:
        print(f"[import-photos] {src.name} -> ", end="", flush=True)
        try:
            entry = process_one(src, OUT_DIR, args.category, remove_background)
            entries.append(entry)
            print(f"public/garments/{entry['id']}.png ({entry['category']})")
        except Exception as err:  # noqa: BLE001 - una foto mala no debe tirar abajo el resto
            print(f"ERROR: {err}")

    CATALOG_OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[import-photos] {len(entries)} prendas escritas en public/garments/")
    print(f"[import-photos] Borrador de catálogo en {CATALOG_OUT.relative_to(ROOT)}")
    print("[import-photos] Revisar color/precio/descripción antes de pegarlo en lib/catalog/garments.ts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
