import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { mesesDeTemporada } = await import("@/lib/temporada");
const { activities } = await import("@/data/activities");

/**
 * La temporada de una actividad, como texto.
 *
 * Hasta el 2026-09-24 la ficha tenía una caja propia, "¿Cuándo se hace?", con
 * una franja de doce meses (`SeasonStrip`). Juan Francisco la sacó: en once de
 * las catorce fichas decía "Todo el año", un dato que no distingue nada. En las
 * otras tres sí importa —las alpacas se esquilan en primavera—, así que ahí la
 * temporada pasa a ser una línea de las condiciones.
 *
 * Las reglas que la franja cuidaba siguen: los meses los nombra Intl con el
 * idioma de la página, y la enumeración la arma Intl.ListFormat.
 */

test("una actividad de todo el año no tiene temporada que decir", () => {
  assert.equal(mesesDeTemporada([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "es"), undefined);
});

test("los meses los nombra Intl, en el idioma de la página", () => {
  assert.equal(mesesDeTemporada([9, 10, 11], "es"), "septiembre, octubre y noviembre");
  assert.equal(mesesDeTemporada([9, 10, 11], "en"), "September, October, and November");
  assert.equal(mesesDeTemporada([7, 8], "pt"), "julho e agosto");
});

test("los meses salen en orden del año aunque el dato venga desordenado", () => {
  assert.equal(mesesDeTemporada([10, 9], "es"), "septiembre y octubre");
});

test("las tres actividades de temporada la dicen, y las de todo el año no", () => {
  const conTemporada = activities
    .filter((activity) => mesesDeTemporada(activity.months, "es") !== undefined)
    .map((activity) => activity.slug)
    .sort();
  assert.deepEqual(conTemporada, ["alpacas", "apicultura", "lagrimas-de-invierno"]);
});

const ficha = await readFile(
  new URL("../app/[locale]/actividades/[categoria]/[slug]/page.tsx", import.meta.url),
  "utf8",
);

test("la ficha pide el mensaje crudo, con su placeholder intacto", () => {
  // Con `t()` next-intl parsea el ICU, no encuentra `months` y devuelve la
  // ruta de la clave como texto: la ficha imprimiría
  // "activities.labels.seasonAvailableIn" en pantalla.
  assert.match(ficha, /t\.raw\("seasonAvailableIn"\)/);
});

test("el mensaje sigue trayendo el placeholder que la ficha reemplaza", async () => {
  for (const locale of ["es", "en", "pt"]) {
    const bundle = JSON.parse(
      await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
    );
    assert.match(bundle.activities.labels.seasonAvailableIn, /\{months\}/, locale);
  }
});

test("la caja de la franja de meses ya no está en la ficha", () => {
  assert.doesNotMatch(ficha, /SeasonStrip/);
});
