#!/usr/bin/env node
/**
 * Sello de procedencia de `data/catalogo-fallback.json`.
 *
 * El snapshot es salida de `npm run catalogo:snapshot`, nunca un archivo que se
 * edita a mano — pero eso era una regla escrita en la documentación, y una regla
 * que nadie puede ver desde el editor no es un control. Este sello la vuelve
 * verificable: `tests/catalogo-snapshot-integridad.test.mjs` se pone rojo cuando
 * el JSON y su hash dejan de coincidir.
 *
 * No es a prueba de manipulación: quien edite el snapshot puede recalcular el
 * sello. Lo que evita es la edición SILENCIOSA, que es la que costó un incidente.
 *
 * Uso:
 *   npm run catalogo:sellar     (lo llama también `catalogo:snapshot` al terminar)
 */

import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = path.join(ROOT, "data", "catalogo-fallback.json");
const SELLO = path.join(ROOT, "data", "catalogo-fallback.integrity.json");

/** Los dos archivos del fallback, para quien tenga que restaurarlos. */
export const RUTA_SNAPSHOT = SNAPSHOT;
export const RUTA_SELLO = SELLO;

/**
 * Escribe reemplazando de una sola vez: primero a un temporal, después `rename`.
 *
 * `writeFile` directo TRUNCA el destino y recién entonces escribe. Si el proceso
 * muere en el medio —y el generador corre dentro de un build, que puede quedarse
 * sin tiempo o sin memoria— el fallback queda como medio JSON: `next build` no
 * lo puede importar y el sitio pierde su última línea de defensa justo mientras
 * intenta desplegarse. `rename` en el mismo volumen es atómico: o está el
 * archivo viejo entero, o está el nuevo entero.
 */
export async function escribirAtomico(destino, contenido) {
  const temporal = `${destino}.tmp`;
  try {
    await writeFile(temporal, contenido, "utf8");
    await rename(temporal, destino);
  } catch (error) {
    // Sin esto, un `rename` que falla —el destino bloqueado, por ejemplo— deja
    // el temporal tirado en `data/`, donde alguien termina commiteándolo.
    await rm(temporal, { force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Hash del CONTENIDO, no del archivo.
 *
 * Se reserializa lo parseado a propósito: el repo no tiene `.gitattributes`, así
 * que un checkout con conversión CRLF cambiaría los bytes sin cambiar un solo
 * dato — y un sello que se rompe solo por eso se desactiva a los dos días.
 */
export function hashCatalogo(payload) {
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

export async function sellar() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT, "utf8"));
  const sello = {
    algoritmo: "sha256",
    hash: hashCatalogo(snapshot),
    generado_en: snapshot.generado_en,
    sellado_en: new Date().toISOString(),
    productos: snapshot.productos.length,
  };
  await escribirAtomico(SELLO, `${JSON.stringify(sello, null, 2)}\n`);
  return sello;
}

// Solo cuando se ejecuta directo: importarlo desde un test no debe escribir nada.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sello = await sellar();
  console.info(
    `Sello escrito: ${sello.productos} productos, generado_en ${sello.generado_en}\n` +
      `  sha256 ${sello.hash}`,
  );
}
