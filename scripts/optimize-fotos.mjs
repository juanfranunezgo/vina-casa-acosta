// Optimiza las fotos finales del sitio, organizadas por nomenclatura (A/B/D...).
//
// Uso:
//   1. npm i -D sharp        (una sola vez)
//   2. Poné tus fotos en   sitio-web/_fotos-input/<Letra>/<ID-descripcion>.jpg
//      con los nombres del MANIFEST de abajo (ver también _fotos-input/LEEME.md)
//   3. npm run fotos
//
// Cada foto se redimensiona al ancho máximo de su slot y se reencoda a JPG 85
// en sRGB con metadata removida. NO recorta: el sitio usa object-cover, así que
// el encuadre lo hace el CSS. Solo importa que la orientación sea la correcta.
//
// No toca los originales. Next/Image genera después AVIF/WebP y las variantes
// por dispositivo, así que estos "masters" son el techo, no el peso final.

import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, extname, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";
const INPUT = join(ROOT, "_fotos-input");
const OUTPUT = join(ROOT, "public", "images");
const QUALITY = 85;

// slot ID (prefijo del nombre de archivo) -> destino en public/images/ + ancho máx.
// El script mira el prefijo antes del primer "-" para encontrar el slot.
const MANIFEST = {
  // A — Inicio
  "A1": { out: "home/hero.jpg", w: 2560 }, // hero pantalla completa (horizontal)
  "A2-1": { out: "home/stack-1-vinedo.jpg", w: 1600 }, // pila vertical
  "A2-2": { out: "home/stack-2-fundador.jpg", w: 1600 },
  "A2-3": { out: "home/stack-3-cata.jpg", w: 1600 },
  "A2-4": { out: "home/stack-4-familia.jpg", w: 1600 },
  "A4-tours": { out: "home/actividad-tours.jpg", w: 1400 }, // cards horizontales
  "A4-experiencias": { out: "home/actividad-experiencias.jpg", w: 1400 },
  "A4-eventos": { out: "home/actividad-eventos.jpg", w: 1400 },
  // B — Historia
  "B2": { out: "historia/origen.jpg", w: 2000 }, // imagen grande origen
  "B5-damian": { out: "familia/damian.jpg", w: 1600 }, // retratos verticales 4:5, color
  "B5-andrea": { out: "familia/andrea.jpg", w: 1600 },
  "B5-enrique": { out: "familia/enrique.jpg", w: 1600 },
  "B5-alfonso": { out: "familia/alfonso.jpg", w: 1600 },
  // D — Actividades
  "D2-ombu": { out: "actividades/tour-ombu.jpg", w: 1400 },
  "D2-bera": { out: "actividades/tour-bera.jpg", w: 1400 },
  "D2-carmenere": { out: "actividades/tour-carmenere.jpg", w: 1400 },
  "D3-vendimia": { out: "actividades/vendimia.jpg", w: 1400 },
  "D3-madres": { out: "actividades/dia-madres.jpg", w: 1400 },
  "D3-tren": { out: "actividades/tren-efe.jpg", w: 1400 },
  "D4": { out: "actividades/eventos-hero.jpg", w: 2000 }, // banner eventos
};

const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (IMG_EXT.has(extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

// Encuentra la entrada del MANIFEST cuyo id sea prefijo del nombre de archivo.
// Prueba el prefijo más largo primero (A2-1 antes que A2, D2-ombu antes que D2).
function matchSlot(fileBase) {
  const name = fileBase.toLowerCase();
  const ids = Object.keys(MANIFEST).sort((a, b) => b.length - a.length);
  return ids.find((id) => name.startsWith(id.toLowerCase()));
}

const kb = (n) => (n / 1024).toFixed(0) + " KB";

async function run() {
  const files = await walk(INPUT);
  if (files.length === 0) {
    console.log(`No hay imágenes en ${INPUT}`);
    console.log("Poné las fotos en _fotos-input/<Letra>/<ID-...>.jpg y volvé a correr.");
    return;
  }

  let totalIn = 0;
  let totalOut = 0;
  const done = new Set();
  const skipped = [];

  for (const src of files) {
    const base = basename(src, extname(src));
    const id = matchSlot(base);
    if (!id) {
      skipped.push(basename(src));
      continue;
    }
    const { out, w } = MANIFEST[id];
    const dest = join(OUTPUT, out);
    await mkdir(dirname(dest), { recursive: true });

    const inBytes = (await stat(src)).size;
    await sharp(src)
      .rotate() // respeta orientación EXIF antes de descartar metadata
      .resize({ width: w, withoutEnlargement: true })
      .toColorspace("srgb")
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(dest);
    const outBytes = (await stat(dest)).size;

    totalIn += inBytes;
    totalOut += outBytes;
    done.add(id);
    console.log(`✓ ${id.padEnd(16)} → ${out.padEnd(34)} ${kb(inBytes).padStart(9)} → ${kb(outBytes).padStart(9)}`);
  }

  const missing = Object.keys(MANIFEST).filter((id) => !done.has(id));
  console.log(`\n${done.size}/${Object.keys(MANIFEST).length} slots · ${kb(totalIn)} → ${kb(totalOut)} en public/images/`);
  if (skipped.length) console.log(`⚠ Ignoradas (nombre sin ID válido): ${skipped.join(", ")}`);
  if (missing.length) console.log(`… Faltan slots: ${missing.join(", ")}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
