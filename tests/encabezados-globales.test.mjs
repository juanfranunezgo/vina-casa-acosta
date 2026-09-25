import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Los componentes que se renderizan en TODAS las páginas no llevan encabezados.
 *
 * El pie, el carrito y la capa de +18 están en el HTML de cada página —el
 * carrito y la capa, aunque estén cerrados—. Hasta el 2026-09-24 sumaban cinco
 * <h2> a cada una ("Visítanos", "Actividades", "La viña", "Tu selección",
 * "¿Eres mayor de 18 años?"): la estructura de encabezados que leen Google y
 * los lectores de pantalla terminaba, en todas las páginas, con cinco
 * secciones que no son de esa página. Juan Francisco lo vio en un auditor de
 * SEO. Ahora son rótulos (<p>) con el mismo estilo, y los diálogos se siguen
 * nombrando por aria-label / aria-labelledby.
 */

const GLOBALES = ["components/Footer.tsx", "components/CartDrawer.tsx", "components/AgeGate.tsx"];

test("pie, carrito y capa de +18 no agregan encabezados a cada página", async () => {
  for (const archivo of GLOBALES) {
    const fuente = await readFile(new URL(`../${archivo}`, import.meta.url), "utf8");
    assert.doesNotMatch(fuente, /<h[1-6][\s>]/, `${archivo} tiene un encabezado`);
  }
});

test("los dos diálogos conservan su nombre accesible", async () => {
  const carrito = await readFile(new URL("../components/CartDrawer.tsx", import.meta.url), "utf8");
  assert.match(carrito, /role="dialog"[\s\S]{0,120}aria-label=\{t\("title"\)\}/);
  const capa = await readFile(new URL("../components/AgeGate.tsx", import.meta.url), "utf8");
  assert.match(capa, /aria-labelledby="age-gate-title"/);
  assert.match(capa, /id="age-gate-title"/);
});
