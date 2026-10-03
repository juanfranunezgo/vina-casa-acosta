import "./alias-hook.mjs";
import "./tsx-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";

/**
 * El precio de un vino, en la tarjeta de la tienda y en su ficha.
 *
 * Sin rebaja se dibuja como siempre: un elemento con el precio. Con rebaja se
 * agregan el precio anterior tachado y la etiqueta «−N %», y un lector de
 * pantalla oye «precio anterior» y «precio actual» — el tachado no se anuncia.
 *
 * Acá el componente se DIBUJA (`tsx-hook.mjs`) con los mensajes reales de los
 * tres idiomas y el traductor real de next-intl: lo que se afirma es el HTML que
 * sale, no cómo está escrito el fuente.
 */

const raiz = new URL("../", import.meta.url);
const leer = async (ruta) => (await readFile(new URL(ruta, raiz), "utf8")).replace(/\r\n/g, "\n");

const LOCALES = ["es", "en", "pt"];
const PRICE_LOCALE = { es: "es-CL", en: "en-US", pt: "pt-BR" };
const mensajes = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, JSON.parse(await leer(`messages/${l}.json`))])),
);

/** El traductor que reciben la tarjeta y la ficha: `useTranslations("vinos")`. */
const traductor = (locale) =>
  createTranslator({ locale, messages: mensajes[locale], namespace: "vinos" });

