import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { sitemapPaths, sitemapEntries, SITEMAP_URL_LIMIT } = await import("@/lib/sitemap");
const { routing } = await import("@/i18n/routing");

/**
 * Qué URLs anuncia el sitio, y cuáles se niega a anunciar.
 *
 * El bug de origen: `app/sitemap.ts` armaba las fichas de producto con la lista
 * de 13 vinos escrita en `data/wines.ts`. Un producto cargado desde el panel
 * tenía página —`generateStaticParams` sí lee el catálogo— pero no entraba al
 * listado que lee Google: existía y era invisible.
 *
 * Las funciones son puras y reciben los productos ya leídos. No es por elegancia:
 * `lib/afeleia/catalog.ts` importa React y el snapshot JSON, y `node --test` no
 * puede cargarlo. Lo que no se puede cargar solo se puede cubrir con un guard de
 * texto, y un guard de texto no prueba que un producto de otra categoría quede
 * afuera —solo que la línea que lo filtra está escrita.
 */

/** Un producto del catálogo, reducido a lo que el sitemap necesita mirar. */
function producto(slug, catalogCategory) {
  return catalogCategory === undefined ? { slug } : { slug, catalogCategory };
}

const rutas = (productos) => sitemapPaths(productos);
const urls = (productos) => sitemapEntries(sitemapPaths(productos)).map((e) => e.url);

// --- El bug de origen ---------------------------------------------------------

test("un producto del catalogo entra al sitemap en los tres idiomas", () => {
  const todas = urls([producto("chardonnay-de-guarda")]);
  for (const locale of routing.locales) {
    assert.ok(
      todas.some((url) => url.endsWith(`/${locale}/vinos/chardonnay-de-guarda`)),
      `falta /${locale}/vinos/chardonnay-de-guarda`,
    );
  }
});

test("el sitemap no depende de la lista de vinos del repo", () => {
  // Si las fichas salieran de `data/wines.ts`, este catalogo de un solo producto
  // igual traeria las 13 URLs escritas a mano.
  const fichas = rutas([producto("bera")]).filter((path) => path.startsWith("/vinos/"));
  assert.deepEqual(fichas, ["/vinos/bera"]);
});

// --- Lo que NO se anuncia -----------------------------------------------------

test("un producto declarado en otra categoria NO entra al sitemap", () => {
  // Misma regla que `/vinos`: los productos que no son vino todavia no tienen
  // direccion propia. Anunciar /vinos/huevos-de-avestruz mientras esa decision
  // no esta tomada la convierte en permanente: cuando Google la indexe, moverla
  // cuesta una redireccion para siempre.
  const fichas = rutas([
    producto("bera", "vinos"),
    producto("huevos-de-avestruz", "delicatessen"),
  ]).filter((path) => path.startsWith("/vinos/"));
  assert.deepEqual(fichas, ["/vinos/bera"]);
});

test("un producto SIN categoria si entra: lo que excluye es una declaracion, no un olvido", () => {
  const fichas = rutas([producto("recien-creado")]).filter((p) => p.startsWith("/vinos/"));
  assert.deepEqual(fichas, ["/vinos/recien-creado"]);
});

// --- Seguridad: el slug lo escribe el cliente en el panel ---------------------
// `isValidProduct` solo exige que `slug` sea un string no vacio. Todo lo demas
// que llegue en ese campo termina, sin este guard, dentro de una URL que el
// sitio le pide a Google que rastree.

const VENENOS = [
  "../../admin",
  "..",
  "/etc/passwd",
  "//evil.example.com",
  "https://evil.example.com/x",
  "bera?utm_source=x",
  "bera#ancla",
  "bera con espacio",
  "bera%2f..",
  "bera\\otro",
  "bera\nSitemap: https://evil.example.com/sitemap.xml",
];

test("un slug que se sale de su segmento NO entra, y el descarte se grita", () => {
  const errores = [];
  const original = console.error;
  console.error = (...args) => errores.push(args.join(" "));
  try {
    for (const veneno of VENENOS) {
      const fichas = rutas([producto(veneno)]).filter((p) => p.startsWith("/vinos/"));
      assert.deepEqual(fichas, [], `el slug ${JSON.stringify(veneno)} no deberia entrar`);
    }
  } finally {
    console.error = original;
  }
  // Un producto que desaparece del sitemap sin dejar rastro es el mismo bug que
  // esta rama vino a cerrar, con otro disfraz: existe y Google no lo ve.
  assert.equal(errores.length, VENENOS.length);
  assert.ok(errores.every((linea) => linea.includes("[sitemap]")));
});

