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
import {
  CandadoOcupado,
  RUTA_SNAPSHOT,
  conElParTomado,
  confirmarPar,
  escribirAtomico,
  estadoDelPar,
  repararDesdeRespaldo,
  respaldarPar,
  sellar,
} from "./catalogo-integridad.mjs";
import {
  avisoPorVaciado,
  mensajeDeCuerpoIlegible,
  razonParaRechazar,
} from "./catalogo-validacion.mjs";
import { catalogEndpointFor } from "../lib/afeleia/contract.ts";
// `@next/env` es CommonJS: el named import no existe desde ESM.
import entornoDeNext from "@next/env";

/**
 * Las mismas variables que ven el prebuild y `next build`.
 *
 * Sin esto, la salida que el propio mensaje de error del prebuild recomienda
 * —«regeneralo con `npm run catalogo:snapshot`»— fallaba con "faltan datos de
 * conexion" en la maquina de cualquiera que tuviera su configuracion en
 * `.env.local`: la quinta capa mirando otra cosa que las otras cuatro. Las
 * banderas `--url` y `--sitio` siguen ganando, que es lo que permite regenerar
 * contra otro sitio a proposito.
 */
entornoDeNext.loadEnvConfig(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."), false, {
  info: () => {},
  error: (mensaje) => console.error(mensaje),
});

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

// La misma composición que usa el runtime (`catalogEndpointFor`), y no un pegado
// de texto acá: con una base que trae query —`.../functions/v1?token=x`— el
// pegado producía `/functions/v1?token=x/catalogo-publico?sitio=...`, o sea el
// path metido dentro del query. Si el generador y el runtime arman la URL
// distinto, el snapshot se refresca contra un endpoint y el sitio consulta otro.
const endpoint = catalogEndpointFor(apiUrl, sitio);
if (!endpoint) {
  console.error(
    `Con --url ${JSON.stringify(apiUrl)} no se puede armar el endpoint: tiene que ser una URL ` +
      "http(s) sin query, sin fragmento y sin credenciales. El snapshot NO se tocó.",
  );
  process.exit(1);
}
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
} catch (error) {
  // Una API que manda los headers y nunca termina el cuerpo agota el mismo reloj
  // y aparecia como "no es JSON", que manda a buscar el problema al lugar
  // equivocado. Ver `mensajeDeCuerpoIlegible`.
  console.error(`${mensajeDeCuerpoIlegible(error, TIMEOUT_MS)} El snapshot NO se tocó.`);
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
// Son DOS archivos que tienen que quedar de acuerdo —el snapshot y su sello— y el
// sistema de archivos no sabe reemplazar dos de una vez. Guardar el estado previo
// en memoria no alcanzaba: la review mato el proceso entre los dos `rename` y la
// memoria se fue con él, dejando un snapshot nuevo con un sello viejo y a nadie
// que lo supiera. Ahora el respaldo va A DISCO antes de tocar nada, el par se
// verifica contra el disco después de escribirlo, y el respaldo se retira recién
// cuando cierra. Si el proceso muere en el medio, el respaldo queda y el prebuild
// de la corrida siguiente repara antes de que el build lea nada.
// Todo el protocolo vive en `catalogo-integridad.mjs`.

/** Cuántos productos tenía el snapshot que está por reemplazarse. */
async function productosDelSnapshotActual() {
  try {
    const actual = JSON.parse(await readFile(OUTPUT, "utf8"));
    return Array.isArray(actual.productos) ? actual.productos.length : null;
  } catch {
    return null;
  }
}

/**
 * El reemplazo entero, con el par tomado.
 *
 * Todo lo que toca disco va acá adentro —contar los productos previos,
 * respaldar, escribir, sellar, verificar y confirmar— porque el candado protege
 * la SECUENCIA, no cada escritura: dos generadores intercalados dejaban snapshot
 * de uno con sello del otro y sin respaldos (tercera ronda de review). El `fetch`
 * quedó afuera a propósito: una API lenta no tiene por qué bloquear al que quiera
 * reparar el par.
 */
async function reemplazarElPar() {
  const aviso = avisoPorVaciado(await productosDelSnapshotActual(), payload.productos.length);
  if (aviso) console.warn(`Aviso: ${aviso}`);

  await respaldarPar();

  let sello;
  try {
    await escribirAtomico(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
    // Sellar acá y no en un paso aparte: un snapshot regenerado sin sellar deja el
    // test de integridad en rojo, y "acordarse de correr el sello" es exactamente
    // el tipo de regla que ya falló una vez. Y se sella EL PAYLOAD, no lo que haya
    // en el disco: releerlo era la mitad de la carrera entre dos generadores.
    sello = await sellar(payload);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    const reparacion = await repararDesdeRespaldo();
    console.error(
      reparacion.restaurado
        ? `No se pudo escribir el snapshot (${detalle}). Se restauró el anterior.`
        : `No se pudo escribir el snapshot (${detalle}), y tampoco restaurar` +
            `${reparacion.fallos.length > 0 ? `: ${reparacion.fallos.join(", ")}` : ` (${reparacion.motivo})`}. ` +
            "El respaldo (data/*.bak) queda para el próximo prebuild. Revisar data/ a mano.",
    );
    // `exitCode` y no `exit()`: cortar el proceso de golpe con escrituras de disco
    // todavía cerrándose hace abortar a libuv en Windows (`UV_HANDLE_CLOSING`), y
    // eso devuelve 3221226505 en vez de 1 — un fallo entendible disfrazado de
    // choque incomprensible. Salir por las buenas deja el código correcto.
    process.exitCode = 1;
    return;
  }

  // No alcanza con que las dos escrituras no hayan tirado: lo que el sitio va a
  // servir es lo que quedó EN EL DISCO, así que se lee de ahí y se comprueba que
  // el sello describa a este snapshot. Si no cierra, se vuelve al respaldo: un
  // par incoherente hace fallar el test de integridad del próximo que lo toque,
  // sin que nadie sepa de dónde salió.
  const estado = await estadoDelPar();
  if (!estado.coherente) {
    const reparacion = await repararDesdeRespaldo();
    console.error(
      `El snapshot y su sello no quedaron de acuerdo (${estado.motivo}). ` +
        (reparacion.restaurado
          ? "Se restauró el par anterior."
          : `Y tampoco se pudo restaurar${reparacion.fallos.length > 0 ? `: ${reparacion.fallos.join(", ")}` : ""}. ` +
            "El respaldo (data/*.bak) queda para el próximo prebuild. Revisar data/ a mano."),
    );
    process.exitCode = 1;
    return;
  }

  await confirmarPar();
  console.info(
    `Snapshot escrito: ${payload.productos.length} productos, ` +
      `${payload.categorias?.length ?? 0} categorías → data/catalogo-fallback.json\n` +
      `Sello: sha256 ${sello.hash}`,
  );
}

try {
  // 10 s como mucho: sumado a los 15 s del fetch entra holgado en los 45 s con
  // los que el wrapper corta este proceso. Esperar mas seria hacerse matar a la
  // mitad del protocolo, que es peor que no refrescar.
  await conElParTomado(reemplazarElPar, { esperaMs: 10_000 });
} catch (error) {
  if (error instanceof CandadoOcupado) {
    // Rendirse es correcto: el que tiene el candado está escribiendo un snapshot
    // igual de bueno que el nuestro, y colgarse esperándolo dentro de un build es
    // convertir una molestia en un despliegue perdido. El wrapper lo cuenta como
    // "no se pudo refrescar" y sigue con lo committeado.
    console.error(`${error.message}. El snapshot NO se tocó.`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
