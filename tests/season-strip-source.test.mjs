import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Tres reglas de la franja de meses que se rompen sin sintoma visible:
 *
 * 1. Los nombres de mes se piden a Intl con el locale. Escribirlos a mano son 36
 *    strings nuevos por mantener y una fuente mas de desincronizacion.
 * 2. El mes disponible se distingue por color Y por peso tipografico. Solo color
 *    incumple WCAG 1.4.1 y la pagina se ve igual de bien para quien lo escribio.
 * 3. La grilla va aria-hidden y el dato viaja en un parrafo. Doce abreviaturas
 *    leidas en voz alta no dicen nada.
 */

const source = await readFile(
  new URL("../components/SeasonStrip.tsx", import.meta.url),
  "utf8",
);

test("los nombres de mes salen de Intl, no escritos a mano", () => {
  assert.match(source, /Intl\.DateTimeFormat/);
  assert.doesNotMatch(source, /enero|febrero|January|janeiro/i);
});

test("la enumeracion del resumen usa Intl.ListFormat", () => {
  assert.match(source, /Intl\.ListFormat/);
});

test("el mes disponible no se distingue solo por color", () => {
  assert.match(source, /font-semibold|font-bold/);
});

test("la franja es una lista, no una fila de divs", () => {
  assert.match(source, /<ul/);
  assert.match(source, /<li/);
});

test("la grilla se oculta a la accesibilidad y el resumen queda en texto", () => {
  // El dato lo lleva el parrafo de resumen, que es visible ademas de accesible:
  // un sr-only aparte seria la misma frase dicha dos veces.
  assert.match(source, /<ul[\s\S]{0,120}aria-hidden/);
  assert.doesNotMatch(source, /sr-only/);
});

test("no es un componente de cliente: no necesita estado ni eventos", () => {
  assert.doesNotMatch(source, /"use client"/);
});
