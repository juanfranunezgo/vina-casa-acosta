// Galería de /contacto. Fuentes en `vina-casa-acosta/web/_fuentes-fotos/`
// (fuera del repo, ver su LEEME.md). Uso: npm run fotos:contacto

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = join(ROOT, "..", "_fuentes-fotos");
const OUTPUT = join(ROOT, "public", "images", "contacto");

const images = [
  ["plato-cena.jpg", "plato-cena.webp"],
  ["cena1.jpg", "cena.webp"],
  ["asado.JPG", "asado.webp"],
  ["letrero.JPG", "letrero.webp"],
];

await mkdir(OUTPUT, { recursive: true });

for (const [source, output] of images) {
  await sharp(join(SOURCE_ROOT, source))
    .rotate()
    .toColorspace("srgb")
    .resize(1200, 1500, { fit: "cover", position: "centre" })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(join(OUTPUT, output));

  console.log(`Optimized ${source} → public/images/contacto/${output}`);
}
