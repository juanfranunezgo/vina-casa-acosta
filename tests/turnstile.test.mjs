import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

/**
 * El widget invisible de Cloudflare Turnstile, sin React (`lib/turnstile.ts`).
 * `components/TurnstileInvisible.tsx` solo lo monta y lo desmonta; todo lo que
 * puede salir mal —el script que no carga, el widget que falla, Cloudflare que
 * pide que la persona actúe, el plazo— vive acá y se prueba ejecutándolo.
 */

const { crearTurnstile, crearCargadorTurnstile, ErrorTurnstile, TURNSTILE_SCRIPT_URL } =
  await import("@/lib/turnstile");

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = () => new Promise((r) => setImmediate(r));

/** Una API de Turnstile falsa que anota las llamadas y guarda las opciones del render. */
function apiFalsa() {
  const llamadas = [];
  const estado = { opciones: null };
  const api = {
    render(contenedor, opciones) {
      llamadas.push(["render", contenedor]);
      estado.opciones = opciones;
      return "w1";
    },
    reset: (id) => llamadas.push(["reset", id]),
    execute: (contenedor) => llamadas.push(["execute", contenedor]),
    remove: (id) => llamadas.push(["remove", id]),
  };
  return { api, llamadas, estado };
}

const CONTENEDOR = { nodo: "div" };

function montado(opciones = {}) {
  const falsa = apiFalsa();
  const turnstile = crearTurnstile({
    sitekey: "clave-publica",
    cargarApi: () => Promise.resolve(falsa.api),
    ...opciones,
  });
  turnstile.montar(CONTENEDOR);
  return { turnstile, ...falsa };
}

async function motivoDelError(promesa) {
  try {
    await promesa;
  } catch (error) {
    assert.ok(error instanceof ErrorTurnstile, `se esperaba ErrorTurnstile y llegó ${error}`);
    return error.motivo;
  }
  assert.fail("debía fallar y se resolvió");
}

test("pinta el widget con la configuración que exige la puerta", async () => {
  const { estado, llamadas } = montado();
  await tick();
  assert.deepEqual(llamadas, [["render", CONTENEDOR]]);
  const o = estado.opciones;
  assert.equal(o.sitekey, "clave-publica");
  // La puerta rechaza cualquier otra acción (contrato v1, decisión 7).
  assert.equal(o.action, "formulario");
  // El token se pide al enviar y la persona solo ve algo si Cloudflare lo necesita.
  assert.equal(o.execution, "execute");
  assert.equal(o.appearance, "interaction-only");
  // Sin reintentos propios: cada envío hace reset + execute, y un fallo tiene
  // que llegar al formulario en vez de quedarse reintentando cada 8 s.
  assert.equal(o.retry, "never");
  // El token se pasa a mano; no hace falta el input oculto que agrega Cloudflare.
  assert.equal(o["response-field"], false);
  // El sitio no tiene modo oscuro.
  assert.equal(o.theme, "light");
});

test("obtenerToken reinicia, ejecuta y resuelve con el token del callback", async () => {
  const { turnstile, estado, llamadas } = montado();
  await tick();
  const promesa = turnstile.obtenerToken();
  await tick();
  assert.deepEqual(llamadas.slice(1), [
    ["reset", "w1"],
    ["execute", CONTENEDOR],
  ]);
  estado.opciones.callback("token-1");
  assert.equal(await promesa, "token-1");
});

test("cada envío pide un token nuevo", async () => {
  const { turnstile, estado, llamadas } = montado();
  await tick();
  const primero = turnstile.obtenerToken();
  await tick();
  estado.opciones.callback("a");
  await primero;
  const segundo = turnstile.obtenerToken();
  await tick();
  estado.opciones.callback("b");
  assert.equal(await segundo, "b");
  assert.equal(llamadas.filter(([q]) => q === "reset").length, 2);
});

