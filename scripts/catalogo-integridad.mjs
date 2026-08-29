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
import { createHash, randomUUID } from "node:crypto";
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
  // El temporal lleva PID y un identificador unico, y eso NO es cosmetica: con un
  // nombre fijo (`<destino>.tmp`) dos escritores sobre el mismo checkout se
  // pisaban —el primero en renombrar se llevaba el archivo que el otro estaba por
  // renombrar, y el segundo moria con ENOENT—. Pasa con dos builds en paralelo,
  // con un `catalogo:snapshot` a mano mientras corre un build, y con cualquier
  // agente que dispare las dos cosas. Cada escritor con su temporal no compite.
  const temporal = `${destino}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    // `recursive` porque una ruta temporal vieja puede haber quedado como
    // carpeta: sin esto, `writeFile` fallaba con EISDIR y nada la limpiaba.
    await rm(temporal, { recursive: true, force: true }).catch(() => {});
    await writeFile(temporal, contenido, "utf8");
    await renombrarConReintento(temporal, destino);
  } catch (error) {
    // Sin esto, un `rename` que falla —el destino bloqueado, por ejemplo— deja
    // el temporal tirado en `data/`, donde alguien termina commiteandolo.
    await rm(temporal, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/** Errores de Windows que significan "el destino esta ocupado ahora mismo". */
const OCUPADO = new Set(["EPERM", "EACCES", "EBUSY"]);

/**
 * `rename` con reintento corto sobre el destino ocupado.
 *
 * En Linux —donde construye Netlify— `rename` reemplaza atomicamente aunque haya
 * otro escritor: no hace falta reintentar y este bucle nunca corre. En Windows,
 * en cambio, reemplazar un archivo que otro proceso tiene abierto un instante
 * falla con EPERM, asi que dos generadores simultaneos en la maquina de
 * desarrollo se rechazaban entre si. Ceder unos milisegundos y reintentar
 * convierte esa colision en una espera; si el destino sigue ocupado despues de
 * ~500 ms, el error es real y se propaga.
 */
async function renombrarConReintento(temporal, destino, intentos = 10) {
  for (let intento = 1; ; intento += 1) {
    try {
      await rename(temporal, destino);
      return;
    } catch (error) {
      const ocupado = OCUPADO.has(error?.code);
      if (!ocupado || intento >= intentos) throw error;
      await new Promise((listo) => setTimeout(listo, intento * 10));
    }
  }
}

/**
 * --- El par: snapshot + sello -------------------------------------------------
 *
 * Los dos archivos describen una sola cosa y el sistema de archivos no sabe
 * reemplazar dos de una vez: entre un `rename` y el otro hay una ventana, y morir
 * ahi deja un snapshot nuevo con un sello viejo. Cerrar la ventana no se puede;
 * lo que se puede es que un par a medias sea siempre DETECTABLE y REPARABLE.
 *
 * El protocolo, en cuatro pasos: respaldar los dos archivos, escribir, verificar
 * el par contra el disco, y recien entonces retirar el respaldo. Si algo falla en
 * el medio se vuelve al respaldo; y si el proceso muere sin llegar a retirarlo,
 * el respaldo queda en disco y la corrida siguiente lo encuentra y decide —por el
 * estado del par, no por adivinanza— si reparar o confirmar.
 *
 * El respaldo NO es un archivo mas que alguien tenga que limpiar: se retira solo
 * en la misma corrida, y si sobrevive es porque hubo una muerte. `data/*.bak`
 * esta ignorado por git para que un respaldo huerfano no termine commiteado.
 */

/** Ruta del respaldo de un archivo del par. */
export const rutaDeRespaldo = (ruta) => `${ruta}.bak`;

/** Contenido de un archivo, o `null` si no existe o no se puede leer. */
async function leerSiExiste(ruta) {
  try {
    return await readFile(ruta, "utf8");
  } catch {
    return null;
  }
}

/**
 * Si el sello que hay en disco describe al snapshot que hay en disco.
 *
 * Es la unica pregunta que importa despues de una escritura interrumpida, y la
 * responde el mismo hash que usa el test de integridad: si el par cierra, el
 * refresco termino; si no cierra, quedo a medias.
 *
 * @returns {Promise<{coherente: boolean, motivo: string | null}>}
 */
