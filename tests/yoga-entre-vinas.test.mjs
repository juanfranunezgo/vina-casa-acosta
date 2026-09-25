import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { activities } = await import("@/data/activities");
const { buildActivityJsonLd } = await import("@/lib/activityJsonLd");

/**
 * Yoga entre Viñas — el contenido final que la viña mandó en septiembre de 2026
 * ("Contenido web de la experiencia Yoga entre Viñas", versión septiembre 2026).
 *
 * Lo que se cuida acá son los datos que el documento fija y que, si se
 * desalinean, le dicen al visitante algo falso: el precio con y sin IVA, la
 * duración y el reparto de esa duración entre las cuatro etapas.
 */

const LOCALES = ["es", "en", "pt"];
const bundles = Object.fromEntries(
  await Promise.all(
    LOCALES.map(async (locale) => [
      locale,
      JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
    ]),
  ),
);

const yoga = activities.find((activity) => activity.slug === "yoga");

/** Minutos de una duración ISO 8601 del tipo PT3H15M. */
function minutos(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  assert.ok(match, `duración ISO ilegible: ${iso}`);
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

test("el yoga publica $47.481 IVA incluido y su neto de $39.900", () => {
  assert.equal(yoga.priceCLP, 47481);
  assert.equal(yoga.priceNetCLP, 39900);
});

test("todo precio neto declarado es el precio publicado sin el 19% de IVA", () => {
  // Si alguien actualiza uno de los dos y se olvida del otro, la tarjeta de
  // precio mostraría dos cifras que no se corresponden.
  for (const activity of activities) {
    if (activity.priceNetCLP === undefined) continue;
    assert.ok(activity.priceCLP, `${activity.slug}: neto sin precio publicado`);
    assert.equal(
      Math.round(activity.priceNetCLP * 1.19),
      activity.priceCLP,
      `${activity.slug}: ${activity.priceNetCLP} + IVA no da ${activity.priceCLP}`,
    );
  }
});

test("el yoga dura 3 horas 15 minutos, y así lo dice en los tres idiomas", () => {
  assert.equal(yoga.durationISO, "PT3H15M");
  assert.equal(bundles.es.activities.items.yoga.duration, "3 horas 15 minutos");
  for (const locale of LOCALES) {
    assert.match(bundles[locale].activities.items.yoga.duration, /3\D+15/, locale);
  }
});

test("las etapas de un programa con horario suman la duración declarada", () => {
  for (const activity of activities) {
    if (!activity.schedule) continue;
    assert.ok(activity.durationISO, `${activity.slug}: horario sin duración`);
    const total = activity.schedule.reduce((sum, stage) => sum + stage.minutes, 0);
    assert.equal(total, minutos(activity.durationISO), activity.slug);
  }
});

test("el yoga tiene cuatro etapas: 15, 60, 60 y 60 minutos", () => {
  assert.deepEqual(
    yoga.schedule.map((stage) => stage.minutes),
    [15, 60, 60, 60],
  );
});

test("cada etapa del horario tiene su título y su texto en los tres idiomas", () => {
  for (const activity of activities) {
    if (!activity.schedule) continue;
    for (const locale of LOCALES) {
      const copy = bundles[locale].activities.items[activity.slug].schedule;
      assert.ok(Array.isArray(copy), `${locale}.${activity.slug}.schedule`);
      assert.equal(copy.length, activity.schedule.length, `${locale}.${activity.slug}`);
      for (const stage of copy) {
        assert.equal(typeof stage.title, "string", `${locale}.${activity.slug}`);
        assert.ok(stage.title.length > 0, `${locale}.${activity.slug}`);
        assert.equal(typeof stage.text, "string", `${locale}.${activity.slug}`);
        assert.ok(stage.text.length > 0, `${locale}.${activity.slug}`);
      }
    }
  }
});

test("el programa viejo ya no se publica: ni productores locales ni venta de vinos", () => {
  // El documento pide reemplazar esas dos etapas por el brunch completo y la
  // degustación guiada. Si `program` sobrevive, la ficha dibuja los dos.
  for (const locale of LOCALES) {
    const item = bundles[locale].activities.items.yoga;
    assert.equal(item.program, undefined, locale);
  }
  const texto = JSON.stringify(bundles.es.activities.items.yoga).toLowerCase();
  assert.doesNotMatch(texto, /productores locales/);
  assert.doesNotMatch(texto, /3 horas \+ cierre/);
});

test("la carta del brunch tiene sus dos sándwiches a elección en los tres idiomas", () => {
  for (const locale of LOCALES) {
    // La carta cuelga de la etapa del brunch, la tercera, y no de la ficha:
    // es el detalle de ESE momento de la mañana.
    const stages = bundles[locale].activities.items.yoga.schedule;
    assert.deepEqual(
      stages.map((stage) => stage.menu !== undefined),
      [false, false, true, false],
      `${locale}: la carta va en el brunch`,
    );
    const { menu } = stages[2];
    const [eleccion, ...resto] = menu.groups;
    assert.equal(eleccion.items.length, 2, `${locale}: dos alternativas de sándwich`);
    assert.equal(typeof eleccion.or, "string", `${locale}: la "o" entre las dos`);
    const items = menu.groups.flatMap((group) => group.items);
    assert.equal(items.length, 7, `${locale}: los ítems del brunch`);
    assert.ok(resto.every((group) => group.or === undefined), locale);
  }
});

test("el yoga trae las nueve preguntas frecuentes en los tres idiomas", () => {
  for (const locale of LOCALES) {
    const faq = bundles[locale].activities.items.yoga.faq;
    assert.ok(Array.isArray(faq), locale);
    assert.equal(faq.length, 9, locale);
    for (const { q, a } of faq) {
      assert.ok(q.trim().endsWith("?"), `${locale}: "${q}"`);
      assert.ok(a.length > 0, `${locale}: "${q}"`);
    }
  }
});

test("la ficha del yoga se llama como el documento y tiene su propia meta descripción", () => {
  const es = bundles.es.activities.items.yoga;
  assert.equal(es.name, "Yoga entre Viñas");
  // Sin antetítulo desde el 2026-09-24: la categoría del documento salía
  // encima del título y Juan Francisco la sacó.
  assert.equal(es.eyebrow, undefined);
  for (const locale of LOCALES) {
    const item = bundles[locale].activities.items.yoga;
    assert.ok(item.metaDescription.length <= 160, `${locale}: ${item.metaDescription.length}`);
    assert.ok(item.metaDescription.length >= 110, `${locale}: ${item.metaDescription.length}`);
  }
});

test("los campos extra del formulario del yoga tienen su texto", () => {
  assert.deepEqual([...yoga.bookingFields].sort(), ["eleccion", "restricciones", "segundaFecha"]);
  for (const locale of LOCALES) {
    const form = bundles[locale].activities.items.yoga.form;
    for (const key of ["choiceLabel", "choicePlaceholder", "choiceHint", "title", "subtitle", "waIntro"]) {
      assert.equal(typeof form?.[key], "string", `${locale}.yoga.form.${key}`);
      assert.ok(form[key].length > 0, `${locale}.yoga.form.${key}`);
    }
  }
});

test("una actividad que pide elección en el formulario trae el texto del campo", () => {
  for (const activity of activities) {
    if (!activity.bookingFields?.includes("eleccion")) continue;
    for (const locale of LOCALES) {
      const form = bundles[locale].activities.items[activity.slug].form;
      assert.equal(typeof form?.choiceLabel, "string", `${locale}.${activity.slug}`);
    }
  }
});

test("el JSON-LD del yoga declara el precio con IVA incluido", () => {
  const graph = buildActivityJsonLd(
    "es",
    yoga,
    { name: "Yoga entre Viñas", description: "Bajada", image: yoga.image },
    { home: "Inicio", activities: "Actividades", category: "Experiencias" },
  );
  const product = graph["@graph"].find((node) => node["@type"] === "Product");
  assert.ok(product, "con precio la actividad es un Product con Offer");
  assert.equal(product.offers.price, 47481);
  assert.equal(product.offers.priceSpecification.valueAddedTaxIncluded, true);
  assert.equal(product.offers.priceSpecification.price, 47481);
});

test("un precio sin neto declarado no afirma nada sobre el IVA", () => {
  const ombu = activities.find((activity) => activity.slug === "ombu");
  const graph = buildActivityJsonLd(
    "es",
    ombu,
    { name: "Ombú", description: "Bajada", image: ombu.image },
    { home: "Inicio", activities: "Actividades", category: "Tours" },
  );
  const product = graph["@graph"].find((node) => node["@type"] === "Product");
  assert.equal(product.offers.priceSpecification, undefined);
});
