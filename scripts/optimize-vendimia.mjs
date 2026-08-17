// Recortes del hero de la vendimia — npm run fotos:vendimia
//
// La foto de la jornada es una sola: una aérea de 8064x4536. En vez de rellenar
// la página con imágenes de otras actividades (que dirían que así se ve la
// vendimia, y no es cierto), se sacan cuatro encuadres del mismo original. A 36
// megapíxeles, un recorte de un cuarto del cuadro todavía sale por encima de
// 2000px de ancho: son fotos de verdad, no ampliaciones.
//
// Las coordenadas van en fracción del original y no en píxeles para que sigan
// significando lo mismo si algún día llega el archivo a otro tamaño.
//
// Uso: poner `hero-vendimia.jpg` en `web/_fuentes-fotos/` y correr el script.
// Si falta la fuente, avisa y no hace nada (los .webp ya están versionados).

import sharp from "sharp";
import { mkdir, stat, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "..", "_fuentes-fotos", "hero-vendimia.jpg");
const OUT_DIR = join(ROOT, "public", "images", "actividades");

// q72 por lo mismo que el hero: follaje visto desde arriba es textura fina y la
// curva por megapíxeles paga detalle que a tamaño de pantalla no se ve.
const QUALITY = 72;

const RECORTES = [
  {
    // El grupo entero, que es el corazón de la foto. Encuadre horizontal.
    name: "vendimia-grupo",
    box: { left: 0.19, top: 0.24, width: 0.57, height: 0.62 },
    width: 1600,
  },
  {
    // Las gamelas con la uva cortada, abajo a la derecha. Panorámico corto:
    // acompaña bien al texto sin robarle la fila.
    name: "vendimia-gamelas",
    box: { left: 0.66, top: 0.68, width: 0.34, height: 0.32 },
    width: 1200,
  },
  {
    // Las hileras de la izquierda, en vertical. Es la única toma vertical que la
    // foto puede dar sin cortar gente.
    name: "vendimia-hileras",
    box: { left: 0.0, top: 0.2, width: 0.26, height: 0.8 },
    width: 1000,
  },
  {
    // El tractor y la carpa del fondo: el trabajo que rodea a la jornada.
    name: "vendimia-tractor",
    box: { left: 0.41, top: 0.0, width: 0.32, height: 0.36 },
    width: 1200,
  },
];

const exists = async (p) => access(p).then(() => true, () => false);

if (!(await exists(SOURCE))) {
  console.log(`⚠ falta ${SOURCE.split(/[\\/]/).pop()} en _fuentes-fotos/ — no se genera nada (ver docs/FOTOS.md)`);
  process.exit(0);
}

await mkdir(OUT_DIR, { recursive: true });
const { width: W, height: H } = await sharp(SOURCE).metadata();
console.log(`origen ${W}x${H}`);

for (const { name, box, width } of RECORTES) {
  const output = join(OUT_DIR, `${name}.webp`);
  const extract = {
    left: Math.round(box.left * W),
    top: Math.round(box.top * H),
    width: Math.round(box.width * W),
    height: Math.round(box.height * H),
  };
  await sharp(SOURCE)
    .rotate()
    .extract(extract)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toFile(output);
  const { size } = await stat(output);
  const meta = await sharp(output).metadata();
  console.log(
    `  ✓ ${name}.webp  recorte ${extract.width}x${extract.height} → ${meta.width}x${meta.height}  ${Math.round(size / 1024)} KB`,
  );
}
