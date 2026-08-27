#!/usr/bin/env node
/**
 * Regenera `data/catalogo-fallback.json`: la copia committeada del catálogo que
 * la web sirve cuando la API de Afeleia no responde.
 *
 * El snapshot es la respuesta del contrato v1 con UNA transformación: las rutas de
 * imagen se reapuntan a `public/vinos/` (ver `localizarImagenes`). Salvo eso,
 * `lib/afeleia/catalog.ts` lo pasa por el mismo adaptador que la respuesta viva —
 * si divergieran, el modo degradado se vería distinto del normal justo el día que
 * importa.
 *
 * Uso:
 *   npm run catalogo:snapshot -- --url <API_URL> --sitio <slug>
 *
 * Sin flags toma `NEXT_PUBLIC_AFELEIA_API_URL` y `NEXT_PUBLIC_AFELEIA_SITIO`.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { RUTA_SELLO, RUTA_SNAPSHOT, escribirAtomico, sellar } from "./catalogo-integridad.mjs";
import { razonParaRechazar } from "./catalogo-validacion.mjs";

/**
 * Techo de espera de la API. Sin esto, una API que acepta la conexión y nunca
 * contesta deja el proceso colgado para siempre: en un build de Netlify eso
 * consume el timeout global y **bloquea el despliegue**, que es exactamente la
 * regla que el fallback existe para no violar («un Afeleia caído no puede además
 * impedir desplegar»). Colgado es peor que caído: caído se detecta.
 */
const TIMEOUT_MS = 15_000;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = RUTA_SNAPSHOT;
/** Carpeta de `public/` donde viven las fotos de botella committeadas. */
const LOCAL_IMAGE_DIR = "/vinos";

function readFlag(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  // Un flag sin valor (o seguido de otro flag) es un error de invocación, no un
  // valor vacío que deba pisar la variable de entorno.
  if (!value || value.startsWith("--")) {
    console.error(`Falta el valor de --${name}`);
    process.exit(1);
  }
  return value;
}

const apiUrl = readFlag("url") ?? process.env.NEXT_PUBLIC_AFELEIA_API_URL;
const sitio = readFlag("sitio") ?? process.env.NEXT_PUBLIC_AFELEIA_SITIO;

if (!apiUrl || !sitio) {
  console.error(
    "Faltan datos de conexión.\n" +
      "  npm run catalogo:snapshot -- --url <API_URL> --sitio <slug>\n" +
      "  (o definir NEXT_PUBLIC_AFELEIA_API_URL y NEXT_PUBLIC_AFELEIA_SITIO)",
  );
  process.exit(1);
}

const endpoint = `${apiUrl.replace(/\/+$/, "")}/catalogo-publico?sitio=${encodeURIComponent(sitio)}`;
console.info(`Consultando ${endpoint}`);

// La API caída es el caso NORMAL de este script —es el motivo por el que existe
// el fallback— así que se informa como los demás fallos y no como un stack trace.
let response;
try {
  response = await fetch(endpoint, { signal: AbortSignal.timeout(TIMEOUT_MS) });
} catch (error) {
  const detalle = error instanceof Error ? error.message : String(error);
  const colgada = error instanceof Error && error.name === "TimeoutError";
  console.error(
    colgada
      ? `La API no respondió en ${TIMEOUT_MS / 1000}s. El snapshot NO se tocó.`
      : `No se pudo consultar la API (${detalle}). El snapshot NO se tocó.`,
  );
  process.exit(1);
}
if (!response.ok) {
  console.error(`La API respondió ${response.status}. El snapshot NO se tocó.`);
  process.exit(1);
}

let payload;
try {
  payload = await response.json();
} catch {
  console.error("La API respondió algo que no es JSON. El snapshot NO se tocó.");
  process.exit(1);
}

// Nunca pisar un snapshot bueno con uno inservible: el fallback es la última
// línea de defensa de la web, y desde que se refresca en cada build esta
// comprobación corre en cada deploy. Incluye que la respuesta sea DE ESTE SITIO
// y que cumpla el mismo contrato que exige el runtime — ver `razonParaRechazar`.
const rechazo = razonParaRechazar(payload, sitio);
if (rechazo) {
  console.error(`Respuesta rechazada: ${rechazo}. El snapshot NO se tocó.`);
  process.exit(1);
}

/**
 * Las imágenes del snapshot apuntan a `public/` y no al Storage de Afeleia.
 *
 * El snapshot se sirve justo cuando NO hay API, y una URL de Storage la resuelve
 * un host que en ese escenario puede ser el que se cayó — además de que la URL
 * generada en local (`http://127.0.0.1:54321/...`) no existe en producción y
 * `next/image` la rechazaría por no estar en `remotePatterns`. Las fotos de
 * botella ya viajan committeadas en `public/vinos/`, así que el modo degradado
 * usa esas: es lo que garantiza que el fallback se vea igual que el `wines.ts`
 * de siempre. Si alguna no está, se conserva la URL remota y se avisa.
 */
