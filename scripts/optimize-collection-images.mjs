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

const collections = [
  { source: "ombu.jpg", output: "coleccion-ombu.webp" },
  { source: "lajau.jpg", output: "coleccion-lajau.webp" },
  { source: "coleccion-et.jpg", output: "coleccion-estacion-francia.webp" },
  { source: "bera.jpg", output: "coleccion-bera.webp" },
  { source: "Guidaí.jpg", output: "coleccion-guidai.webp", narrowSource: true },
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
