import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Plus Jakarta Sans es la letra de texto de las fichas de actividad, y sólo de
 * ellas: decisión de Juan Francisco del 2026-09-24. El resto del sitio sigue en
 * Work Sans. Los títulos, en las dos, siguen en Libre Caslon.
 */

const raiz = new URL("../", import.meta.url);
const ficha = await readFile(
  new URL("app/[locale]/actividades/[categoria]/[slug]/page.tsx", raiz),
  "utf8",
);
const layout = await readFile(new URL("app/[locale]/layout.tsx", raiz), "utf8");

test("la ficha carga Plus Jakarta Sans y la pone como --font-body", () => {
  assert.match(ficha, /Plus_Jakarta_Sans\(/);
  assert.match(ficha, /\[--font-body:var\(--font-jakarta\)\]/);
});

test("el resto del sitio sigue con Work Sans como letra de texto", () => {
  assert.match(layout, /Work_Sans\(\{\s*variable: "--font-body"/);
  assert.doesNotMatch(layout, /Plus_Jakarta_Sans/);
});

test("la letra no envuelve la ficha en un div que esconda el hero al Navbar", () => {
  // El Navbar busca el hero como `main > section`. Un envoltorio alrededor de
  // toda la página lo dejaría sin hero y sin su modo transparente.
  const retorno = ficha.slice(ficha.indexOf("  return (\n    <>"));
  assert.ok(retorno.length > 0, "no se encontró el return de la página");
  assert.match(retorno, /<>\s*\{\/\*[\s\S]*?\*\/\}\s*<JsonLd/);
  assert.match(retorno, /<section className=\{`relative \$\{FUENTE_FICHA\}`\}>/);
});
