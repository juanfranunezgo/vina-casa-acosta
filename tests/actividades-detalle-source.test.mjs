import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Cena Sensorial es la unica actividad del catalogo sin inclusiones ni
 * programa: el cliente describe "cinco tiempos" y no los enumera. Inventarlos
 * seria marcado falso, del mismo tipo que inventar un precio.
 *
 * Lo que queda por resolver es la pagina: un encabezado "Que incluye?" seguido
 * de nada promete una lista que no existe. Se afirma sobre la fuente y no
 * renderizando porque lo que importa es la decision de estructura.
 */

const fuente = await readFile(
  new URL(
    "../app/[locale]/actividades/[categoria]/[slug]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("el encabezado de la lista solo se dibuja cuando hay lista", () => {
  assert.match(
    fuente,
    /hasDetail\s*=\s*includes\.length\s*>\s*0\s*\|\|\s*program\.length\s*>\s*0/,
  );
  assert.match(fuente, /\{hasDetail\s*&&\s*\(/);
});

test("el aviso de tickets sigue siendo solo de los tours", () => {
  assert.match(fuente, /isTour\s*&&\s*\(/);
});
