import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasLocalMatch } from "next/dist/shared/lib/match-local-pattern.js";

/**
 * `images.localPatterns` decide que rutas del propio sitio puede servir el
 * optimizador. Sin la clave, Next acepta TODAS — incluida cualquier ruta que un
 * dato del panel logre meter en un <Image src>.
 *
 * El riesgo del recorte es el inverso: una lista incompleta rompe fotos del sitio
 * y NO falla el build, porque el optimizador valida por request. Por eso la lista
 * no se lee a ojo: este test escanea public/ y exige que toda carpeta con
 * imagenes este cubierta. Agregar public/nueva/ pone esto en rojo.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONES = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);

const config = await (await import("../next.config.ts")).default;
const patrones = config.images.localPatterns;

async function tieneImagenes(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    if (entrada.isDirectory()) {
      if (await tieneImagenes(path.join(dir, entrada.name))) return true;
      continue;
    }
    if (EXTENSIONES.has(path.extname(entrada.name).toLowerCase())) return true;
  }
  return false;
}

test("localPatterns esta configurado: sin la clave Next acepta cualquier ruta", () => {
  assert.ok(Array.isArray(patrones) && patrones.length > 0);
});

test("toda carpeta de public/ con imagenes esta cubierta por localPatterns", async () => {
  const entradas = await readdir(path.join(ROOT, "public"), { withFileTypes: true });
  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    if (!(await tieneImagenes(path.join(ROOT, "public", entrada.name)))) continue;
    const ejemplo = `/${entrada.name}/x.webp`;
    assert.ok(
      hasLocalMatch(patrones, ejemplo),
      `public/${entrada.name}/ tiene imagenes y localPatterns no la cubre: ` +
        `sus fotos responderian 400 en produccion. ` +
        `Agregar { pathname: "/${entrada.name}/**", search: "" }.`,
    );
  }
});

test("no cubre rutas que no son de assets", () => {
  assert.equal(hasLocalMatch(patrones, "/api/interno"), false);
  assert.equal(hasLocalMatch(patrones, "/_next/static/chunk.js"), false);
  assert.equal(hasLocalMatch(patrones, "/es/vinos"), false);
});

test("la carpeta del snapshot esta cubierta", async () => {
  const { SNAPSHOT_IMAGE_PREFIX } = await import("../lib/afeleia/contract.ts");
  assert.ok(hasLocalMatch(patrones, `${SNAPSHOT_IMAGE_PREFIX}bera.png`));
});
