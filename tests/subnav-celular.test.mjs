import "./alias-hook.mjs";
import "./tsx-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * La píldora de secciones (Detalle · Galería · Preguntas · Reserva) en celular.
 *
 * Pedido de Juan Francisco del 2026-10-12: "dejar la sub nav en la parte de
 * abajo del celular para que no estorbe donde va la vista", y "que quede lo
 * menos ancha posible". Pegada bajo el navbar, en un celular se llevaba junto
 * con él 150 px de los 812 de la pantalla, justo arriba, donde se lee.
 *
 * En escritorio sigue como estaba: pegada bajo el navbar.
 *
 * El mismo día la sumó a la página de la vendimia, con las migas bajo el hero
 * y centradas, como en las fichas.
 */

const raiz = new URL("../", import.meta.url);
const leer = async (ruta) => (await readFile(new URL(ruta, raiz), "utf8")).replace(/\r\n/g, "\n");

const PROPS = {
  items: [
    { id: "detalle", label: "Detalle" },
    { id: "galeria", label: "Galería" },
    { id: "preguntas", label: "Preguntas" },
  ],
  cta: { id: "reserva", label: "Reserva" },
  aria: "Secciones",
};

async function dibujar() {
  const { default: ActivitySectionNav } = await import("../components/ActivitySectionNav.tsx");
  return renderToStaticMarkup(createElement(ActivitySectionNav, PROPS));
}

/** Las clases del elemento que posiciona la píldora: el primero del marcado. */
const clasesDe = (html, etiqueta) =>
  html.match(new RegExp(`<${etiqueta}[^>]*class="([^"]*)"`))?.[1].split(/\s+/) ?? [];

test("en celular la píldora va fija abajo; en escritorio, pegada bajo el navbar", async () => {
  const envoltorio = clasesDe(await dibujar(), "div");
  // Celular: fija, de lado a lado, abajo, respetando la franja del gesto de inicio.
  assert.ok(envoltorio.includes("max-md:fixed"));
  assert.ok(envoltorio.includes("max-md:inset-x-0"));
  assert.ok(
    envoltorio.includes("max-md:bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"),
    "el borde inferior tiene que sumar la zona segura del teléfono",
  );
  // Escritorio: como antes.
  assert.ok(envoltorio.includes("md:sticky"));
  assert.ok(envoltorio.includes("md:top-24"));
  // Ya no se pega arriba en celular.
  assert.ok(!envoltorio.includes("sticky"), "queda un `sticky` sin `md:`");
  assert.ok(!envoltorio.includes("top-[88px]"));
});

test("la píldora se dibuja visible: sin JavaScript no puede quedar escondida", async () => {
  // Quién la esconde es el script, cuando la página pasa del formulario; el
  // servidor la manda visible, que es lo correcto al entrar a la página.
  const html = await dibujar();
  assert.match(html, /^<div[^>]*data-subnav-abajo="visible"/);
  assert.ok(!clasesDe(html, "div").includes("max-md:invisible"));
});

test("en celular los rótulos van más juntos, para que la píldora sea angosta", async () => {
  const html = await dibujar();
  const enlace = html.match(/<a href="#detalle"[^>]*class="([^"]*)"/)?.[1].split(/\s+/) ?? [];
  assert.ok(enlace.includes("max-md:px-2"), "el relleno de celular");
  assert.ok(enlace.includes("md:px-2.5"), "el relleno de escritorio, como antes");
});

test("el carrito flotante sube cuando la píldora está abajo", async () => {
  // Los dos van fijos abajo en celular: sin esto la píldora, centrada, queda
  // debajo del círculo del carrito.
  const carrito = await leer("components/CartButton.tsx");
  assert.match(carrito, /data-cart-fab/);
  const estilos = await leer("app/globals.css");
  const regla = estilos.match(
    /@media \(max-width: 767\.98px\) \{[\s\S]*?body:has\(\[data-subnav-abajo="visible"\]\) \[data-cart-fab\] \{([^}]*)\}/,
  );
  assert.ok(regla, "falta la regla que sube el carrito");
  // `translate` y no `transform`: el botón ya usa `scale` al tocarlo.
  assert.match(regla[1], /translate:\s*0 -/);
});

test("la vendimia lleva las migas bajo el hero, centradas, y la píldora de secciones", async () => {
  const pagina = await leer("app/[locale]/actividades/vendimia/page.tsx");
  const hero = pagina.indexOf("{/* Dv1 — Hero");
  const finHero = pagina.indexOf("</section>", hero);
  const migas = pagina.indexOf("<ActivityBreadcrumbs");
  assert.ok(hero > 0 && finHero > hero);
  assert.ok(migas > finHero, "las migas siguen dentro de la foto");
  const bloqueMigas = pagina.slice(migas, pagina.indexOf("/>", migas));
  assert.match(bloqueMigas, /tone="papel"/);
  assert.match(bloqueMigas, /align="center"/);

  const inicio = pagina.indexOf("<ActivitySectionNav");
  assert.ok(inicio > migas, "la píldora va después de las migas");
  const pildora = pagina.slice(inicio, pagina.indexOf("/>", inicio));
  // Cada rótulo lleva a una sección que existe en la página.
  for (const id of ["jornada", "galeria", "preguntas"]) {
    assert.match(pildora, new RegExp(`id: "${id}"`), id);
    assert.match(pagina, new RegExp(`id="${id}"`), `no existe la sección #${id}`);
  }
  assert.match(pildora, /cta=\{\{ id: "consulta"/);

  // La píldora acompaña mientras su contenedor está en pantalla: tiene que
  // cerrar después de la consulta y antes de "otras formas de vivir el ciclo".
  const consulta = pagina.indexOf('id="consulta"');
  const otras = pagina.indexOf("{/* Dv5 —");
  const cierre = pagina.indexOf("{/* Fin del recorrido de la píldora */}");
  assert.ok(cierre > consulta && cierre < otras, "el contenedor de la píldora no cierra donde debe");
});
