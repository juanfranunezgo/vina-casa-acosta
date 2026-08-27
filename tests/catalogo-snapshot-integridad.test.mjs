import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashCatalogo } from "../scripts/catalogo-integridad.mjs";

/**
 * El snapshot es la unica fuente de precios cuando la API no responde, y hasta
 * este sello nada detectaba una edicion a mano: sin CI, sin checksum, sin test.
 * Ya paso una vez (commit 7691b44, "regenerate the snapshot so it stops being a
 * hand edit").
 *
 * Esto no impide la edicion —quien la haga puede recalcular el hash— pero la
 * vuelve deliberada en vez de silenciosa, que es el objetivo real.
 *
 * El hash va sobre el JSON reparseado, no sobre los bytes: el repo no tiene
 * .gitattributes y una conversion CRLF cambiaria los bytes sin cambiar un dato.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const snapshot = JSON.parse(
  await readFile(path.join(ROOT, "data", "catalogo-fallback.json"), "utf8"),
);
const sello = JSON.parse(
  await readFile(path.join(ROOT, "data", "catalogo-fallback.integrity.json"), "utf8"),
);

test("el snapshot committeado coincide con su sello", () => {
  assert.equal(
    hashCatalogo(snapshot),
    sello.hash,
    "data/catalogo-fallback.json no coincide con su sello: o se edito a mano " +
      "(no se hace: es salida de `npm run catalogo:snapshot`) o se regenero sin " +
      "sellar (correr `npm run catalogo:sellar`).",
  );
});

test("el sello describe el mismo snapshot", () => {
  assert.equal(sello.generado_en, snapshot.generado_en);
  assert.equal(sello.productos, snapshot.productos.length);
  assert.equal(sello.algoritmo, "sha256");
});

test("el hash cambia si cambia un precio", () => {
  const alterado = JSON.parse(JSON.stringify(snapshot));
  alterado.productos[0].precio += 1;
  assert.notEqual(hashCatalogo(alterado), sello.hash);
});

test("el hash NO cambia por espacios ni por fin de linea", () => {
  const reformateado = JSON.parse(JSON.stringify(snapshot, null, 8));
  assert.equal(hashCatalogo(reformateado), sello.hash);
});

test("el snapshot viaja con las definiciones de atributos", () => {
  // El generador escribe el `payload` entero, asi que la clave nueva viaja sola.
  // Si esto falla, el snapshot se regenero contra una API que todavia no las
  // publica —o se congelo uno viejo— y el modo degradado perdio las etiquetas.
  assert.ok(
    Array.isArray(snapshot.definiciones_atributos),
    "regenerar con `npm run catalogo:snapshot` contra una API que publique definiciones",
  );
  assert.ok(snapshot.definiciones_atributos.length > 0);
});

test("DEC-6: ningun atributo del snapshot se publica sin su definicion", () => {
  // La comprobacion que hasta ahora solo existia contra la API viva
  // (`verificar-catalogo-publico.mjs`), ahora tambien offline y en cada `npm
  // test`. Un atributo sin definicion es un dato que el sitio no sabe rotular:
  // se dibujaria con su clave cruda o no se dibujaria en absoluto.
  const definidas = new Set(snapshot.definiciones_atributos.map((d) => d.clave));
  const huerfanas = new Set();
  for (const producto of snapshot.productos) {
    for (const clave of Object.keys(producto.atributos ?? {})) {
      if (!definidas.has(clave)) huerfanas.add(`${producto.slug}.${clave}`);
    }
  }
  assert.deepEqual([...huerfanas], []);
});

test("los subcampos declarados alcanzan para dibujar las fichas del snapshot", () => {
  // El mismo agujero que DEC-6 pero un nivel mas abajo: un subcampo cargado en
  // el panel y no declarado en la definicion no se dibuja en ningun lado, y esa
  // ausencia es silenciosa.
  const ficha = snapshot.definiciones_atributos.find((d) => d.clave === "ficha_tecnica");
  if (!ficha) return;
  const declarados = new Set((ficha.subcampos ?? []).map((s) => s.clave));
  const invisibles = new Set();
  for (const producto of snapshot.productos) {
    const grupo = producto.atributos?.ficha_tecnica;
    if (!grupo || typeof grupo !== "object") continue;
    for (const clave of Object.keys(grupo)) {
      if (!declarados.has(clave)) invisibles.add(`${producto.slug}.${clave}`);
    }
  }
  assert.deepEqual([...invisibles], []);
});
