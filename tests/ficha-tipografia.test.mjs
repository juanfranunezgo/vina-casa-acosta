import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Plus Jakarta Sans es la letra de texto de las fichas: decisión de Juan
 * Francisco del 2026-09-24 para las de actividad, extendida el 2026-09-25 a la
 * ficha de vino y a la vitrina de la tienda (lo cuida `tienda-vitrina`). El
 * resto del sitio sigue en Work Sans. Los títulos siguen en Libre Caslon.
 */

const raiz = new URL("../", import.meta.url);
// Los archivos se sacan con CRLF en Windows: se normaliza para que las
// expresiones de abajo no dependan de la máquina.
const leer = async (ruta) => (await readFile(new URL(ruta, raiz), "utf8")).replace(/\r\n/g, "\n");

const fuente = await leer("lib/fuenteFicha.ts");
const actividad = await leer("app/[locale]/actividades/[categoria]/[slug]/page.tsx");
const vino = await leer("app/[locale]/vinos/[slug]/page.tsx");
const layout = await leer("app/[locale]/layout.tsx");

test("la letra de las fichas carga Plus Jakarta Sans y la pone como --font-body", () => {
  assert.match(fuente, /Plus_Jakarta_Sans\(/);
  assert.match(fuente, /\[--font-body:var\(--font-jakarta\)\]/);
});

test("las dos fichas usan la misma letra, sin cargarla cada una por su lado", () => {
  for (const [nombre, pagina] of [["actividad", actividad], ["vino", vino]]) {
    assert.match(pagina, /import \{ FUENTE_FICHA \} from "@\/lib\/fuenteFicha"/, nombre);
    assert.doesNotMatch(pagina, /Plus_Jakarta_Sans/, nombre);
  }
});

test("el resto del sitio sigue con Work Sans como letra de texto", () => {
  assert.match(layout, /Work_Sans\(\{\s*variable: "--font-body"/);
  assert.doesNotMatch(layout, /Plus_Jakarta_Sans/);
});

test("la letra no envuelve la ficha en un div que esconda el hero al Navbar", () => {
  // El Navbar busca el hero como `main > section`. Un envoltorio alrededor de
  // toda la página lo dejaría sin hero y sin su modo transparente.
  const retorno = actividad.slice(actividad.indexOf("  return (\n    <>"));
  assert.ok(retorno.length > 0, "no se encontró el return de la página");
  assert.match(retorno, /<>\s*\{\/\*[\s\S]*?\*\/\}\s*<JsonLd/);
  assert.match(retorno, /<section className=\{`relative \$\{FUENTE_FICHA\}`\}>/);
});

test("en la ficha de vino la letra va en cada sección de primer nivel", () => {
  const retorno = vino.slice(vino.indexOf("  return (\n    <>"));
  assert.ok(retorno.length > 0, "no se encontró el return de la página");
  // La principal y la de vinos relacionados.
  const secciones = [...retorno.matchAll(/<section className=([^>]*)>/g)];
  assert.equal(secciones.length, 2, "se esperaban dos secciones");
  for (const [, clases] of secciones) {
    assert.match(clases, /\$\{FUENTE_FICHA\}/, clases);
  }
});
