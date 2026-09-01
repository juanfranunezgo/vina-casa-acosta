import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { activities, activityPath, VENDIMIA_HUB } = await import("@/data/activities");
const { wines } = await import("@/data/wines");
const { routing } = await import("@/i18n/routing");

/**
 * La regla que este test cuida: el mapeo de la migracion no puede apuntar a una
 * URL que este sitio no sirve.
 *
 * Es el riesgo real de esa tabla: son 57 reglas escritas contra un sitio que
 * sigue cambiando, y viven en otro repositorio. Cuando las fichas de actividad
 * se mudaron bajo su categoria, los tres tours del mapeo quedaron apuntando a
 * la URL plana —que hoy es un 308— sin que nada fallara. Un 301 hacia un 308 es
 * una cadena, y un 301 hacia un 404 tira a la basura justo la autoridad que la
 * migracion existe para traspasar.
 *
 * Solo se valida lo que este repo puede resolver: las rutas de actividad, de
 * vino y las estaticas. Un destino fuera de ese conjunto hace fallar el test a
 * proposito, para que agregar una regla obligue a decidir aca si es valida.
 */

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const CSV = join(RAIZ, "docs", "migracion-casaacosta-redirects.csv");
const BASE = "https://vinacasaacosta.cl";

/**
 * Las rutas validas se arman para LOS TRES IDIOMAS, no solo para español.
 *
 * El sitio viejo tambien tenia sus paginas en ingles —`/wines/`, `/our-story/`,
 * `/contact/`, `/tours/`, `/shop/`—, y siguen indexadas. Mandarlas al castellano
 * seria cambiarle el idioma a quien viene de un resultado en ingles; mandarlas
 * a `/en/...` es la traduccion literal de la URL vieja. Cuando el mapeo era solo
 * español esa mitad del sitio viejo no tenia a donde ir.
 */
const CAMINOS_ESTATICOS = [
  "",
  "/vinos",
  "/tienda",
  "/actividades",
  "/historia",
  "/staff",
  "/contacto",
];

const rutasValidas = new Set(
  routing.locales.flatMap((locale) => [
    ...CAMINOS_ESTATICOS.map((p) => `/${locale}${p}`),
    ...activities.map((a) => `/${locale}${activityPath(a)}`),
    ...wines.map((w) => `/${locale}/vinos/${w.slug}`),
    ...(VENDIMIA_HUB ? [`/${locale}${VENDIMIA_HUB}`] : []),
  ]),
);

const reglas = readFileSync(CSV, "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim() !== "")
  .slice(1)
  .map((l) => {
    const [origen, destino] = l.split(",");
    return { origen: origen.trim(), destino: destino.trim() };
  });

test("el mapeo no esta vacio", () => {
  assert.ok(reglas.length > 50, `solo se leyeron ${reglas.length} reglas`);
});

test("todos los destinos son URLs del dominio nuevo, con idioma en la ruta", () => {
  for (const { origen, destino } of reglas) {
    const conIdioma = routing.locales.some((l) => destino.startsWith(`${BASE}/${l}`));
    assert.ok(conIdioma, `${origen} apunta a ${destino}`);
  }
});

test("todos los destinos son rutas que el sitio sirve", () => {
  for (const { origen, destino } of reglas) {
    const ruta = destino.slice(BASE.length).split("#")[0].replace(/\/$/, "");
    assert.ok(
      rutasValidas.has(ruta),
      `${origen} apunta a ${ruta}, que no es una ruta de este sitio`,
    );
  }
});

test("ningun destino usa un ancla que el indice ya no publica", () => {
  for (const { origen, destino } of reglas) {
    const ancla = destino.split("#")[1];
    assert.ok(
      ancla === undefined || ancla === "tours",
      `${origen} apunta al ancla #${ancla}, que el indice de actividades no publica`,
    );
  }
});

test("cada ficha de vino del mapeo existe en el catalogo", () => {
  const delMapeo = reglas
    .filter((r) => r.destino.includes("/vinos/"))
    .map((r) => r.destino.split("/vinos/")[1]);
  for (const slug of delMapeo) {
    assert.ok(
      wines.some((w) => w.slug === slug),
      `el mapeo manda a /es/vinos/${slug}, que no esta en el catalogo`,
    );
  }
});

test("no hay dos reglas para el mismo origen", () => {
  const vistos = new Set();
  for (const { origen } of reglas) {
    assert.ok(!vistos.has(origen), `${origen} aparece dos veces`);
    vistos.add(origen);
  }
});
