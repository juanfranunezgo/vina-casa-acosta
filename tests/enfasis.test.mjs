import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { partesConEnfasis, sinEnfasis } = await import("@/lib/enfasis");

/**
 * Los destacados de los textos (`**así**`). Ver lib/enfasis.ts.
 */

test("parte el texto en tramos normales y destacados", () => {
  assert.deepEqual(partesConEnfasis("Con **agua saborizada** de limón."), [
    { texto: "Con ", destacado: false },
    { texto: "agua saborizada", destacado: true },
    { texto: " de limón.", destacado: false },
  ]);
});

test("un texto que empieza destacado no deja tramos vacíos", () => {
  assert.deepEqual(partesConEnfasis("**No.** La sesión."), [
    { texto: "No.", destacado: true },
    { texto: " La sesión.", destacado: false },
  ]);
});

test("un par sin cerrar queda como texto, sin romper la frase", () => {
  assert.deepEqual(partesConEnfasis("Con **agua saborizada."), [
    { texto: "Con **agua saborizada.", destacado: false },
  ]);
});

test("sinEnfasis devuelve la frase limpia", () => {
  assert.equal(sinEnfasis("Con **agua saborizada** de limón."), "Con agua saborizada de limón.");
});

/** Todas las hojas string de un objeto de mensajes, con su ruta. */
function hojas(valor, ruta = "") {
  if (typeof valor === "string") return [[ruta, valor]];
  if (valor === null || typeof valor !== "object") return [];
  return Object.entries(valor).flatMap(([clave, hijo]) =>
    hojas(hijo, ruta ? `${ruta}.${clave}` : clave),
  );
}

test("ningún mensaje deja un destacado sin cerrar", async () => {
  for (const locale of ["es", "en", "pt"]) {
    const bundle = JSON.parse(
      await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
    );
    for (const [ruta, texto] of hojas(bundle)) {
      const marcas = texto.split("**").length - 1;
      assert.equal(marcas % 2, 0, `${locale}.${ruta}: "${texto.slice(0, 60)}"`);
    }
  }
});

test("las preguntas del yoga destacan lo mismo en los tres idiomas", async () => {
  // Cada respuesta lleva su destacado en los tres idiomas o en ninguno: una
  // negrita que existe en español y no en inglés es una traducción a medias.
  const faqs = await Promise.all(
    ["es", "en", "pt"].map(async (locale) => {
      const bundle = JSON.parse(
        await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
      );
      return bundle.activities.items.yoga.faq.map(({ a }) => a.split("**").length - 1);
    }),
  );
  assert.deepEqual(faqs[1], faqs[0], "en");
  assert.deepEqual(faqs[2], faqs[0], "pt");
  assert.ok(faqs[0].some((marcas) => marcas > 0), "el español destaca algo");
});
