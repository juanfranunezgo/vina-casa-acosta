import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * `/[locale]/vinos/[slug]` es la unica ruta del sitio que combina segmento
 * dinamico con ISR, y en esa combinacion la restauracion de scroll de Next no
 * corre: la ficha abria en la posicion que traia la tienda. En movil eso dejaba
 * a la persona cerca del footer, sin ver nunca la botella que acababa de tocar.
 *
 * Estos son guards de cableado, no cobertura del DOM: el repo no tiene renderer.
 * Lo que si se verifico en un navegador de verdad, contra un build de produccion,
 * es que el scroll queda en 0 al entrar a la ficha, que el boton atras devuelve a
 * la grilla donde estaba, y que las anclas siguen mandando a su seccion.
 */

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), "utf8");

/**
 * Quita comentarios. Necesario para cualquier asercion sobre el ORDEN de dos
 * llamadas: este componente documenta en prosa como se midio el bug y nombra
 * `window.scrollTo` ahi, antes de usarlo. Sin esto, el test lee el comentario.
 */
const soloCodigo = (fuente) =>
  fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

test("el layout monta ScrollReset", async () => {
  const layout = await leer("app/[locale]/layout.tsx");
  assert.match(layout, /import ScrollReset from "@\/components\/ScrollReset"/);
  assert.match(layout, /<ScrollReset \/>/);
});

test("ScrollReset no pisa las anclas del sitio", async () => {
  // Sin este guard, "Reservar" (#reserva) y el submenu de Actividades
  // (#experiencias, #eventos) saltarian a la cabecera en vez de a su seccion.
  const codigo = soloCodigo(await leer("components/ScrollReset.tsx"));
  assert.match(codigo, /if \(window\.location\.hash\) return;/);
  const posHash = codigo.indexOf("window.location.hash");
  const posScroll = codigo.indexOf("window.scrollTo");
  assert.ok(posScroll > -1, "el componente tiene que scrollear en algun momento");
  assert.ok(posHash < posScroll, "el guard del hash tiene que decidir ANTES de scrollear");
});

test("ScrollReset deja que el navegador restaure en atras/adelante", async () => {
  const fuente = await leer("components/ScrollReset.tsx");
  assert.match(fuente, /addEventListener\("popstate"/);
  assert.match(fuente, /removeEventListener\("popstate"/);
});

test("el reset es instantaneo porque el CSS declara scroll suave", async () => {
  const [fuente, css] = await Promise.all([
    leer("components/ScrollReset.tsx"),
    leer("app/globals.css"),
  ]);
  // Mientras globals.css declare scroll-behavior: smooth, el salto tiene que
  // pedir "instant" explicitamente: si no, anima ~1900px con la ficha ya visible.
  assert.match(css, /scroll-behavior:\s*smooth/);
  assert.match(fuente, /behavior:\s*"instant"/);
});

test("las anclas que el guard protege siguen existiendo", async () => {
  const [menu, tour] = await Promise.all([
    leer("components/ActivitiesMenu.tsx"),
    leer("app/[locale]/actividades/[categoria]/[slug]/page.tsx"),
  ]);
  // Si estas desaparecen, el guard del hash queda sin motivo y conviene saberlo
  // antes de que alguien lo borre por parecer muerto.
  //
  // Vivian en Navbar.tsx hasta el mega-menu; ahora las emite ActivitiesMenu.
  // `#experiencias` ya no se afirma: el plan 2 la retiro a proposito porque esa
  // seccion del indice no lista la categoria. Esa regla la cuida
  // tests/actividades-anclas.test.mjs, que es su dueño.
  assert.match(menu, /#eventos/);
  assert.match(tour, /href="#reserva"/);
});
