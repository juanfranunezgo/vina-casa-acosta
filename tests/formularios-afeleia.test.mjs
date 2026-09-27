import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";

/**
 * Los dos formularios del sitio mandan a la puerta de formularios de Afeleia
 * (`formularios-publico`) desde 2026-09. El contrato v1 vive en el repo de
 * Afeleia —`supabase/functions/formularios-publico/README.md`, resumido en el
 * capítulo 12 de `docs/conexiones-web/manual-conexion.md`— y no se copia acá:
 * estos tests cuidan las partes de ese contrato que dependen de este repo.
 *
 * Reemplaza a `netlify-forms-paridad.test.mjs`. Aquel cuidaba que cada campo
 * estuviera declarado en `__forms.html`, porque Netlify descartaba en silencio
 * los que no. La puerta no descarta nada: rechaza el envío entero (400) si una
 * clave no tiene la forma del contrato. El modo de falla cambió de "llega sin
 * un campo" a "no llega", y eso es lo que se prueba ahora.
 */

const raiz = new URL("../", import.meta.url);
const leer = (ruta) => readFile(new URL(ruta, raiz), "utf8");

const {
  enviarFormularioAfeleia,
  formularioEndpointFor,
  ErrorEnvioFormulario,
  LARGO_MAXIMO_CAMPO,
} = await import("@/lib/afeleiaFormularios");

const BASE = "https://ref.supabase.co/functions/v1";
const SITIO = "vina-casa-acosta";

function conEntorno(base, sitio) {
  if (base === undefined) delete process.env.NEXT_PUBLIC_AFELEIA_API_URL;
  else process.env.NEXT_PUBLIC_AFELEIA_API_URL = base;
  if (sitio === undefined) delete process.env.NEXT_PUBLIC_AFELEIA_SITIO;
  else process.env.NEXT_PUBLIC_AFELEIA_SITIO = sitio;
}

/** Un `fetch` que anota lo que recibe y contesta lo que se le pide. */
function fetchFalso(respuesta) {
  const llamadas = [];
  const fn = async (url, init) => {
    llamadas.push({ url: String(url), init });
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  };
  return { fn, llamadas };
}

const json = (cuerpo, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function codigoDelError(promesa) {
  try {
    await promesa;
  } catch (error) {
    assert.ok(error instanceof ErrorEnvioFormulario, `se esperaba ErrorEnvioFormulario y llegó ${error}`);
    return error.codigo;
  }
  assert.fail("el envío debía fallar y se resolvió");
}

// ---------------------------------------------------------------------------
// El adaptador
// ---------------------------------------------------------------------------

test("manda un POST JSON a la puerta con el sitio y el formulario en la URL", async () => {
  conEntorno(BASE, SITIO);
  const { fn, llamadas } = fetchFalso(json({ ok: true }));
  const campos = { nombre: "Ana", email: "ana@ejemplo.cl", mensaje: "Hola" };

  await enviarFormularioAfeleia("contacto", campos, "token-1", "", fn);

  assert.equal(llamadas.length, 1);
  const { url, init } = llamadas[0];
  assert.equal(
    url,
    "https://ref.supabase.co/functions/v1/formularios-publico?sitio=vina-casa-acosta&formulario=contacto",
  );
  assert.equal(init.method, "POST");
  assert.equal(init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(init.body), { campos, turnstile: "token-1", trampa: "" });
  // El timeout de 10 s del contrato: sin señal, una puerta colgada deja el
  // botón en "Enviando…" para siempre.
  assert.ok(init.signal instanceof AbortSignal, "el fetch va sin AbortSignal");
});

test("la trampa viaja en `trampa`, fuera de los campos", async () => {
  conEntorno(BASE, SITIO);
  const { fn, llamadas } = fetchFalso(json({ ok: true }));

  await enviarFormularioAfeleia("reserva-actividad", { nombre: "Bot" }, "t", "http://spam", fn);

  const cuerpo = JSON.parse(llamadas[0].init.body);
  assert.equal(cuerpo.trampa, "http://spam");
  assert.deepEqual(cuerpo.campos, { nombre: "Bot" });
  assert.match(llamadas[0].url, /formulario=reserva-actividad$/);
});

test("un 200 sin `{ ok: true }` no cuenta como enviado", async () => {
  // Un portal cautivo o un proxy pueden contestar 200 con HTML: mostrar
  // "mensaje enviado" ahí es perder el mensaje sin que nadie se entere.
  conEntorno(BASE, SITIO);
  const html = new Response("<html>login</html>", { status: 200 });
  assert.equal(
    await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fetchFalso(html).fn)),
    "respuesta_invalida",
  );
});

