import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

const sitemap = (await import("@/app/sitemap")).default;
const { activities, activityPath } = await import("@/data/activities");
const { routing } = await import("@/i18n/routing");

/**
 * El sitemap se deriva de los datos justamente para que nadie tenga que
 * acordarse de agregar la actividad numero quince. Este test es lo que hace que
 * ese "se deriva" sea verdad y no una intencion escrita en un comentario.
 */

const entries = sitemap();
const urls = entries.map((e) => e.url);

test("cada actividad esta en el sitemap en los tres idiomas", () => {
  for (const activity of activities) {
    for (const locale of routing.locales) {
      const esperada = `/${locale}${activityPath(activity)}`;
      assert.ok(
        urls.some((url) => url.endsWith(esperada)),
        `falta ${esperada}`,
      );
    }
  }
});

test("no quedo ninguna URL plana de actividad", () => {
  // Las viejas /actividades/tour-ombu redirigen; anunciarlas en el sitemap
  // seria pedirle a Google que rastree lo que acabamos de mover.
  for (const url of urls) {
    assert.doesNotMatch(url, /\/actividades\/(tour-|ombu$|bera$|carmenere$)/, url);
  }
});

test("ninguna URL del sitemap es una que redirige", () => {
  // Las URLs padre de categoria redirigen en 307. Anunciar en el sitemap algo
  // que redirige es pedirle a Google que rastree un salto de mas.
  for (const url of urls) {
    assert.doesNotMatch(
      url,
      /\/actividades\/(tours|talleres|experiencias)$/,
      `${url} redirige, no corresponde anunciarla`,
    );
  }
});

test("cada entrada declara los tres hreflang mas x-default", () => {
  for (const entry of entries) {
    const langs = Object.keys(entry.alternates.languages);
    for (const locale of routing.locales) {
      assert.ok(langs.includes(locale), `${entry.url} sin ${locale}`);
    }
    assert.ok(langs.includes("x-default"), `${entry.url} sin x-default`);
  }
});

test("no hay URLs repetidas", () => {
  assert.equal(new Set(urls).size, urls.length);
});

test("toda URL lleva prefijo de idioma", () => {
  const prefijos = routing.locales.map((l) => `/${l}`);
  for (const url of urls) {
    const ruta = new URL(url).pathname;
    assert.ok(
      prefijos.some((p) => ruta === p || ruta.startsWith(`${p}/`)),
      `${url} no lleva prefijo de idioma`,
    );
  }
});
