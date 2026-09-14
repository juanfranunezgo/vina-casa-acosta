import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * El carrito se lee en tres idiomas y next-intl NO falla cuando falta una clave:
 * muestra la ruta ("cart.checkoutPay") en el botón. `actividades-i18n-parity`
 * solo compara `activities`, así que nada cuidaba que `cart` tuviera las mismas
 * hojas en es, en y pt. Esto lo cuida, y además exige los textos del pago en
 * línea que usa `CartDrawer`.
 */

const LOCALES = ["es", "en", "pt"];

const TEXTOS_DEL_PAGO = [
  "checkoutPay",
  "checkoutPaying",
  "checkoutDisclaimerOnline",
  "checkoutFallbackNotice",
  "checkoutCartChanged",
];

async function load(locale) {
  const url = new URL(`../messages/${locale}.json`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}

/** Rutas de todas las hojas, para comparar estructura y no solo el primer nivel. */
function leafPaths(value, prefix = "") {
  if (Array.isArray(value)) return [prefix];
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const bundles = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, await load(l)])),
);

test("el namespace cart tiene las mismas claves en los tres idiomas", () => {
  // Sin esto la comparación pasa en vacío: leafPaths(undefined) da lo mismo
  // para los tres idiomas.
  for (const locale of LOCALES) {
    assert.equal(typeof bundles[locale].cart, "object", locale);
    assert.notEqual(bundles[locale].cart, null, locale);
  }

  const reference = leafPaths(bundles.es.cart).sort();
  for (const locale of LOCALES.slice(1)) {
    const actual = leafPaths(bundles[locale].cart).sort();
    const missing = reference.filter((k) => !actual.includes(k));
    const extra = actual.filter((k) => !reference.includes(k));
    assert.deepEqual(missing, [], `faltan en ${locale}`);
    assert.deepEqual(extra, [], `sobran en ${locale}`);
  }
});

test("los textos del pago en línea existen y no están vacíos en los tres idiomas", () => {
  for (const locale of LOCALES) {
    for (const clave of TEXTOS_DEL_PAGO) {
      const valor = bundles[locale].cart[clave];
      assert.equal(typeof valor, "string", `${locale}: falta cart.${clave}`);
      assert.ok(valor.trim().length > 0, `${locale}: cart.${clave} está vacío`);
    }
  }
});
