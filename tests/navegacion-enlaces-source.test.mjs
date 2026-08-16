import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Once de las catorce fichas no reciben enlaces de ninguna otra parte del
 * sitio: estos paneles son su unica via de entrada.
 *
 * Un panel escrito como {abierto && <panel/>} funciona perfecto en pantalla y
 * no existe en el HTML que sirve el servidor, porque el estado arranca cerrado.
 * Asi estaba el desplegable de Actividades del navbar: comprobado sobre el
 * build, /es/contacto no traia un solo enlace a una ficha.
 *
 * Por eso los paneles se renderizan siempre y se ocultan con el atributo
 * `hidden`. Este test es lo unico que separa las dos formas, porque a la vista
 * son identicas.
 */

const ESTADOS = ["activitiesMenuOpen", "mobileActivitiesOpen", "abierto"];

async function leer(ruta) {
  return readFile(new URL(ruta, import.meta.url), "utf8");
}

/**
 * Toda fuente que monte un panel de navegacion entra aca. La lista se amplia
 * cuando aparece una superficie nueva: el guard no descubre archivos solo.
 */
const FUENTES = ["../components/Navbar.tsx"];

for (const ruta of FUENTES) {
  const nombre = ruta.split("/").pop();
  const fuente = await leer(ruta);

  test(`${nombre}: ningun panel se monta solo cuando su estado es true`, () => {
    for (const estado of ESTADOS) {
      assert.doesNotMatch(
        fuente,
        new RegExp(`&&\\s*${estado}\\s*&&`),
        `${nombre} monta un panel solo cuando ${estado} es true: sus enlaces no existen en el HTML`,
      );
      assert.doesNotMatch(
        fuente,
        new RegExp(`\\{\\s*${estado}\\s*&&`),
        `${nombre} monta un panel solo cuando ${estado} es true: sus enlaces no existen en el HTML`,
      );
    }
  });

  test(`${nombre}: los paneles se ocultan con el atributo hidden`, () => {
    assert.match(fuente, /hidden=\{!/);
  });

  test(`${nombre}: el elemento que lleva hidden no trae clase de display`, () => {
    // `hidden` aplica display:none desde la hoja del navegador y CUALQUIER
    // clase de display lo pisa. Un `flex` o un `grid` en el mismo elemento deja
    // el panel visible siempre, que es el fallo opuesto y tambien silencioso.
    for (const match of fuente.matchAll(/hidden=\{![\s\S]{0,400}?>/g)) {
      const clase = match[0].match(/className="([^"]*)"/)?.[1] ?? "";
      for (const display of ["flex", "grid", "block", "inline-flex", "inline-block"]) {
        assert.ok(
          !new RegExp(`(^|\\s)${display}(\\s|$)`).test(clase),
          `${nombre}: el elemento con hidden trae la clase "${display}", que pisa display:none`,
        );
      }
    }
  });
}