function localizarImagenes(productos) {
  const sinFotoLocal = [];
  const duenoDe = new Map();
  const colisiones = [];
  for (const producto of productos) {
    producto.imagenes = producto.imagenes.map((url) => {
      const archivo = path.posix.basename(new URL(url, "http://local").pathname);
      const rutaPublica = `${LOCAL_IMAGE_DIR}/${archivo}`;
      if (!existsSync(path.join(ROOT, "public", LOCAL_IMAGE_DIR, archivo))) {
        sinFotoLocal.push(`${producto.slug} → ${url}`);
        return url;
      }
      // El mapeo es por nombre de archivo: dos productos cuyas fotos remotas
      // terminan con el mismo basename quedan apuntando a la misma imagen local
      // y en modo degradado se ven iguales, sin que nada lo diga. Con 13
      // productos no pasa; es un bug de crecimiento.
      const previo = duenoDe.get(rutaPublica);
      if (previo !== undefined && previo !== producto.slug) {
        colisiones.push(`${rutaPublica} ← ${previo} y ${producto.slug}`);
      } else {
        duenoDe.set(rutaPublica, producto.slug);
      }
      return rutaPublica;
    });
  }
  return { sinFotoLocal, colisiones };
}

const { sinFotoLocal, colisiones } = localizarImagenes(payload.productos);
if (sinFotoLocal.length > 0) {
  console.warn(
    `Aviso: ${sinFotoLocal.length} imagen(es) sin copia en public${LOCAL_IMAGE_DIR}/ — el fallback las pedirá al Storage:\n  ${sinFotoLocal.join("\n  ")}`,
  );
}
if (colisiones.length > 0) {
  console.warn(
    `Aviso: ${colisiones.length} foto(s) local(es) compartida(s) por más de un producto — en modo degradado se verán iguales:\n  ${colisiones.join("\n  ")}`,
  );
}

// --- Reemplazo del fallback: de todo o nada -----------------------------------
// Son DOS archivos que tienen que quedar de acuerdo —el snapshot y su sello— y
// hasta acá se escribían en secuencia, sin red: si el sello fallaba, quedaba un
// snapshot nuevo con un sello viejo (integridad en rojo) y encima el mensaje
// decía «el snapshot NO se tocó», que era mentira. Ahora el estado previo se
// guarda en memoria y se restaura si algo falla en el medio.

/** Contenido actual de un archivo, o `null` si todavía no existe. */
async function leerSiExiste(ruta) {
  try {
    return await readFile(ruta, "utf8");
  } catch {
    return null;
  }
}

const previo = {
  snapshot: await leerSiExiste(OUTPUT),
  sello: await leerSiExiste(RUTA_SELLO),
};

/**
 * Devuelve los archivos que NO se pudieron restaurar.
 *
 * Cada uno se intenta por separado y ningún fallo interrumpe al siguiente: si
 * restaurar el sello falla, el snapshot igual tiene que volver a su estado. Y
 * nada de esto puede lanzar — una excepción acá moriría como rechazo sin
 * capturar, con stack trace, en medio de un build (visto en la verificación).
 */
async function restaurar() {
  const fallos = [];
  for (const [ruta, contenido] of [
    [OUTPUT, previo.snapshot],
    [RUTA_SELLO, previo.sello],
  ]) {
    if (contenido === null) continue;
    try {
      await escribirAtomico(ruta, contenido);
    } catch (error) {
      fallos.push(`${path.basename(ruta)} (${error instanceof Error ? error.message : error})`);
    }
  }
  return fallos;
}

let sello;
try {
  await escribirAtomico(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  // Sellar acá y no en un paso aparte: un snapshot regenerado sin sellar deja el
  // test de integridad en rojo, y "acordarse de correr el sello" es exactamente
  // el tipo de regla que ya falló una vez.
  sello = await sellar();
} catch (error) {
  const detalle = error instanceof Error ? error.message : String(error);
  const fallos = await restaurar();
  console.error(
    fallos.length === 0
      ? `No se pudo escribir el snapshot (${detalle}). Se restauró el anterior.`
      : `No se pudo escribir el snapshot (${detalle}), y tampoco restaurar: ${fallos.join(", ")}. ` +
          `Revisar data/ a mano: el fallback puede haber quedado a medias.`,
  );
  // `exitCode` y no `exit()`: cortar el proceso de golpe con escrituras de disco
  // todavía cerrándose hace abortar a libuv en Windows (`UV_HANDLE_CLOSING`), y
  // eso devuelve 3221226505 en vez de 1 — un fallo entendible disfrazado de
  // choque incomprensible. Salir por las buenas deja el código correcto.
  process.exitCode = 1;
}
if (sello) {
  console.info(
    `Snapshot escrito: ${payload.productos.length} productos, ${payload.categorias?.length ?? 0} categorías → data/catalogo-fallback.json\n` +
      `Sello: sha256 ${sello.hash}`,
  );
}
