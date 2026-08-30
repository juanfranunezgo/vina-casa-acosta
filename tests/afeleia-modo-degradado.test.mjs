import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  emptyCatalog,
  isValidCatalog,
  optionsFor,
  renderableImage,
  sanitizeDefinitions,
  technicalRowsFrom,
} from "../lib/afeleia/contract.ts";

/**
 * El camino degradado —Afeleia caido, el sitio sirviendo su copia committeada—
 * es el que nadie ejerce hasta el dia que hace falta, y se descubre roto justo
 * ahi. Esto lo ejerce en cada `npm test`.
 *
 * Lo que se puede correr de verdad es lo de aca: que la copia committeada pase
 * el MISMO guard que el runtime aplica a la respuesta viva, y que las funciones
 * que la leen se banquen una copia vieja sin definiciones. Lo que NO se puede
 * correr en `node --test` es `lib/afeleia/catalog.ts`, que importa React y el
 * JSON: para esa parte hay un guard de texto al final, y la prueba de verdad es
 * el paso 5 del §8 (romper la URL de la API en el preview).
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://syvwfadxohizvytanjnx.supabase.co/functions/v1";

const snapshot = JSON.parse(
  await readFile(path.join(ROOT, "data", "catalogo-fallback.json"), "utf8"),
);
const catalogSource = await readFile(path.join(ROOT, "lib", "afeleia", "catalog.ts"), "utf8");
const generadorSource = await readFile(path.join(ROOT, "scripts", "catalogo-snapshot.mjs"), "utf8");
const wrapperSource = await readFile(
  path.join(ROOT, "scripts", "catalogo-snapshot-build.mjs"),
  "utf8",
);

// Listas locales de respaldo, en el mismo orden en que las declara data/wines.ts.
const LINEAS_LOCALES = ["Ombú", "Lajau", "Estación Francia", "Berá", "Guidaí", "Yaráy Guá"];

test("la copia committeada pasa el mismo guard que la respuesta viva", () => {
  // Si esto falla, la ultima linea de defensa del sitio esta muerta y nadie se
  // entera hasta la proxima caida de Afeleia.
  assert.equal(isValidCatalog(snapshot), true);
  assert.ok(snapshot.productos.length > 0, "un snapshot sin productos es una tienda vacia");
});

test("toda imagen del snapshot es dibujable por el guard del sitio", () => {
  // En modo degradado una foto rechazada por `next/image` no rompe la foto:
  // rompe la pagina entera (SSG/ISR). Y una URL remota apuntaria justo al host
  // que se acaba de caer.
  for (const producto of snapshot.productos) {
    if (producto.imagenes.length === 0) continue;
    assert.ok(
      renderableImage(producto.imagenes, API),
      `${producto.slug}: ninguna de sus imagenes pasa renderableImage`,
    );
  }
});

test("con la copia actual los filtros salen de las definiciones publicadas", () => {
  const defs = sanitizeDefinitions(snapshot.definiciones_atributos);
  assert.ok(defs.length > 0, "el snapshot vigente ya viaja con definiciones");
  assert.deepEqual(optionsFor(defs, "linea", ["fallback"]), LINEAS_LOCALES);
});

test("con una copia VIEJA, sin definiciones, la tienda sigue teniendo filtros", () => {
  // El escenario real de la regla 3 del contrato: el snapshot de una web que no
  // despliega desde antes de la Etapa B no trae la clave nueva.
  const vieja = { ...snapshot };
  delete vieja.definiciones_atributos;

  assert.equal(isValidCatalog(vieja), true, "la clave nueva es opcional en la lectura");
  const defs = sanitizeDefinitions(vieja.definiciones_atributos);
  assert.deepEqual(defs, []);
  assert.deepEqual(optionsFor(defs, "linea", LINEAS_LOCALES), LINEAS_LOCALES);
});

test("con una copia VIEJA la ficha tecnica no se dibuja, y no explota", () => {
  const producto = snapshot.productos.find((p) => p.atributos?.ficha_tecnica);
  assert.ok(producto, "el snapshot deberia traer al menos un producto con ficha");
  assert.deepEqual(technicalRowsFrom([], producto.atributos), []);
});

test("las tres puertas al modo degradado siguen cableadas", () => {
  // Guard de texto, no de ejecucion: `catalog.ts` importa React y el JSON del
  // snapshot, asi que `node --test` no lo puede cargar. Afirma el cableado, no
  // el comportamiento; el comportamiento se verifica en el preview (§8 paso 5).
  assert.match(catalogSource, /if \(!response\.ok\) \{\s*return degraded\(/, "respuesta no-ok");
  assert.match(catalogSource, /if \(!isValidCatalog\(payload\)\) \{\s*return degraded\(/, "contrato roto");
  assert.match(catalogSource, /catch \(error\) \{[\s\S]{0,200}?return degraded\(/, "fetch caido");
  // Cuarta puerta: la respuesta valida pero de OTRO sitio. El generador ya la
  // rechaza (`razonParaRechazar`), pero el runtime la servia igual: el sitio
  // habria publicado el catalogo de otro cliente hasta la siguiente
  // revalidacion. Las dos capas tienen que mirar lo mismo.
  // Forma exacta y cerrada: con la version laxa, agregarle `&& false` a la
  // condicion dejaba la puerta muerta y el guard en verde.
  assert.match(
    catalogSource,
    /if \(!isOwnCatalog\(payload, sitio\)\) \{\s*return degraded\(/,
    "sitio ajeno",
  );
  assert.match(
    catalogSource,
    /const sitio = process\.env\.NEXT_PUBLIC_AFELEIA_SITIO;\s*if \(!isOwnCatalog\(payload, sitio\)\)/,
    "el sitio contra el que se compara sale del entorno, no de la respuesta",
  );
});

test("el SNAPSHOT tambien se comprueba contra el sitio configurado", () => {
  // La quinta puerta, y la que faltaba: la respuesta viva se comprobaba, el
  // archivo no. La tercera ronda de review committeo un snapshot coherente y
  // sellado con `sitio: "bodega-ajena"` y el build salio en verde publicando
  // `/es/vinos/producto-ajeno`. Servir el catalogo de otro cliente es peor que
  // no servir ninguno: se degrada a la tienda vacia, que es ruidosa y no miente.
  //
  // La forma EXACTA importa, y salio de una revision de estos tests: con
  // `/isOwnCatalog\(snapshot, sitio\)/` a secas, agregarle `&& false` a la
  // condicion dejaba la regla en tautologia y el guard en verde. Por eso se pide
  // el `if (...)` entero, cerrado.
  const cuerpo = catalogSource.match(/function fallbackCatalog\(\): ApiCatalog \{([\s\S]*?)\n\}/);
  assert.ok(cuerpo, "no se encontro la funcion fallbackCatalog");
  assert.match(cuerpo[1], /if \(!isOwnCatalog\(snapshot, sitio\)\) \{/);
  assert.match(cuerpo[1], /const sitio = process\.env\.NEXT_PUBLIC_AFELEIA_SITIO;/);
  assert.match(cuerpo[1], /return emptyCatalog\(sitio \?\? ""\);[\s\S]*return emptyCatalog\(sitio \?\? ""\);/);
});

test("una rafaga no abre una conexion por render: hay vuelo unico", () => {
  // `cache()` de React memoiza por REQUEST. Con 30 rutas simultaneas contra una
  // API que tarda y corta, la review midio 30 conexiones y 30 degradaciones: la
  // memoria de caida no las contiene porque durante la rafaga todavia no hay
  // resultado que recordar. Lo que las contiene es compartir la PROMESA.
  //
  // El COMPORTAMIENTO lo prueba `afeleia-amplificacion` ejecutando
  // `crearVueloUnico` —la version anterior de este guard era puro texto y se
  // quedaba verde con el single-flight desactivado—. Aca solo queda el cableado:
  // que la pagina pase por el vuelo compartido y no por su propia consulta.
  assert.match(catalogSource, /const consultaCompartida = crearVueloUnico\(/);
  assert.match(catalogSource, /return consultaCompartida\(\);/);
  // Y que la promesa compartida no pueda rechazar: colgada de ella puede haber
  // media docena de renders, y un rechazo los tumba a todos.
  const compartida = catalogSource.match(
    /const consultaCompartida = crearVueloUnico\(([\s\S]*?)\n\}\);/,
  );
  assert.ok(compartida, "no se encontro la consulta compartida");
  assert.match(compartida[1], /catch \(error\) \{/, "la promesa compartida no puede rechazar");
  assert.match(compartida[1], /catalog: emptyCatalog\(/, "y su ultimo escalon es el vacio");
  // El unico lugar que abre la conexion tiene que quedar ADENTRO del vuelo: si
  // `fetch` volviera a `loadCatalog`, la rafaga vuelve con el.
  const consultar = catalogSource.indexOf("async function consultarCatalogo(");
  const fetchEn = catalogSource.indexOf("await fetch(");
  assert.ok(consultar > 0 && consultar < fetchEn, "el fetch vive dentro de consultarCatalogo");
});

test("el cuerpo de `degraded` devuelve el snapshot y nada mas", () => {
  // La version anterior de este test comprobaba solo la FIRMA de `degraded` y
  // se quedaba verde con un `throw` inyectado como primera linea del cuerpo
  // (hallazgo de review). Un guard que no puede fallar es peor que no tenerlo:
  // afirma una garantia que no esta comprobando.
  //
  // Ahora se fija el cuerpo entero. Es frágil ante un formateo distinto —y esta
  // bien que lo sea: cualquier cosa que se agregue ahi adentro merece que
  // alguien la mire, porque es el unico camino que le queda al sitio cuando
  // Afeleia no responde.
  const cuerpo = catalogSource.match(/function degraded\([^)]*\): CatalogLoad \{([\s\S]*?)\n\}/);
  assert.ok(cuerpo, "no se encontro la funcion degraded");
  const sentencias = cuerpo[1]
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => linea !== "" && !linea.startsWith("//"));
  assert.deepEqual(sentencias, [
    "const catalog = fallbackCatalog();",
    "reportFallback(reason, catalog);",
    'const load: CatalogLoad = { catalog, origin: "snapshot" };',
    // Recordar la caida es parte del camino degradado desde que se midio la
    // amplificacion: sin esta linea, cada pagina y cada worker vuelven a
    // intentar contra la API que ya se sabe caida (53 intentos por build).
    "caidaReciente.remember(load);",
    "return load;",
  ]);
});

test("la espera a la API tiene techo, en el generador y en el runtime", () => {
  // Una API que acepta la conexion y nunca contesta es peor que una caida: no se
  // distingue de "esta tardando", y sin techo se come el timeout del build hasta
  // impedir el despliegue — la unica cosa que el modo degradado tiene prohibido
  // provocar (hallazgo de review).
  assert.match(catalogSource, /signal: AbortSignal\.timeout\(CATALOG_TIMEOUT_MS\)/);
  assert.match(generadorSource, /signal: AbortSignal\.timeout\(TIMEOUT_MS\)/);
  assert.match(wrapperSource, /timeout: TIMEOUT_MS/);
});

test("el snapshot committeado se valida antes de servirse", () => {
  // Servirlo a ciegas convertia un archivo corrupto en un build fallido: un
  // producto sin `slug` revienta generateStaticParams y con eso el sitio entero.
  assert.match(catalogSource, /function fallbackCatalog\(\): ApiCatalog \{[\s\S]*?isValidCatalog\(snapshot\)/);
  assert.match(catalogSource, /return emptyCatalog\(/);
});

test("el fallback vacio es un catalogo valido: no puede tumbar la pagina", () => {
  const vacio = emptyCatalog("vina-casa-acosta");
  assert.equal(isValidCatalog(vacio), true);
  assert.deepEqual(vacio.productos, []);
  assert.deepEqual(sanitizeDefinitions(vacio.definiciones_atributos), []);
});

test("toda ruta que consume el catalogo declara su propio revalidate", async () => {
  // Next propaga el `revalidate` del `fetch` al segmento DEL RENDER QUE LO
  // INICIO, y con el vuelo compartido los demas no ejecutan esa propagacion: una
  // ruta que se apoyara en el fetch quedaria con ISR de 60 s cuando inicia el
  // vuelo y estatica para siempre cuando se cuelga de otro, segun el orden de
  // render del build. O sea que el literal de segmento paso a ser load-bearing
  // y nada lo decia.
  const rutas = [
    "app/sitemap.ts",
    "app/[locale]/vinos/page.tsx",
    "app/[locale]/vinos/[slug]/page.tsx",
    "app/[locale]/tienda/page.tsx",
  ];
  for (const ruta of rutas) {
    const fuente = await readFile(path.join(ROOT, ruta), "utf8");
    if (!/getCatalog|getCatalogMeta|getCatalogDefinitions|getWineBySlug/.test(fuente)) continue;
    assert.match(
      fuente,
      /export const revalidate = 60/,
      `${ruta} lee el catalogo y no declara su revalidate`,
    );
  }
});
