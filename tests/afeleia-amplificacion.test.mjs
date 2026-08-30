import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { createOutageMemo, crearVueloUnico } = await import("@/lib/afeleia/contract");

/**
 * Cuantas veces se le pregunta a una API que ya se sabe caida.
 *
 * La segunda ronda de review lo midio: un build contra un socket que corta la
 * conexion hacia **53 intentos** donde una API sana hace **una sola consulta**.
 * El motivo no es el timeout —el `AbortSignal` esta bien puesto— sino que Next
 * cachea las respuestas pero NO los fallos: cada pagina y cada worker vuelven a
 * intentar. Con un sitio da igual; con cien sitios desplegando durante una caida
 * de Afeleia son ~5.300 intentos contra el servicio que ya se cayo, o sea que
 * cada web conectada empuja un poco mas fuerte justo en el peor momento.
 *
 * El arreglo es recordar el fallo por proceso, por la misma ventana que dura el
 * ISR (60s): el primer intento de cada worker decide, los demas leen la copia. La
 * memoria vive aca —pura, con reloj inyectable— porque `lib/afeleia/catalog.ts`
 * importa React y el snapshot y `node --test` no puede cargarlo.
 */

test("sin nada recordado no hay nada vigente", () => {
  const memo = createOutageMemo(60_000);
  assert.equal(memo.current(), null);
});

test("lo recordado se sirve mientras dura la ventana", () => {
  let ahora = 1_000;
  const memo = createOutageMemo(60_000, () => ahora);

  memo.remember("snapshot");
  assert.equal(memo.current(), "snapshot");

  ahora += 59_999;
  assert.equal(memo.current(), "snapshot", "dentro de la ventana no se vuelve a intentar");
});

test("cumplida la ventana se vuelve a intentar", () => {
  // Es la mitad que impide que el arreglo se convierta en otro bug: sin
  // vencimiento, un proceso que vio una caida serviria el snapshot para siempre
  // aunque Afeleia hubiera vuelto hace horas.
  let ahora = 1_000;
  const memo = createOutageMemo(60_000, () => ahora);
  memo.remember("snapshot");

  ahora += 60_000;
  assert.equal(memo.current(), null);
});

test("un reloj que salta hacia atras NO estira la ventana", () => {
  // Hallazgo de la tercera ronda: con `Date.now()`, atrasar el reloj 60 s
  // extendia la ventana otro tanto y el sitio seguia sirviendo el snapshot
  // despues de que la API habia vuelto. Pasa de verdad: un ajuste de NTP, una VM
  // que se despierta, un contenedor con el reloj corregido al arrancar.
  let ahora = 1_000_000;
  const memo = createOutageMemo(60_000, () => ahora);
  memo.remember("snapshot");

  ahora -= 60_000;
  assert.equal(memo.current(), null, "ante un reloj que retrocede, se vuelve a intentar");
});

// El guard de ortografia del reloj (una regex sobre el texto del parametro por
// defecto) se reemplazo por el de comportamiento del final de este archivo: la
// version de texto se ponia roja ante un refactor equivalente y podia no
// notar un cambio de reloj de verdad.

test("una respuesta buena borra el recuerdo de la caida", () => {
  let ahora = 1_000;
  const memo = createOutageMemo(60_000, () => ahora);
  memo.remember("snapshot");

  memo.forget();

  assert.equal(memo.current(), null, "si la API contesto, el fallo viejo ya no manda");
});

// --- Guard de texto: como lo usa el modulo que no se puede cargar -------------

const fuente = readFileSync(new URL("../lib/afeleia/catalog.ts", import.meta.url), "utf8");

test("el catalogo consulta la memoria antes de volver a llamar a la API", () => {
  assert.match(fuente, /createOutageMemo/);
  // El orden importa: preguntar por la memoria DESPUES del fetch no ahorraria
  // ningun intento, que es justo lo que hay que ahorrar.
  const usoMemoria = fuente.indexOf(".current()");
  const usoFetch = fuente.indexOf("await fetch(");
  assert.ok(usoMemoria > 0 && usoMemoria < usoFetch, "la memoria se consulta antes del fetch");
});

