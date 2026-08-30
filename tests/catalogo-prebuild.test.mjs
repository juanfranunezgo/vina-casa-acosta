import test from "node:test";
import assert from "node:assert/strict";
import {
  decisionDeCierre,
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

// --- 5. Faltar las DOS variables no es lo mismo en local que en un deploy -----

test("sin ninguna de las dos variables, en un DESPLIEGUE, es un error", () => {
  // El agujero que quedaba abierto: con las dos ausentes esto devolvia `null` en
  // cualquier contexto, y entonces `isOwnCatalog` se queda sin nada contra que
  // comparar en las CUATRO capas a la vez. O sea que el snapshot ajeno volvia a
  // desplegarse por la puerta mas facil de dejar abierta: la configuracion que
  // todavia no se cargo. En Netlify siempre hay `CONTEXT`.
  for (const contexto of ["production", "deploy-preview", "branch-deploy"]) {
    const razon = razonDeConfiguracionInvalida({ CONTEXT: contexto });
    assert.ok(razon, `con CONTEXT=${contexto} tiene que fallar`);
    assert.match(razon, /NEXT_PUBLIC_AFELEIA_API_URL/);
    assert.match(razon, /NEXT_PUBLIC_AFELEIA_SITIO/);
  }
  assert.ok(razonDeConfiguracionInvalida({ NETLIFY: "true" }), "NETLIFY tambien alcanza");
});

test("sin ninguna de las dos y SIN contexto de deploy sigue siendo valido", () => {
  // El clon local sin `.env.local` no puede romperse: ahi no hay nada que
  // desplegar y el sitio se construye con el snapshot committeado.
  assert.equal(razonDeConfiguracionInvalida({}), null);
  assert.equal(razonDeConfiguracionInvalida({ NODE_ENV: "development" }), null);
});

test("un fragmento vacio tambien se rechaza", () => {
  // `new URL(".../v1#").hash` es `""` —el `#` vacio no se representa— y sin
  // embargo sobrevive al `toString()`. Un control que no cubre lo que dice
  // cubrir es peor que no tenerlo.
  assert.ok(
    razonDeConfiguracionInvalida({ ...SANO, NEXT_PUBLIC_AFELEIA_API_URL: `${URL_API}#` }),
  );
});

// --- 6. Qué hace el prebuild al cerrar ----------------------------------------
// Las dos puertas que pueden FRENAR UN DEPLOY, sus dos escotillas y sus codigos
// de salida no los ejercitaba ningun test: estaban adentro de `cerrar()`, que
// lee disco y llama a `process.exit`. La decision es pura y vive en
// `decisionDeCierre`; `cerrar()` quedo en leer, imprimir y salir.

const PAR_SANO = { razon: null, parCoherente: true, motivoDelPar: null };

test("con catalogo servible y el par cerrado, se construye y no se dice nada", () => {
  assert.deepEqual(decisionDeCierre({ ...PAR_SANO, env: {} }), {
    salida: 0,
    nivel: "info",
    mensaje: null,
  });
});

test("sin catalogo servible no se construye, y el motivo viaja entero", () => {
  const decision = decisionDeCierre({ ...PAR_SANO, razon: "el snapshot de fallback no es JSON legible. X", env: {} });
  assert.equal(decision.salida, 1);
  assert.equal(decision.nivel, "error");
  assert.match(decision.mensaje, /no es JSON legible/);
  assert.match(decision.mensaje, /catalogo:snapshot/, "tiene que decir como salir");
});

test("la escotilla del catalogo construye igual, y dice que publica la tienda vacia", () => {
  const decision = decisionDeCierre({
    ...PAR_SANO,
    razon: "el snapshot de fallback es del sitio \"bodega-ajena\" y este sitio es \"vina-casa-acosta\"",
    env: { AFELEIA_PERMITIR_SIN_CATALOGO: "1" },
  });
  assert.equal(decision.salida, 0);
  assert.equal(decision.nivel, "warn");
  // El nombre de la escotilla dice "sin catalogo", pero tambien abre la puerta
  // del tenant: el mensaje tiene que decir que lo que se publica es la tienda
  // vacia y no el catalogo del otro cliente.
  assert.match(decision.mensaje, /VACIA/);
});

test("una escotilla que no vale exactamente 1 no abre nada", () => {
  for (const valor of ["true", "yes", "", "0", " 1"]) {
    assert.equal(
      decisionDeCierre({ ...PAR_SANO, razon: "sin catalogo", env: { AFELEIA_PERMITIR_SIN_CATALOGO: valor } }).salida,
      1,
      `${JSON.stringify(valor)} no deberia abrir la escotilla`,
    );
  }
});

test("el par que NO cierra frena el build, con su escotilla propia", () => {
  const roto = {
    razon: null,
    parCoherente: false,
    motivoDelPar: "el hash del sello no describe a este snapshot",
  };
  const frena = decisionDeCierre({ ...roto, env: {} });
  assert.equal(frena.salida, 1);
  assert.match(frena.mensaje, /catalogo:sellar/, "tiene que ofrecer las dos salidas");
  assert.match(frena.mensaje, /AFELEIA_PERMITIR_PAR_A_MEDIAS/);

  const pasa = decisionDeCierre({ ...roto, env: { AFELEIA_PERMITIR_PAR_A_MEDIAS: "1" } });
  assert.equal(pasa.salida, 0);
  assert.equal(pasa.nivel, "warn");
});

test("que FALTE el sello no frena el deploy: grita", () => {
  // El sello es un control de PROCEDENCIA, no de servibilidad: el snapshot ya
  // paso el contrato y el dueño. Frenar aca convertia una caida de Afeleia —o un
  // archivo borrado— en un deploy imposible, que es justo la regla que ordena
  // todo este archivo. Que el sello CONTRADIGA al snapshot es otra cosa, y esa
  // si frena (test de arriba).
  const decision = decisionDeCierre({
    razon: null,
    parCoherente: false,
    motivoDelPar: "no hay sello",
    env: {},
  });
  assert.equal(decision.salida, 0);
  assert.equal(decision.nivel, "warn");
  assert.match(decision.mensaje, /catalogo:sellar/);
});

test("si el par no se pudo juzgar, no se frena por el par", () => {
  // Otro proceso escribiendo: la lectura seria de un refresco en vuelo y frenar
  // un deploy sobre esa muestra es frenar un build inocente. El contenido del
  // snapshot si se sigue juzgando, porque `escribirAtomico` garantiza que sea el
  // viejo entero o el nuevo entero.
  assert.equal(
    decisionDeCierre({
      razon: null,
      parCoherente: false,
      motivoDelPar: "el hash del sello no describe a este snapshot",
      parJuzgable: false,
      env: {},
    }).salida,
    0,
  );
  assert.equal(
    decisionDeCierre({ razon: "sin catalogo", parCoherente: true, motivoDelPar: null, parJuzgable: false, env: {} })
      .salida,
    1,
    "pero el catalogo inservible frena igual",
  );
});

test("el wrapper usa la decision pura, y no vuelve a decidir por su cuenta", async () => {
  const { readFile } = await import("node:fs/promises");
  const wrapper = await readFile(
    new URL("../scripts/catalogo-snapshot-build.mjs", import.meta.url),
    "utf8",
  );
  assert.match(wrapper, /const decision = decisionDeCierre\(\{/);
  assert.match(wrapper, /process\.exit\(decision\.salida\)/);
  // Y repara ANTES de juzgar: al reves, un par a medias disparaba la puerta
  // equivocada con el respaldo bueno ahi al lado.
  const reparar = wrapper.indexOf('repararLoQueHayaQuedadoAMedias("antes de construir")');
  const juzgar = wrapper.indexOf("const decision = decisionDeCierre({");
  assert.ok(reparar > 0 && reparar < juzgar, "se repara antes de decidir");
});
