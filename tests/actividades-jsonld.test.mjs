import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

const { buildActivityJsonLd } = await import("@/lib/activityJsonLd");

/**
 * La regla que este test cuida: no se declara lo que la pagina no dice.
 *
 * Un Offer sin price no produce rich result y afirma una oferta que la pagina
 * no hace. Un availability "InStock" afirma disponibilidad que nadie confirmo:
 * las actividades se reservan y tienen minimo de personas.
 *
 * Y el BreadcrumbList tiene que decir los MISMOS textos que la miga visible, o
 * es una jerarquia inventada para el crawler.
 */

const CON_PRECIO = {
  slug: "ombu",
  category: "tours",
  priceCLP: 30000,
  minPeople: 2,
  months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  durationISO: "PT2H",
  image: "/images/actividades/tour-carmenere.webp",
};

const SIN_PRECIO = {
  ...CON_PRECIO,
  slug: "pizzas",
  category: "talleres",
  priceCLP: undefined,
};

const COPY = { name: "Tour Ombu", description: "Bajada", image: "/x.webp" };
const CRUMBS = { home: "Inicio", activities: "Actividades", category: "Tours" };

function nodes(graph, type) {
  return graph["@graph"].filter((n) =>
    Array.isArray(n["@type"]) ? n["@type"].includes(type) : n["@type"] === type,
  );
}

test("con precio se emite un Offer con moneda", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [product] = nodes(graph, "Product");
  assert.equal(product.offers.price, 30000);
  assert.equal(product.offers.priceCurrency, "CLP");
});

test("sin precio NO se emite offers", () => {
  const graph = buildActivityJsonLd("es", SIN_PRECIO, COPY, {
    ...CRUMBS,
    category: "Talleres",
  });
  const [product] = nodes(graph, "Product");
  assert.equal(product.offers, undefined);
});

test("nunca se declara availability", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  assert.doesNotMatch(JSON.stringify(graph), /availability/);
});

test("el BreadcrumbList tiene los cuatro niveles, en orden y con los textos dados", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [crumbs] = nodes(graph, "BreadcrumbList");
  assert.equal(crumbs.itemListElement.length, 4);
  assert.deepEqual(
    crumbs.itemListElement.map((i) => i.position),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    crumbs.itemListElement.map((i) => i.name),
    ["Inicio", "Actividades", "Tours", "Tour Ombu"],
  );
  assert.match(crumbs.itemListElement[3].item, /\/es\/actividades\/tours\/ombu$/);
});

test("la miga respeta el idioma de la URL", () => {
  const graph = buildActivityJsonLd("pt", CON_PRECIO, COPY, CRUMBS);
  const [crumbs] = nodes(graph, "BreadcrumbList");
  for (const entrada of crumbs.itemListElement) {
    assert.match(entrada.item, /\/pt(\/|$)/, entrada.item);
  }
});

test("las imagenes se emiten absolutas", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [product] = nodes(graph, "Product");
  assert.match(product.image, /^https?:\/\//);
});

test("la URL del producto es la ruta anidada, no la plana", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [product] = nodes(graph, "Product");
  assert.match(product.url, /\/actividades\/tours\/ombu$/);
  assert.doesNotMatch(product.url, /\/actividades\/ombu$/);
});
