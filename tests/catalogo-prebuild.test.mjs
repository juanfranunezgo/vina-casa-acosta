import test from "node:test";
import assert from "node:assert/strict";
import {
  razonDeConfiguracionInvalida,
  razonParaNoDesplegar,
} from "../scripts/catalogo-validacion.mjs";

/**
 * Las dos preguntas que el prebuild tiene que contestar antes de dejar pasar un
 * build, y que hasta la segunda ronda de review no se hacía ninguna:
 *
 *   1. ¿la configuración es válida? Una variable vacía, con espacios o a medias
 *      no es una caída de Afeleia: es un error de configuración, y tratarlo como
 *      caída deja el sitio permanentemente degradado y el build en verde;
 *   2. ¿queda algo servible? Con la API caída Y el snapshot corrupto, el sitio se
 *      construía igual y publicaba una tienda VACÍA —desaparecían las 39 páginas
 *      de producto— pisando la última versión buena. En un hosting de deploy
 *      atómico, fallar el build es más seguro: deja publicado lo anterior.
 */

const SITIO = "vina-casa-acosta";
const URL_API = "https://xyz.supabase.co/functions/v1";

const SANO = { NEXT_PUBLIC_AFELEIA_API_URL: URL_API, NEXT_PUBLIC_AFELEIA_SITIO: SITIO };

const catalogo = (productos) => ({
  version: 1,
  sitio: SITIO,
  generado_en: "2026-08-28T12:00:00.000Z",
  categorias: [],
  productos,
});

const PRODUCTO = {
  slug: "bera",
  nombre: "Bera",
  precio: 23000,
  imagenes: [],
  agotado: false,
  atributos: {},
};

// --- 1. Configuración ---------------------------------------------------------

test("la configuracion sana pasa", () => {
  assert.equal(razonDeConfiguracionInvalida(SANO), null);
});

test("sin ninguna de las dos variables NO es un error de configuracion", () => {
  // Es el caso de un clon local sin `.env.local`: no se refresca el snapshot y el
  // sitio se construye con el committeado. Fallar acá rompería el desarrollo.
  assert.equal(razonDeConfiguracionInvalida({}), null);
});

test("media configuracion es un error, no una caida", () => {
  assert.match(
    razonDeConfiguracionInvalida({ NEXT_PUBLIC_AFELEIA_API_URL: URL_API }) ?? "",
    /SITIO/,
  );
  assert.match(
    razonDeConfiguracionInvalida({ NEXT_PUBLIC_AFELEIA_SITIO: SITIO }) ?? "",
    /API_URL/,
  );
});

test("un slug con espacios o mayusculas es un error de configuracion", () => {
  // Medido en la review: `"  vina-casa-acosta  "` y `"VINA-CASA-ACOSTA"` dejaban
  // el sitio degradado para siempre, en verde y sin que nada lo dijera. La
  // comparacion estricta del contrato es correcta; lo que faltaba era avisar.
  for (const sitio of ["  vina-casa-acosta  ", "VINA-CASA-ACOSTA", "vina casa acosta", ""]) {
    assert.ok(
      razonDeConfiguracionInvalida({ ...SANO, NEXT_PUBLIC_AFELEIA_SITIO: sitio }),
      `${JSON.stringify(sitio)} tiene que rechazarse`,
    );
  }
});

test("una URL de API que no es una URL es un error de configuracion", () => {
  for (const url of ["", "   ", "no-es-una-url", "ftp://x.cl", "javascript:alert(1)"]) {
    assert.ok(
      razonDeConfiguracionInvalida({ ...SANO, NEXT_PUBLIC_AFELEIA_API_URL: url }),
      `${JSON.stringify(url)} tiene que rechazarse`,
    );
  }
});

test("localhost sigue siendo valido: es la configuracion de desarrollo", () => {
  assert.equal(
    razonDeConfiguracionInvalida({
      ...SANO,
      NEXT_PUBLIC_AFELEIA_API_URL: "http://127.0.0.1:54321/functions/v1",
    }),
    null,
  );
});

test("en produccion la API tiene que viajar por https", () => {
  // Simetrico al guard que ya protege el dominio publico (`lib/siteUrl.ts`): en
  // el contexto de produccion de Netlify, una API en http pondria el catalogo
  // —precios incluidos— en texto plano y dejaria que un intermediario decida que
  // productos ve el visitante. En preview y en local sigue permitido: ahi la API
  // es un Supabase en 127.0.0.1.
  const enProduccion = { ...SANO, CONTEXT: "production" };
  assert.equal(razonDeConfiguracionInvalida(enProduccion), null);
  assert.match(
    razonDeConfiguracionInvalida({
      ...enProduccion,
      NEXT_PUBLIC_AFELEIA_API_URL: "http://api.afeleia.cl/functions/v1",
    }) ?? "",
    /https/,
  );
  assert.equal(
    razonDeConfiguracionInvalida({
      ...SANO,
      NEXT_PUBLIC_AFELEIA_API_URL: "http://127.0.0.1:54321/functions/v1",
      CONTEXT: "deploy-preview",
    }),
    null,
    "un preview con la API local sigue siendo valido",
  );
});

// --- 2. ¿Queda algo servible? -------------------------------------------------

test("un snapshot sano deja desplegar", () => {
  assert.equal(razonParaNoDesplegar(JSON.stringify(catalogo([PRODUCTO]))), null);
});

test("un snapshot VACIO deja desplegar: vacio no es roto", () => {
  // Coherente con el generador, que desde esta tanda acepta el catalogo vacio:
  // si el cliente despublico todo, la tienda vacia es la verdad, no una falla.
  assert.equal(razonParaNoDesplegar(JSON.stringify(catalogo([]))), null);
});

test("un snapshot corrupto NO deja desplegar", () => {
  const sinSlug = catalogo([{ ...PRODUCTO, slug: undefined }]);
  assert.ok(razonParaNoDesplegar(JSON.stringify(sinSlug)));
  assert.ok(razonParaNoDesplegar("{ esto no es json"));
  assert.ok(razonParaNoDesplegar(""));
  assert.ok(razonParaNoDesplegar(null));
});

test("el motivo dice que fallar el build conserva la version publicada", () => {
  // El mensaje es la mitad del arreglo: quien lo lea en Netlify tiene que
  // entender que el deploy anterior sigue vivo y que no hay que forzar nada.
  assert.match(razonParaNoDesplegar("{ roto") ?? "", /anterior|publicad/i);
});
