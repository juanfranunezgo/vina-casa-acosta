import test from "node:test";
import assert from "node:assert/strict";
import {
  activities,
  ACTIVITY_CATEGORIES,
  activityMenu,
  VENDIMIA_HUB,
} from "../data/activities.ts";

/**
 * El menu es la unica via por la que se llega a once de las catorce fichas.
 * Si deja de cubrir el catalogo, esas paginas vuelven a quedar huerfanas y no
 * hay sintoma visible: el menu sigue abriendo y mostrando lo que le quedo.
 */

test("el menu tiene una columna por categoria, en el orden del catalogo", () => {
  assert.deepEqual(
    activityMenu().map((c) => c.category),
    [...ACTIVITY_CATEGORIES],
  );
});

test("toda actividad del catalogo aparece exactamente una vez en el menu", () => {
  const enMenu = activityMenu().flatMap((c) => c.items.map((a) => a.slug));
  assert.equal(enMenu.length, activities.length);
  assert.deepEqual(
    [...enMenu].sort(),
    activities.map((a) => a.slug).sort(),
  );
});

test("cada columna trae sus actividades en el orden del catalogo", () => {
  for (const columna of activityMenu()) {
    const esperado = activities
      .filter((a) => a.category === columna.category)
      .map((a) => a.slug);
    assert.deepEqual(
      columna.items.map((a) => a.slug),
      esperado,
    );
  }
});

test("ninguna columna queda vacia", () => {
  for (const columna of activityMenu()) {
    assert.ok(columna.items.length > 0, columna.category);
  }
});

test("el hub de vendimia esta declarado, aunque todavia no exista", () => {
  // null a proposito: la pagina no existe y enlazar a un 404 desde el navbar
  // seria peor que no ofrecerla. Cuando exista, esta constante es el unico
  // lugar que cambia.
  assert.ok(VENDIMIA_HUB === null || typeof VENDIMIA_HUB === "string");
});
