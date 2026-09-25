import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

/**
 * La ficha de vino (`/vinos/[slug]`) después del rediseño del 2026-09-25:
 * pedido de Juan Francisco, "plana y fome", con el mismo tratamiento que las
 * fichas de actividades y un sello de compra segura con Mercado Pago.
 *
 * La página lee el catálogo con `getCatalog()`, que `node --test` no puede
 * cargar (ver lib/sitemap.ts), así que lo que se cuida acá se lee del fuente.
 */

const raiz = new URL("../", import.meta.url);
const leer = (ruta) => readFile(new URL(ruta, raiz), "utf8");
// Los archivos se sacan con CRLF en Windows: se normaliza para que las
// expresiones de abajo no dependan de la máquina.
const normal = (texto) => texto.replace(/\r\n/g, "\n");

const ficha = normal(await leer("app/[locale]/vinos/[slug]/page.tsx"));
const sello = normal(await leer("components/CompraSegura.tsx"));
const catalogo = normal(await leer("lib/afeleia/catalog.ts"));
const carrito = normal(await leer("lib/cart.ts"));

const LOCALES = ["es", "en", "pt"];
const bundles = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, JSON.parse(await leer(`messages/${l}.json`))])),
);

test("la compra va arriba, antes de las notas, el maridaje y la ficha técnica", () => {
  // Hasta el rediseño el precio y el botón quedaban al final, después de la
  // ficha técnica: para comprar había que bajar toda la página.
  const compra = ficha.indexOf("<ProductPurchase");
  assert.ok(compra > 0, "falta el bloque de compra");
  for (const seccion of ['t("tastingNotes")', 't("pairing")', 't("technical.title")']) {
    const posicion = ficha.indexOf(seccion);
    assert.ok(posicion > 0, `falta ${seccion}`);
    assert.ok(compra < posicion, `la compra tiene que ir antes que ${seccion}`);
  }
});

test("el sello de Mercado Pago sólo aparece con el pago en línea configurado", () => {
  // La misma condición que muestra "Pagar" en el carrito: sin la variable del
  // checkout, el carrito cierra por WhatsApp y la ficha no puede prometer
  // un pago con Mercado Pago que el comprador no va a encontrar.
  assert.match(ficha, /checkoutIniciarUrl\(process\.env\.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL\) !== null/);
  assert.match(ficha, /<CompraSegura[\s\S]*?pagoEnLinea=\{pagoEnLinea\}/);
  assert.match(sello, /\{pagoEnLinea && \(/);
  assert.match(sello, /MERCADO_PAGO_LOGO/);
});

test("el logo de Mercado Pago está en public/brand", async () => {
  // El SVG oficial se baja de mercadopago.cl/mp/logo-oficial; no se copia de
  // sitios de terceros. Sin el archivo, el sello mostraría una imagen rota.
  const ruta = sello.match(/MERCADO_PAGO_LOGO = "([^"]+)"/)?.[1];
  assert.ok(ruta, "el sello no declara la ruta del logo");
  await assert.doesNotReject(
    access(new URL(`public${ruta}`, raiz)),
    `falta public${ruta}: bajarlo de mercadopago.cl/mp/logo-oficial`,
  );
});

test("el mínimo de botellas del sello es el mismo que exige el carrito", () => {
  // El carrito lo lee del catálogo con MIN_BOTTLES de respaldo; la ficha, del
  // mismo catálogo con el mismo respaldo. Un "6" escrito en la página se
  // desalinearía el día que la viña cambie el mínimo en el panel.
  assert.match(ficha, /await getMinBottles\(\)/);
  assert.match(catalogo, /minBottlesFrom\(catalog, MIN_BOTTLES\)/);
  // `MIN_BOTTLES` vive fuera de lib/cart.ts: ese módulo es "use client", y un
  // valor importado de ahí en el servidor llega como referencia de cliente,
  // no como el número.
  assert.match(carrito, /export \{ MIN_BOTTLES \} from "@\/lib\/compraMinima"/);
  assert.doesNotMatch(catalogo, /from "@\/lib\/cart"/);
});

test("la botella queda fija en escritorio mientras se lee la ficha", () => {
  assert.match(ficha, /md:sticky/);
});

test("en celular el nombre va sobre la botella, y es lo primero en el HTML", () => {
  // Pedido de Juan Francisco (2026-09-25). En escritorio la grilla lo sube a
  // la columna derecha sin reordenar el DOM, así que el h1 sigue primero.
  const nombre = ficha.indexOf("<h1");
  const botella = ficha.indexOf("<WineBottleImage");
  const compra = ficha.indexOf("<ProductPurchase");
  assert.ok(nombre > 0 && botella > 0, "faltan el nombre o la botella");
  assert.ok(nombre < botella, "el nombre va antes que la botella");
  assert.ok(botella < compra, "la botella va antes que la compra");
});

test("las secciones de la ficha son h2 bajo el h1 del vino", () => {
  // Eran h3 directo bajo el h1: un salto de nivel que los lectores de pantalla
  // y los auditores de SEO marcan.
  assert.doesNotMatch(ficha, /<h3[^>]*>\s*<span className="h-px/);
});

test("los textos del sello y del precio existen en los tres idiomas", () => {
  for (const locale of LOCALES) {
    const detalle = bundles[locale].wineDetail;
    assert.equal(typeof detalle.priceLabel, "string", `${locale}.wineDetail.priceLabel`);
    const sello = detalle.trust;
    for (const clave of [
      "securePayment",
      "securePaymentNote",
      "direct",
      "directNote",
      "minimum",
      "minimumNote",
    ]) {
      assert.equal(typeof sello?.[clave], "string", `${locale}.wineDetail.trust.${clave}`);
      assert.ok(sello[clave].length > 0, `${locale}.wineDetail.trust.${clave}`);
    }
    // "Pago seguro con" + el logo: el nombre de la marca lo pone el `alt`.
    assert.doesNotMatch(sello.securePayment, /Mercado Pago/, `${locale}: el nombre va en el logo`);
    assert.match(sello.minimum, /\{min, plural,/, `${locale}: el mínimo viene del catálogo`);
  }
});

test("el logo de Mercado Pago dice su nombre a quien no lo ve", () => {
  // El título dice "Pago seguro con" y el logo completa la frase: sin `alt`,
  // un lector de pantalla leería "Pago seguro con" y nada más.
  assert.match(sello, /src=\{MERCADO_PAGO_LOGO\}\s*alt="Mercado Pago"/);
});
