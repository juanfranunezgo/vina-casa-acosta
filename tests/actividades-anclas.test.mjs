import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ACTIVITY_CATEGORIES,
  CATEGORIES_WITH_INDEX_ANCHOR,
  categoryIndexHref,
} from "../data/activities.ts";

/**
 * La miga de una ficha enlaza a la seccion de su categoria en el indice. Un
 * ancla que no existe no falla: el navegador deja al visitante arriba de la
 * pagina y el BreadcrumbList declara una URL que no lleva a lo que dice.
 *
 * Este test empareja las dos puntas: la lista de categorias con ancla y los
 * id= que el indice realmente renderiza. Cuando el plan 3 estrene las
 * secciones que faltan, se pone rojo hasta que la lista las reconozca.
 */

const indice = await readFile(
  new URL("../app/[locale]/actividades/page.tsx", import.meta.url),
  "utf8",
);

const idsDelIndice = new Set(
  [...indice.matchAll(/<section\s+id="([a-z-]+)"/g)].map((m) => m[1]),
);

test("toda categoria declarada con ancla tiene su seccion en el indice", () => {
  for (const categoria of CATEGORIES_WITH_INDEX_ANCHOR) {
    assert.ok(
      idsDelIndice.has(categoria),
      `${categoria} dice tener ancla y el indice no la renderiza`,
    );
  }
});

test("la seccion #experiencias existe y aun asi no se usa como ancla", () => {
  // No es un olvido. La seccion se llama Experiencias y muestra tres
  // tarjetas-puerta (Vendimia, Talleres, Tren EFE): ninguna de las ocho
  // experiencias del catalogo esta ahi. Enlazar la miga a esa ancla declararia
  // una jerarquia que la pagina no sostiene.
  //
  // Este test se pone rojo el dia que el indice liste de verdad la categoria y
  // alguien agregue "experiencias" a la lista: leer este comentario y borrarlo
  // es parte de ese cambio.
  assert.ok(idsDelIndice.has("experiencias"));
  assert.ok(!CATEGORIES_WITH_INDEX_ANCHOR.includes("experiencias"));
});

test("una categoria sin seccion enlaza al indice sin fragmento", () => {
  const sinAncla = ACTIVITY_CATEGORIES.find(
    (c) => !CATEGORIES_WITH_INDEX_ANCHOR.includes(c),
  );
  if (sinAncla === undefined) return; // todas tienen seccion: nada que probar
  assert.equal(categoryIndexHref("es", sinAncla), "/es/actividades");
});

test("una categoria con seccion enlaza a su ancla", () => {
  const [conAncla] = CATEGORIES_WITH_INDEX_ANCHOR;
  assert.equal(categoryIndexHref("pt", conAncla), `/pt/actividades#${conAncla}`);
});

test("la miga no se identifica por href: dos niveles pueden compartir destino", async () => {
  // Consecuencia directa de lo anterior. Sin seccion de categoria, el segundo
  // nivel ("Actividades") y el tercero (la categoria) apuntan los dos a
  // /actividades. Con key={item.href} React encuentra dos hijos con la misma
  // clave y avisa que puede duplicarlos u omitirlos.
  const miga = await readFile(
    new URL("../components/ActivityBreadcrumbs.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(miga, /key=\{item\.href\}/);
});

/**
 * Tercera superficie con la misma regla. La miga visible y el BreadcrumbList ya
 * pasan por categoryIndexHref; el redirect de la URL padre vive en
 * next.config.ts y podria quedar diciendo otra cosa sin que nada avise:
 * tests/actividades-redirects.test.mjs verifica el destino con un ^ que no mira
 * el fragmento.
 */
const config = await (await import("../next.config.ts")).default;
const redirects = await config.redirects();

test("el redirect de una URL padre lleva fragmento solo si la categoria tiene ancla", () => {
  for (const categoria of ACTIVITY_CATEGORIES) {
    const regla = redirects.find(
      (r) => r.source === `/:locale(es|en|pt)/actividades/${categoria}`,
    );
    assert.ok(regla, `falta el redirect padre de ${categoria}`);
    assert.equal(
      regla.destination.includes("#"),
      CATEGORIES_WITH_INDEX_ANCHOR.includes(categoria),
      `${categoria}: el redirect y la miga no dicen lo mismo`,
    );
  }
});
