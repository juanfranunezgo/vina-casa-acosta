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

test("correcciones de Damián del 2026-10-12: el rosé es Rosé y la bajada del Tour Berá", async () => {
  // Pedido de la viña (Damián, por Juan Francisco), revisando el sitio.
  const leerBundle = async (locale) =>
    JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));

  // 1. El Tour Carmenere recibía con "Berá Rosa Carménère": el vino se llama
  //    Berá Rosé, y así está escrito en el resto del sitio. El error estaba en
  //    los tres idiomas, así que se busca en el bundle entero.
  for (const locale of ["es", "en", "pt"]) {
    const bundle = await leerBundle(locale);
    assert.doesNotMatch(JSON.stringify(bundle), /Ber[áa] Rosa\b/, `${locale}: queda un "Berá Rosa"`);
    assert.match(
      bundle.activities.items.carmenere.includes[0],
      /Berá Rosé Carménère/,
      `${locale}: la copa de bienvenida del Tour Carmenere`,
    );
  }

  // 2. La bajada del Tour Berá. Decía "Degustación premium y vino directo desde
  //    la barrica". Va sin punto final, como las demás bajadas.
  const es = await leerBundle("es");
  assert.equal(
    es.activities.items.bera.tagline,
    "Una experiencia más profunda, con vino directo desde la barrica",
  );
  for (const locale of ["en", "pt"]) {
    const { tagline } = (await leerBundle(locale)).activities.items.bera;
    assert.doesNotMatch(tagline, /premium/i, `${locale}: la bajada sigue diciendo "premium"`);
  }
});

test("lo que incluye cada taller, como lo mandó Damián el 2026-10-12", async () => {
  // Hasta ese día los tres talleres compartían la misma lista genérica de cinco
  // o seis puntos (los ñoquis decían "cocción en horno tradicional", copiado de
  // las pizzas). Damián mandó la de cada uno. El español va tal cual lo
  // escribió; inglés y portugués son traducción nuestra, sin validar.
  const items = async (locale) => (await load(locale)).activities.items;
  const es = await items("es");

  assert.deepEqual(es.pizzas.includes, [
    "Copa de bienvenida Berá Rosé Carménère.",
    "Ingredientes frescos y todos los utensilios necesarios.",
    "Preparación guiada de la masa, desde el amasado hasta el armado de tu propia pizza.",
    "Cocción en horno tradicional.",
    "Degustación de tres vinos de Casa Acosta, servidos durante el taller y al cierre.",
    "Jugos naturales para menores de edad y personas que no consuman alcohol.",
    "Receta impresa para repetir la experiencia en casa.",
    "Porción de masa lista para llevar.",
  ]);
  assert.deepEqual(es.pastas.includes, [
    "Copa de bienvenida Berá Rosé Carménère.",
    "Ingredientes frescos y todos los utensilios necesarios.",
    "Preparación guiada de la masa, desde el amasado y estirado hasta el corte.",
    "Elaboración de fetuccini y pasta rellena.",
    "Cocción de las pastas elaboradas durante el taller.",
    "Degustación de cuatro salsas diferentes para acompañar las preparaciones.",
    "Degustación de tres vinos de Casa Acosta, servidos durante el taller y al cierre.",
    "Jugos naturales para menores de edad y personas que no consuman alcohol.",
    "Receta impresa para repetir la experiencia en casa.",
  ]);
  assert.deepEqual(es.noquis.includes, [
    "Copa de bienvenida Berá Rosé Carménère.",
    "Ingredientes frescos y todos los utensilios necesarios.",
    "Preparación guiada de la masa de ñoquis, desde el amasado hasta lograr el punto correcto.",
    "Corte y formado manual de los ñoquis mediante técnicas tradicionales.",
    "Cocción de los ñoquis elaborados durante el taller.",
    "Degustación de cuatro salsas diferentes para acompañar las preparaciones.",
    "Degustación de tres vinos de Casa Acosta, servidos durante el taller y al cierre.",
    "Jugos naturales para menores de edad y personas que no consuman alcohol.",
    "Cena compartida con los ñoquis preparados por el grupo.",
    "Receta impresa de los ñoquis y sus salsas para repetir la experiencia en casa.",
  ]);

  // Los otros dos idiomas traen los mismos puntos, uno por uno.
  for (const locale of ["en", "pt"]) {
    const otro = await items(locale);
    for (const taller of ["pizzas", "pastas", "noquis"]) {
      assert.equal(otro[taller].includes.length, es[taller].includes.length, `${locale}.${taller}`);
      // El horno es de las pizzas: en los ñoquis y las pastas era un error de copia.
      if (taller !== "pizzas") {
        assert.doesNotMatch(otro[taller].includes.join(" "), /oven|forno/i, `${locale}.${taller}`);
      }
    }
  }
});
