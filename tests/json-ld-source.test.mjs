import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serializeJsonLd } from "../lib/jsonLd.ts";

/**
 * El JSON-LD de /vinos se alimenta del catalogo que administra el cliente desde
 * el panel de Afeleia. Es contenido no confiable entrando a un sink de HTML: si
 * se emite con JSON.stringify pelado, un nombre de producto puede cerrar el
 * <script> y ejecutar markup en el sitio publico de la vina.
 */

const BREAKOUT = "Vino</script><img src=x onerror=alert(1)>";

test("serializeJsonLd impide cerrar el <script> desde un dato del panel", () => {
  const data = { "@type": "Product", name: BREAKOUT };

  // El bug que se esta previniendo: JSON.stringify deja el cierre literal.
  assert.match(JSON.stringify(data), /<\/script/i);

  const emitido = serializeJsonLd(data);
  assert.doesNotMatch(emitido, /<\/script/i);
  assert.doesNotMatch(emitido, /</);
});

test("el escape es neutro: el bloque parsea al mismo valor", () => {
  const data = {
    name: BREAKOUT,
    frase: "dos palabras con espacios",
    lista: ["a < b", "c > d"],
  };
  assert.deepEqual(JSON.parse(serializeJsonLd(data)), data);
});

test("U+2028 y U+2029 salen escapados y no crudos", () => {
  // Se construyen por codigo: pegados como literales, cualquier editor o
  // normalizacion Unicode los convierte en espacios y el test deja de probar nada.
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const raro = `a${LS}b${PS}c`;

  const emitido = serializeJsonLd({ raro });
  assert.doesNotMatch(emitido, new RegExp(`[${LS}${PS}]`));
  assert.equal(JSON.parse(emitido).raro, raro);
});

test("ningun archivo emite JSON-LD sin pasar por <JsonLd>", async () => {
  const { globSync } = await import("node:fs");
  const archivos = globSync(["app/**/*.tsx", "components/**/*.tsx"]);
  assert.ok(archivos.length > 0, "el glob no encontro fuentes");

  for (const archivo of archivos) {
    if (archivo.endsWith("JsonLd.tsx")) continue;
    const fuente = await readFile(archivo, "utf8");
    // assert.ok y no assert.doesNotMatch: este ultimo vuelca el archivo entero en
    // la salida del test y tapa el unico mensaje que importa.
    assert.ok(
      !/application\/ld\+json/.test(fuente),
      `${archivo} emite JSON-LD a mano: usar <JsonLd data={...} />`,
    );
  }
});