test("solo un 200 es un envío hecho: otro 2xx, aunque diga { ok: true }, es un error", async () => {
  // El contrato dice 200. `respuesta.ok` acepta de 200 a 299, y un 204 ni
  // siquiera puede traer cuerpo: se prueba con una respuesta armada a mano.
  conEntorno(BASE, SITIO);
  for (const status of [201, 202, 204, 206, 299]) {
    const falsa = { status, ok: true, json: async () => ({ ok: true }) };
    assert.equal(
      await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fetchFalso(falsa).fn)),
      `http_${status}`,
      `status ${status}`,
    );
  }
});

test("un 3xx de la puerta no lleva el mensaje a otra parte", async () => {
  conEntorno(BASE, SITIO);
  const { fn, llamadas } = fetchFalso(json({ ok: true }));
  await enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fn);
  assert.equal(llamadas[0].init.redirect, "error");

  // Y con el fetch de verdad: una puerta que redirige no recibe una segunda
  // copia del mensaje en otra URL. Sin `redirect: "error"`, un 307 o un 308
  // reenvían el POST con el cuerpo entero.
  const { createServer } = await import("node:http");
  let recibidosEnOtraParte = 0;
  const servidor = createServer((req, res) => {
    if (req.url.startsWith("/otra")) {
      recibidosEnOtraParte += 1;
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    }
    const status = Number(new URL(req.url, "http://x").searchParams.get("sitio").split("-")[1]);
    res.writeHead(status, { Location: "/otra" });
    res.end();
  });
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  try {
    const base = `http://127.0.0.1:${servidor.address().port}/functions/v1`;
    for (const status of [301, 302, 303, 307, 308]) {
      conEntorno(base, `redirige-${status}`);
      assert.equal(
        await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "")),
        "red",
        `status ${status}`,
      );
    }
    assert.equal(recibidosEnOtraParte, 0);
  } finally {
    servidor.close();
  }
});

test("la trampa se recorta a 200: la puerta la descarta en silencio y no con un 400", async () => {
  // La puerta mide `trampa.length` y con más de 200 responde 400: el bot se
  // enteraría de que lo vieron. Recortada sigue llena, y se descarta con 200.
  conEntorno(BASE, SITIO);
  const enviada = async (trampa) => {
    const { fn, llamadas } = fetchFalso(json({ ok: true }));
    await enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", trampa, fn);
    return JSON.parse(llamadas[0].init.body).trampa;
  };
  const larga = "https://spam.example/".repeat(50);
  assert.equal(await enviada(larga), larga.slice(0, 200));
  // Se cuenta como la puerta: en unidades UTF-16.
  assert.equal((await enviada("😀".repeat(150))).length, 200);
  assert.equal(await enviada("x".repeat(200)), "x".repeat(200));
  assert.equal(await enviada("bot"), "bot");
  assert.equal(await enviada(""), "");
});

test("un rechazo de la puerta llega con su código", async () => {
  conEntorno(BASE, SITIO);
  for (const [status, codigo] of [
    [400, "datos_invalidos"],
    [403, "verificacion_fallida"],
    [404, "formulario_desconocido"],
    [429, "demasiados_envios"],
    [503, "no_disponible"],
  ]) {
    const { fn } = fetchFalso(json({ ok: false, codigo }, status));
    assert.equal(await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fn)), codigo);
  }
});

test("sin un código legible, el error dice el HTTP", async () => {
  conEntorno(BASE, SITIO);
  const html = new Response("<h1>Bad gateway</h1>", { status: 502 });
  assert.equal(
    await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fetchFalso(html).fn)),
    "http_502",
  );
  // Un `codigo` con otra forma no se propaga tal cual.
  const raro = json({ ok: false, codigo: "<script>" }, 400);
  assert.equal(
    await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fetchFalso(raro).fn)),
    "http_400",
  );
});

test("una caída de red o un timeout es un ErrorEnvioFormulario, no un TypeError suelto", async () => {
  conEntorno(BASE, SITIO);
  for (const error of [new TypeError("Failed to fetch"), new DOMException("timeout", "TimeoutError")]) {
    assert.equal(
      await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fetchFalso(error).fn)),
      "red",
    );
  }
});

