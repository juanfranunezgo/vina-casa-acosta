import test from "node:test";
import assert from "node:assert/strict";

/**
 * Las tres URLs de tour estan publicadas y pueden estar compartidas por
 * WhatsApp o indexadas. Mover la ficha sin redirigir las convierte en 404.
 *
 * La distincion permanente/temporal no es cosmetica. Next emite 308 para
 * `permanent: true` y 307 para `false` (verificado en
 * node_modules/next/dist/docs/.../redirects.md): el 308 lo cachea el navegador
 * para siempre. Las URLs padre van a dejar de redirigir cuando exista su
 * landing, asi que tienen que ser temporales; las de tour no vuelven nunca.
 */

const config = await (await import("../next.config.ts")).default;
const redirects = await config.redirects();

function find(source) {
  return redirects.find((r) => r.source === source);
}

const TOUR_MOVES = [
  ["/:locale(es|en|pt)/actividades/tour-ombu", "/:locale/actividades/tours/ombu"],
  ["/:locale(es|en|pt)/actividades/tour-bera", "/:locale/actividades/tours/bera"],
  [
    "/:locale(es|en|pt)/actividades/tour-carmenere",
    "/:locale/actividades/tours/carmenere",
  ],
];

for (const [source, destination] of TOUR_MOVES) {
  test(`la URL vieja ${source} redirige permanente`, () => {
    const rule = find(source);
    assert.ok(rule, `falta el redirect de ${source}`);
    assert.equal(rule.destination, destination);
    assert.equal(rule.permanent, true);
  });
}

const CATEGORY_PARENTS = ["tours", "talleres", "experiencias"];

for (const category of CATEGORY_PARENTS) {
  test(`la URL padre /actividades/${category} redirige temporal`, () => {
    const rule = find(`/:locale(es|en|pt)/actividades/${category}`);
    assert.ok(rule, `falta el redirect padre de ${category}`);
    assert.equal(
      rule.permanent,
      false,
      "tiene que ser temporal: la landing esta planificada",
    );
    assert.match(rule.destination, /^\/:locale\/actividades/);
  });
}

test("ninguna regla captura locales que no existen", () => {
  for (const rule of redirects) {
    if (!rule.source.includes(":locale")) continue;
    assert.match(rule.source, /:locale\(es\|en\|pt\)/, rule.source);
  }
});

test("ningun destino apunta a una URL que a su vez redirige", () => {
  // Una cadena de redirects diluye la senal y suma un viaje al servidor.
  const fuentes = new Set(redirects.map((r) => r.source.replace("(es|en|pt)", "")));
  for (const rule of redirects) {
    const destinoSinHash = rule.destination.split("#")[0];
    assert.ok(!fuentes.has(destinoSinHash), `cadena: ${rule.source} -> ${rule.destination}`);
  }
});
