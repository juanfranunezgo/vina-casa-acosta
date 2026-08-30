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
  assert.match(
    catalogEndpointFor("https://xyz.supabase.co/functions/v1", "vina casa&otra") ?? "",
    /sitio=vina\+casa%26otra|sitio=vina%20casa%26otra/,
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

test("el runtime compone el endpoint con catalogEndpointFor", async () => {
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
  // por su cuenta, esto se pone rojo.
  const capas = {
    "lib/afeleia/catalog.ts": 2, // respuesta viva + snapshot committeado
    "scripts/catalogo-validacion.mjs": 2, // respuesta del generador + snapshot del prebuild
  };
  for (const [archivo, veces] of Object.entries(capas)) {
    const fuente = await readFile(path.join(ROOT, archivo), "utf8");
    const usos = fuente.match(/isOwnCatalog\(/g) ?? [];
    assert.equal(usos.length, veces, `${archivo} usa isOwnCatalog ${usos.length} veces`);
  }
});
