import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * El botón del sitio (`components/ui/Button.tsx`) y el desborde en celular.
 *
 * Juan Francisco, 2026-10-12: "la página de la vendimia en celular quedó con
 * scroll horizontal… los botones se salen". Medido en producción a 375 px: la
 * página medía 502. Dos botones con el texto largo —"Inscríbete, ven a vivir
 * la vendimia en Casa Acosta" (478 px) y "Guarda tu lugar para la próxima
 * fecha" (384 px)— no caben en los 327 px de la columna, y el botón lleva
 * `whitespace-nowrap`: en vez de partir el texto en dos renglones, empuja el
 * ancho de la página entera.
 *
 * `multiline` es la salida: el botón no pasa del ancho de su contenedor y el
 * texto se parte. No es el comportamiento por defecto porque un botón que se
 * parte cambia de alto, y hay filas del sitio armadas contando con que no.
 *
 * Las clases se arman en `buttonClasses.ts`, sin Next, para poder ejecutarlas
 * acá: `Button.tsx` importa `next/link`, que no carga en Node pelado.
 */

const { buttonClasses } = await import("../components/ui/buttonClasses.ts");

const tiene = (clases, una) => clases.split(/\s+/).includes(una);

test("por defecto el botón sigue igual: una línea y alto fijo", () => {
  const clases = buttonClasses({});
  assert.ok(tiene(clases, "whitespace-nowrap"));
  assert.ok(tiene(clases, "h-11"), "el alto de `md`");
  assert.ok(!tiene(clases, "max-w-full"));
});

test("con `multiline` el texto se parte y el botón no pasa del ancho de su contenedor", () => {
  const clases = buttonClasses({ multiline: true });
  assert.ok(!tiene(clases, "whitespace-nowrap"), "sigue sin poder partirse");
  assert.ok(tiene(clases, "whitespace-normal"));
  assert.ok(tiene(clases, "max-w-full"));
  // Alto mínimo y no fijo: con dos renglones, un `h-11` deja el texto fuera
  // del botón. Con uno solo mide lo mismo que antes.
  assert.ok(!tiene(clases, "h-11"), "alto fijo");
  assert.ok(tiene(clases, "min-h-11"));
});

test("`multiline` respeta cada tamaño", () => {
  for (const [size, alto] of [["sm", "9"], ["md", "11"], ["lg", "14"]]) {
    const clases = buttonClasses({ size, multiline: true });
    assert.ok(tiene(clases, `min-h-${alto}`), size);
    assert.ok(!tiene(clases, `h-${alto}`), size);
  }
});

test("la variante `link` no lleva tamaño, con o sin `multiline`", () => {
  for (const multiline of [false, true]) {
    const clases = buttonClasses({ variant: "link", multiline });
    assert.ok(!/(^|\s)(min-)?h-(9|11|14)(\s|$)/.test(clases));
  }
});

test("los dos botones largos de la vendimia van con `multiline`", async () => {
  const pagina = (
    await readFile(new URL("../app/[locale]/actividades/vendimia/page.tsx", import.meta.url), "utf8")
  ).replace(/\r\n/g, "\n");
  const botones = [...pagina.matchAll(/<Button\s[^>]*?href="#consulta"[\s\S]*?<\/Button>/g)].map((m) => m[0]);
  assert.equal(botones.length, 2, "el de Dv2 y el de Dv4");
  for (const boton of botones) assert.match(boton, /\bmultiline\b/, boton.slice(0, 80));
});

test("el componente arma sus clases con esa función y le pasa `multiline`", async () => {
  const boton = await readFile(new URL("../components/ui/Button.tsx", import.meta.url), "utf8");
  assert.match(boton, /buttonClasses\(\{[^}]*multiline[^}]*\}\)/);
});
