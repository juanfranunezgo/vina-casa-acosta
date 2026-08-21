// Genera los WebP de los heros full-bleed, en dos encuadres cada uno.
// Uso: npm run foto:heros
//
// Por qué dos archivos por hero: el master horizontal se ve nítido en desktop,
// pero en una pantalla vertical `object-cover` lo estira hasta cubrir el alto y
// solo queda visible una franja del centro (un tercio, medido). Encima el
// navegador elige el candidato del srcset mirando el ancho del contenedor, que
// es mucho menor que el ancho al que termina pintando la foto: descargaba 1200px
// para estirarlos sobre 3800. De ahí los heros borrosos en celular.
//
// Con un master 9:16 la proporción de la imagen coincide con la del viewport,
// cover deja de estirar y la cuenta vuelve a dar 1:1.
//
// El corte entre encuadres lo decide el <picture> de cada página por PROPORCIÓN
// de pantalla (min-aspect-ratio: 3/4), no por ancho: lo que rompe la foto es que
// el viewport sea vertical, no que sea angosto — un iPad en vertical tiene el
// mismo problema con 820px de ancho.

import sharp from "sharp";
import { mkdir, stat, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (...p) => join(ROOT, ...p);
const fuentes = (name) => join(ROOT, "..", "_fuentes-fotos", name);

// La calidad baja a medida que crece la imagen: un archivo grande se ve a menos
// aumento por píxel, así que tolera más compresión. Medido sobre estas fotos, la
// curva tiene un codo en q75 (a partir de q78 el peso sube el doble de rápido
// sin ganancia visible). El umbral va por megapíxeles y no por ancho porque los
// dos encuadres tienen proporciones distintas: un vertical de 1600px tiene
// 4,5 MP y un horizontal de 1920px solo 2,5.
const qualityFor = (pixels) => (pixels <= 1.5e6 ? 82 : pixels <= 3e6 ? 78 : 75);

// `full` = archivo que ya existe en el repo a su ancho nativo. Se deja tal cual y
// se usa como el candidato más grande del srcset: reencodearlo al mismo tamaño
// solo sumaría una segunda pasada de compresión sin ganar nada.
const HEROS = [
  {
    id: "home",
    desktop: { source: src("public/images/home/hero-v2.jpg"), out: "public/images/home/hero", widths: [1280, 1920, 2560] },
    movil: { source: fuentes("hero-movil.jpg"), out: "public/images/home/hero-movil", widths: [828, 1200, 1600] },
  },
  {
    id: "vinos",
    desktop: { source: src("public/images/vinos/hero-corchos.webp"), out: "public/images/vinos/hero-corchos", widths: [1280, 1920], full: 2560 },
    movil: { source: fuentes("hero-vinos-movil.jpg"), out: "public/images/vinos/hero-corchos-movil", widths: [828, 1200, 1600] },
  },
  {
    id: "historia",
    desktop: { source: src("public/images/historia/vinos-retro.webp"), out: "public/images/historia/vinos-retro", widths: [1280, 1920], full: 2400 },
    movil: { source: fuentes("hero-historia-movil.jpg"), out: "public/images/historia/vinos-retro-movil", widths: [828, 1200, 1600] },
  },
  {
    id: "actividades",
    desktop: { source: src("public/images/actividades/hero-grupal.webp"), out: "public/images/actividades/hero-grupal", widths: [1280, 1920], full: 2880 },
    movil: { source: fuentes("hero-actividades-movil.jpg"), out: "public/images/actividades/hero-grupal-movil", widths: [828, 1200, 1600] },
  },
  {
    // Staff. El recorte vertical sale del master a 700px de la izquierda: es el
    // encuadre donde la caja queda centrada con la mano dentro. Como el de la
    // capa de +18, su candidato mas grande es de 1125px —lo que dan 2000 de alto
    // por 9/16— y no de 1600.
    id: "staff",
    desktop: { source: fuentes("hero-staff.jpg"), out: "public/images/staff/hero-caja-uvas", widths: [1280, 1920, 2560] },
    movil: { source: fuentes("hero-staff-movil.jpg"), out: "public/images/staff/hero-caja-uvas-movil", widths: [828, 1125] },
  },
  {
    // Capa de verificacion de edad. No es el hero de una pagina —va sobre todas—,
    // pero usa el mismo mecanismo: es una foto a sangre con texto encima, y en
    // pantalla vertical sufre lo mismo que sufrian los heros. El recorte 9:16 se
    // saco del master corrido a la izquierda del centro, que es donde caen los
    // dos racimos; centrado se llevaba uno.
    id: "edad",
    desktop: { source: fuentes("gate-uvas.jpg"), out: "public/images/edad/uvas", widths: [1280, 1920, 2560] },
    // 1125 y no 1600: el recorte vertical sale de los 2000px de alto del master
    // (2000 x 9/16 = 1125) y `withoutEnlargement` no inventa pixeles. Pedir 1600
    // devolvia el mismo archivo de 1125 con otro nombre, y el srcset habria
    // prometido un ancho que la foto no tiene.
    movil: { source: fuentes("gate-uvas-movil.jpg"), out: "public/images/edad/uvas-movil", widths: [828, 1125] },
  },
  {
    // Hub de Vendimia. Único hero SIN encuadre móvil, y no por falta de fuente:
    // la foto es una aérea donde el grupo ocupa el 55% del ancho, así que
    // cualquier recorte vertical (9:16 se lleva el 32% del ancho) corta gente en
    // los dos extremos. En pantalla vertical se ve la franja central —el grueso
    // del grupo y el tractor— y la nitidez la cuida el `sizes` de la página, que
    // pide un candidato más grande que el ancho del viewport porque `cover`
    // pinta la foto más ancha que su contenedor. Ver Dv1.
    id: "vendimia",
    // q72 medido contra la curva: de 78 a 72 son 90 KB menos a 1920px y el
    // recorte 1:1 sobre las caras no cambia; de 72 para abajo se ahorran 20 KB
    // por escalón, ya no vale la pena.
    desktop: { source: fuentes("hero-vendimia.jpg"), out: "public/images/actividades/hero-vendimia", widths: [1280, 1920, 2560], quality: 72 },
  },
  {
    // Contacto. Su foto —la mesa larga de noche— ya vivía en el repo como card
    // de Eventos (A4 y D4): no hay original suelto en `_fuentes-fotos`, así que
    // el master es ese mismo archivo y el candidato más grande es de 1920px.
    // Los 2000px del JPG no dan para el escalón de 2560, y `withoutEnlargement`
    // devolvería el mismo archivo con otro nombre.
    //
    // Es también el único hero cuyo encuadre vertical sale de un RECORTE del
    // master y no de una toma aparte, por lo mismo. El 9:16 se calcula sobre los
    // 1334px de alto: 750px de ancho, menos que los 828 de costumbre, pero es lo
    // que la foto tiene. Es una foto de noche y bokeh, donde el estirón se nota
    // mucho menos que en una diurna con detalle fino.
    id: "contacto",
    desktop: { source: src("public/images/actividades/eventos.jpg"), out: "public/images/contacto/hero-mesa-larga", widths: [1280, 1920] },
    // `centro: 0.45` y no 0.5: el recorte centrado parte la botella que sirve el
    // vino, que es el gesto de la foto. Corrido a la izquierda entra entera.
    movil: { source: src("public/images/actividades/eventos.jpg"), out: "public/images/contacto/hero-mesa-larga-movil", widths: [750], recorte: { proporcion: 9 / 16, centro: 0.45 } },
  },
];

const exists = async (p) => access(p).then(() => true, () => false);

/**
 * Devuelve el master listo para escalar. Sin `recorte` es la ruta del archivo;
 * con `recorte`, el buffer del encuadre pedido —proporción ancho/alto y centro
 * horizontal en fracción del ancho—. Se resuelve una vez por encuadre y no por
 * candidato: recortar es barato, pero decodificar el master tres veces no.
 */
async function masterDe(cfg) {
  if (!cfg.recorte) return cfg.source;
  // Las medidas se leen del buffer ya rotado y no de `metadata()`, que informa
  // el archivo tal como está en disco: con una foto en vertical por EXIF, el
  // ancho y el alto vienen dados vuelta y el recorte cae fuera de la imagen.
  const { data, info } = await sharp(cfg.source).rotate().toBuffer({ resolveWithObject: true });
  const width = Math.round(info.height * cfg.recorte.proporcion);
  const left = Math.max(
    0,
    Math.min(info.width - width, Math.round(info.width * cfg.recorte.centro - width / 2)),
  );
  return sharp(data).extract({ left, top: 0, width, height: info.height }).toBuffer();
}

for (const hero of HEROS) {
  console.log(`\n${hero.id}`);
  for (const [encuadre, cfg] of Object.entries(hero)) {
    if (encuadre === "id") continue;
    if (!(await exists(cfg.source))) {
      console.log(`  ⚠ ${encuadre}: falta ${cfg.source.split(/[\\/]/).pop()} — se salta (ver docs/FOTOS.md)`);
      continue;
    }
    const master = await masterDe(cfg);
    for (const width of cfg.widths) {
      const output = src(`${cfg.out}-${width}.webp`);
      await mkdir(dirname(output), { recursive: true });
      const resized = sharp(master).rotate().resize({ width, withoutEnlargement: true });
      const { width: w, height: h } = await resized
        .clone()
        .toBuffer({ resolveWithObject: true })
        .then((r) => r.info);
      // `cfg.quality` pisa la curva por megapíxeles. Existe para las fotos de
      // textura fina —follaje visto desde arriba, por ejemplo—, donde la curva
      // se corre: el codo cae unos puntos más abajo y q75 paga detalle que a
      // tamaño de pantalla nadie ve. Se usa con una medición al lado, no a ojo.
      const quality = cfg.quality ?? qualityFor(w * h);
      await resized.webp({ quality, effort: 6, smartSubsample: true }).toFile(output);
      const { size } = await stat(output);
      console.log(`  ✓ ${cfg.out.split("/").pop()}-${width}.webp  ${w}x${h}  q${quality}  ${Math.round(size / 1024)} KB`);
    }
    if (cfg.full) console.log(`  · ${cfg.out.split("/").pop()}.webp se usa tal cual como candidato de ${cfg.full}px`);
  }
}
