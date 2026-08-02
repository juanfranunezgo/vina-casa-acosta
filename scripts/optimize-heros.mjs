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
];

const exists = async (p) => access(p).then(() => true, () => false);

for (const hero of HEROS) {
  console.log(`\n${hero.id}`);
  for (const [encuadre, cfg] of Object.entries(hero)) {
    if (encuadre === "id") continue;
    if (!(await exists(cfg.source))) {
      console.log(`  ⚠ ${encuadre}: falta ${cfg.source.split(/[\\/]/).pop()} — se salta (ver docs/FOTOS.md)`);
      continue;
    }
    for (const width of cfg.widths) {
      const output = src(`${cfg.out}-${width}.webp`);
      await mkdir(dirname(output), { recursive: true });
      const resized = sharp(cfg.source).rotate().resize({ width, withoutEnlargement: true });
      const { width: w, height: h } = await resized
        .clone()
        .toBuffer({ resolveWithObject: true })
        .then((r) => r.info);
      const quality = qualityFor(w * h);
      await resized.webp({ quality, effort: 6, smartSubsample: true }).toFile(output);
      const { size } = await stat(output);
      console.log(`  ✓ ${cfg.out.split("/").pop()}-${width}.webp  ${w}x${h}  q${quality}  ${Math.round(size / 1024)} KB`);
    }
    if (cfg.full) console.log(`  · ${cfg.out.split("/").pop()}.webp se usa tal cual como candidato de ${cfg.full}px`);
  }
}