test("una respuesta sana olvida la caida anterior", () => {
  assert.match(fuente, /\.forget\(\)/);
});

test("la ventana de la memoria es la misma del ISR", () => {
  // Recordar mas que la ventana de revalidacion dejaria al sitio sirviendo el
  // snapshot despues de que la API volvio; recordar menos no ahorraria intentos.
  assert.match(fuente, /createOutageMemo(<[^>]*>)?\(\s*CATALOG_REVALIDATE_SECONDS \* 1000/);
});

// --- El vuelo unico: lo que la memoria NO contiene ---------------------------
// La memoria de arriba recuerda el RESULTADO, y por eso no contiene una rafaga:
// durante la rafaga todavia no hay resultado. La review lo midio —30 rutas
// simultaneas contra una API que tarda 750 ms y corta: 30 conexiones y 30
// degradaciones, todas leyendo la memoria antes de que el primer fallo llegara a
// escribirla—. Lo que la contiene es compartir la promesa EN VUELO.
//
// Esto se ejecuta, y no es un detalle: la primera version del guard era una
// expresion regular sobre `catalog.ts` y se quedaba verde con el single-flight
// desactivado (borrando una asignacion, o cambiando `return await` por `return`).

test("treinta llamadas simultaneas disparan UNA sola consulta", async () => {
  let disparos = 0;
  let resolver;
  const enEspera = new Promise((listo) => {
    resolver = listo;
  });
  const consultar = crearVueloUnico(async () => {
    disparos += 1;
    await enEspera;
    return "catalogo";
  });

  const rafaga = Promise.all(Array.from({ length: 30 }, () => consultar()));
  resolver();
  const resultados = await rafaga;

  assert.equal(disparos, 1, `abrio ${disparos} consultas para 30 lecturas simultaneas`);
  assert.deepEqual(new Set(resultados), new Set(["catalogo"]));
});

test("cumplida la consulta, la siguiente vuelve a preguntar", async () => {
  // Sin esto el proceso se colgaria para siempre de una lectura vieja y el sitio
  // dejaria de revalidar: compartir una consulta EN CURSO no es cachear.
  let disparos = 0;
  const consultar = crearVueloUnico(async () => {
    disparos += 1;
    return disparos;
  });

  assert.equal(await consultar(), 1);
  assert.equal(await consultar(), 2);
  assert.equal(disparos, 2);
});

test("si la consulta falla, falla para todos y la siguiente reintenta", async () => {
  let disparos = 0;
  const consultar = crearVueloUnico(async () => {
    disparos += 1;
    throw new Error(`fallo ${disparos}`);
  });

  const resultados = await Promise.allSettled([consultar(), consultar(), consultar()]);
  assert.deepEqual(
    resultados.map((r) => r.status),
    ["rejected", "rejected", "rejected"],
  );
  assert.equal(disparos, 1, "los tres se colgaron de la misma consulta");

  await assert.rejects(() => consultar(), /fallo 2/, "y la siguiente vuelve a intentar");
});

test("el reloj de por defecto no es el de pared", async () => {
  // Guard de comportamiento, no de ortografia: la version anterior fijaba el
  // texto del parametro por defecto, asi que un refactor equivalente la ponia
  // roja y un cambio de reloj real podia no notarse. Aca se mueve `Date.now`
  // hacia atras: con el reloj de pared la ventana se estiraba —el hallazgo— y
  // con el monotonico no pasa nada.
  const real = Date.now;
  try {
    Date.now = () => 1_000_000;
    const memo = createOutageMemo(60_000);
    memo.remember("snapshot");
    Date.now = () => 0;
    assert.equal(memo.current(), "snapshot", "el vencimiento no puede depender de Date.now");
  } finally {
    Date.now = real;
  }
});