test("sin configuración válida no se llama a nadie", async () => {
  const casos = [
    [undefined, SITIO],
    [BASE, undefined],
    [BASE, ""],
    // Lo que `catalogEndpointFor` ya rechaza, por las mismas razones.
    [`${BASE}?token=x`, SITIO],
    ["https://usuario:clave@ref.supabase.co/functions/v1", SITIO],
    ["ftp://ref.supabase.co/functions/v1", SITIO],
    ["no es una url", SITIO],
  ];
  for (const [base, sitio] of casos) {
    conEntorno(base, sitio);
    const { fn, llamadas } = fetchFalso(json({ ok: true }));
    assert.equal(
      await codigoDelError(enviarFormularioAfeleia("contacto", { nombre: "A" }, "t", "", fn)),
      "configuracion",
      `base=${base} sitio=${sitio}`,
    );
    assert.equal(llamadas.length, 0, `base=${base} sitio=${sitio} llamó a fetch`);
  }
});

test("la URL de la puerta se arma sobre la base, con o sin barra final", () => {
  assert.equal(
    formularioEndpointFor(`${BASE}/`, SITIO, "contacto"),
    `${BASE}/formularios-publico?sitio=vina-casa-acosta&formulario=contacto`,
  );
  assert.equal(
    formularioEndpointFor("http://127.0.0.1:54321/functions/v1", "demo", "reserva-actividad"),
    "http://127.0.0.1:54321/functions/v1/formularios-publico?sitio=demo&formulario=reserva-actividad",
  );
  assert.equal(formularioEndpointFor(`${BASE}#x`, SITIO, "contacto"), null);
});

test("el catálogo sigue saliendo de la misma base", async () => {
  // `formularioEndpointFor` y `catalogEndpointFor` comparten la validación de
  // la base: este test cuida que el refactor no le cambió la URL al catálogo.
  const { catalogEndpointFor } = await import("@/lib/afeleia/contract");
  assert.equal(catalogEndpointFor(BASE, SITIO), `${BASE}/catalogo-publico?sitio=vina-casa-acosta`);
  assert.equal(catalogEndpointFor(`${BASE}?x=1`, SITIO), null);
});

