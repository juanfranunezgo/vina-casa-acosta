import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogEndpointFor, isOwnCatalog } from "../lib/afeleia/contract.ts";

/**
 * Las dos reglas que las CUATRO capas del catalogo tienen que compartir: como se
 * arma el endpoint y de quien es un catalogo.
 *
 * Las dos estaban escritas mas de una vez, y las dos fallaron por eso. La tercera
 * ronda de review encontro:
 *
 *   1. el endpoint pegado con texto (`base + "/catalogo-publico?sitio="`), que
 *      con una base con query producia `/functions/v1?token=x/catalogo-publico?
 *      sitio=...` — el path metido adentro del query, el sitio degradado y el
 *      build en verde;
 *   2. la comprobacion de dueño escrita en el generador y en la respuesta viva,
 *      y ausente en las dos capas que leen el ARCHIVO: un snapshot sellado con
 *      `sitio: "bodega-ajena"` se desplegaba y se servia.
 *
 * Por eso las dos viven en `contract.ts`, una sola vez, y esto las prueba
 * ejecutandolas.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITIO = "vina-casa-acosta";

// --- Como se arma el endpoint -------------------------------------------------

test("la base normal arma el endpoint de siempre", () => {
  assert.equal(
    catalogEndpointFor("https://xyz.supabase.co/functions/v1", SITIO),
    "https://xyz.supabase.co/functions/v1/catalogo-publico?sitio=vina-casa-acosta",
  );
});

test("una base con barra final, con puerto o sin path sigue funcionando", () => {
  assert.equal(
    catalogEndpointFor("https://xyz.supabase.co/functions/v1/", SITIO),
    "https://xyz.supabase.co/functions/v1/catalogo-publico?sitio=vina-casa-acosta",
  );
  assert.equal(
    catalogEndpointFor("http://127.0.0.1:54321/functions/v1", SITIO),
    "http://127.0.0.1:54321/functions/v1/catalogo-publico?sitio=vina-casa-acosta",
  );
  assert.equal(
    catalogEndpointFor("https://xyz.supabase.co", SITIO),
    "https://xyz.supabase.co/catalogo-publico?sitio=vina-casa-acosta",
  );
});

test("el slug del sitio viaja escapado", () => {
  // No se espera un slug raro —`razonDeConfiguracionInvalida` exige la forma—
  // pero componer con `URL` significa que ni siquiera hace falta acordarse.
  // Cadena exacta, no una alternativa: si mañana alguien vuelve a pegar texto,
  // el escapado cambia (`+` por `%20`) y este test tiene que notarlo.
  assert.equal(
    catalogEndpointFor("https://xyz.supabase.co/functions/v1", "vina casa&otra"),
    "https://xyz.supabase.co/functions/v1/catalogo-publico?sitio=vina+casa%26otra",
  );
});

test("una base con query, fragmento o credenciales NO arma endpoint", () => {
  for (const base of [
    "https://xyz.supabase.co/functions/v1?token=humano",
    "https://xyz.supabase.co/functions/v1#ancla",
    "https://usuario:clave@xyz.supabase.co/functions/v1",
    "ftp://xyz.supabase.co/functions/v1",
    "no-es-una-url",
    "",
  ]) {
    assert.equal(catalogEndpointFor(base, SITIO), null, `${JSON.stringify(base)} deberia dar null`);
  }
  assert.equal(catalogEndpointFor("https://xyz.supabase.co/functions/v1", undefined), null);
});

test("el generador arma el endpoint con la MISMA funcion que el runtime", async () => {
  // Si el generador y el runtime lo armaran distinto, el snapshot se refrescaria
  // contra un endpoint y el sitio consultaria otro — y nadie lo notaria hasta que
  // los datos no coincidan.
  const generador = await readFile(path.join(ROOT, "scripts", "catalogo-snapshot.mjs"), "utf8");
  assert.match(generador, /catalogEndpointFor\(apiUrl, sitio\)/);
  // Y que el fetch use ESE endpoint. Prohibir solo la interpolacion no alcanzaba:
  // medido en una revision de estos tests, rearmar la URL con `+` adentro del
  // `fetch` dejaba `catalogEndpointFor` como codigo muerto y la suite en verde.
  assert.match(generador, /const endpoint = catalogEndpointFor\(apiUrl, sitio\);/);
  assert.match(generador, /await fetch\(endpoint, \{/);
  assert.doesNotMatch(generador, /fetch\(\s*`/, "el fetch tiene que ir al endpoint compuesto");
  assert.doesNotMatch(generador, /catalogo-publico\?sitio=\$\{/, "volvio el pegado de texto");

  const contrato = await readFile(path.join(ROOT, "lib", "afeleia", "contract.ts"), "utf8");
  assert.match(contrato, /export function catalogEndpoint\(\): string \| null \{\s*return catalogEndpointFor\(/);
});

// --- De quien es este catalogo ------------------------------------------------

test("un catalogo del sitio configurado es propio", () => {
  assert.equal(isOwnCatalog({ sitio: SITIO }, SITIO), true);
});

test("un catalogo de otro sitio NO es propio", () => {
  assert.equal(isOwnCatalog({ sitio: "bodega-ajena" }, SITIO), false);
  assert.equal(isOwnCatalog({}, SITIO), false, "sin `sitio` tampoco se puede afirmar que es propio");
  assert.equal(isOwnCatalog({ sitio: "VINA-CASA-ACOSTA" }, SITIO), false, "la comparacion es literal");
});

test("sin sitio configurado no se puede juzgar, y pasa", () => {
  // El clon local sin `.env.local`: no hay contra que comparar y el snapshot
  // committeado es todo lo que hay. La configuracion a medias la frena el
  // prebuild, que es donde corresponde.
  assert.equal(isOwnCatalog({ sitio: "cualquiera" }, undefined), true);
  assert.equal(isOwnCatalog({ sitio: "cualquiera" }, ""), true);
});

test("las cuatro capas comparten la regla del dueño", async () => {
  // La regla vale lo que valga su cobertura: si alguna capa vuelve a escribirla
  // por su cuenta, esto se pone rojo. Se pide la FORMA de cada uso y no la
  // cantidad: contar ocurrencias castigaba agregar una quinta capa legitima, y
  // no veia la diferencia entre comparar contra el entorno o contra la propia
  // respuesta —que es la mutacion que vuelve la regla una tautologia—.
  const capas = {
    "lib/afeleia/catalog.ts": [
      /if \(!isOwnCatalog\(snapshot, sitio\)\) \{/,
      /if \(!isOwnCatalog\(payload, sitio\)\) \{/,
    ],
    "scripts/catalogo-validacion.mjs": [
      /if \(!isOwnCatalog\(payload, sitioEsperado\)\) \{/,
      /if \(!isOwnCatalog\(catalogo, sitioEsperado\)\) \{/,
    ],
  };
  for (const [archivo, formas] of Object.entries(capas)) {
    const fuente = await readFile(path.join(ROOT, archivo), "utf8");
    for (const forma of formas) {
      assert.match(fuente, forma, `${archivo} no aplica la regla con la forma esperada`);
    }
  }
});

test("el prebuild le pasa el sitio configurado a la puerta del snapshot", async () => {
  // `sitioEsperado` es opcional, asi que si el wrapper deja de pasarlo la regla
  // se apaga entera y el snapshot ajeno vuelve a desplegarse. Medido en una
  // revision de estos tests: esa mutacion dejaba la suite completa en verde.
  const wrapper = await readFile(path.join(ROOT, "scripts", "catalogo-snapshot-build.mjs"), "utf8");
  assert.match(
    wrapper,
    /razonParaNoDesplegar\(crudo, process\.env\.NEXT_PUBLIC_AFELEIA_SITIO\)/,
  );
});