test("si el script todavía no cargó, espera y después ejecuta", async () => {
  const falsa = apiFalsa();
  let cargar;
  const turnstile = crearTurnstile({
    sitekey: "k",
    cargarApi: () => new Promise((r) => (cargar = r)),
  });
  turnstile.montar(CONTENEDOR);
  const promesa = turnstile.obtenerToken();
  await tick();
  assert.deepEqual(falsa.llamadas, []);
  cargar(falsa.api);
  await tick();
  assert.deepEqual(falsa.llamadas.map(([q]) => q), ["render", "reset", "execute"]);
  falsa.estado.opciones.callback("tarde");
  assert.equal(await promesa, "tarde");
});

test("un error del widget llega al formulario", async () => {
  const { turnstile, estado } = montado();
  await tick();
  const promesa = turnstile.obtenerToken();
  await tick();
  estado.opciones["error-callback"]("300030");
  assert.equal(await motivoDelError(promesa), "widget");
});

test("un navegador sin soporte y un desafío que vence también", async () => {
  for (const [callback, motivo] of [
    ["unsupported-callback", "no_soportado"],
    ["timeout-callback", "tiempo_agotado"],
  ]) {
    const { turnstile, estado } = montado();
    await tick();
    const promesa = turnstile.obtenerToken();
    await tick();
    estado.opciones[callback]();
    assert.equal(await motivoDelError(promesa), motivo);
  }
});

test("sin respuesta de Cloudflare, el plazo corta", async () => {
  const { turnstile } = montado({ plazoMs: 20 });
  await tick();
  assert.equal(await motivoDelError(turnstile.obtenerToken()), "tiempo_agotado");
});

test("si Cloudflare pide que la persona actúe, el plazo se alarga", async () => {
  // Con `interaction-only` el widget aparece recién acá. Cortar a los 30 s
  // castigaría justo a quien Cloudflare quiere ver: se tarda en notar la casilla.
  const { turnstile, estado } = montado({ plazoMs: 20, plazoInteractivoMs: 300 });
  await tick();
  const promesa = turnstile.obtenerToken();
  await tick();
  estado.opciones["before-interactive-callback"]();
  await esperar(60);
  estado.opciones.callback("humano");
  assert.equal(await promesa, "humano");

  const segundo = turnstile.obtenerToken();
  await tick();
  estado.opciones["before-interactive-callback"]();
  // El plazo interactivo también vence: el botón nunca queda girando para siempre.
  assert.equal(await motivoDelError(segundo), "tiempo_agotado");
});

test("si el script no carga, falla enseguida y no a los 30 s", async () => {
  // Bloqueado por una extensión o por la CSP: el formulario muestra la
  // alternativa en vez de un botón que no hace nada (manual §12, Respaldo).
  const turnstile = crearTurnstile({
    sitekey: "k",
    cargarApi: () => Promise.reject(new Error("bloqueado")),
    plazoMs: 10_000,
  });
  const pendiente = turnstile.obtenerToken();
  turnstile.montar(CONTENEDOR);
  const inicio = Date.now();
  assert.equal(await motivoDelError(pendiente), "script");
  assert.ok(Date.now() - inicio < 1_000);
  // Y el siguiente intento también, sin esperar.
  assert.equal(await motivoDelError(turnstile.obtenerToken()), "script");
});

test("sin clave pública no carga nada y falla como configuración", async () => {
  let cargas = 0;
  for (const sitekey of [undefined, ""]) {
    const turnstile = crearTurnstile({
      sitekey,
      cargarApi: () => {
        cargas += 1;
        return Promise.resolve(apiFalsa().api);
      },
    });
    turnstile.montar(CONTENEDOR);
    assert.equal(await motivoDelError(turnstile.obtenerToken()), "configuracion");
  }
  assert.equal(cargas, 0);
});

test("desmontar quita el widget, corta lo pendiente y deja volver a montar", async () => {
  // React monta dos veces en desarrollo (Strict Mode): el segundo montaje
  // tiene que pintar el widget de nuevo.
  const { turnstile, llamadas } = montado();
  await tick();
  const pendiente = turnstile.obtenerToken();
  await tick();
  turnstile.desmontar();
  assert.equal(await motivoDelError(pendiente), "desmontado");
  assert.deepEqual(llamadas.at(-1), ["remove", "w1"]);

  turnstile.montar(CONTENEDOR);
  await tick();
  assert.deepEqual(llamadas.at(-1), ["render", CONTENEDOR]);
});

