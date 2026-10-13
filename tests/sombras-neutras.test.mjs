import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * "Yo creo que podríamos cambiar el color rosa de fondo" (Juan Francisco,
 * 2026-10-12, mirando la tienda).
 *
 * El fondo del sitio es blanco puro. El rosado lo ponían las sombras: todas las
 * tarjetas flotaban sobre una sombra teñida de vino (`rgba(74,14,14,…)`), y una
 * sombra de color sobre blanco deja un halo de ese color alrededor de cada
 * tarjeta. Pasaron a un gris sin tinte de la misma luminosidad
 * (`rgba(27,28,28,…)`, el `on-surface` de la paleta), en todo el sitio.
 *
 * La regla que queda: **una sombra vino sólo va bajo un elemento vino** —un
 * botón, un `IconBadge`, la pastilla prendida de un filtro—, donde se lee como
 * el reflejo del propio elemento y no como un fondo rosado.
 */

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const leer = async (ruta) =>
  (await readFile(path.join(RAIZ, ruta), "utf8")).replace(/\r\n/g, "\n");

/** Los dos vinos de la paleta que se usaron en sombras: #4a0e0e y #2a0002. */
const SOMBRA_VINO = /rgba\(\s*(?:74,\s*14,\s*14|42,\s*0,\s*2)\s*,/;
/** Un relleno vino: el elemento que proyecta la sombra es de ese color. */
const RELLENO_VINO = /\bbg-primary(?![\w/-])|\bbg-primary-container\b|\bfrom-wine-accent\b/;

async function fuentes(dir) {
  const salida = [];
  for (const entrada of await readdir(path.join(RAIZ, dir), { withFileTypes: true })) {
    const ruta = `${dir}/${entrada.name}`;
    if (entrada.isDirectory()) salida.push(...(await fuentes(ruta)));
    else if (/\.tsx?$/.test(entrada.name)) salida.push(ruta);
  }
  return salida;
}

test("una sombra vino sólo va bajo un elemento vino", async () => {
  const fuera = [];
  for (const ruta of [...(await fuentes("app")), ...(await fuentes("components"))]) {
    const lineas = (await leer(ruta)).split("\n");
    lineas.forEach((linea, i) => {
      if (!SOMBRA_VINO.test(linea)) return;
      // El relleno puede estar en el mismo renglón o en la rama siguiente del
      // mismo `className` (el botón "Tienda" del navbar lo decide tres abajo).
      const vecindad = lineas.slice(i, i + 4).join("\n");
      if (!RELLENO_VINO.test(vecindad)) fuera.push(`${ruta}:${i + 1}`);
    });
  }
  assert.deepEqual(fuera, [], "sombras vino sobre una superficie clara");
});

test("las sombras de la hoja de estilos siguen la misma regla", async () => {
  const estilos = await leer("app/globals.css");
  for (const [, selector, cuerpo] of estilos.matchAll(/([.#][\w-]+)\s*\{([^}]*)\}/g)) {
    if (!SOMBRA_VINO.test(cuerpo)) continue;
    assert.match(
      cuerpo,
      /background:\s*var\(--color-primary\)/,
      `${selector} lleva una sombra vino sin ser un elemento vino`,
    );
  }
  // Las dos utilidades de sombra que usa medio sitio.
  for (const clase of ["ambient-shadow", "ambient-shadow-lg"]) {
    const cuerpo = estilos.match(new RegExp(`\\.${clase}\\s*\\{([^}]*)\\}`))?.[1];
    assert.ok(cuerpo, `falta .${clase}`);
    assert.match(cuerpo, /rgba\(27, 28, 28, /, clase);
  }
});

test("las tarjetas de la tienda flotan sobre una sombra gris", async () => {
  // Lo que Juan Francisco estaba mirando: el panel de filtros y las tarjetas.
  const vitrina = await leer("components/TiendaCatalogo.tsx");
  for (const nombre of ["SOMBRA_FLOTANTE", "SOMBRA_TARJETA"]) {
    const valor = vitrina.match(new RegExp(`const ${nombre} =\\s*"([^"]+)"`))?.[1];
    assert.ok(valor, `falta ${nombre}`);
    assert.match(valor, /rgba\(27,28,28,/, nombre);
    assert.doesNotMatch(valor, SOMBRA_VINO, nombre);
  }
});
