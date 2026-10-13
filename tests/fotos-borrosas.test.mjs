import "./alias-hook.mjs";
import "./tsx-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * La foto borrosa que se ve mientras baja la de verdad (2026-10-12).
 *
 * Pedido de Juan Francisco: "en celular, cuando pongo el sitio o cambio la
 * página, donde va la foto queda un gris feo". Ese gris no era un color: era el
 * fondo blanco de la página bajo el velo oscuro que lleva cada portada, durante
 * el segundo o dos que tarda en bajar una foto de 100 a 290 KB con datos
 * móviles. Ahora debajo de cada foto de portada va una miniatura muy chica de
 * la misma foto, estirada: se ve desde el primer pintado porque viaja dentro
 * del HTML, y la foto real la tapa cuando termina de bajar.
 */

const raiz = new URL("../", import.meta.url);
const leer = async (ruta) => (await readFile(new URL(ruta, raiz), "utf8")).replace(/\r\n/g, "\n");

/** Las siete páginas cuya foto de portada va en un `<picture>` propio. */
const PAGINAS = [
  "app/[locale]/page.tsx",
  "app/[locale]/vinos/page.tsx",
  "app/[locale]/historia/page.tsx",
  "app/[locale]/actividades/page.tsx",
  "app/[locale]/actividades/vendimia/page.tsx",
  "app/[locale]/contacto/page.tsx",
  "app/[locale]/staff/page.tsx",
];

// Se cargan dentro de cada test: si el módulo falta, falla el test que lo
// necesita y no el archivo entero.
const mapa = async () => (await import("../data/fotosBorrosas.ts")).fotosBorrosas;
const componente = async () => (await import("../components/FotoBorrosa.tsx")).default;

const MOVIL = "data:image/webp;base64,AAAA";
const ESCRITORIO = "data:image/webp;base64,BBBB";
const dibujar = async (props) => renderToStaticMarkup(createElement(await componente(), props));

test("cada miniatura es un data URI chico de una foto que existe", async () => {
  const fotos = Object.entries(await mapa());
  assert.ok(fotos.length > 0, "el mapa está vacío: correr `npm run fotos:borrosas`");
  for (const [ruta, uri] of fotos) {
    await access(new URL(`public${ruta}`, raiz));
    assert.match(uri, /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, ruta);
    // Viaja dentro del HTML de cada página: tiene que pesar casi nada.
    assert.ok(uri.length < 1000, `${ruta}: ${uri.length} caracteres`);
  }
});

test("bajo cada foto de portada va su versión borrosa, con el mismo encuadre", async () => {
  const fotos = await mapa();
  for (const ruta of PAGINAS) {
    const fuente = await leer(ruta);
    // La borrosa va ANTES en el HTML: lo que viene después se pinta encima.
    const par = fuente.match(/<FotoBorrosa\s([\s\S]*?)\/>\s*<picture[^>]*>([\s\S]*?)<\/picture>/);
    assert.ok(par, `${ruta}: falta <FotoBorrosa /> justo antes del <picture> de la portada`);
    const [, borrosa, real] = par;

    const rutas = [...borrosa.matchAll(/fotoBorrosa\("([^"]+)"\)/g)].map((m) => m[1]);
    assert.ok(rutas.length > 0, `${ruta}: la borrosa no pide ninguna foto`);
    for (const foto of rutas) assert.ok(foto in fotos, `${ruta}: ${foto} no tiene miniatura`);

    // Mismo recorte que la foto real: si no, al enfocarse la imagen "salta".
    // Lo único que no comparte es el zoom de entrada, que es de la foto nítida.
    const clases = (bloque) => bloque.match(/className="([^"]*)"/)?.[1];
    const sinAnimacion = clases(real.slice(real.indexOf("<img")))
      .replace(/\s*motion-safe:animate-\[[^\]]*\]/, "")
      .trim();
    assert.equal(clases(borrosa), sinAnimacion, ruta);
  }
});

test("la borrosa lleva los dos encuadres y no existe para un lector de pantalla", async () => {
  const html = await dibujar({ movil: MOVIL, escritorio: ESCRITORIO, className: "h-full w-full object-cover" });
  assert.match(html, /^<picture class="absolute inset-0">/);
  // El mismo corte de proporción que usan las portadas para elegir encuadre.
  assert.match(html, new RegExp(`<source media="\\(min-aspect-ratio: 3/4\\)" srcSet="${ESCRITORIO}"/>`));
  // `alt=""`: decorativa. La descripción la lleva la foto real, encima.
  assert.match(html, new RegExp(`<img src="${MOVIL}" alt="" class="h-full w-full object-cover"/>`));
});

test("con un solo encuadre no declara una fuente alternativa", async () => {
  // El hub de Vendimia tiene una sola foto para todas las pantallas.
  const html = await dibujar({ escritorio: ESCRITORIO, className: "h-full w-full" });
  assert.doesNotMatch(html, /<source/);
  assert.match(html, new RegExp(`<img src="${ESCRITORIO}" alt=""`));
});

test("sin miniatura no dibuja nada, en vez de una imagen rota", async () => {
  assert.equal(await dibujar({ className: "h-full w-full" }), "");
});

test("la capa de +18 recibe su borrosa desde el layout, sin llevar el mapa al navegador", async () => {
  // Es lo primero que ve un visitante nuevo, y es un componente de cliente:
  // importar ahí el mapa entero metería todas las miniaturas en su JavaScript.
  const fotos = await mapa();
  const layout = await leer("app/[locale]/layout.tsx");
  const capa = await leer("components/AgeGate.tsx");
  const paso = layout.match(/<AgeGate\s+fotoBorrosa=\{\{([\s\S]*?)\}\}\s*\/>/);
  assert.ok(paso, "el layout no le pasa la borrosa a la capa");
  const rutas = [...paso[1].matchAll(/fotoBorrosa\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.equal(rutas.length, 2, "celular y escritorio");
  for (const foto of rutas) assert.ok(foto in fotos, `${foto} no tiene miniatura`);
  assert.match(capa, /<FotoBorrosa\s[\s\S]*?\/>\s*<picture/);
  assert.doesNotMatch(capa, /data\/fotosBorrosas|lib\/fotoBorrosa/);
});

test("la portada de cada ficha de actividad usa el desenfoque de next/image", async () => {
  const fotos = await mapa();
  const { activities } = await import("../data/activities.ts");
  for (const { slug, image } of activities) {
    assert.ok(image in fotos, `${slug}: ${image} no tiene miniatura`);
  }
  const ficha = await leer("app/[locale]/actividades/[categoria]/[slug]/page.tsx");
  // Sin miniatura (una actividad nueva antes de correr el script) se queda
  // como hoy: `placeholder="blur"` sin `blurDataURL` es un error de Next.
  assert.match(ficha, /placeholder=\{borrosa \? "blur" : "empty"\}/);
  assert.match(ficha, /blurDataURL=\{borrosa\}/);
});

test("las miniaturas salen de `npm run fotos:borrosas`", async () => {
  const paquete = JSON.parse(await leer("package.json"));
  assert.equal(paquete.scripts["fotos:borrosas"], "node scripts/fotos-borrosas.mjs");
});