test("un script que carga después de desmontar no pinta nada", async () => {
  const falsa = apiFalsa();
  let cargar;
  const turnstile = crearTurnstile({ sitekey: "k", cargarApi: () => new Promise((r) => (cargar = r)) });
  turnstile.montar(CONTENEDOR);
  turnstile.desmontar();
  cargar(falsa.api);
  await tick();
  assert.deepEqual(falsa.llamadas, []);
});

test("un callback tardío, sin nadie esperando, no rompe nada", async () => {
  const { turnstile, estado } = montado({ plazoMs: 10 });
  await tick();
  await motivoDelError(turnstile.obtenerToken());
  estado.opciones.callback("tarde");
  estado.opciones["error-callback"]("x");
});

test("un segundo pedido reemplaza al primero", async () => {
  const { turnstile, estado } = montado();
  await tick();
  const primero = turnstile.obtenerToken();
  const segundo = turnstile.obtenerToken();
  assert.equal(await motivoDelError(primero), "reemplazado");
  await tick();
  estado.opciones.callback("ultimo");
  assert.equal(await segundo, "ultimo");
});

test("si el widget tira al ejecutar, falla como widget", async () => {
  const falsa = apiFalsa();
  falsa.api.execute = () => {
    throw new Error("container not found");
  };
  const turnstile = crearTurnstile({ sitekey: "k", cargarApi: () => Promise.resolve(falsa.api) });
  turnstile.montar(CONTENEDOR);
  await tick();
  assert.equal(await motivoDelError(turnstile.obtenerToken()), "widget");
});

// ---------------------------------------------------------------------------
// La carga del script
// ---------------------------------------------------------------------------

function documentoFalso() {
  const scripts = [];
  const documento = {
    createElement(tag) {
      const listeners = {};
      const el = {
        tag,
        listeners,
        removido: false,
        addEventListener: (tipo, fn) => (listeners[tipo] = fn),
        remove() {
          el.removido = true;
        },
      };
      return el;
    },
    head: { appendChild: (el) => scripts.push(el) },
  };
  return { documento, scripts };
}

test("el script se carga una vez, de la URL de Cloudflare y en explícito", async () => {
  const { documento, scripts } = documentoFalso();
  const ventana = {};
  const cargar = crearCargadorTurnstile(documento, ventana);
  const a = cargar();
  const b = cargar();
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].tag, "script");
  assert.equal(scripts[0].src, TURNSTILE_SCRIPT_URL);
  assert.equal(TURNSTILE_SCRIPT_URL, "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
  assert.equal(scripts[0].async, true);
  const api = apiFalsa().api;
  ventana.turnstile = api;
  scripts[0].listeners.load();
  assert.equal(await a, api);
  assert.equal(await b, api);
});

test("si la API ya está en la página, no agrega otro script", async () => {
  const { documento, scripts } = documentoFalso();
  const api = apiFalsa().api;
  assert.equal(await crearCargadorTurnstile(documento, { turnstile: api })(), api);
  assert.equal(scripts.length, 0);
});

test("un script que falla se saca y el próximo intento lo vuelve a pedir", async () => {
  const { documento, scripts } = documentoFalso();
  const cargar = crearCargadorTurnstile(documento, {});
  const primero = cargar();
  scripts[0].listeners.error();
  await assert.rejects(primero);
  assert.equal(scripts[0].removido, true);

  cargar();
  assert.equal(scripts.length, 2);
});

test("un script que carga sin dejar la API cuenta como fallo", async () => {
  const { documento, scripts } = documentoFalso();
  const cargar = crearCargadorTurnstile(documento, {});
  const promesa = cargar();
  scripts[0].listeners.load();
  await assert.rejects(promesa);
});
