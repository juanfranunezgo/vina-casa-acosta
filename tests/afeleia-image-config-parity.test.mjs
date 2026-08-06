import test from "node:test";
import assert from "node:assert/strict";
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern.js";

/**
 * `renderableImage` y `images.remotePatterns` son dos implementaciones de UNA
 * regla. Si el guard acepta un `src` que la config rechaza, `next/image` tira una
 * excepcion en desarrollo y la pagina SSG entera responde 500 — el bug H-49.
 *
 * El invariante es de contencion, no de igualdad: el guard puede ser MAS estricto
 * (hoy lo es: no acepta images.unsplash.com, que la config si permite). Lo que no
 * puede es ser mas permisivo en ningun caso.
 *
 * Se corre el matcher real de Next, no una reimplementacion: una copia del
 * algoritmo se desincronizaria igual que las dos constantes que este test cuida.
 */

const API = "https://syvwfadxohizvytanjnx.supabase.co/functions/v1";
const HOST = "https://syvwfadxohizvytanjnx.supabase.co";

// Las dos partes derivan de esta variable. Se fija ACA y no se lee de .env.local
// a proposito: el test compara guard contra config bajo un entorno conocido, y
// asi da el mismo resultado en la maquina de cualquiera y en cualquier rama.
process.env.NEXT_PUBLIC_AFELEIA_API_URL = API;

const { renderableImage, STORAGE_PUBLIC_PREFIX } = await import("../lib/afeleia/contract.ts");
const config = await (await import("../next.config.ts")).default;

/** URLs absolutas plausibles: lo que el panel puede llegar a guardar. */
const CANDIDATAS = [
  `${HOST}/storage/v1/object/public/assets/c/s/productos/bera.png`,
  `${HOST}/storage/v1/object/public/`,
  `${HOST}/storage/v1/object/public`,
  `${HOST}/storage/v1/object/publico/x.png`,
  `${HOST}/storage/v1/object/public/x.png?download=1`,
  `${HOST}/storage/v1/object/public/x.png#frag`,
  `${HOST}/rest/v1/productos`,
  `${HOST}:443/storage/v1/object/public/x.png`,
  `https://SYVWFADXOHIZVYTANJNX.supabase.co/storage/v1/object/public/x.png`,
  `http://syvwfadxohizvytanjnx.supabase.co/storage/v1/object/public/x.png`,
  `https://evil.example/storage/v1/object/public/x.png`,
  `https://images.unsplash.com/photo-123`,
  `${HOST}/storage/v1/object/public/../../rest/v1/productos`,
  `${HOST}/storage/v1/object/public/a%2Fb.png`,
  `${HOST}/storage/v1/object/public/carpeta con espacio/x.png`,
];

test("todo src absoluto que el guard acepta, remotePatterns tambien lo acepta", () => {
  for (const url of CANDIDATAS) {
    if (renderableImage([url], API) === undefined) continue;
    assert.ok(
      hasRemoteMatch([], config.images.remotePatterns, new URL(url)),
      `el guard acepta un src que next/image rechazaria (500 en dev): ${url}`,
    );
  }
});

test("el guard efectivamente acepta la URL de Storage: el test de arriba no es vacuo", () => {
  const buena = `${HOST}/storage/v1/object/public/assets/x.png`;
  assert.equal(renderableImage([buena], API), buena);
  assert.ok(hasRemoteMatch([], config.images.remotePatterns, new URL(buena)));
});

test("la config deriva su patron del mismo prefijo que el guard", () => {
  const afeleia = config.images.remotePatterns.find(
    (p) => p.hostname !== "images.unsplash.com",
  );
  assert.ok(afeleia, "falta el patron del Storage de Afeleia en remotePatterns");
  assert.equal(afeleia.pathname, `${STORAGE_PUBLIC_PREFIX}**`);
});
