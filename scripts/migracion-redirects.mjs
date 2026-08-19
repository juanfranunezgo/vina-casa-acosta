/**
 * Genera `casaacosta-redirect/_redirects` desde el CSV del mapeo.
 *
 * El archivo generado ya declaraba "no editar a mano: regenerar desde el CSV",
 * pero el generador no existía y la regeneración era manual — es decir, la
 * única forma de que los dos archivos se desincronizaran en silencio. Esto lo
 * cierra.
 *
 * Cada origen se emite dos veces, con y sin barra final, para no depender de
 * cómo normalice el proveedor. El `!` fuerza la regla por sobre los archivos
 * estáticos del propio shell.
 *
 *   node scripts/migracion-redirects.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const CSV = join(RAIZ, "docs", "migracion-casaacosta-redirects.csv");
const DESTINO = join(RAIZ, "..", "casaacosta-redirect", "_redirects");

const ENCABEZADO = `# ===========================================================================
#  casaacosta.cl  →  vinacasaacosta.cl   ·   301 permanentes
#
#  GENERADO por sitio-web/scripts/migracion-redirects.mjs desde
#  sitio-web/docs/migracion-casaacosta-redirects.csv
#  NO editar a mano: cambiar el CSV y volver a correr el script.
#
#  Cada URL aparece dos veces (con y sin barra final) para no depender de la
#  normalizacion del proveedor. El "!" fuerza la regla por sobre los archivos
#  estaticos: sin el, "/" serviria index.html en vez de redirigir.
#
#  Las URLs que NO estan aca (36 entradas de demostracion del tema, sus
#  categorias y /wp-content/*) caen en 404.html a proposito: no tienen
#  equivalente y el 404 las saca del indice de forma limpia.
# ===========================================================================
`;

const filas = readFileSync(CSV, "utf8")
  .split(/\r?\n/)
  .filter((linea) => linea.trim() !== "")
  .slice(1)
  .map((linea) => {
    const [origen, destino] = linea.split(",");
    return { origen: origen.trim(), destino: destino.trim() };
  });

/** Ancho de la primera columna, para que los destinos queden alineados. */
const ancho =
  Math.max(...filas.map((f) => f.origen.replace(/\/$/, "").length || 1)) + 2;

const lineas = [];
for (const { origen, destino } of filas) {
  // La raiz es un caso aparte: "/" sin barra no existe.
  const variantes =
    origen === "/" ? ["/"] : [origen.replace(/\/?$/, "/"), origen.replace(/\/$/, "")];
  for (const variante of variantes) {
    lineas.push(`${variante.padEnd(ancho)} ${destino.padEnd(58)} 301!`);
  }
}

writeFileSync(DESTINO, `${ENCABEZADO}\n${lineas.join("\n")}\n`, "utf8");
console.log(`${filas.length} reglas → ${lineas.length} lineas en ${DESTINO}`);
