import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { createOutageMemo } = await import("@/lib/afeleia/contract");
const fuenteContrato = readFileSync(
  new URL("../lib/afeleia/contract.ts", import.meta.url),
  "utf8",
);

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

test("el reloj de por defecto es monotonico", () => {
  // La proteccion de arriba es la red; esto es la regla: `performance.now()` no
  // salta. Si alguien vuelve a `Date.now()`, este test se pone rojo.
  assert.match(fuenteContrato, /now: \(\) => number = \(\) => performance\.now\(\)/);
  assert.doesNotMatch(fuenteContrato, /now: \(\) => number = Date\.now/);
});

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
