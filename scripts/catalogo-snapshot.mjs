#!/usr/bin/env node
/**
 * Regenera `data/catalogo-fallback.json`: la copia committeada del catálogo que
 * la web sirve cuando la API de Afeleia no responde.
 *
 * El snapshot es la respuesta literal del contrato v1, así que `lib/afeleia/catalog.ts`
 * lo pasa por el mismo adaptador que la respuesta viva. Si divergieran, el modo
 * degradado se vería distinto del normal justo el día que importa.
 *
 * Uso:
 *   npm run catalogo:snapshot -- --url <API_URL> --sitio <slug>
 *
 * Sin flags toma `NEXT_PUBLIC_AFELEIA_API_URL` y `NEXT_PUBLIC_AFELEIA_SITIO`.
 */

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sellar } from "./catalogo-integridad.mjs";

const CONTRACT_VERSION = 1;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "data", "catalogo-fallback.json");
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

const response = await fetch(endpoint);
if (!response.ok) {
  console.error(`La API respondió ${response.status}. El snapshot NO se tocó.`);
  process.exit(1);
}

const payload = await response.json();

// Nunca pisar un snapshot bueno con uno inservible: el fallback es la última
// línea de defensa de la web y se regenera a mano, no en cada deploy.
if (payload?.version !== CONTRACT_VERSION) {
  console.error(`Se esperaba version ${CONTRACT_VERSION} y llegó ${payload?.version}. El snapshot NO se tocó.`);
  process.exit(1);
}
if (!Array.isArray(payload.productos) || payload.productos.length === 0) {
  console.error("El catálogo llegó vacío. El snapshot NO se tocó.");
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
  for (const producto of productos) {
    producto.imagenes = producto.imagenes.map((url) => {
      const archivo = path.posix.basename(new URL(url, "http://local").pathname);
      const rutaPublica = `${LOCAL_IMAGE_DIR}/${archivo}`;
      if (existsSync(path.join(ROOT, "public", LOCAL_IMAGE_DIR, archivo))) return rutaPublica;
      sinFotoLocal.push(`${producto.slug} → ${url}`);
      return url;
    });
  }
  return sinFotoLocal;
}

const sinFotoLocal = localizarImagenes(payload.productos);
if (sinFotoLocal.length > 0) {
  console.warn(
    `Aviso: ${sinFotoLocal.length} imagen(es) sin copia en public${LOCAL_IMAGE_DIR}/ — el fallback las pedirá al Storage:\n  ${sinFotoLocal.join("\n  ")}`,
  );
}

await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
// Sellar acá y no en un paso aparte: un snapshot regenerado sin sellar deja el
// test de integridad en rojo, y "acordarse de correr el sello" es exactamente el
// tipo de regla que ya falló una vez.
const sello = await sellar();
console.info(
  `Snapshot escrito: ${payload.productos.length} productos, ${payload.categorias?.length ?? 0} categorías → data/catalogo-fallback.json\n` +
    `Sello: sha256 ${sello.hash}`,
);
