import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

const { buildTiendaJsonLd } = await import("@/lib/siteJsonLd");
const { SITE_URL } = await import("@/lib/siteUrl");

/**
 * La tienda como colección (2026-09-25). Hasta acá era la única página
 * principal sin structured data de página: `/vinos` ya declaraba su
 * `CollectionPage` y su `ItemList`, y la tienda —la que vende— nada.
 */

const COPY = {
  name: "Comprar vinos online con despacho",
  description: "Compra los vinos de Viña Casa Acosta.",
};

function nodo(grafo, tipo) {
  return grafo["@graph"].find((n) =>
    Array.isArray(n["@type"]) ? n["@type"].includes(tipo) : n["@type"] === tipo,
  );
}

test("la tienda es un CollectionPage con su URL, su idioma y la viña detrás", () => {
  const pagina = nodo(buildTiendaJsonLd("es", COPY), "CollectionPage");
  assert.ok(pagina, "falta el CollectionPage");
  assert.equal(pagina["@id"], `${SITE_URL}/es/tienda#page`);
  assert.equal(pagina.url, `${SITE_URL}/es/tienda`);
  assert.equal(pagina.name, COPY.name);
  assert.equal(pagina.description, COPY.description);
  assert.equal(pagina.inLanguage, "es");
  assert.deepEqual(pagina.isPartOf, { "@id": `${SITE_URL}/#website` });
  assert.deepEqual(pagina.about, { "@id": `${SITE_URL}/#winery` });
});

test("la tienda trae el nodo completo de la viña, como las demás páginas", () => {
  // Un crawler que llega directo a la tienda tiene que poder resolver quién
  // vende sin pasar antes por la portada.
  const grafo = buildTiendaJsonLd("en", COPY);
  const vina = grafo["@graph"].find((n) => n["@id"] === `${SITE_URL}/#winery`);
  assert.ok(vina, "falta la viña");
  assert.equal(nodo(grafo, "CollectionPage").url, `${SITE_URL}/en/tienda`);
});
