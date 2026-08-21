import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * La capa de +18 se ve o no se ve por un atributo en `<html>`, no por estado de
 * React: `AGE_GATE_SCRIPT` lo pone antes del primer pintado y el CSS decide
 * desde ahi. Eso funciona mientras el documento no se re-renderice.
 *
 * El 2026-08-20, al poner el selector de idioma dentro de la capa, aparecio
 * el agujero: `router.replace` a otro locale re-renderiza `<html>` con las props
 * del layout, React se lleva por delante el atributo y el script no vuelve a
 * correr porque la navegacion es del cliente. Resultado medido: la capa
 * desaparecia y el sitio quedaba entero a la vista sin haber contestado la
 * pregunta, con `localStorage` vacio.
 *
 * Estos tests leen la fuente porque el fallo es silencioso: en pantalla se ve
 * un sitio que funciona.
 */

const raiz = new URL("../", import.meta.url);
const gate = await readFile(new URL("components/AgeGate.tsx", raiz), "utf8");
const css = await readFile(new URL("app/globals.css", raiz), "utf8");
const switcher = await readFile(new URL("components/LanguageSwitcher.tsx", raiz), "utf8");

test("la capa repone el atributo del que depende su propia visibilidad", () => {
  assert.match(
    gate,
    /document\.documentElement\.setAttribute\("data-age-gate", "pendiente"\)/,
    "AgeGate no repone `data-age-gate`: una navegacion del cliente deja el sitio abierto sin confirmar edad",
  );
});

test("el componente y el CSS hablan del mismo atributo y del mismo valor", () => {
  assert.match(css, /html\[data-age-gate="pendiente"\] #age-gate\s*\{\s*display: flex;/);
  assert.match(css, /html\[data-age-gate="pendiente"\] body\s*\{\s*overflow: hidden;/);
  assert.match(gate, /id="age-gate"/);
});

test("saber si hay que preguntar sale del navegador, no del atributo", () => {
  // El atributo es una optimizacion para el primer pintado; el dato duro es la
  // fecha guardada en el navegador. Apoyarse en el atributo trae las dos
  // desgracias a la vez: sin atributo —navegacion del cliente— deja entrar sin
  // confirmar, y con el atributo puesto por la propia capa la sostiene para
  // siempre, incluso a quien ya confirmo.
  const bloque = gate.match(/const sinConfirmacionVigente = \(\) => \{([\s\S]*?)\n\};/);
  assert.ok(bloque, "no se encontro `sinConfirmacionVigente`");
  assert.match(bloque[1], /localStorage\.getItem\(CLAVE\)/);
  assert.doesNotMatch(bloque[1], /getAttribute/);
  assert.match(gate, /const hayQuePreguntar = sinConfirmacionVigente;/);
});

test("la capa no repone el atributo en el render transitorio de la hidratacion", () => {
  // El primer render del cliente repite el del servidor —que siempre dice
  // "preguntando", para que el marcado exista— y el efecto corre ahi, antes de
  // que `useSyncExternalStore` corrija con el dato del navegador. Sin esta
  // guarda, a quien ya confirmo se le ponia el atributo y quedaba encerrado en
  // la capa: la pregunta volvia en cada carga. Medido el 2026-08-20.
  const efecto = gate.match(/if \(estado === "oculto"\) return;([\s\S]*?)setAttribute/);
  assert.ok(efecto, "no se encontro el efecto que repone el atributo");
  assert.match(
    efecto[1],
    /if \(!sinConfirmacionVigente\(\)\) return;/,
    "el efecto pone el atributo sin preguntarle al navegador si ya hay confirmacion",
  );
});

test("el foco entra por el boton que contesta, no por el selector de idioma", () => {
  assert.match(gate, /querySelector<HTMLElement>\("\[data-age-gate-principal\]"\)/);
  // La marca existe en los dos estados: la pregunta y la despedida.
  const marcas = gate.match(/data-age-gate-principal/g) ?? [];
  assert.ok(
    marcas.length >= 3,
    `se esperaba la marca en la consulta y en los dos botones principales, hay ${marcas.length}`,
  );
});

test("el selector de idioma de la capa usa una variante que existe", () => {
  assert.match(gate, /variant="gate"/);
  assert.match(switcher, /variant\?: "desktop" \| "mobile" \| "gate"/);
  assert.match(switcher, /if \(variant === "gate"\)/);
});

test("el srcset de la capa promete anchos que los archivos tienen de verdad", async () => {
  // El recorte vertical sale del master horizontal (2000px de alto x 9/16 =
  // 1125), y `withoutEnlargement` no inventa pixeles: pedirle 1200 y 1600 al
  // pipeline devolvia el MISMO archivo de 1125 con otro nombre. Un srcset que
  // promete 1600w y entrega 1125 hace que el navegador descarte candidatos
  // mejores y pinte borroso, sin ningun error a la vista.
  const candidatos = [...gate.matchAll(/"(\/images\/edad\/[^"\s]+\.webp) (\d+)w"/g)];
  assert.ok(candidatos.length >= 5, `se esperaban los dos encuadres, hay ${candidatos.length} candidatos`);

  for (const [, url, declarado] of candidatos) {
    const archivo = fileURLToPath(new URL(`public${url}`, raiz));
    const { width } = await sharp(archivo).metadata();
    assert.equal(
      width,
      Number(declarado),
      `${url} se declara ${declarado}w y mide ${width}px`,
    );
  }
});
