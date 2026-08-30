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
  assert.equal(razonParaNoDesplegar(JSON.stringify(catalogo([PRODUCTO])), SITIO), null);
});

test("un snapshot de OTRO sitio NO deja desplegar", () => {
  // Hallazgo P1 de la tercera ronda, reproducido: un snapshot coherente, bien
  // sellado y con `sitio: "bodega-ajena"` construia 77 paginas y publicaba
  // `/es/vinos/producto-ajeno`, con el build en verde. `razonParaNoDesplegar`
  // miraba la FORMA y no el dueño. Publicar el catalogo de otro cliente es la
  // peor falla del sistema: se frena el deploy y queda publicado lo anterior.
  const ajeno = { ...catalogo([PRODUCTO]), sitio: "bodega-ajena" };
  const razon = razonParaNoDesplegar(JSON.stringify(ajeno), SITIO);
  assert.match(razon ?? "", /bodega-ajena/);
  assert.match(razon ?? "", /vina-casa-acosta/);
});

test("sin sitio configurado no se juzga el dueño del snapshot", () => {
  // Es el clon local sin `.env.local`: no hay contra que comparar, y el snapshot
  // committeado es todo lo que hay. Que esa configuracion a medias no llegue a
  // produccion lo asegura `razonDeConfiguracionInvalida`, no esta funcion.
  const ajeno = { ...catalogo([PRODUCTO]), sitio: "bodega-ajena" };
  assert.equal(razonParaNoDesplegar(JSON.stringify(ajeno), undefined), null);
});

test("un snapshot VACIO deja desplegar: vacio no es roto", () => {
  // Coherente con el generador, que desde esta tanda acepta el catalogo vacio:
  // si el cliente despublico todo, la tienda vacia es la verdad, no una falla.
  assert.equal(razonParaNoDesplegar(JSON.stringify(catalogo([])), SITIO), null);
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

// --- 3. La URL de la API es una BASE, no cualquier URL ------------------------

test("una URL de API con query o fragmento es un error de configuracion", () => {
  // Hallazgo P2 de la tercera ronda: `http://host/functions/v1?token=humano`
  // pasaba la validacion, y el endpoint quedaba armado como
  // `/functions/v1?token=humano/catalogo-publico?sitio=...` — el path adentro
  // del query. El servidor recibia cualquier cosa y el sitio se construia
  // degradado, en verde. Se rechaza en vez de recortarlo en silencio: quien puso
  // ese token queria que viajara, y tiene que enterarse de que asi no viaja.
  for (const url of [
    "https://xyz.supabase.co/functions/v1?token=humano",
    "https://xyz.supabase.co/functions/v1#ancla",
  ]) {
    const razon = razonDeConfiguracionInvalida({ ...SANO, NEXT_PUBLIC_AFELEIA_API_URL: url });
    assert.ok(razon, `${JSON.stringify(url)} tiene que rechazarse`);
  }
});

test("una URL de API con credenciales es un error de configuracion", () => {
  // `NEXT_PUBLIC_*` termina en el bundle del navegador: una credencial ahi es
  // una credencial publicada. El contrato v1 no usa ninguna.
  assert.match(
    razonDeConfiguracionInvalida({
      ...SANO,
      NEXT_PUBLIC_AFELEIA_API_URL: "https://usuario:clave@xyz.supabase.co/functions/v1",
    }) ?? "",
    /credencial/i,
  );
});

test("las bases legitimas raras siguen pasando", () => {
  // El riesgo de agregar puertas es frenar un build que deberia pasar. Estas son
  // configuraciones que un humano escribe de buena fe y tienen que seguir vivas.
  for (const url of [
    "https://xyz.supabase.co/functions/v1/",
    "https://xyz.supabase.co/functions/v1//",
    "https://xyz.supabase.co:8443/functions/v1",
    "https://xyz.supabase.co",
    "http://127.0.0.1:54321/functions/v1",
    // Un `?` vacio no es un query: `URL` lo normaliza y el endpoint sale bien
    // armado. Rechazarlo seria frenar un build por un caracter de mas.
    "https://xyz.supabase.co/functions/v1?",
  ]) {
    assert.equal(
      razonDeConfiguracionInvalida({ ...SANO, NEXT_PUBLIC_AFELEIA_API_URL: url }),
      null,
      `${JSON.stringify(url)} es legitima y tiene que pasar`,
    );
  }
});

// --- 4. El prebuild mira la misma configuracion que `next build` --------------

test("el prebuild carga los .env como los carga Next", async () => {
  // `next build` lee `.env.local` y `.env`; el prebuild corre antes y en otro
  // proceso, y solo veia las variables del shell. Con eso las dos capas
  // comparaban contra configuraciones distintas —el prebuild dejaba pasar por
  // "sin API/SITIO" y el runtime se encontraba con un snapshot que no era de su
  // sitio— y el build salia en verde con la tienda vacia. En Netlify no cambia
  // nada: ahi las variables son de entorno y no hay `.env*` en el repo.
  const { readFile } = await import("node:fs/promises");
  const wrapper = await readFile(
    new URL("../scripts/catalogo-snapshot-build.mjs", import.meta.url),
    "utf8",
  );
  assert.match(wrapper, /from "@next\/env"/, "el cargador tiene que ser el de Next, no uno propio");
  assert.match(wrapper, /loadEnvConfig\(RAIZ, false/);
  // Y antes de leer nada: cargar despues de decidir no sirve de nada.
  const carga = wrapper.indexOf("loadEnvConfig(");
  const primeraLectura = wrapper.indexOf("razonDeConfiguracionInvalida(process.env)");
  assert.ok(carga > 0 && carga < primeraLectura, "se carga antes de mirar la configuracion");
});
