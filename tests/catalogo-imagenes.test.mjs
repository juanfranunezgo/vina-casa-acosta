import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { LOCAL_IMAGE_DIR, localizarImagenes } from "../scripts/catalogo-imagenes.mjs";

/**
 * Cómo el generador del snapshot reapunta las fotos a las copias de `public/vinos/`.
 *
 * El caso que lo trajo: dos fotos subidas desde el panel llegan con nombre de marca de tiempo
 * (`1788117431665.png`) y la copia committeada se llama como el producto. Mapeando solo por el
 * nombre del archivo remoto, el snapshot guardaba la URL del Storage; sin API configurada, o con la
 * API local, `renderableImage` la descarta y el sitio mostraba «sin foto» donde `main` mostraba la
 * botella (review de Codex de la etapa E del checkout).
 */

const PUBLIC = path.join("raiz", "public");
const STORAGE =
  "https://syvwfadxohizvytanjnx.supabase.co/storage/v1/object/public/assets/cliente/sitio/productos/p/";

function conCopias(...archivos) {
  const presentes = new Set(archivos.map((archivo) => path.join(PUBLIC, LOCAL_IMAGE_DIR, archivo)));
  return (ruta) => presentes.has(ruta);
}

test("una foto con copia de su mismo nombre apunta a esa copia", () => {
  const productos = [{ slug: "bera", imagenes: [`${STORAGE}bera.png`] }];
  const avisos = localizarImagenes(productos, { publicDir: PUBLIC, existe: conCopias("bera.png") });
  assert.deepEqual(productos[0].imagenes, ["/vinos/bera.png"]);
  assert.deepEqual(avisos, { sinFotoLocal: [], porSlug: [], colisiones: [] });
});

test("una foto del panel sin copia con su nombre cae a la copia del producto, y se avisa", () => {
  const productos = [{ slug: "lajau-betum-yu", imagenes: [`${STORAGE}1788117431665.png`] }];
  const avisos = localizarImagenes(productos, {
    publicDir: PUBLIC,
    existe: conCopias("lajau-betum-yu.png"),
  });
  assert.deepEqual(productos[0].imagenes, ["/vinos/lajau-betum-yu.png"]);
  assert.equal(avisos.porSlug.length, 1);
  assert.match(avisos.porSlug[0], /^lajau-betum-yu → \/vinos\/lajau-betum-yu\.png/);
  assert.deepEqual(avisos.sinFotoLocal, []);
});

test("sin copia por nombre ni por producto, la URL remota se conserva y se avisa", () => {
  const remota = `${STORAGE}1790000000000.png`;
  const productos = [{ slug: "vino-nuevo", imagenes: [remota] }];
  const avisos = localizarImagenes(productos, { publicDir: PUBLIC, existe: conCopias() });
  assert.deepEqual(productos[0].imagenes, [remota]);
  assert.deepEqual(avisos.sinFotoLocal, [`vino-nuevo → ${remota}`]);
  assert.deepEqual(avisos.porSlug, []);
});

test("la copia del producto se usa una sola vez aunque haya varias fotos sin copia", () => {
  const segunda = `${STORAGE}2.png`;
  const productos = [{ slug: "bera", imagenes: [`${STORAGE}1.png`, segunda] }];
  localizarImagenes(productos, { publicDir: PUBLIC, existe: conCopias("bera.png") });
  assert.deepEqual(productos[0].imagenes, ["/vinos/bera.png", segunda]);
});

test("si otra foto del producto ya apunta a su copia, no se repite", () => {
  const primera = `${STORAGE}1.png`;
  const productos = [{ slug: "bera", imagenes: [primera, `${STORAGE}bera.png`] }];
  const avisos = localizarImagenes(productos, { publicDir: PUBLIC, existe: conCopias("bera.png") });
  assert.deepEqual(productos[0].imagenes, [primera, "/vinos/bera.png"]);
  assert.deepEqual(avisos.sinFotoLocal, [`bera → ${primera}`]);
});
