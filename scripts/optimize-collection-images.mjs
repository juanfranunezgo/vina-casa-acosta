// Genera masters 4:5 para las bandas C2 desde las fotos entregadas por el cliente.
// Las fuentes viven un nivel sobre el proyecto y nunca se sobrescriben.
// Uso: npm run fotos:colecciones

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";
const SOURCE_ROOT = join(ROOT, "..");
const OUTPUT = join(ROOT, "public", "images", "vinos");
const WIDTH = 1200;
const HEIGHT = 1500;

// Una entrada por foto del carrusel de cada colección (C2). El orden acá es el
// orden en que se ven; el índice del nombre lo refleja. Todas las fuentes tienen
// la botella al centro, así que el recorte a 4:5 va centrado.
const collections = [
  { source: "ombu.jpg", output: "coleccion-ombu.webp" },
  { source: "ombu-carmenere.jpg", output: "coleccion-ombu-2.webp" },
  { source: "ombu-tannat.jpg", output: "coleccion-ombu-3.webp" },

  { source: "lajau.jpg", output: "coleccion-lajau.webp" },
  { source: "lajau-sam.jpg", output: "coleccion-lajau-2.webp" },
  { source: "lajau-deti.jpg", output: "coleccion-lajau-3.webp" },

  { source: "coleccion-et.jpg", output: "coleccion-estacion-francia.webp" },
  { source: "estacion-francia-carmenere.jpg", output: "coleccion-estacion-francia-2.webp" },
  { source: "estacion-francia-carmenere2.jpg", output: "coleccion-estacion-francia-3.webp" },
  { source: "estacion-francia-carmenere3.jpg", output: "coleccion-estacion-francia-4.webp" },

  { source: "bera.jpg", output: "coleccion-bera.webp" },
  { source: "bera2.jpg", output: "coleccion-bera-2.webp" },

  // La foto nueva de Guidaí es de alta resolución y queda de portada; la vieja
  // (baja resolución, con relleno desenfocado a los lados) pasa a ser la segunda.
  // -v2 en el nombre = cache-bust: la portada de Guidaí cambió de foto y, con
  // el nombre viejo, navegador y optimizador de Next seguían sirviendo la anterior.
  { source: "coleccion-guidai.jpg", output: "coleccion-guidai-v2.webp" },
  { source: "Guidaí.jpg", output: "coleccion-guidai-2.webp", narrowSource: true },
];

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function optimizeCollection({ source, output, narrowSource = false }) {
  const input = join(SOURCE_ROOT, source);
  const destination = join(OUTPUT, output);

  const image = sharp(input).rotate().toColorspace("srgb");
  if (narrowSource) {
    // Guidaí llega en baja resolución y más angosto que 4:5. Una versión
    // desenfocada de la misma toma rellena los lados sin cortar la botella.
    const [background, foreground] = await Promise.all([
      image
        .clone()
        .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
        .blur(24)
        .modulate({ brightness: 0.72, saturation: 0.84 })
        .toBuffer(),
      image.clone().resize({ height: HEIGHT }).toBuffer(),
    ]);

    await sharp(background)
      .composite([{ input: foreground, gravity: "centre" }])
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toFile(destination);
  } else {
    await image
      .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toFile(destination);
  }

  const [inputInfo, outputInfo] = await Promise.all([stat(input), stat(destination)]);
  console.log(`✓ ${source.padEnd(20)} → images/vinos/${output.padEnd(32)} ${kb(inputInfo.size)} → ${kb(outputInfo.size)}`);
}

async function run() {
  await mkdir(OUTPUT, { recursive: true });
  for (const collection of collections) await optimizeCollection(collection);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
