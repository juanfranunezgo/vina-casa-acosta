import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Que se puede afirmar sobre un sitio conectado MIRANDOLO DESDE AFUERA.
 *
 * El `<meta name="afeleia-catalogo">` ya decia el origen y la edad de la copia.
 * La segunda ronda de review pidio dos datos mas, y el motivo es concreto: con
 * origen y fecha se puede detectar "este sitio esta degradado", pero no "este
 * sitio esta sirviendo el catalogo de OTRO cliente" ni "este sitio se quedo sin
 * productos". Las dos son fallas silenciosas —el sitio se ve sano— y las dos
 * importan mas cuando hay cien sitios que cuando hay uno, porque nadie va a
 * mirar cien paneles de logs.
 *
 * Son datos publicos: el slug del sitio viaja en la URL de la API publica y la
 * cantidad de productos se cuenta entrando a la tienda.
 */

const componente = readFileSync(
  new URL("../components/CatalogOriginMeta.tsx", import.meta.url),
  "utf8",
);
const catalogo = readFileSync(new URL("../lib/afeleia/catalog.ts", import.meta.url), "utf8");

test("el meta declara origen, edad, sitio y cantidad de productos", () => {
  assert.match(componente, /name="afeleia-catalogo"/);
  assert.match(componente, /content=\{[^}]*origin/);
  assert.match(componente, /data-generado=/);
  assert.match(componente, /data-sitio=/);
  assert.match(componente, /data-productos=/);
});

test("los cuatro datos salen de una sola lectura del catalogo", () => {
  // Si el componente pidiera cada dato por separado podria describir dos
  // lecturas distintas: "origen api" con la cantidad del snapshot, por ejemplo.
  // Un meta que se contradice a si mismo es peor que no tenerlo.
  assert.match(componente, /getCatalogMeta\(\)/);
  assert.doesNotMatch(componente, /Promise\.all/);
});

test("la cantidad publicada es la del catalogo que se sirvio", () => {
  assert.match(catalogo, /export async function getCatalogMeta/);
  assert.match(catalogo, /products: catalog\.productos\.length/);
  assert.match(catalogo, /sitio: catalog\.sitio/);
});
