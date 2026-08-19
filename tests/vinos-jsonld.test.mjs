import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

const { buildWineDetailJsonLd } = await import("@/lib/wineJsonLd");

/**
 * La regla que este test cuida: la ficha de un vino marca lo que la ficha dice.
 *
 * Es el mismo criterio que `actividades-jsonld.test.mjs`, aplicado al otro lado
 * del catalogo. Con una diferencia que importa y que aca queda fijada: en la
 * ficha del vino el precio SE VE, asi que el Offer si lo lleva; y `agotado` es
 * un estado real y visible —el boton lo dice y queda deshabilitado—, asi que
 * `availability` no es una suposicion optimista.
 */

const VINO = {
  slug: "ombu-carmenere",
  name: "Ombu Carmenere",
  image: "/vinos/ombu-carmenere.png",
  priceCLP: 9900,
  vintage: 2021,
  agotado: false,
};

const COPY = {
  description: "Intenso color rojo cereza.",
  category: "Tinto - Carmenere",
  vintageProperty: "Cosecha",
  siteDescription: "Vina boutique familiar.",
};

function nodo(graph, tipo) {
  return graph["@graph"].find((n) =>
    Array.isArray(n["@type"]) ? n["@type"].includes(tipo) : n["@type"] === tipo,
  );
}

test("el Offer declara el precio que la pagina muestra", () => {
  const producto = nodo(buildWineDetailJsonLd(VINO, "es", COPY), "Product");
  assert.equal(producto.offers.price, 9900);
  assert.equal(producto.offers.priceCurrency, "CLP");
});

test("la disponibilidad sigue al estado real del catalogo", () => {
  const enStock = nodo(buildWineDetailJsonLd(VINO, "es", COPY), "Product");
  assert.equal(enStock.offers.availability, "https://schema.org/InStock");

  const sinStock = nodo(
    buildWineDetailJsonLd({ ...VINO, agotado: true }, "es", COPY),
    "Product",
  );
  assert.equal(sinStock.offers.availability, "https://schema.org/OutOfStock");
});

test("un no-vintage no declara cosecha en vez de declararla vacia", () => {
  const conAnada = nodo(buildWineDetailJsonLd(VINO, "es", COPY), "Product");
  assert.deepEqual(conAnada.additionalProperty, {
    "@type": "PropertyValue",
    name: "Cosecha",
    value: "2021",
  });

  const sinAnada = nodo(
    buildWineDetailJsonLd({ ...VINO, vintage: undefined }, "es", COPY),
    "Product",
  );
  assert.ok(!("additionalProperty" in sinAnada));
});

test("un vino sin foto no declara una imagen vacia", () => {
  const producto = nodo(
    buildWineDetailJsonLd({ ...VINO, image: undefined }, "es", COPY),
    "Product",
  );
  assert.ok(!("image" in producto));
});

test("la ficha resuelve sola la entidad de la vina, y el Offer la referencia", () => {
  const graph = buildWineDetailJsonLd(VINO, "es", COPY);
  const vina = nodo(graph, "Winery");
  assert.ok(vina, "la ficha tiene que traer el nodo de la vina");
  const producto = nodo(graph, "Product");
  assert.equal(producto.offers.seller["@id"], vina["@id"]);
});

test("las URLs del bloque llevan el prefijo de idioma de la ficha", () => {
  for (const locale of ["es", "en", "pt"]) {
    const producto = nodo(buildWineDetailJsonLd(VINO, locale, COPY), "Product");
    assert.ok(
      producto.url.endsWith(`/${locale}/vinos/ombu-carmenere`),
      `la URL de ${locale} apunta a ${producto.url}`,
    );
    assert.equal(producto.offers.url, producto.url);
  }
});
