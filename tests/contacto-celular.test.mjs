import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * El formulario de contacto pide el celular desde el 2026-09-22, a pedido de la
 * viña, y es obligatorio. La paridad con `__forms.html` ya la cubre
 * `netlify-forms-paridad.test.mjs`; esto cubre lo que ese test no ve: que el
 * campo sea obligatorio y que su patrón haga lo que dice.
 *
 * El patrón se prueba compilado como lo compila el navegador —anclado y con el
 * flag `v`—, porque un patrón que no compila con `v` no rompe nada visible: el
 * navegador lo ignora y el campo acepta cualquier cosa.
 */

const fuente = await readFile(new URL("../components/ContactForm.tsx", import.meta.url), "utf8");

const input = fuente.match(/<input\s+id="contacto-celular"[\s\S]*?\/>/);

test("el formulario de contacto tiene el campo de celular, obligatorio y de tipo tel", () => {
  assert.ok(input, "ContactForm.tsx no tiene el input #contacto-celular");
  assert.match(input[0], /\brequired\b/);
  assert.match(input[0], /type="tel"/);
  assert.match(input[0], /autoComplete="tel"/);
  assert.match(fuente, /htmlFor="contacto-celular"/);
});

const patron = input?.[0].match(/pattern="([^"]+)"/)?.[1];
// Así lo compila el navegador: https://html.spec.whatwg.org/#compiled-pattern-regular-expression
const compilado = () => new RegExp(`^(?:${patron})$`, "v");

test("el patrón del celular compila con el flag v, como en el navegador", () => {
  assert.ok(patron, "el input del celular no tiene pattern");
  assert.doesNotThrow(compilado);
});

test("el patrón acepta un celular chileno escrito de cualquier forma, y uno extranjero", () => {
  const re = compilado();
  for (const numero of [
    "+56 9 1234 5678",
    "+56912345678",
    "912345678",
    "9 1234 5678",
    "+56-9-1234-5678",
    "(+56) 9 1234 5678",
    "+1 (555) 123-4567",
    "+55 11 91234-5678",
  ]) {
    assert.ok(re.test(numero), `debería aceptar "${numero}"`);
  }
});

test("el patrón rechaza lo que no es un número de teléfono", () => {
  const re = compilado();
  for (const numero of [
    "1234567", // 7 dígitos: le falta uno
    "12 34 56", // largo por los espacios, pero con 6 dígitos
    "+56 9 1234 5678 99999", // 16 dígitos, sobre el tope de E.164
    "no tengo",
    "9 1234 567a",
    "56+912345678", // el "+" solo va al principio
  ]) {
    assert.ok(!re.test(numero), `debería rechazar "${numero}"`);
  }
});

test("el celular tiene etiqueta, ejemplo y ayuda en los tres idiomas", async () => {
  for (const locale of ["es", "en", "pt"]) {
    const mensajes = JSON.parse(
      await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
    );
    const campos = mensajes.contactForm.fields;
    for (const clave of ["phone", "phonePlaceholder", "phoneHint"]) {
      assert.ok(campos[clave]?.trim(), `messages/${locale}.json no tiene contactForm.fields.${clave}`);
    }
    // El ejemplo tiene que pasar su propio patrón: si no, el placeholder le
    // enseña a escribir un número que el formulario rechaza.
    assert.ok(compilado().test(campos.phonePlaceholder), `el ejemplo de ${locale} no pasa el patrón`);
  }
});
