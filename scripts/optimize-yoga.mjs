// Fotos de Yoga entre Viñas — npm run fotos:yoga
//
// Nueve fotos de sesiones reales que la viña mandó el 2026-09-24; entran ocho,
// una por ranura de la ficha. Reemplazan la pareja en el columpio y el letrero
// de la viña, que eran fotos de la viña pero no del yoga.
//
// Llegaron por WhatsApp: 960x1280 las verticales y 1280x960 la única apaisada.
// Es poco para un hero a ancho completo —en escritorio el navegador la estira
// 1,5 veces— y por eso ninguna se agranda acá (`withoutEnlargement`): si la
// viña consigue los originales de la cámara, se reemplazan en
// `web/_fuentes-fotos/` y se corre de nuevo, sin tocar nada más.
//
// A diferencia del mimbre, varias fotos no se recortan sólo por la proporción:
// hay que sacar algo del cuadro (un ventilador, bolsos en primer plano). Por eso
// cada una declara su caja `box` en píxeles del original, ya con la proporción
// de su ranura, elegida mirando la foto y anotada una por una. Sin `box`, la
// foto sale entera y el encuadre lo resuelve `object-cover` en la página.
//
// La que no entra: `yoga-bailarin.jpg` (el grupo en la postura del bailarín
// detrás del tronco). La mitad de abajo es tierra, y el mismo momento lo
// cuentan mejor las demás.

import sharp from "sharp";
import { mkdir, stat, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FUENTES = join(ROOT, "..", "_fuentes-fotos");
const OUT_DIR = join(ROOT, "public", "images", "actividades");

// q76, como el hero del mimbre. Son fotos que WhatsApp ya comprimió: a q82 el
// webp pesaba lo mismo que el JPEG (conserva su ruido), y a q76 baja cerca de
// un 20% (el hero, de 250 a 203 KB).
const QUALITY = 76;

const FOTOS = [
  {
    // Dd1 — hero (y `og:image`). Una persona en la postura del triángulo sobre
    // el pasillo de tablas, entre las parras y con la cordillera al fondo: la
    // imagen que dice "yoga entre viñas" sin explicar nada. Entera: en celular
    // el hero es vertical y la usa completa; en escritorio `object-cover` toma
    // la franja del medio, que es donde está ella.
    source: "yoga-hero.jpg",
    name: "yoga-hero",
  },
  {
    // Dd1 — junto a la introducción, 4:3. El grupo sentado estirando los
    // brazos, de espaldas, con las parras y el cerro. La caja deja afuera el
    // ventilador y el tambor negro de la izquierda.
    source: "yoga-grupo.jpg",
    name: "yoga-grupo",
    box: { left: 160, top: 330, width: 800, height: 600 },
  },
  {
    // Dd5 — cabecera de la tarjeta de precio, la que acompaña a "¿Qué
    // incluye?", 16:10. La mesa del brunch servida, con el grupo: pedido de
    // Juan Francisco, porque es lo que el precio incluye además de la clase.
    // Sale el toldo de arriba y las patas de la mesa de abajo; queda la cabeza
    // de quien sirve.
    source: "yoga-mesa.jpg",
    name: "yoga-mesa",
    box: { left: 0, top: 440, width: 960, height: 600 },
  },
  {
    // Dd7 — panel junto al formulario. Las posturas bajo el toldo blanco.
    // Entera: la ranura es vertical en escritorio y apaisada en celular, y en
    // los dos casos el centro del cuadro son las posturas.
    source: "yoga-toldo.jpg",
    name: "yoga-toldo",
  },
  {
    // Dd6 — apertura de la galería, 16:9. El grupo en la mesa del brunch,
    // sonriendo: la única apaisada. Sale parejo de arriba (toldo) y de abajo.
    source: "yoga-brunch.jpg",
    name: "yoga-brunch",
    box: { left: 0, top: 120, width: 1280, height: 720 },
  },
  {
    // Dd6 — mosaico, 2:3. Posturas bajo las hojas de la parra, con los racimos.
    // Se conserva la derecha, donde está la participante del primer plano.
    source: "yoga-parras.jpg",
    name: "yoga-parras",
    box: { left: 107, top: 0, width: 853, height: 1280 },
  },
  {
    // Dd6 — mosaico, 2:3. La relajación del final de la práctica. La caja es
    // más chica que el cuadro porque abajo hay un fardo, bolsos, zapatillas y
    // el brazo de quien sacó la foto.
    source: "yoga-relajacion.jpg",
    name: "yoga-relajacion",
    box: { left: 160, top: 0, width: 640, height: 960 },
  },
  {
    // Dd6 — mosaico, 2:3. La instructora frente al grupo, junto a la barrica
    // con hortensias. Se conserva la izquierda, donde está la barrica.
    source: "yoga-instructora.jpg",
    name: "yoga-instructora",
    box: { left: 0, top: 0, width: 853, height: 1280 },
  },
];

const exists = async (p) => access(p).then(() => true, () => false);

await mkdir(OUT_DIR, { recursive: true });

console.log("fotos de Yoga entre Viñas");

for (const { source, name, box } of FOTOS) {
  const input = join(FUENTES, source);
  if (!(await exists(input))) {
    console.log(`  ⚠ falta ${source} en _fuentes-fotos/ — se salta`);
    continue;
  }

  // `.rotate()` por si algún original trae orientación EXIF (ver el script del
  // mimbre); las de WhatsApp llegan ya enderezadas.
  const meta = await sharp(input).rotate().metadata();
  const pipeline = sharp(input).rotate();
  if (box) {
    const dentro =
      box.left >= 0 &&
      box.top >= 0 &&
      box.left + box.width <= meta.width &&
      box.top + box.height <= meta.height;
    if (!dentro) throw new Error(`${source}: la caja se sale del cuadro ${meta.width}x${meta.height}`);
    pipeline.extract(box);
  }

  const output = join(OUT_DIR, `${name}.webp`);
  await pipeline
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toFile(output);

  const { size } = await stat(output);
  const salida = await sharp(output).metadata();
  const corte = box ? `recorte ${box.width}x${box.height} → ` : "sin recorte → ";
  console.log(
    `  ✓ ${name}.webp  origen ${meta.width}x${meta.height}  ${corte}${salida.width}x${salida.height}  ${Math.round(size / 1024)} KB`,
  );
}
