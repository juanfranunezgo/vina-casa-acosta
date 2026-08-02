// Genera los WebP del hero A1 de la home, en dos encuadres.
// Uso: npm run foto:hero-home
//
// Por qué dos archivos y no uno: el master horizontal 3:2 se ve nítido en
// desktop, pero en una pantalla vertical `object-cover` lo estira hasta ~1266px
// de ancho para cubrir el alto, y de esos solo se ven los 390 del centro. El
// navegador, en cambio, elige el candidato del srcset mirando el ancho del
// contenedor (390px), así que descarga un archivo 3x más chico del que termina
// pintando. De ahí el hero borroso en celular. Con un master 9:16 la relación
// de la imagen coincide con la del viewport, cover deja de estirar y la cuenta
// vuelve a dar 1:1.
//
// Los anchos de salida son los que pide cada breakpoint a DPR 1-3; el `sizes`
// del <picture> en app/[locale]/page.tsx está calculado para elegir entre estos.

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "public", "images", "home");

// La calidad baja a medida que crece la imagen: un archivo grande se ve a menos
// aumento por píxel, así que tolera más compresión. Medido sobre esta foto, la
// curva tiene un codo en q75 (a partir de q78 el peso sube el doble de rápido
// sin ganancia visible).
//
// El umbral va por megapíxeles y no por ancho porque los dos encuadres tienen
// proporciones distintas: el vertical de 1600px tiene 4,5 MP y el horizontal de
// 1920px solo 2,5. Por ancho, al vertical le tocaría más calidad que al
// horizontal siendo casi el doble de pesado.
const qualityFor = (pixels) => (pixels <= 1.5e6 ? 82 : pixels <= 3e6 ? 78 : 75);

// El master de desktop sale del original de 3840x2560 y no del hero.webp ya
// optimizado: así se comprime una sola vez en vez de dos.
const VARIANTS = [
  { source: join(ROOT, "public", "images", "home", "hero-v2.jpg"), widths: [1280, 1920, 2560], name: "hero" },
  { source: join(ROOT, "..", "_fuentes-fotos", "hero-movil.jpg"), widths: [828, 1200, 1600], name: "hero-movil" },
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const variant of VARIANTS) {
  for (const width of variant.widths) {
    const output = join(OUTPUT_DIR, `${variant.name}-${width}.webp`);
    const resized = sharp(variant.source).rotate().resize({ width, withoutEnlargement: true });
    const { width: outWidth, height: outHeight } = await resized.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
    const quality = qualityFor(outWidth * outHeight);
    await resized.webp({ quality, effort: 6, smartSubsample: true }).toFile(output);
    const { size } = await stat(output);
    console.log(`✓ ${variant.name}-${width}.webp  ${outWidth}x${outHeight}  q${quality}  ${Math.round(size / 1024)} KB`);
  }
}