test("las variables públicas se leen literales, para que Next las incruste", async () => {
  // Next reemplaza `process.env.NEXT_PUBLIC_X` en el build solo cuando está
  // escrito así. Un acceso dinámico compila y en el navegador vale undefined:
  // el formulario fallaría siempre con "configuracion".
  const adaptador = await leer("lib/afeleiaFormularios.ts");
  assert.match(adaptador, /process\.env\.NEXT_PUBLIC_AFELEIA_API_URL/);
  assert.match(adaptador, /process\.env\.NEXT_PUBLIC_AFELEIA_SITIO/);
  const widget = await leer("components/TurnstileInvisible.tsx");
  assert.match(widget, /process\.env\.NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
});

// ---------------------------------------------------------------------------
// Los formularios
// ---------------------------------------------------------------------------

const CASOS = [
  {
    formulario: "contacto",
    componente: "components/ContactForm.tsx",
    // Los mismos que iban a Netlify, sin `bot-field`.
    campos: ["nombre", "email", "telefono", "asunto", "mensaje", "idioma", "terminos", "privacidad"],
  },
  {
    formulario: "reserva-actividad",
    componente: "components/ActivityReservationForm.tsx",
    campos: [
      "actividad",
      "tipo",
      "nombre",
      "email",
      "telefono",
      "personas",
      "fecha",
      "eleccion",
      "restricciones",
      "nota",
      "idioma",
      "terminos",
      "privacidad",
    ],
  },
];

/** La llamada a `enviarFormularioAfeleia` del componente, desarmada. */
function llamada(fuente, formulario) {
  const m = fuente.match(
    new RegExp(
      `enviarFormularioAfeleia\\(\\s*"${formulario}",\\s*\\{([\\s\\S]*?)\\n\\s*\\},\\s*(\\w+),\\s*(\\w+),?\\s*\\)`,
    ),
  );
  assert.ok(m, `no se encontró enviarFormularioAfeleia("${formulario}", {...}, token, trampa)`);
  // `nombre: name` y la forma corta `email` cuentan igual. Las líneas de
  // comentario empiezan con `//` y no matchean.
  const campos = [...m[1].matchAll(/^\s*"?([\w-]+)"?\s*[:,]/gm)].map((c) => c[1]);
  return { campos, token: m[2], trampa: m[3] };
}

for (const { formulario, componente, campos } of CASOS) {
  test(`${formulario} manda los mismos campos que antes, con claves que la puerta acepta`, async () => {
    const enviados = llamada(await leer(componente), formulario).campos;
    assert.deepEqual([...enviados].sort(), [...campos].sort());
    // Contrato v1: de 1 a 30 claves `^[a-z0-9_]{1,40}$`. Una sola clave con
    // guion (`bot-field`) es un 400 para todo el envío.
    assert.ok(enviados.length >= 1 && enviados.length <= 30);
    for (const clave of enviados) assert.match(clave, /^[a-z0-9_]{1,40}$/, `clave "${clave}"`);
  });

  test(`${formulario} usa los nombres con que Afeleia arma el contacto`, async () => {
    const enviados = llamada(await leer(componente), formulario).campos;
    assert.ok(enviados.some((c) => ["correo", "email", "mail"].includes(c)), "sin correo");
    assert.ok(enviados.some((c) => ["telefono", "phone", "celular", "whatsapp"].includes(c)), "sin teléfono");
    assert.ok(enviados.some((c) => ["nombre", "name"].includes(c)), "sin nombre");
  });

  test(`${formulario} manda la trampa aparte y pide el token antes de enviar`, async () => {
    const fuente = await leer(componente);
    const { token, trampa } = llamada(fuente, formulario);
    assert.equal(trampa, "botField");
    assert.match(fuente, /value=\{botField\}/, "la trampa ya no está atada al input oculto");
    assert.doesNotMatch(fuente, /bot-field/);
    // El token sale del widget en el mismo envío: dura 300 s y sirve una vez.
    assert.match(fuente, new RegExp(`const ${token} = await \\w+\\.obtenerToken\\(\\)`));
    assert.ok(
      // El import no lleva paréntesis: el primer `enviarFormularioAfeleia(` es la llamada.
      fuente.indexOf(".obtenerToken()") < fuente.indexOf("enviarFormularioAfeleia("),
      "el token se pide después del envío",
    );
  });

  test(`${formulario} monta el widget invisible`, async () => {
    const fuente = await leer(componente);
    assert.match(fuente, /<TurnstileInvisible ref=\{\w+\} \/>/);
  });

  test(`${formulario} no deja escribir más de lo que la puerta acepta por campo`, async () => {
    const fuente = await leer(componente);
    const areas = [...fuente.matchAll(/<textarea[\s\S]*?\/>/g)].map((m) => m[0]);
    assert.ok(areas.length > 0);
    for (const area of areas) assert.match(area, /maxLength=\{LARGO_MAXIMO_CAMPO\}/);
  });
}

test("el tope por campo es el del contrato", () => {
  assert.equal(LARGO_MAXIMO_CAMPO, 5000);
});

test("los dos formularios piden y mandan el consentimiento", async () => {
  // El consentimiento se pierde de dos maneras: sacando la casilla del
  // formulario, o dejándola sin mandar el campo. Las dos tienen que doler.
  for (const { formulario, componente } of CASOS) {
    const fuente = await leer(componente);
    assert.match(fuente, /<PrivacyConsent/, `${componente} debería montar <PrivacyConsent />`);
    const enviados = llamada(fuente, formulario).campos;
    assert.ok(enviados.includes("privacidad"), `${componente} no manda "privacidad"`);
    assert.ok(enviados.includes("terminos"), `${componente} no manda "terminos"`);
  }
  const consent = await leer("components/PrivacyConsent.tsx");
  assert.match(consent, /required/, "la casilla debería ser `required`");
  assert.match(consent, /PRIVACIDAD_PDF/, "el enlace debería salir de lib/legal.ts");
});

// ---------------------------------------------------------------------------
// Netlify Forms, retirado
// ---------------------------------------------------------------------------

test("Netlify Forms ya no está en el código", async () => {
  for (const ruta of ["lib/netlifyForms.ts", "public/__forms.html"]) {
    await assert.rejects(access(new URL(ruta, raiz)), `${ruta} sigue existiendo`);
  }
  for (const carpeta of ["components", "lib"]) {
    const archivos = await readdir(new URL(`${carpeta}/`, raiz), { recursive: true });
    for (const archivo of archivos.filter((a) => /\.(ts|tsx)$/.test(a))) {
      const fuente = await leer(`${carpeta}/${archivo}`);
      assert.doesNotMatch(fuente, /submitToNetlifyForms|netlifyForms|__forms\.html/, `${carpeta}/${archivo}`);
    }
  }
});

// ---------------------------------------------------------------------------
// CSP
// ---------------------------------------------------------------------------

test("la CSP deja cargar el widget de Cloudflare y llamar a la puerta", async () => {
  process.env.NEXT_PUBLIC_AFELEIA_API_URL = BASE;
  const mod = await import(`../next.config.ts?turnstile=${Date.now()}`);
  const headers = await mod.default.headers();
  const csp = headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy").value;
  const directiva = (nombre) => csp.split("; ").find((d) => d.startsWith(`${nombre} `))?.split(" ").slice(1) ?? [];

  assert.ok(directiva("script-src").includes("https://challenges.cloudflare.com"), "script-src");
  assert.ok(directiva("frame-src").includes("https://challenges.cloudflare.com"), "frame-src");
  // El POST sale del navegador hacia el origen de las Edge Functions.
  assert.ok(directiva("connect-src").includes("https://ref.supabase.co"), "connect-src");
  // Y nada más se abrió: el script de Turnstile no necesita conectar ni
  // enviar formularios a Cloudflare.
  assert.ok(!directiva("connect-src").includes("https://challenges.cloudflare.com"));
  assert.ok(!directiva("form-action").includes("https://challenges.cloudflare.com"));
  // El mapa sigue.
  assert.ok(directiva("frame-src").includes("https://www.google.com"));
});

// ---------------------------------------------------------------------------
// El build de producción
// ---------------------------------------------------------------------------

/**
 * Sin la clave pública del widget, el sitio compila igual y cada formulario falla
 * al enviar: para siempre y en verde. Es la clase de error que este repo ya frena
 * en el prebuild para el catálogo (`scripts/catalogo-validacion.mjs`). En el build
 * de producción de Netlify se corta, y Netlify deja publicado el deploy anterior.
 */
const { razonFormulariosSinConfigurar } = await import("../scripts/formularios-validacion.mjs");
const CLAVE_REAL = "0x4AAAAAAAB1cD2eF3gH4iJ5";

test("en producción, sin una clave del widget que sirva, el build se frena", () => {
  const malas = [
    undefined,
    "",
    "   ",
    ` ${CLAVE_REAL}`,
    `${CLAVE_REAL}\n`,
    // Las claves de prueba de Cloudflare: con ellas la puerta rechaza cada token.
    "1x00000000000000000000AA",
    "2x00000000000000000000AB",
    "1x00000000000000000000BB",
    "2x00000000000000000000BB",
    "3x00000000000000000000FF",
  ];
  for (const clave of malas) {
    const razon = razonFormulariosSinConfigurar({ CONTEXT: "production", NEXT_PUBLIC_TURNSTILE_SITE_KEY: clave });
    assert.ok(razon, `debía frenar con ${JSON.stringify(clave)}`);
    assert.match(razon, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  }
  assert.equal(
    razonFormulariosSinConfigurar({ CONTEXT: "production", NEXT_PUBLIC_TURNSTILE_SITE_KEY: CLAVE_REAL }),
    null,
  );
  assert.ok(razonFormulariosSinConfigurar({ CONTEXT: "Production" }), "CONTEXT sin distinguir mayúsculas");
});

test("fuera de producción no frena: los previews y el local no tienen el widget", () => {
  for (const CONTEXT of [undefined, "deploy-preview", "branch-deploy", "dev"]) {
    assert.equal(razonFormulariosSinConfigurar({ CONTEXT }), null, `CONTEXT=${CONTEXT}`);
    assert.equal(
      razonFormulariosSinConfigurar({ CONTEXT, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA" }),
      null,
    );
  }
});

test("el prebuild corre la validación y un error la hace salir con 1", async () => {
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const pkg = JSON.parse(await leer("package.json"));
  assert.match(pkg.scripts.prebuild, /^node scripts\/formularios-validacion\.mjs && /);

  const correr = (clave) =>
    spawnSync(process.execPath, ["scripts/formularios-validacion.mjs"], {
      cwd: fileURLToPath(raiz),
      env: { ...process.env, CONTEXT: "production", NEXT_PUBLIC_TURNSTILE_SITE_KEY: clave },
      encoding: "utf8",
    });
  const mala = correr("   ");
  assert.equal(mala.status, 1);
  assert.match(mala.stderr, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.equal(correr(CLAVE_REAL).status, 0);
});
