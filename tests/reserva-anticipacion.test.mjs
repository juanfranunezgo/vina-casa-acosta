import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { primeraFechaReservable } from "../lib/fechaReserva.ts";
import { activities } from "../data/activities.ts";

/**
 * Anticipación de reserva (`minAdvanceDays`): el yoga se reserva con 5 días de
 * aviso desde el 2026-09-23, a pedido de la viña. El calendario del formulario
 * no deja elegir antes, y la ficha y la ayuda del campo lo dicen.
 *
 * Lo que este test cuida y el build no:
 * - que "hoy" sea el de Chile y no el de UTC (de noche en Chile, UTC ya cambió
 *   de día y el calendario se comía un día);
 * - que el número de la ficha y el del calendario no puedan divergir.
 */

const raiz = new URL("../", import.meta.url);
const LOCALES = ["es", "en", "pt"];
const bundles = Object.fromEntries(
  await Promise.all(
    LOCALES.map(async (locale) => [
      locale,
      JSON.parse(await readFile(new URL(`messages/${locale}.json`, raiz), "utf8")),
    ]),
  ),
);

test("de noche en Chile, hoy sigue siendo hoy aunque UTC ya esté en mañana", () => {
  // 23 de septiembre, 22:30 en Chile (horario de verano, UTC-3).
  const noche = new Date("2026-09-24T01:30:00Z");
  assert.equal(primeraFechaReservable(0, noche), "2026-09-23");
  assert.equal(primeraFechaReservable(5, noche), "2026-09-28");
  // 22 de septiembre, 23:00 en Chile.
  assert.equal(primeraFechaReservable(0, new Date("2026-09-23T02:00:00Z")), "2026-09-22");
});

test("la anticipación cruza el fin de mes y el de año", () => {
  assert.equal(primeraFechaReservable(5, new Date("2026-09-28T15:00:00Z")), "2026-10-03");
  assert.equal(primeraFechaReservable(5, new Date("2026-12-30T15:00:00Z")), "2027-01-04");
});

test("sin anticipación declarada, se reserva desde hoy", () => {
  assert.equal(primeraFechaReservable(undefined, new Date("2026-07-10T15:00:00Z")), "2026-07-10");
});

test("el yoga se reserva con 5 días de anticipación", () => {
  const yoga = activities.find((a) => a.slug === "yoga");
  assert.equal(yoga?.minAdvanceDays, 5);
});

test("toda anticipación declarada es un entero positivo y la ficha dice el mismo número", () => {
  const conAnticipacion = activities.filter((a) => a.minAdvanceDays !== undefined);
  assert.ok(conAnticipacion.length > 0);
  for (const { slug, minAdvanceDays } of conAnticipacion) {
    assert.ok(Number.isInteger(minAdvanceDays) && minAdvanceDays > 0, `${slug}: ${minAdvanceDays}`);
    for (const locale of LOCALES) {
      const nota = bundles[locale].activities.items[slug]?.reservationNote ?? "";
      assert.match(
        nota,
        new RegExp(`\\b${minAdvanceDays}\\b`),
        `${slug} (${locale}) bloquea ${minAdvanceDays} días en el calendario y su ficha dice "${nota}"`,
      );
    }
  }
});

test("la ayuda del campo de fecha explica la anticipación en los tres idiomas", () => {
  for (const locale of LOCALES) {
    const ayuda = bundles[locale].activities.labels.form.dateHintAdvance ?? "";
    assert.match(ayuda, /\{days, plural,/, `falta dateHintAdvance con {days} en ${locale}`);
  }
});

test("la ficha le pasa la anticipación al formulario, y el formulario la usa para el mínimo", async () => {
  const [pagina, formulario] = await Promise.all([
    readFile(new URL("app/[locale]/actividades/[categoria]/[slug]/page.tsx", raiz), "utf8"),
    readFile(new URL("components/ActivityReservationForm.tsx", raiz), "utf8"),
  ]);
  assert.match(pagina, /minAdvanceDays=\{tour\.minAdvanceDays\}/);
  assert.match(formulario, /input\.min = primeraFechaReservable\(minAdvanceDays \?\? 0\)/);
  // El mínimo en UTC es justamente el error que esto corrige.
  assert.doesNotMatch(formulario, /input\.min = new Date\(\)\.toISOString\(\)/);
});
