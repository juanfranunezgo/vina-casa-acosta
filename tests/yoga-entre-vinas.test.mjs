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
 * desalinean, le dicen al visitante algo falso: el precio y su IVA, la
 * duración y el reparto de esa duración entre las cuatro etapas. Encima van
 * los ajustes que la viña pidió el 2026-09-25 al ver la ficha publicada.
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

test("el yoga publica $39.900 + IVA por persona", () => {
  // Pedido de la viña (2026-09-25): el precio dice "$39.900 + IVA (por
  // persona)" en el hero y en la tarjeta. Antes publicaba $47.481 IVA incluido
  // con el neto en chico para empresas y agencias.
  assert.equal(yoga.priceCLP, 39900);
  assert.equal(yoga.priceExcludesVAT, true);
});

test("la ficha ya no publica un precio aparte para empresas y agencias", () => {
  // La viña pidió sacarlo: el precio es uno solo, el mismo para todos.
  assert.ok(activities.every((activity) => !("priceNetCLP" in activity)));
  for (const locale of LOCALES) {
    const labels = bundles[locale].activities.labels;
    assert.equal(labels.netPrice, undefined, locale);
    assert.equal(labels.vatIncluded, undefined, locale);
    assert.match(labels.plusVat, /^\+ /, `${locale}: "+ IVA" junto a la cifra`);
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

test("el yoga trae sus diez preguntas frecuentes en los tres idiomas", () => {
  // Nueve del documento de la viña y una de ubicación, agregada por SEO local
  // el 2026-09-24 (ver el test de abajo).
  for (const locale of LOCALES) {
    const faq = bundles[locale].activities.items.yoga.faq;
    assert.ok(Array.isArray(faq), locale);
    assert.equal(faq.length, 10, locale);
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

test("la ficha del yoga nombra las ciudades que se buscan", () => {
  // Pedido de Juan Francisco: posicionar búsquedas como "yoga cerca de San
  // Fernando". El autocompletado de Google en Chile confirma "yoga rancagua",
  // "yoga san fernando" y "yoga en san vicente de tagua tagua". Lo que Google
  // lee para eso es el título y el texto visible; la etiqueta `keywords` la
  // ignora, y va igual porque se pidió.
  //
  // La respuesta de "¿Dónde queda?" es la que más se cita (Google y los
  // buscadores con IA toman ese bloque tal cual), así que las ciudades van
  // ahí. La viña mandó su propia respuesta el 2026-09-25 sin nombrarlas, y
  // Juan Francisco pidió sumarlas igual: una frase al final del primer
  // párrafo, con los 40 minutos a Rancagua que el sitio ya publica.
  const es = bundles.es.activities.items.yoga;
  assert.match(es.metaTitle, /Rancagua/);
  assert.match(es.metaTitle, /San Fernando/);
  assert.match(es.metaDescription, /San Vicente de Tagua Tagua/);
  for (const locale of LOCALES) {
    const faq = bundles[locale].activities.items.yoga.faq;
    // Se la busca por la dirección, que se escribe igual en los tres idiomas.
    const ubicacion = faq.find(({ a }) => /Fundo El Llano/.test(a));
    assert.ok(ubicacion, `${locale}: falta la pregunta de ubicación`);
    for (const lugar of ["San Vicente de Tagua Tagua", "San Fernando", "Rancagua"]) {
      assert.match(ubicacion.a, new RegExp(lugar), `${locale}: ${lugar}`);
    }
  }
  for (const locale of LOCALES) {
    const item = bundles[locale].activities.items.yoga;
    assert.equal(typeof item.metaKeywords, "string", locale);
    assert.ok(item.metaKeywords.split(",").length >= 10, locale);
    assert.ok(item.metaTitle.length <= 50, `${locale}: título de ${item.metaTitle.length}`);
  }
  assert.match(es.metaKeywords, /yoga cerca de San Fernando/);
});

test("las respuestas del yoga son las que mandó la viña el 2026-09-25", () => {
  // Seis respuestas reescritas por la viña. Se verifica el dato que cada una
  // agrega o corrige, no la frase entera: el texto se puede pulir, el dato no.
  const respuesta = (pregunta) => {
    const entrada = bundles.es.activities.items.yoga.faq.find(({ q }) => pregunta.test(q));
    assert.ok(entrada, `falta la pregunta ${pregunta}`);
    return entrada.a;
  };
  const reservar = respuesta(/reservar cualquier día/);
  assert.match(reservar, /sábados, domingos y festivos/);
  assert.match(reservar, /5 días de anticipación/);
  const ubicacion = respuesta(/Dónde queda/);
  assert.match(ubicacion, /1 hora y 40 minutos de Santiago/);
  assert.match(ubicacion, /Fundo El Llano, lote 6/);
  assert.match(ubicacion, /Waze o Google Maps/);
  const degustacion = respuesta(/incluye la degustación/);
  for (const linea of ["Ombú", "Lajau", "Estación Francia"]) {
    assert.match(degustacion, new RegExp(linea), linea);
  }
  assert.match(degustacion, /pueden variar según disponibilidad/);
  assert.match(respuesta(/Cuántas personas/), /sin límite máximo/);
  assert.match(respuesta(/adaptar el brunch/), /formulario de reserva/);
  // `\s`: entre el 100 y el % va un espacio duro, para que no se corten.
  assert.match(respuesta(/menores de edad/), /jugos 100\s% naturales/);
});

test("las alergias se informan en el formulario, y la ficha lo dice igual en todas partes", () => {
  // La respuesta nueva de la viña pide indicarlas al completar el formulario.
  // Las condiciones y la nota de la carta decían "al confirmar la reserva" y
  // "con anticipación": tres momentos distintos para lo mismo en una página.
  const lugares = {
    es: /formulario de reserva/,
    en: /booking form/,
    pt: /formulário de reserva/,
  };
  for (const locale of LOCALES) {
    const item = bundles[locale].activities.items.yoga;
    const textos = [
      ...item.conditions,
      item.schedule[2].menu.note,
      ...item.faq.map(({ a }) => a),
    ].filter((texto) => /alerg|allerg/i.test(texto));
    assert.equal(textos.length, 3, `${locale}: condición, nota de la carta y pregunta`);
    for (const texto of textos) {
      assert.match(texto, lugares[locale], `${locale}: "${texto}"`);
    }
  }
});

test("una respuesta de dos párrafos tiene dos párrafos en los tres idiomas", () => {
  // La ubicación y la degustación traen un segundo párrafo en el texto de la
  // viña. Van separados por una línea en blanco y la ficha los dibuja como
  // dos <p>; una traducción que los junte rompería el paralelo.
  const parrafos = (locale) =>
    bundles[locale].activities.items.yoga.faq.map(({ a }) => a.split("\n\n").length);
  assert.ok(parrafos("es").some((n) => n > 1), "el español trae algún segundo párrafo");
  assert.deepEqual(parrafos("en"), parrafos("es"), "en");
  assert.deepEqual(parrafos("pt"), parrafos("es"), "pt");
});

test("el formulario del yoga ya no pide una segunda fecha", () => {
  // Pedido de la viña (2026-09-25). Era el único que la pedía, así que el
  // campo se fue del formulario, de los textos y de la declaración de Netlify.
  assert.equal(yoga.bookingFields.includes("segundaFecha"), false);
  for (const locale of LOCALES) {
    const form = bundles[locale].activities.labels.form;
    for (const key of ["secondDate", "secondDateHint", "datePreferred"]) {
      assert.equal(form[key], undefined, `${locale}.form.${key}`);
    }
  }
});

test("los campos extra del formulario del yoga tienen su texto", () => {
  assert.deepEqual([...yoga.bookingFields].sort(), ["eleccion", "restricciones"]);
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

test("el JSON-LD del yoga declara el precio sin IVA", () => {
  const graph = buildActivityJsonLd(
    "es",
    yoga,
    { name: "Yoga entre Viñas", description: "Bajada", image: yoga.image },
    { home: "Inicio", activities: "Actividades", category: "Experiencias" },
  );
  const product = graph["@graph"].find((node) => node["@type"] === "Product");
  assert.ok(product, "con precio la actividad es un Product con Offer");
  assert.equal(product.offers.price, 39900);
  assert.equal(product.offers.priceSpecification.valueAddedTaxIncluded, false);
  assert.equal(product.offers.priceSpecification.price, 39900);
});

test("un precio que no declara su IVA no afirma nada sobre el IVA", () => {
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
