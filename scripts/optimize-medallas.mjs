// Convierte las medallas y puntajes que entrega la viña en los `.webp` de
// `public/images/medallas/`. Las fuentes viven en
// `vina-casa-acosta/web/_fuentes-fotos/medallas/` (fuera del repo) y nunca se
// sobrescriben. Las que falten se saltan.
// Uso: npm run fotos:medallas
//
// Por qué existe: la viña las manda como PDF o como PNG con la medalla flotando
// en un lienzo más grande (la de Carmenère al Mundo ocupa 715 px de un lienzo de
// 2000x1523). El sitio las dibuja chicas —28 px en la tarjeta de un vino—,
// así que se recortan al borde de la medalla y se sacan en un cuadrado parejo.
//
// Los PDF no los lee sharp: se rasterizaron una vez a PNG con transparencia
// (PyMuPDF, lado mayor 1024 px) y ese PNG es la fuente. Ver `docs/FOTOS.md`.
//
// El nombre de salida es el id de la medalla en `data/medallas.ts`: una medalla
// nueva se agrega en los dos lados (lo cuida `tests/medallas.test.mjs`).

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";
const SOURCE_ROOT = join(ROOT, "..", "_fuentes-fotos", "medallas");
const OUTPUT = join(ROOT, "public", "images", "medallas");

// Hoy la más grande se dibuja a 40 px (el panel de la botella en la ficha) y
// `next/image` sirve el tamaño que cada pantalla pide. El master queda en 256
// —nacieron al doble y se achicaron el mismo día— para poder agrandarlas sin
// regenerar. La fuente más chica (Catador 2025) mide 332 px: no se agranda.
const SIZE = 256;

const medallas = [
  "catador-oro-2020",
  "catador-oro-2021",
  "catador-oro-2022",
  "catador-oro-2023",
  "catador-oro-2025",
  "carmenere-al-mundo-oro-2022",
  "la-cav-90",
  "la-cav-91",
  "la-cav-93",
];

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 };

await mkdir(OUTPUT, { recursive: true });

for (const id of medallas) {
  const from = join(SOURCE_ROOT, `${id}.png`);
  if (!(await exists(from))) {
    console.log(`· ${id}.png no está en _fuentes-fotos/medallas/, se salta`);
    continue;
  }

  const origen = await stat(from);

  // `trim` recorta la transparencia que rodea a la medalla: sin esto, cada una
  // se vería de otro tamaño según el lienzo en que la mandaron.
  const recortada = await sharp(from).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });

  const to = join(OUTPUT, `${id}.webp`);
  await sharp(recortada.data)
    .resize(SIZE, SIZE, { fit: "contain", background: TRANSPARENTE, withoutEnlargement: false })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(to);

  const destino = await stat(to);
  console.log(
    `✓ ${id}.webp — ${SIZE}x${SIZE}, medalla ${recortada.info.width}x${recortada.info.height} · ${kb(origen.size)} → ${kb(destino.size)}`,
  );
}
