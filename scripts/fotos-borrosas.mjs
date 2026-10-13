// Genera las miniaturas borrosas que se ven mientras baja cada foto de portada
// (`components/FotoBorrosa.tsx`) y las deja en `data/fotosBorrosas.ts`.
// Uso: npm run fotos:borrosas
//
// No lleva una lista de fotos: las encuentra.
//   · Toda llamada `fotoBorrosa("/images/…")` escrita en `app/` o `components/`.
//   · La foto (`image`) de cada actividad de `data/activities.ts`, que es la
//     portada de su ficha.
// Así, sumar una portada es escribir la llamada en la página y correr esto.
//
// Lee los `.webp`/`.jpg` ya optimizados de `public/`, no los originales: no
// necesita `_fuentes-fotos/`.

import sharp from "sharp";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(ROOT, "data", "fotosBorrosas.ts");

// 24 px de ancho: alcanza para que se reconozcan las manchas de color de la
// foto y cada miniatura pesa unos 300 bytes. Viajan dentro del HTML de la
// página, así que cada byte acá es un byte de todas las visitas.
const ANCHO = 24;

async function fuentes(dir) {
  const salida = [];
  for (const entrada of await readdir(join(ROOT, dir), { withFileTypes: true })) {
    const ruta = `${dir}/${entrada.name}`;
    if (entrada.isDirectory()) salida.push(...(await fuentes(ruta)));
    else if (/\.tsx?$/.test(entrada.name)) salida.push(ruta);
  }
  return salida;
}

const rutas = new Set();
for (const archivo of [...(await fuentes("app")), ...(await fuentes("components"))]) {
  const texto = await readFile(join(ROOT, archivo), "utf8");
  for (const [, ruta] of texto.matchAll(/fotoBorrosa\("(\/[^"]+)"\)/g)) rutas.add(ruta);
}
const { activities } = await import("../data/activities.ts");
for (const { image } of activities) if (image.startsWith("/")) rutas.add(image);

const entradas = [];
for (const ruta of [...rutas].sort()) {
  const miniatura = await sharp(join(ROOT, "public", ruta))
    .resize({ width: ANCHO })
    // Un desenfoque leve antes de comprimir: quita el detalle que a 24 px es
    // sólo ruido, y el navegador estira manchas en vez de píxeles.
    .blur(1)
    .webp({ quality: 40, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  entradas.push([ruta, `data:image/webp;base64,${miniatura.data.toString("base64")}`]);
  console.log(`✓ ${ruta} — ${miniatura.info.width}x${miniatura.info.height}, ${miniatura.data.length} bytes`);
}

const cuerpo = entradas.map(([ruta, uri]) => `  ${JSON.stringify(ruta)}:\n    ${JSON.stringify(uri)},`);
await writeFile(
  SALIDA,
  [
    "// GENERADO por `npm run fotos:borrosas` (scripts/fotos-borrosas.mjs).",
    "// No editar a mano: se pisa en la próxima corrida.",
    "//",
    "// La miniatura borrosa de cada foto de portada, por su ruta en `public/`.",
    "// Se piden con `fotoBorrosa()` de `lib/fotoBorrosa.ts`.",
    "",
    "export const fotosBorrosas: Record<string, string> = {",
    ...cuerpo,
    "};",
    "",
  ].join("\n"),
);
console.log(`\n${entradas.length} miniaturas → data/fotosBorrosas.ts`);
