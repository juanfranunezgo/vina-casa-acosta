import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";

/**
 * `activities` tiene dos mitades que se leen distinto:
 *
 *   activities.labels.*        textos de la plantilla, iguales para toda actividad
 *   activities.items.{slug}.*  textos de UNA actividad
 *
 * Leer un campo de actividad desde `labels` no falla el build. next-intl
 * devuelve la ruta de la clave como texto y la pagina se publica mostrando
 * "activities.labels.tour-ombu.duration" en pantalla. Paso de verdad: la
 * portada salio asi del build y solo se vio abriendo el HTML generado.
 *
 * El sintoma: un traductor atado a `activities.labels` invocado con una
 * plantilla — o sea, con una clave que depende del slug.
 */

const RAICES = ["app", "components"];

async function archivosTsx(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const salida = [];
  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await archivosTsx(ruta)));
    else if (extname(entrada.name) === ".tsx") salida.push(ruta);
  }
  return salida;
}

/** Devuelve los nombres de variable atados a `activities.labels`. */
function traductoresDeLabels(source) {
  const re = /const\s+(\w+)\s*=\s*(?:await\s+)?(?:get|use)Translations\(\s*(?:\{[^}]*namespace:\s*)?"activities\.labels"/g;
  return [...source.matchAll(re)].map((m) => m[1]);
}

/** Llamadas de ese traductor con clave dinamica: `t(\`...\`)` o `t.raw(\`...\`)`. */
function llamadasConPlantilla(source, nombre) {
  const re = new RegExp(`\\b${nombre}(?:\\.raw)?\\(\\s*\``, "g");
  return [...source.matchAll(re)].map((m) => m[0]);
}

function infracciones(source) {
  return traductoresDeLabels(source).flatMap((nombre) =>
    llamadasConPlantilla(source, nombre),
  );
}

test("el detector reconoce el error que este test cuida", () => {
  // Fixture con la forma exacta del bug real, para que el test no pase por no
  // saber mirar.
  const malo = [
    'const tLabels = await getTranslations("activities.labels");',
    "const duration = tLabels(`${slug}.duration`);",
  ].join("\n");
  assert.equal(infracciones(malo).length, 1);

  const bueno = [
    'const tLabels = await getTranslations("activities.labels");',
    'const titulo = tLabels("seasonTitle");',
    'const tItems = await getTranslations("activities.items");',
    "const duration = tItems(`${slug}.duration`);",
  ].join("\n");
  assert.deepEqual(infracciones(bueno), []);
});

test("ningun archivo lee un campo de actividad desde activities.labels", async () => {
  const archivos = (await Promise.all(RAICES.map(archivosTsx))).flat();
  assert.ok(archivos.length > 0, "no se encontro ningun .tsx que revisar");

  const malos = [];
  for (const archivo of archivos) {
    const source = await readFile(archivo, "utf8");
    if (infracciones(source).length) malos.push(archivo);
  }
  assert.deepEqual(malos, []);
});
