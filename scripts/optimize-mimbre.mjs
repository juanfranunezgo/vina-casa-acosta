// Fotos del Taller de mimbre — npm run fotos:mimbre
//
// Ocho fotos propias de un taller real (2026-08-19). Reemplazan la foto de
// categoría (`pareja-columpio`) y el letrero de la viña, que era lo que había
// en la ficha: fotos de la viña, sí, pero de otra actividad. Una imagen que no
// es del taller le dice al visitante que así se ve el taller.
//
// Cada ranura de la ficha tiene una proporción fija, así que el recorte se hace
// acá y no con `object-cover`: lo que no se ve, no se descarga. Las tres
// verticales salen SIN recorte —la cámara ya entregó 2:3, que es la proporción
// de la ranura del mosaico— y por eso el mosaico se diseñó a 2:3 y no al 4:5 de
// Vendimia: recortar un 17% del alto de la artesana le come la cara o el bol.
//
// `anchorY` es la fracción del sobrante que se saca POR ARRIBA: 0 conserva el
// borde superior, 1 el inferior, 0.5 recorta parejo. Se elige mirando la foto y
// por eso está anotado uno por uno. `anchorX` hace lo mismo en horizontal.
//
// Ojo con la orientación EXIF: `artesana`, `maestro` y `piezas` salieron de la
// cámara en vertical y el archivo mide 4752x3168 con `orientation: 6`. Sin
// `.rotate()` se procesan acostadas y el recorte cae en cualquier parte. Las
// dimensiones para calcular la caja se toman ya rotadas.
//
// Uso: poner las fuentes en `web/_fuentes-fotos/` y correr el script. Las que
// falten se saltan con un aviso; los .webp ya están versionados.

import sharp from "sharp";
import { mkdir, stat, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FUENTES = join(ROOT, "..", "_fuentes-fotos");
const OUT_DIR = join(ROOT, "public", "images", "actividades");

// q80, como el resto de las galerías del sitio: el mimbre es textura fina y
// repetitiva —donde el bandeo se ve antes que en follaje— y la mitad de las
// fotos tiene manos y caras.
const QUALITY = 80;

// El hero es el único que se sirve a ancho completo. Baja a 76 por peso: a
// 2400px la diferencia con 80 son 90 KB y el detalle del tejido a ese tamaño ya
// no se distingue en pantalla.
const QUALITY_HERO = 76;

/**
 * Una foto por ranura de la ficha (Dd1…Dd7, ver docs/NOMENCLATURA.md).
 *
 * `ratio` es el de la ranura. Si la foto ya viene con esa proporción —o si no
 * hay `ratio`— no se recorta nada y el encuadre lo resuelve el `object-cover`
 * de la página.
 */
const FOTOS = [
  {
    // Dd1 — hero. La mesa entera de canastos terminados, que es lo que el
    // visitante se lleva. Sin recorte: el hero es full-bleed y su alto cambia
    // con el viewport, así que el 3:2 completo le deja margen a `cover` en
    // vertical y en horizontal.
    source: "mimbre-hero.jpg",
    name: "mimbre-hero",
    width: 2400,
    quality: QUALITY_HERO,
  },
  {
    // Dd1 — junto a la bajada, ranura 4:3. Las manos empezando la base sobre el
    // molde: es el gesto que abre el taller. Recorte centrado; el trabajo está
    // al medio del cuadro.
    source: "mimbre-tejido.jpg",
    name: "mimbre-tejido",
    ratio: 4 / 3,
    width: 1200,
  },
  {
    // Dd5 — cabecera de la tarjeta de reserva, 16:10. Manos y martillo cerrando
    // el fondo de una pieza. Sobra un 6% de alto y sale de arriba (el techo del
    // toldo), no de abajo, donde están las herramientas sobre el banco.
    source: "mimbre-manos.jpg",
    name: "mimbre-manos",
    ratio: 16 / 10,
    anchorY: 0.75,
    width: 1200,
  },
  {
    // Dd6 — apertura de la galería, 16:9. La segunda mesa de piezas, con los
    // canastos altos a la derecha. Se saca más de arriba que de abajo: arriba
    // asoma el borde del toldo y abajo están las piezas del frente.
    source: "mimbre-canastos.jpg",
    name: "mimbre-canastos",
    ratio: 16 / 9,
    anchorY: 0.6,
    width: 1600,
  },
  {
    // Dd6 — mosaico, vertical 2:3. La artesana marcando los radios sobre el
    // molde. Sin recorte: ya es 2:3 exacto y cualquier corte le toca la cabeza
    // (empieza al 3% del alto) o el bol (termina al 97%).
    source: "mimbre-artesana.jpg",
    name: "mimbre-artesana",
    ratio: 2 / 3,
    width: 1000,
  },
  {
    // Dd6 — mosaico, vertical 2:3. El maestro artesano mostrando el arranque a
    // una participante. Sin recorte.
    source: "mimbre-maestro.jpg",
    name: "mimbre-maestro",
    ratio: 2 / 3,
    width: 1000,
  },
  {
    // Dd6 — mosaico, vertical 2:3. Las piezas terminadas vistas desde el borde
    // de la mesa. Sin recorte.
    source: "mimbre-piezas.jpg",
    name: "mimbre-piezas",
    ratio: 2 / 3,
    width: 1000,
  },
  {
    // Dd7 — panel junto al formulario. La mesa larga del desayuno campesino,
    // que es como parte el programa. Se deja apaisada entera: la ranura cambia
    // de proporción con el viewport —angosta y alta en escritorio, ancha y baja
    // en móvil— y el encuadre lo resuelve `object-cover` desde el centro, donde
    // está la mesa servida.
    source: "mimbre-desayuno.jpg",
    name: "mimbre-desayuno",
    width: 1600,
  },
];

const exists = async (p) => access(p).then(() => true, () => false);

await mkdir(OUT_DIR, { recursive: true });

console.log("fotos del taller de mimbre");

for (const { source, name, ratio, anchorY = 0.5, anchorX = 0.5, width, quality } of FOTOS) {
  const input = join(FUENTES, source);
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
      // Más ancha que la ranura: sobra a los costados.
      const ancho = Math.round(H * ratio);
      recorte = { left: Math.round((W - ancho) * anchorX), top: 0, width: ancho, height: H };
    } else if (actual < ratio) {
      const alto = Math.round(W / ratio);
      recorte = { left: 0, top: Math.round((H - alto) * anchorY), width: W, height: alto };
    }
    if (recorte) pipeline.extract(recorte);
  }

  const output = join(OUT_DIR, `${name}.webp`);
  await pipeline
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: quality ?? QUALITY, effort: 6, smartSubsample: true })
    .toFile(output);

  const { size } = await stat(output);
  const salida = await sharp(output).metadata();
  const corte = recorte ? `recorte ${recorte.width}x${recorte.height} → ` : "sin recorte → ";
  console.log(
    `  ✓ ${name}.webp  origen ${W}x${H}  ${corte}${salida.width}x${salida.height}  q${quality ?? QUALITY}  ${Math.round(size / 1024)} KB`,
  );
}
