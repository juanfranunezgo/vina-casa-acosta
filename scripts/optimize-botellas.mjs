// Convierte las fotos HD de botella que entrega el cliente en los masters
// cuadrados de `public/vinos/`. Las fuentes viven en
// `vina-casa-acosta/web/_fuentes-fotos/` (fuera del repo) y nunca se
// sobrescriben. Las que falten se saltan.
// Uso: npm run fotos:botellas
//
// Por qué existe: las fuentes llegan como lienzos altísimos (2560x8400) con la
// botella flotando en transparencia, y el sitio las sirve en un cuadrado. Meter
// esa relación 1:3 en la grilla la rompe, y el archivo pesa 12 MB.
//
// El nombre de salida no se inventa: el catálogo de Afeleia apunta a
// `/vinos/<slug>.png` y esa ruta llega por la red desde el panel del cliente.
// Cambiar la extensión o el nombre acá deja la ficha sin foto en producción.

import sharp from "sharp";
import { stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";
const SOURCE_ROOT = join(ROOT, "..", "_fuentes-fotos");
const OUTPUT = join(ROOT, "public", "vinos");

// Lienzo cuadrado del master. Las botellas viejas son de 500; estas salen al
// doble porque la fuente lo permite y `next/image` sirve el tamaño que cada
// pantalla pide — el master grande sólo mejora lo que ve un retina.
const SIZE = 1000;

// Cuánto del alto ocupa la botella dentro del cuadrado. Medido sobre las
// botellas ya publicadas: entre 92% y 97%, con las dos líneas de estas fotos
// en 94%. Si este número cambia, las nuevas se ven de otro tamaño que sus
// vecinas en la misma grilla.
const BOTTLE_HEIGHT_RATIO = 0.94;

const bottles = [
  { source: "lajau-betum-yu-2023.png", output: "lajau-betum-yu.png" },
  { source: "estacion-francia-tannat-2020.png", output: "estacion-francia-tannat.png" },
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

for (const { source, output } of bottles) {
  const from = join(SOURCE_ROOT, source);
  if (!(await exists(from))) {
    console.log(`· ${source} no está en _fuentes-fotos/, se salta`);
    continue;
  }

  const origen = await stat(from);

  // `trim` recorta la transparencia que rodea a la botella: sin esto, el
  // centrado y la escala salen del lienzo del diseñador y no de la botella.
  const recortada = await sharp(from).trim({ threshold: 0 }).toBuffer();

  const alto = Math.round(SIZE * BOTTLE_HEIGHT_RATIO);
  const escalada = await sharp(recortada)
    .resize({ height: alto, fit: "inside", withoutEnlargement: true })
    .toBuffer();

  const { width, height } = await sharp(escalada).metadata();
  const horizontal = Math.round((SIZE - width) / 2);
  const vertical = Math.round((SIZE - height) / 2);

  const to = join(OUTPUT, output);
  await sharp(escalada)
    .extend({
      top: vertical,
      bottom: SIZE - height - vertical,
      left: horizontal,
      right: SIZE - width - horizontal,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(to);

  const destino = await stat(to);
  console.log(
    `✓ ${output} — ${SIZE}x${SIZE}, botella ${width}x${height} · ${kb(origen.size)} → ${kb(destino.size)}`,
  );
}
