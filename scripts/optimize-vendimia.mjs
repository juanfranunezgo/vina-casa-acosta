// Fotos de la vendimia — npm run fotos:vendimia
//
// Dos etapas, con fuentes distintas:
//
// 1. RECORTES de la aérea (`hero-vendimia.jpg`, 8064x4536). Cuando la jornada
//    tenía una sola foto, en vez de rellenar la página con imágenes de otras
//    actividades —que dirían que así se ve la vendimia, y no es cierto— se
//    sacaron cuatro encuadres del mismo original. A 36 megapíxeles, un recorte
//    de un cuarto del cuadro sigue saliendo sobre 2000px de ancho: son fotos de
//    verdad, no ampliaciones. Las coordenadas van en fracción y no en píxeles
//    para que signifiquen lo mismo si el archivo llega a otro tamaño.
//
// 2. FOTOS propias de la jornada, una por archivo (2026-08-18). Cada ranura de
//    la página tiene una proporción fija, así que el recorte se hace acá y no
//    con `object-cover`: lo que no se ve, no se descarga.
//
//    `anchorY` es la fracción del sobrante que se saca POR ARRIBA: 0 conserva el
//    borde superior, 1 el inferior, 0.5 recorta parejo. Se elige mirando la foto
//    —dónde quedan las caras— y por eso está anotado uno por uno.
//
//    Ojo con la orientación EXIF: `personas`, `bin` y `charla` salieron de un
//    teléfono en vertical y el archivo mide 4000x2252 con `orientation: 6`. Sin
//    `.rotate()` se procesan acostadas y el recorte cae en cualquier parte. Las
//    dimensiones para calcular la caja se toman ya rotadas.
//
// Uso: poner las fuentes en `web/_fuentes-fotos/` y correr el script. Las que
// falten se saltan con un aviso; los .webp ya están versionados.

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

// Las fotos de la jornada van a 80, como el resto de las galerías del sitio: se
// ven a tamaño de tarjeta y tienen caras y piel, donde el bandeo de q72 se nota.
const QUALITY_FOTOS = 80;

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

/**
 * Fotos sueltas de la jornada. `ratio` es el de la ranura en la página; si la
 * foto ya viene con esa proporción, no se recorta nada.
 */
const FOTOS = [
  {
    // Dv2 — el mosto cayendo de la canilla de la barrica al balde. Vertical de
    // origen, misma proporción que la ranura: no hay recorte que decidir.
    source: "vendimia-mosto.jpg",
    name: "vendimia-mosto",
    ratio: 2 / 3,
    width: 800,
  },
  {
    // Dv2 — la mano bajo el racimo todavía en la parra.
    source: "vendimia-mano-uva.jpg",
    name: "vendimia-mano-uva",
    ratio: 2 / 3,
    width: 800,
  },
  {
    // Dv2 — los pies en la uva dentro del lagar.
    source: "vendimia-pisoneo.jpg",
    name: "vendimia-pisoneo",
    ratio: 2 / 3,
    width: 800,
  },
  {
    // Dv4 — la mesa larga del desayuno bajo el quitasol. La foto es más alta que
    // la ranura 4:5: se saca más de arriba (quitasol) que de abajo (la mesa, que
    // es el tema).
    source: "vendimia-mesa-desayuno.jpg",
    name: "vendimia-desayuno",
    ratio: 4 / 5,
    anchorY: 0.45,
    width: 1100,
  },
  {
    // Dv6 — tres personas junto a las gamelas rotuladas. Las caras quedan al 45%
    // del alto: el sobrante sale mayormente del cielo.
    source: "vendimia-personas.jpg",
    name: "vendimia-personas",
    ratio: 4 / 5,
    anchorY: 0.55,
    width: 1000,
  },
  {
    // Dv6 — vaciando la gamela en el bin. Se cuida el borde inferior: ahí está
    // la uva cayendo, que es la acción.
    source: "vendimia-bin.jpg",
    name: "vendimia-bin",
    ratio: 4 / 5,
    anchorY: 0.6,
    width: 1000,
  },
  {
    // Dv6 — la charla junto a la despalilladora, con la cordillera al fondo. El
    // grupo va en la banda del medio y abajo sólo hay hojarasca.
    source: "vendimia-charla.jpg",
    name: "vendimia-charla",
    ratio: 4 / 5,
    anchorY: 0.45,
    width: 1000,
  },
  {
    // Dv7 — la gamela roja al pie de la parra. Se deja apaisada entera: la
    // ranura del formulario cambia de proporción con el viewport y el encuadre
    // horizontal lo resuelve el `object-position` de la página, que corre la
    // foto hacia la izquierda porque ahí está la gamela.
    source: "vendimia-formulario.jpg",
    name: "vendimia-formulario",
    width: 1600,
  },
];

const exists = async (p) => access(p).then(() => true, () => false);

await mkdir(OUT_DIR, { recursive: true });

if (!(await exists(SOURCE))) {
  console.log(`⚠ falta ${SOURCE.split(/[\\/]/).pop()} en _fuentes-fotos/ — no se generan los recortes (ver docs/FOTOS.md)`);
} else {
  const { width: W, height: H } = await sharp(SOURCE).metadata();
  console.log(`recortes de la aérea — origen ${W}x${H}`);

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
}

console.log("fotos de la jornada");

for (const { source, name, ratio, anchorY = 0.5, width } of FOTOS) {
  const input = join(ROOT, "..", "_fuentes-fotos", source);
  if (!(await exists(input))) {
    console.log(`  ⚠ falta ${source} en _fuentes-fotos/ — se salta`);
    continue;
  }

  const meta = await sharp(input).metadata();
  // Con orientación EXIF 5-8 el archivo guarda el cuadro acostado; `.rotate()`
  // lo endereza, así que la caja se calcula sobre las medidas ya rotadas.
  const acostada = (meta.orientation ?? 1) >= 5;
  const W = acostada ? meta.height : meta.width;
  const H = acostada ? meta.width : meta.height;

  const pipeline = sharp(input).rotate();
  let recorte = null;

  if (ratio) {
    const actual = W / H;
    if (actual > ratio) {
      // Más ancha que la ranura: sobra a los costados, se recorta centrado.
      const ancho = Math.round(H * ratio);
      recorte = { left: Math.round((W - ancho) / 2), top: 0, width: ancho, height: H };
    } else if (actual < ratio) {
      const alto = Math.round(W / ratio);
      recorte = { left: 0, top: Math.round((H - alto) * anchorY), width: W, height: alto };
    }
    if (recorte) pipeline.extract(recorte);
  }

  const output = join(OUT_DIR, `${name}.webp`);
  await pipeline
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: QUALITY_FOTOS, effort: 6, smartSubsample: true })
    .toFile(output);

  const { size } = await stat(output);
  const salida = await sharp(output).metadata();
  const corte = recorte ? `recorte ${recorte.width}x${recorte.height} → ` : "";
  console.log(
    `  ✓ ${name}.webp  origen ${W}x${H}  ${corte}${salida.width}x${salida.height}  ${Math.round(size / 1024)} KB`,
  );
}