/** El mismo formato que usan la tarjeta y la ficha. */
const formato = (locale) => (monto) =>
  new Intl.NumberFormat(PRICE_LOCALE[locale], {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(monto);

// Se carga dentro de cada test: si el componente falta, falla el test que lo
// necesita y no el archivo entero.
const componente = () => import("../components/PrecioProducto.tsx");

async function dibujar(props) {
  const { default: PrecioProducto } = await componente();
  return renderToStaticMarkup(createElement(PrecioProducto, props));
}

/** Las clases del precio en la tarjeta de la tienda. */
const CLASES = "font-body text-xl font-bold tracking-tight text-primary tabular-nums";

const REBAJA = { previousPriceCLP: 12990, discountPercent: 23 };

async function dibujarConRebaja(locale, rebaja = REBAJA) {
  const { saleCopy } = await componente();
  const precio = formato(locale);
  return dibujar({
    className: CLASES,
    price: precio(9990),
    sale: saleCopy(rebaja, precio, traductor(locale)),
  });
}

// --- Sin rebaja: igual que antes ----------------------------------------------

test("sin rebaja la tarjeta dibuja el precio solo, en un span con sus clases", async () => {
  assert.equal(
    await dibujar({ className: CLASES, price: "$9.990" }),
    `<span class="${CLASES}">$9.990</span>`,
  );
});

test("sin rebaja la ficha dibuja el precio solo, en su párrafo", async () => {
  assert.equal(
    await dibujar({ as: "p", className: CLASES, price: "$9.990" }),
    `<p class="${CLASES}">$9.990</p>`,
  );
});

test("un producto sin rebaja no produce nada que dibujar de más", async () => {
  const { saleCopy } = await componente();
  assert.equal(saleCopy(undefined, formato("es"), traductor("es")), undefined);
});

// --- Con rebaja ---------------------------------------------------------------

test("con rebaja se dibuja el precio anterior tachado", async () => {
  const html = await dibujarConRebaja("es");
  assert.match(html, /<s [^>]*>\$12\.990<\/s>/);
});

test("con rebaja el precio de venta conserva sus clases y su valor", async () => {
  // Lo que se cobra es `precio`: tiene que seguir siendo el número grande.
  const html = await dibujarConRebaja("es");
  assert.match(html, new RegExp(`<span class="${CLASES}">.*\\$9\\.990</span>`));
});

test("con rebaja se dibuja la etiqueta «−N %» con el porcentaje publicado", async () => {
  // Signo menos de verdad (U+2212) y espacio duro: la etiqueta no se parte en
  // dos renglones entre el número y el signo.
  assert.match(await dibujarConRebaja("es"), />−23 %</);
  // De 12.990 a 9.990 hay un 23 %; si Afeleia publica 50, se muestra 50.
  assert.match(await dibujarConRebaja("es", { ...REBAJA, discountPercent: 50 }), />−50 %</);
});

test("un lector de pantalla oye «precio anterior» y «precio actual», en ese orden", async () => {
  const html = await dibujarConRebaja("es");
  assert.match(html, /<span class="sr-only">Precio anterior: <\/span>/);
  assert.match(html, /<span class="sr-only">Precio actual: <\/span>/);
  // Los rótulos van como texto y no en `aria-label`: sobre un span sin rol, un
  // `aria-label` no se anuncia.
  assert.doesNotMatch(html, /aria-label|aria-hidden/);

  const orden = ["Precio anterior", "$12.990", "−23", "Precio actual", "$9.990"].map((trozo) =>
    html.indexOf(trozo),
  );
  assert.ok(orden.every((posicion) => posicion >= 0), `falta algo en ${html}`);
  assert.deepEqual(orden, [...orden].sort((a, b) => a - b), `orden de lectura: ${html}`);
});

test("dentro de la ficha, con rebaja, todo el precio sigue en un párrafo válido", async () => {
  // Un <p> solo admite contenido de frase: un <div> adentro lo cierra antes de
  // tiempo y React avisa de un error de hidratación.
  const { saleCopy } = await componente();
  const precio = formato("es");
  const html = await dibujar({
    as: "p",
    className: CLASES,
    price: precio(9990),
    sale: saleCopy(REBAJA, precio, traductor("es")),
  });
  assert.match(html, /^<p [^>]*>.*<\/p>$/);
  assert.doesNotMatch(html, /<div|<p [^>]*>.*<p /);
});

for (const locale of LOCALES) {
  test(`${locale}: los rótulos y la etiqueta de la rebaja existen y se dibujan`, async () => {
    const textos = mensajes[locale].vinos.price;
    for (const clave of ["previous", "current", "discount"]) {
      assert.equal(typeof textos?.[clave], "string", `${locale}.vinos.price.${clave}`);
      assert.ok(textos[clave].trim().length > 0, `${locale}.vinos.price.${clave}`);
    }
    assert.match(textos.discount, /^−\{percent\}/, `${locale}: signo menos y el porcentaje publicado`);

    const html = await dibujarConRebaja(locale);
    assert.ok(html.includes(`<span class="sr-only">${textos.previous}: </span>`), html);
    assert.ok(html.includes(`<span class="sr-only">${textos.current}: </span>`), html);
    assert.match(html, />−23[ ]?%</, html);
    // Nunca la clave cruda: es lo que imprime next-intl cuando falta un mensaje.
    assert.doesNotMatch(html, /price\.(previous|current|discount)/);
  });
}

// --- Donde se muestra el precio -------------------------------------------------
// La tarjeta y la ficha importan Next (`next/link`, `next-intl/server`) y no
// cargan en Node pelado: lo que sigue se lee del fuente.

const tienda = await leer("components/TiendaCatalogo.tsx");
const ficha = await leer("app/[locale]/vinos/[slug]/page.tsx");

test("la tarjeta de la tienda dibuja el precio con la rebaja del catálogo", () => {
  assert.match(
    tienda,
    /<PrecioProducto\s[^>]*price=\{formatPrice\(wine\.priceCLP\)\}[^>]*sale=\{saleCopy\(wine\.sale, formatPrice, tVinos\)\}/,
  );
});

test("la ficha del vino dibuja el precio con la rebaja del catálogo", () => {
  assert.match(
    ficha,
    /<PrecioProducto\s[^>]*as="p"[^>]*price=\{formatPrice\(wine\.priceCLP\)\}[^>]*sale=\{saleCopy\(wine\.sale, formatPrice, tVinos\)\}/,
  );
});

test("al carrito llega el precio de venta, con o sin rebaja", () => {
  // El carrito y el paso al checkout no cambian: `precio` es lo que se cobra.
  for (const [donde, fuente] of [
    ["la tarjeta", tienda],
    ["la ficha", ficha],
  ]) {
    assert.match(fuente, /priceCLP: wine\.priceCLP,/, donde);
    assert.doesNotMatch(fuente, /priceCLP: wine\.sale/, donde);
  }
});
