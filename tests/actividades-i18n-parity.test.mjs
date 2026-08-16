import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activities } from "../data/activities.ts";

/**
 * next-intl NO falla cuando falta una clave. Verificado en
 * node_modules/use-intl/.../initializeConfig-*.js: el onError por defecto solo
 * hace console.error y getMessageFallback devuelve la ruta de la clave como
 * texto. O sea que una pagina sin traducir se publica mostrando
 * "activities.items.pizzas.name" en pantalla, y donde el codigo espera un array
 * (t.raw) recibe ese mismo string y revienta con .map is not a function.
 *
 * Este test es lo que convierte ese error silencioso en un rojo.
 */

const LOCALES = ["es", "en", "pt"];

async function load(locale) {
  const url = new URL(`../messages/${locale}.json`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}

/** Rutas de todas las hojas, para comparar estructura y no solo el primer nivel. */
function leafPaths(value, prefix = "") {
  if (Array.isArray(value)) return [prefix];
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const bundles = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, await load(l)])),
);

test("el namespace activities tiene las mismas claves en los tres idiomas", () => {
  // Sin esto la comparacion pasa en vacio: leafPaths(undefined) da lo mismo
  // para los tres idiomas y el test seria verdadero sin que exista el namespace.
  for (const locale of LOCALES) {
    assert.equal(typeof bundles[locale].activities, "object", locale);
    assert.notEqual(bundles[locale].activities, null, locale);
  }

  const reference = leafPaths(bundles.es.activities).sort();
  for (const locale of LOCALES.slice(1)) {
    const actual = leafPaths(bundles[locale].activities).sort();
    const missing = reference.filter((k) => !actual.includes(k));
    const extra = actual.filter((k) => !reference.includes(k));
    assert.deepEqual(missing, [], `faltan en ${locale}`);
    assert.deepEqual(extra, [], `sobran en ${locale}`);
  }
});

test("cada actividad del catalogo tiene su bloque de copy en los tres idiomas", () => {
  for (const locale of LOCALES) {
    for (const activity of activities) {
      const item = bundles[locale].activities.items[activity.slug];
      assert.ok(item, `${locale}: falta activities.items.${activity.slug}`);
      for (const field of ["name", "tagline", "intro", "duration", "groupFrom"]) {
        assert.equal(
          typeof item[field],
          "string",
          `${locale}.${activity.slug}.${field}`,
        );
        assert.ok(item[field].length > 0, `${locale}.${activity.slug}.${field}`);
      }
    }
  }
});

test("los campos de lista son arrays de strings no vacios", () => {
  for (const locale of LOCALES) {
    const items = bundles[locale].activities.items;
    for (const [slug, item] of Object.entries(items)) {
      for (const field of ["includes", "wines", "program", "highlights"]) {
        if (item[field] === undefined) continue;
        assert.ok(Array.isArray(item[field]), `${locale}.${slug}.${field}`);
        assert.ok(item[field].length > 0, `${locale}.${slug}.${field}`);
        for (const entry of item[field]) {
          assert.equal(typeof entry, "string", `${locale}.${slug}.${field}`);
        }
      }
    }
  }
});

test("cada categoria del catalogo tiene su nombre en los tres idiomas", () => {
  for (const locale of LOCALES) {
    for (const category of ["tours", "talleres", "experiencias"]) {
      const entry = bundles[locale].activities.categories[category];
      assert.ok(entry, `${locale}: falta la categoria ${category}`);
      assert.ok(entry.name.length > 0, `${locale}.${category}.name`);
    }
  }
});

test("los namespaces viejos ya no existen en ningun idioma", () => {
  for (const locale of LOCALES) {
    assert.equal(bundles[locale].tours, undefined, locale);
    assert.equal(bundles[locale].tourDetail, undefined, locale);
  }
});
