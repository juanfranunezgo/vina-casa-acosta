import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Los íconos del sitio van en `IconBadge`: círculo vino sólido, ícono blanco.
 *
 * Hasta el 2026-09-24 eran un círculo vino al 10% con el ícono en vino, escrito
 * a mano en cada lugar —cinco archivos con la misma clase copiada—. Juan
 * Francisco pidió cambiarlos todos, y la única forma de que "todos" siga siendo
 * cierto cuando alguien agregue el sexto es que ese círculo no se pueda volver
 * a escribir suelto.
 */

const raiz = fileURLToPath(new URL("../", import.meta.url));

async function archivosTsx(carpeta) {
  const entradas = await readdir(join(raiz, carpeta), { recursive: true, withFileTypes: true });
  return entradas
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

/**
 * Un círculo teñido de ícono: redondo, cuadrado (mismo alto y ancho) y con el
 * fondo vino o primario con opacidad. Las píldoras de texto también son
 * `rounded-full` con fondo teñido, pero no son cuadradas y no cuentan.
 */
const CIRCULO_TENIDO = /rounded-full/;
const FONDO_TENIDO = /\bbg-(?:wine-accent|primary)\/\d+\b/;
const CUADRADO = /\bh-(\d+(?:\.\d+)?) w-\1\b/;

test("ningún ícono se dibuja sobre un círculo vino teñido escrito a mano", async () => {
  const archivos = [...(await archivosTsx("app")), ...(await archivosTsx("components"))];
  const hallazgos = [];
  for (const archivo of archivos) {
    const fuente = await readFile(archivo, "utf8");
    for (const [clase] of fuente.matchAll(/className=(?:"[^"]*"|`[^`]*`)/g)) {
      // El `hover:` no es el fondo: un botón que se tiñe al pasar el mouse
      // (el del calendario del formulario) no es un círculo de ícono.
      const sinHover = clase.replace(/\bhover:\S+/g, "");
      if (CIRCULO_TENIDO.test(sinHover) && FONDO_TENIDO.test(sinHover) && CUADRADO.test(sinHover)) {
        hallazgos.push(`${archivo.replace(raiz, "")}: ${clase.slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(hallazgos, [], "usar components/ui/IconBadge.tsx");
});

test("los lugares que tenían el círculo teñido usan IconBadge", async () => {
  for (const archivo of [
    "app/[locale]/actividades/[categoria]/[slug]/page.tsx",
    "app/[locale]/actividades/page.tsx",
    "components/ActivityProgram.tsx",
  ]) {
    const fuente = await readFile(join(raiz, archivo), "utf8");
    assert.match(fuente, /<IconBadge\b/, archivo);
  }
});
