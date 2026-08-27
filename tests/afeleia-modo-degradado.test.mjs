import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isValidCatalog,
  optionsFor,
  renderableImage,
  sanitizeDefinitions,
  technicalRowsFrom,
} from "../lib/afeleia/contract.ts";

/**
 * El camino degradado —Afeleia caido, el sitio sirviendo su copia committeada—
 * es el que nadie ejerce hasta el dia que hace falta, y se descubre roto justo
 * ahi. Esto lo ejerce en cada `npm test`.
 *
 * Lo que se puede correr de verdad es lo de aca: que la copia committeada pase
 * el MISMO guard que el runtime aplica a la respuesta viva, y que las funciones
 * que la leen se banquen una copia vieja sin definiciones. Lo que NO se puede
 * correr en `node --test` es `lib/afeleia/catalog.ts`, que importa React y el
 * JSON: para esa parte hay un guard de texto al final, y la prueba de verdad es
 * el paso 5 del §8 (romper la URL de la API en el preview).
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://syvwfadxohizvytanjnx.supabase.co/functions/v1";

const snapshot = JSON.parse(
  await readFile(path.join(ROOT, "data", "catalogo-fallback.json"), "utf8"),
);
const catalogSource = await readFile(path.join(ROOT, "lib", "afeleia", "catalog.ts"), "utf8");

// Listas locales de respaldo, en el mismo orden en que las declara data/wines.ts.
const LINEAS_LOCALES = ["Ombú", "Lajau", "Estación Francia", "Berá", "Guidaí", "Yaráy Guá"];

test("la copia committeada pasa el mismo guard que la respuesta viva", () => {
  // Si esto falla, la ultima linea de defensa del sitio esta muerta y nadie se
  // entera hasta la proxima caida de Afeleia.
  assert.equal(isValidCatalog(snapshot), true);
  assert.ok(snapshot.productos.length > 0, "un snapshot sin productos es una tienda vacia");
});

test("toda imagen del snapshot es dibujable por el guard del sitio", () => {
  // En modo degradado una foto rechazada por `next/image` no rompe la foto:
  // rompe la pagina entera (SSG/ISR). Y una URL remota apuntaria justo al host
  // que se acaba de caer.
  for (const producto of snapshot.productos) {
    if (producto.imagenes.length === 0) continue;
    assert.ok(
      renderableImage(producto.imagenes, API),
      `${producto.slug}: ninguna de sus imagenes pasa renderableImage`,
    );
  }
});

test("con la copia actual los filtros salen de las definiciones publicadas", () => {
  const defs = sanitizeDefinitions(snapshot.definiciones_atributos);
  assert.ok(defs.length > 0, "el snapshot vigente ya viaja con definiciones");
  assert.deepEqual(optionsFor(defs, "linea", ["fallback"]), LINEAS_LOCALES);
});

test("con una copia VIEJA, sin definiciones, la tienda sigue teniendo filtros", () => {
  // El escenario real de la regla 3 del contrato: el snapshot de una web que no
  // despliega desde antes de la Etapa B no trae la clave nueva.
  const vieja = { ...snapshot };
  delete vieja.definiciones_atributos;

  assert.equal(isValidCatalog(vieja), true, "la clave nueva es opcional en la lectura");
  const defs = sanitizeDefinitions(vieja.definiciones_atributos);
  assert.deepEqual(defs, []);
  assert.deepEqual(optionsFor(defs, "linea", LINEAS_LOCALES), LINEAS_LOCALES);
});

test("con una copia VIEJA la ficha tecnica no se dibuja, y no explota", () => {
  const producto = snapshot.productos.find((p) => p.atributos?.ficha_tecnica);
  assert.ok(producto, "el snapshot deberia traer al menos un producto con ficha");
  assert.deepEqual(technicalRowsFrom([], producto.atributos), []);
});

test("las tres puertas al modo degradado siguen cableadas", () => {
  // Guard de texto, no de ejecucion: `catalog.ts` importa React y el JSON del
  // snapshot, asi que `node --test` no lo puede cargar. Afirma el cableado, no
  // el comportamiento; el comportamiento se verifica en el preview.
  assert.match(catalogSource, /if \(!response\.ok\) \{\s*return degraded\(/, "respuesta no-ok");
  assert.match(catalogSource, /if \(!isValidCatalog\(payload\)\) \{\s*return degraded\(/, "contrato roto");
  assert.match(catalogSource, /catch \(error\) \{[\s\S]{0,200}?return degraded\(/, "fetch caido");
  // Y ninguna de las tres puede tirar: si `degraded` lanzara, la pagina caeria.
  assert.match(catalogSource, /function degraded\(reason: string\): CatalogLoad \{/);
});
