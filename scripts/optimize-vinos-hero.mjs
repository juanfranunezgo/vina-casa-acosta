// Genera el master WebP del hero C1 de vinos desde la fotografía entregada.
// Uso: npm run foto:hero-vinos

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";
const SOURCE = join(ROOT, "..", "corchos.jpg");
const OUTPUT_DIR = join(ROOT, "public", "images", "vinos");
const OUTPUT = join(OUTPUT_DIR, "hero-corchos.webp");

await mkdir(OUTPUT_DIR, { recursive: true });
await sharp(SOURCE)
  .rotate()
  .resize(2560, 1707, { fit: "cover", position: "centre" })
  .webp({ quality: 84, effort: 5, smartSubsample: true })
  .toFile(OUTPUT);

const [sourceInfo, outputInfo] = await Promise.all([stat(SOURCE), stat(OUTPUT)]);
console.log(`✓ corchos.jpg → images/vinos/hero-corchos.webp ${Math.round(sourceInfo.size / 1024)} KB → ${Math.round(outputInfo.size / 1024)} KB`);
