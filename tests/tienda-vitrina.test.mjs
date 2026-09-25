import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * La vitrina de la tienda (`/tienda`) después del rediseño del 2026-09-25:
 * pedido de Juan Francisco, "algo tosca", con el mismo tratamiento que la
 * ficha de vino. Sin renderer en el repo, se lee del fuente.
 */

const raiz = new URL("../", import.meta.url);
// Los archivos se sacan con CRLF en Windows: se normaliza para que las
// expresiones de abajo no dependan de la máquina.
const leer = async (ruta) => (await readFile(new URL(ruta, raiz), "utf8")).replace(/\r\n/g, "\n");

const pagina = await leer("app/[locale]/tienda/page.tsx");
const vitrina = await leer("components/TiendaCatalogo.tsx");
const sello = await leer("components/CompraSegura.tsx");
const boton = await leer("components/AddToCartButton.tsx");

const LOCALES = ["es", "en", "pt"];
const bundles = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, JSON.parse(await leer(`messages/${l}.json`))])),
);

test("el aviso del pie no promete un pago 'próximamente' cuando el pago ya está encendido", () => {
  // Hasta el 2026-09-25 decía "Pago online disponible próximamente · Por ahora
  // coordinamos cada pedido por WhatsApp" con el checkout ya cobrando en
  // producción. Ahora depende de la misma condición que el "Pagar" del carrito.
  assert.match(pagina, /checkoutIniciarUrl\(process\.env\.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL\) !== null/);
  assert.match(pagina, /pagoEnLinea=\{pagoEnLinea\}/);
  assert.match(vitrina, /pagoEnLinea \? t\("disclaimerOnline"\) : t\("disclaimer"\)/);
  for (const locale of LOCALES) {
    const aviso = bundles[locale].tienda.disclaimerOnline;
    assert.equal(typeof aviso, "string", `${locale}.tienda.disclaimerOnline`);
    assert.match(aviso, /Mercado Pago/, locale);
    assert.doesNotMatch(aviso, /próximamente|coming soon|em breve|WhatsApp/i, locale);
    // La ley de alcoholes se sigue diciendo con o sin pago en línea.
    assert.match(aviso, /19\.925/, locale);
  }
});

test("la franja de confianza del encabezado es el mismo sello de la ficha", () => {
  // Un solo componente para los dos lugares: si cambia un dato, cambia en los
  // dos. La vitrina es de cliente y el sello de servidor, así que la página lo
  // arma y se lo pasa armado.
  assert.match(pagina, /confianza=\{\s*<CompraSegura[\s\S]*?variante="franja"/);
  assert.match(pagina, /await getMinBottles\(\)/);
  assert.match(sello, /variante === "franja"/);
  assert.match(vitrina, /\{confianza\}/);
});

test("los filtros son pastillas que dicen si están prendidas", () => {
  // Reemplazan a las casillas nativas. Un botón que se prende y se apaga es
  // un toggle: `aria-pressed` es lo que un lector de pantalla anuncia.
  assert.doesNotMatch(vitrina, /type="checkbox"/);
  assert.match(vitrina, /aria-pressed=\{/);
});

test("el orden sigue siendo un select nativo", () => {
  // La pastilla es sólo el estilo: teclado, lector de pantalla y la rueda
  // nativa del celular siguen funcionando como antes.
  assert.match(vitrina, /<select[\s\S]*?aria-label=\{t\("sort\.label"\)\}/);
  assert.match(vitrina, /appearance-none/);
});

test("la vitrina usa la letra de las fichas en cada sección", () => {
  assert.match(vitrina, /import \{ FUENTE_FICHA \} from "@\/lib\/fuenteFicha"/);
  const secciones = [...vitrina.matchAll(/<section className=([^>]*)>/g)];
  assert.equal(secciones.length, 2, "encabezado y catálogo");
  for (const [, clases] of secciones) {
    assert.match(clases, /\$\{FUENTE_FICHA\}/, clases);
  }
});

test("los encabezados de la tienda son el título y los vinos, no los filtros", () => {
  // Hasta el 2026-09-25 los únicos encabezados bajo el h1 eran "Filtros",
  // "Tipo", "Línea" y "Cepa", y dos veces (el panel de escritorio y la hoja
  // del celular están los dos en el HTML). Los nombres de los vinos, que es
  // lo que la página ofrece, no eran encabezados. Mismo criterio que sacó los
  // h2 del pie el 2026-09-24.
  assert.doesNotMatch(vitrina, /<h3/);
  const h2 = vitrina.match(/<h2/g) ?? [];
  assert.equal(h2.length, 1, "un solo h2: el nombre del vino en su tarjeta");
  assert.match(vitrina, /<h2[^>]*>\s*<Link[\s\S]*?\{wine\.name\}[\s\S]*?<\/Link>\s*<\/h2>/);
});

test("la meta descripción nombra Mercado Pago sólo con el pago en línea encendido", async () => {
  // La misma regla que la franja y el pie: el resultado de Google tampoco
  // puede prometer un pago que el carrito no ofrece.
  const layout = await leer("app/[locale]/tienda/layout.tsx");
  assert.match(layout, /checkoutIniciarUrl\(process\.env\.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL\) !== null/);
  assert.match(layout, /t\(pagoEnLinea \? "descriptionOnline" : "description"\)/);
  for (const locale of LOCALES) {
    const meta = bundles[locale].metadata.tienda;
    assert.match(meta.descriptionOnline, /Mercado Pago/, locale);
    assert.doesNotMatch(meta.description, /Mercado Pago/, locale);
    for (const texto of [meta.description, meta.descriptionOnline]) {
      assert.ok(texto.length <= 160, `${locale}: ${texto.length} caracteres`);
      assert.ok(texto.length >= 110, `${locale}: ${texto.length} caracteres`);
    }
  }
});

test("la tienda declara sus vinos como lista, además de la página como colección", () => {
  // El mismo ItemList de `/vinos` (lib/wineJsonLd) y un CollectionPage propio.
  assert.match(pagina, /buildWinesItemListJsonLd\(catalog,/);
  assert.match(pagina, /buildTiendaJsonLd\(locale,/);
  assert.equal((pagina.match(/<JsonLd data=/g) ?? []).length, 2);
});

test("el botón de carrito de la tarjeta es un círculo vino, no un contorno", () => {
  // El mismo círculo de `IconBadge`: degradado vino y filete de luz.
  assert.match(boton, /from-wine-accent to-primary-container/);
  assert.doesNotMatch(boton, /"w-11 border-primary text-primary/);
});