export async function estadoDelPar(snapshot = SNAPSHOT, sello = SELLO) {
  const [crudoSnapshot, crudoSello] = await Promise.all([
    leerSiExiste(snapshot),
    leerSiExiste(sello),
  ]);
  if (crudoSnapshot === null) return { coherente: false, motivo: "no hay snapshot" };
  if (crudoSello === null) return { coherente: false, motivo: "no hay sello" };

  let catalogo;
  let marca;
  try {
    catalogo = JSON.parse(crudoSnapshot);
  } catch {
    return { coherente: false, motivo: "el snapshot no es JSON legible" };
  }
  try {
    marca = JSON.parse(crudoSello);
  } catch {
    return { coherente: false, motivo: "el sello no es JSON legible" };
  }

  if (hashCatalogo(catalogo) !== marca.hash) {
    return { coherente: false, motivo: "el hash del sello no describe a este snapshot" };
  }
  if (marca.generado_en !== catalogo.generado_en) {
    return { coherente: false, motivo: "el sello y el snapshot declaran distinto generado_en" };
  }
  if (marca.productos !== catalogo.productos?.length) {
    return { coherente: false, motivo: "el sello cuenta otra cantidad de productos" };
  }
  return { coherente: true, motivo: null };
}

/** Deja una copia de los dos archivos antes de tocarlos. */
export async function respaldarPar(snapshot = SNAPSHOT, sello = SELLO) {
  for (const ruta of [snapshot, sello]) {
    const contenido = await leerSiExiste(ruta);
    if (contenido !== null) await escribirAtomico(rutaDeRespaldo(ruta), contenido);
  }
}

/** Retira el respaldo: el par nuevo quedo escrito y verificado. */
export async function confirmarPar(snapshot = SNAPSHOT, sello = SELLO) {
  await Promise.all(
    [snapshot, sello].map((ruta) =>
      rm(rutaDeRespaldo(ruta), { force: true }).catch(() => {}),
    ),
  );
}

/** Vuelve los dos archivos a su respaldo. Devuelve los que no se pudieron restaurar. */
export async function restaurarPar(snapshot = SNAPSHOT, sello = SELLO) {
  const fallos = [];
  for (const ruta of [snapshot, sello]) {
    const respaldo = await leerSiExiste(rutaDeRespaldo(ruta));
    if (respaldo === null) continue;
    try {
      await escribirAtomico(ruta, respaldo);
    } catch (error) {
      fallos.push(`${path.basename(ruta)} (${error instanceof Error ? error.message : error})`);
    }
  }
  return fallos;
}

/**
 * Deja el par en un estado coherente antes de que nadie lo lea.
 *
 * Se llama al empezar el prebuild. Si hay respaldo pendiente, alguien murio en el
 * medio de un refresco, y hay dos escenarios que se distinguen mirando el par y
 * no adivinando:
 *
 *   - **el par NO cierra** → murio entre los dos renames: se vuelve al respaldo,
 *     que es el ultimo par que si cerraba;
 *   - **el par cierra** → murio despues de escribir los dos y antes de retirar el
 *     respaldo: reparar aca seria PERDER un refresco bueno, asi que solo se
 *     retira el respaldo.
 *
 * @returns {Promise<{habiaRespaldo: boolean, reparado: boolean, motivo: string | null, fallos: string[]}>}
 */
export async function recuperarPar(snapshot = SNAPSHOT, sello = SELLO) {
  const respaldos = await Promise.all(
    [snapshot, sello].map((ruta) => leerSiExiste(rutaDeRespaldo(ruta))),
  );
  const habiaRespaldo = respaldos.some((contenido) => contenido !== null);
  if (!habiaRespaldo) {
    return { habiaRespaldo: false, reparado: false, motivo: null, fallos: [] };
  }

  const estado = await estadoDelPar(snapshot, sello);
  if (estado.coherente) {
    await confirmarPar(snapshot, sello);
    return { habiaRespaldo: true, reparado: false, motivo: null, fallos: [] };
  }

  const fallos = await restaurarPar(snapshot, sello);
  await confirmarPar(snapshot, sello);
  return { habiaRespaldo: true, reparado: true, motivo: estado.motivo, fallos };
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
