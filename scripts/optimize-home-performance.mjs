import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const assets = [
  { source: "images/home/hero-v2.jpg", output: "images/home/hero.webp", width: 2560, quality: 72 },
  { source: "images/home/casa/teaching.jpg", output: "images/home/casa/teaching.webp", width: 960, quality: 70 },
  { source: "images/home/casa/tractor.jpg", output: "images/home/casa/tractor.webp", width: 960, quality: 70 },
  { source: "images/home/casa/family.jpg", output: "images/home/casa/family.webp", width: 960, quality: 70 },
  { source: "brand/logo-blanco-v2.png", output: "brand/logo-blanco-v2.webp", width: 256, quality: 95 },
  { source: "brand/logo-negro.png", output: "brand/logo-negro.webp", width: 256, quality: 95 },
];

for (const asset of assets) {
  const source = join(root, "public", asset.source);
  const output = join(root, "public", asset.output);
  await mkdir(dirname(output), { recursive: true });
  await sharp(source)
    .rotate()
    .resize({ width: asset.width, withoutEnlargement: true })
    .webp({ quality: asset.quality })
    .toFile(output);
  console.log(`Optimized ${asset.output}`);
}
