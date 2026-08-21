import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * El mapa de /contacto estuvo roto en producción sin que nada fallara: el iframe
 * cargaba bien, pero se revelaba con el `onLoad` de React y ese evento llega una
 * sola vez. Cuando el iframe terminaba antes de que la página hidratara —cada
 * vez más probable a medida que el sitio suma componentes— nadie lo escuchaba y
 * el mapa se quedaba en `opacity: 0`: cargado, invisible y sin error en consola.
 *
 * Estos tests afirman la forma que no puede romperse así.
 */

const raiz = new URL("../", import.meta.url);
const mapaConComentarios = await readFile(
  new URL("components/MapEmbed.tsx", raiz),
  "utf8",
);
/**
 * Sin comentarios: el propio archivo explica el bug nombrando `onLoad` y
 * `useState`, y un test que lea la prosa se pone rojo por la documentación de
 * la solución.
 */
const mapa = mapaConComentarios
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const contacto = await readFile(
  new URL("app/[locale]/contacto/page.tsx", raiz),
  "utf8",
);

test("la visibilidad del mapa no depende de JavaScript", () => {
  assert.doesNotMatch(
    mapa,
    /onLoad|useState|"use client"/,
    "el mapa volvió a revelarse con estado de React: un `load` perdido lo deja invisible",
  );
});

test("el iframe no arranca transparente", () => {
  // El esqueleto va detrás y el iframe encima, siempre opaco. Cualquier
  // `opacity-0` sobre el iframe reintroduce el modo de falla.
  const iframe = mapa.match(/<iframe[\s\S]*?\/>/);
  assert.ok(iframe, "no se encontró el <iframe> del mapa");
  assert.doesNotMatch(
    iframe[0],
    /opacity-0|opacity:\s*0/,
    "el iframe no debería depender de que algo le suba la opacidad",
  );
});

test("el embed apunta a las coordenadas de la ficha, no a una búsqueda por texto", () => {
  const src = contacto.match(/mapEmbedSrc\s*=\s*\n?\s*"([^"]+)"/);
  assert.ok(src, "no se encontró `mapEmbedSrc` en la página de contacto");
  assert.match(
    src[1],
    /maps\.google\.com\/maps\?q=-?\d+\.\d+,-?\d+\.\d+/,
    "el embed debería pedir coordenadas: una dirección escrita depende de que el buscador acierte",
  );
  assert.match(src[1], /output=embed/, "al embed le falta `output=embed`");
});

test("la CSP deja pasar el frame del mapa", async () => {
  // El componente puede estar impecable y el mapa no verse igual: con
  // `frame-src 'none'` el navegador bloquea el marco y la página se queda con
  // el esqueleto puesto. Pasó —el mapa estuvo caído en producción por esto— y
  // la única señal era una línea en la consola del visitante.
  const config = await readFile(new URL("next.config.ts", raiz), "utf8");
  const frameSrc = config.match(/"frame-src":\s*\[([\s\S]*?)\]/);
  assert.ok(frameSrc, "no se encontró la directiva `frame-src` en next.config.ts");

  const { origin } = new URL(contacto.match(/mapEmbedSrc\s*=\s*\n?\s*"([^"]+)"/)[1]);
  // Los dos saltos de la redirección del embed: la CSP se evalúa en cada uno,
  // así que permitir sólo el origen del `src` corre el bloqueo al siguiente.
  for (const permitido of [origin, "https://google.com", "https://www.google.com"]) {
    assert.ok(
      frameSrc[1].includes(`"${permitido}"`),
      `frame-src no permite ${permitido}: el mapa queda bloqueado`,
    );
  }
});

test("las coordenadas del mapa y las del structured data son las mismas", async () => {
  // Si divergen, el mapa muestra un punto y Google lee otro.
  const jsonLd = await readFile(new URL("lib/siteJsonLd.ts", raiz), "utf8");
  const [, lat, lon] = contacto.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const enJsonLd = jsonLd.match(/latitude:\s*(-?\d+\.\d+)[\s\S]*?longitude:\s*(-?\d+\.\d+)/);
  assert.ok(enJsonLd, "no se encontraron las coordenadas en lib/siteJsonLd.ts");

  // El JSON-LD las declara con menos decimales: se comparan al cuarto, que a
  // esta latitud son ~11 metros.
  const redondear = (n) => Number(n).toFixed(4);
  assert.equal(redondear(lat), redondear(enJsonLd[1]));
  assert.equal(redondear(lon), redondear(enJsonLd[2]));
});
