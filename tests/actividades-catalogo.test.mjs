import test from "node:test";
import assert from "node:assert/strict";
import {
  activities,
  ACTIVITY_CATEGORIES,
  RESERVED_ACTIVITY_SEGMENTS,
  getActivity,
  activitiesByCategory,
} from "../data/activities.ts";

/**
 * El catalogo alimenta rutas, sitemap, menu y JSON-LD. Un slug repetido o que
 * choque con un segmento reservado no rompe el build: genera dos rutas que se
 * pisan, y el sintoma aparece en produccion como una pagina que muestra la
 * actividad equivocada. Por eso se afirma aca y no en un comentario.
 */

test("todo slug es unico en el catalogo completo", () => {
  const slugs = activities.map((a) => a.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("ningun slug choca con un segmento reservado de la ruta", () => {
  for (const activity of activities) {
    assert.ok(
      !RESERVED_ACTIVITY_SEGMENTS.includes(activity.slug),
      `el slug ${activity.slug} choca con un segmento reservado`,
    );
  }
});

test("ninguna categoria choca con un segmento reservado", () => {
  for (const category of ACTIVITY_CATEGORIES) {
    assert.ok(!RESERVED_ACTIVITY_SEGMENTS.includes(category));
  }
});

test("cada actividad declara una categoria conocida", () => {
  for (const activity of activities) {
    assert.ok(ACTIVITY_CATEGORIES.includes(activity.category), activity.slug);
  }
});

test("cada actividad declara un minimo de personas positivo", () => {
  for (const activity of activities) {
    assert.ok(Number.isInteger(activity.minPeople), activity.slug);
    assert.ok(activity.minPeople > 0, activity.slug);
  }
});

test("los meses son enteros 1-12, sin repetidos y en orden", () => {
  for (const activity of activities) {
    const { months, slug } = activity;
    assert.ok(months.length > 0, `${slug} no declara meses`);
    assert.ok(months.length <= 12, slug);
    assert.equal(new Set(months).size, months.length, `${slug} repite un mes`);
    for (const month of months) {
      assert.ok(Number.isInteger(month) && month >= 1 && month <= 12, slug);
    }
    assert.deepEqual(months, [...months].sort((a, b) => a - b), `${slug} desordenado`);
  }
});

test("el precio, si existe, es un entero positivo de pesos", () => {
  for (const activity of activities) {
    if (activity.priceCLP === undefined) continue;
    assert.ok(Number.isInteger(activity.priceCLP), activity.slug);
    assert.ok(activity.priceCLP > 0, activity.slug);
  }
});

test("la duracion ISO, si existe, tiene formato de duracion", () => {
  for (const activity of activities) {
    if (activity.durationISO === undefined) continue;
    assert.match(activity.durationISO, /^PT(\d+H)?(\d+M)?$/, activity.slug);
  }
});

test("getActivity encuentra por categoria y slug, y no cruza categorias", () => {
  const first = activities[0];
  assert.equal(getActivity(first.category, first.slug), first);
  assert.equal(getActivity("talleres", "no-existe"), undefined);

  const otherCategory = ACTIVITY_CATEGORIES.find((c) => c !== first.category);
  assert.equal(getActivity(otherCategory, first.slug), undefined);
});

test("activitiesByCategory devuelve solo esa categoria", () => {
  for (const category of ACTIVITY_CATEGORIES) {
    for (const activity of activitiesByCategory(category)) {
      assert.equal(activity.category, category);
    }
  }
});

test("los tours van de menor a mayor precio", () => {
  // El orden fijo lo consume la grilla del indice y el submenu del navbar.
  const prices = activitiesByCategory("tours").map((t) => t.priceCLP);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});
