import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  confirmarPar,
  estadoDelPar,
  hashCatalogo,
  recuperarPar,
  respaldarPar,
} from "../scripts/catalogo-integridad.mjs";

/**
 * El snapshot y su sello son DOS archivos que describen una sola cosa, y el
 * sistema de archivos no sabe reemplazar dos archivos de una vez: entre un
 * `rename` y el otro hay una ventana. La review la abrio a proposito —mato el
 * generador justo ahi— y quedo un snapshot nuevo con un sello viejo, con el
 * wrapper anunciando que «el snapshot committeado quedo intacto», que era falso.
 *
 * Cerrar la ventana no se puede. Lo que si se puede, y es lo que estos tests
 * fijan, es que un par a medias sea SIEMPRE detectable y reparable:
 *
 *   1. antes de tocar nada se deja un respaldo de los dos archivos;
 *   2. despues de escribir se verifica el par contra el disco;
 *   3. si no cierra, se vuelve al respaldo;
 *   4. y si el proceso muere en el medio, el respaldo sigue ahi: la corrida
 *      siguiente lo encuentra y repara antes de que el build lea nada.
 */

const CATALOGO = {
  version: 1,
  sitio: "vina-casa-acosta",
  generado_en: "2026-08-28T12:00:00.000Z",
  categorias: [],
  productos: [
    { slug: "bera", nombre: "Bera", precio: 23000, imagenes: [], agotado: false, atributos: {} },
  ],
};

const OTRO_CATALOGO = {
  ...CATALOGO,
  generado_en: "2026-08-28T18:00:00.000Z",
  productos: [
    { slug: "guidai", nombre: "Guidai", precio: 25000, imagenes: [], agotado: false, atributos: {} },
  ],
};

const selloDe = (catalogo) => ({
  algoritmo: "sha256",
  hash: hashCatalogo(catalogo),
  generado_en: catalogo.generado_en,
  sellado_en: "2026-08-28T12:00:01.000Z",
  productos: catalogo.productos.length,
});

const existe = async (ruta) => {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
};

/** Un par committeado y coherente, en una carpeta propia. */
async function parSano(catalogo = CATALOGO) {
  const carpeta = await mkdtemp(path.join(tmpdir(), "catalogo-par-"));
  const snapshot = path.join(carpeta, "catalogo-fallback.json");
  const sello = path.join(carpeta, "catalogo-fallback.integrity.json");
  await writeFile(snapshot, `${JSON.stringify(catalogo, null, 2)}\n`, "utf8");
  await writeFile(sello, `${JSON.stringify(selloDe(catalogo), null, 2)}\n`, "utf8");
  return { carpeta, snapshot, sello };
}

test("un par coherente se reconoce como coherente", async () => {
  const { snapshot, sello } = await parSano();
  const estado = await estadoDelPar(snapshot, sello);
  assert.equal(estado.coherente, true, estado.motivo ?? "");
});

test("un snapshot nuevo con el sello viejo NO pasa por coherente", async () => {
  // Exactamente el estado que dejo la muerte entre los dos renames.
  const { snapshot, sello } = await parSano();
  await writeFile(snapshot, `${JSON.stringify(OTRO_CATALOGO, null, 2)}\n`, "utf8");

  const estado = await estadoDelPar(snapshot, sello);
  assert.equal(estado.coherente, false);
  assert.match(estado.motivo ?? "", /hash|sello/i);
});

test("morir entre los dos renames se repara en la corrida siguiente", async () => {
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  // El generador alcanzo a reemplazar el snapshot y murio antes del sello.
  await writeFile(snapshot, `${JSON.stringify(OTRO_CATALOGO, null, 2)}\n`, "utf8");
  assert.equal((await estadoDelPar(snapshot, sello)).coherente, false);

  const reparacion = await recuperarPar(snapshot, sello);

  assert.equal(reparacion.reparado, true);
  assert.equal((await estadoDelPar(snapshot, sello)).coherente, true);
  assert.deepEqual(
    JSON.parse(await readFile(snapshot, "utf8")),
    CATALOGO,
    "tiene que volver el par anterior entero, no el snapshot a medias",
  );
  assert.equal(await existe(`${snapshot}.bak`), false, "el respaldo se consume al reparar");
});

test("morir despues de escribir el par completo conserva lo nuevo", async () => {
  // El otro lado de la ventana: los dos renames salieron y el proceso murio
  // antes de borrar el respaldo. Reparar aca seria PERDER el refresco bueno.
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  await writeFile(snapshot, `${JSON.stringify(OTRO_CATALOGO, null, 2)}\n`, "utf8");
  await writeFile(sello, `${JSON.stringify(selloDe(OTRO_CATALOGO), null, 2)}\n`, "utf8");

  const reparacion = await recuperarPar(snapshot, sello);

  assert.equal(reparacion.reparado, false);
  assert.deepEqual(JSON.parse(await readFile(snapshot, "utf8")), OTRO_CATALOGO);
  assert.equal(await existe(`${snapshot}.bak`), false);
});

test("sin respaldo pendiente no hay nada que reparar", async () => {
  const { snapshot, sello } = await parSano();
  const reparacion = await recuperarPar(snapshot, sello);
  assert.equal(reparacion.reparado, false);
  assert.equal(reparacion.habiaRespaldo, false);
});

test("confirmar el par retira el respaldo", async () => {
  const { snapshot, sello } = await parSano();
  await respaldarPar(snapshot, sello);
  assert.equal(await existe(`${snapshot}.bak`), true);
  assert.equal(await existe(`${sello}.bak`), true);

  await confirmarPar(snapshot, sello);

  assert.equal(await existe(`${snapshot}.bak`), false);
  assert.equal(await existe(`${sello}.bak`), false);
});