test("un slug legitimo con acentos entra, y viaja escapado", () => {
  // H-54: un chequeo que reprueba lo correcto es peor que no tenerlo. Una eñe no
  // es un ataque —no cambia de segmento— y dejar afuera un producto real lo
  // vuelve invisible para Google sin que nadie se entere. Viaja escapado porque
  // el canonical de la ficha tambien sale escapado (Next lo resuelve con `URL`),
  // y sitemap y canonical tienen que decir exactamente lo mismo.
  const todas = urls([producto("vina-nunez")]);
  assert.ok(todas.some((url) => url.endsWith("/es/vinos/vina-nunez")));

  const conEnie = urls([producto("viña")]);
  assert.ok(
    conEnie.some((url) => url.endsWith("/es/vinos/vi%C3%B1a")),
    `esperaba la eñe escapada, hay: ${conEnie.filter((u) => u.includes("vi"))}`,
  );
});

test("un producto duplicado no duplica la URL", () => {
  const todas = urls([producto("bera"), producto("bera")]);
  assert.equal(new Set(todas).size, todas.length);
});

// --- Modo degradado -----------------------------------------------------------

test("sin catalogo el sitemap conserva las rutas del sitio", () => {
  // Afeleia caido y snapshot corrupto: el catalogo llega vacio. El sitio sigue
  // teniendo portada, tienda, historia y actividades, y el sitemap tiene que
  // seguir anunciandolas. Un sitemap que se vacia porque una API de otro
  // proveedor no contesta le pide a Google que deje de ver el sitio entero.
  const paths = rutas([]);
  for (const esperada of ["", "/vinos", "/tienda", "/contacto"]) {
    assert.ok(paths.includes(esperada), `falta la ruta estatica ${esperada || "/"}`);
  }
  assert.ok(
    paths.some((path) => path.startsWith("/actividades/")),
    "faltan las actividades",
  );
});

// --- Escalabilidad ------------------------------------------------------------

test("un sitemap mas grande que el limite se corta, y corta por ruta entera", () => {
  // 50.000 URLs es el tope del estandar: pasarlo no degrada nada, invalida el
  // archivo entero y Google lo descarta completo. Cortar pierde el excedente;
  // no cortar pierde todo. Y se corta por ruta, no por URL: una pagina anunciada
  // en dos idiomas de tres declara hreflang hacia una URL que el sitemap nunca
  // menciona, que es peor que no anunciarla.
  const muchos = Array.from({ length: SITEMAP_URL_LIMIT + 10 }, (_, i) => `/vinos/p-${i}`);
  const errores = [];
  const original = console.error;
  console.error = (...args) => errores.push(args.join(" "));
  let entradas;
  try {
    entradas = sitemapEntries(muchos);
  } finally {
    console.error = original;
  }

  assert.ok(entradas.length <= SITEMAP_URL_LIMIT, `${entradas.length} entradas`);
  assert.ok(entradas.length > 0);
  assert.equal(errores.length, 1, "cortar en silencio es perder paginas sin que nadie se entere");

  const porRuta = new Map();
  for (const entrada of entradas) {
    const ruta = new URL(entrada.url).pathname.replace(/^\/[a-z]{2}/, "");
    porRuta.set(ruta, (porRuta.get(ruta) ?? 0) + 1);
  }
  for (const [ruta, veces] of porRuta) {
    assert.equal(veces, routing.locales.length, `${ruta} quedo anunciada a medias`);
  }
});

test("cada entrada declara los tres hreflang mas x-default", () => {
  for (const entry of sitemapEntries(sitemapPaths([producto("bera")]))) {
    const langs = Object.keys(entry.alternates.languages);
    for (const locale of routing.locales) {
      assert.ok(langs.includes(locale), `${entry.url} sin ${locale}`);
    }
    assert.ok(langs.includes("x-default"), `${entry.url} sin x-default`);
  }
});

// --- Guard de texto: como esta cableado `app/sitemap.ts` ----------------------
// Lo de arriba prueba las reglas; esto prueba que la pagina real las use. Son
// dos afirmaciones distintas y las dos hacen falta: las reglas puras pasarian
// igual con un `app/sitemap.ts` que siguiera leyendo `data/wines`.

const fuente = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");

test("app/sitemap.ts arma las fichas con el catalogo publicado", () => {
  assert.match(fuente, /getCatalog\(\)/);
  // Las reglas de arriba se prueban puras; esto asegura que la pagina real pase
  // por ellas y no arme su propia lista al costado.
  assert.match(fuente, /sitemapEntries\(\s*sitemapPaths\(/);
  assert.doesNotMatch(
    fuente,
    /wines\.map/,
    "las fichas volvieron a salir de la lista del repo",
  );
});

test("app/sitemap.ts se revalida como las paginas que anuncia", () => {
  // Sin esto el sitemap se congela en el build: un producto cargado en el panel
  // tendria ficha viva (revalidate 60) y una URL ausente del sitemap hasta el
  // proximo deploy, que es el bug con otro disfraz.
  assert.match(fuente, /export const revalidate = 60/);
});
