import test from "node:test";
import assert from "node:assert/strict";
import { renderableImage } from "../lib/afeleia/contract.ts";

/**
 * `imagenes[]` lo llena el cliente desde su panel y llega por la red. `next/image`
 * solo acepta un `src` que empiece con "/" o que matchee `images.remotePatterns`:
 * con cualquier otra cosa tira una excepcion en desarrollo, y una excepcion dentro
 * de una pagina SSG/ISR no rompe la foto, rompe la pagina.
 *
 * Es la mitad defensiva que el manual de conexion pide en §3.11 y §8.D.
 */

const API = "https://syvwfadxohizvytanjnx.supabase.co/functions/v1";
const PUBLICA = `https://syvwfadxohizvytanjnx.supabase.co/storage/v1/object/public/assets/c/s/productos/bera.png`;

test("acepta la URL publica de Storage del host configurado", () => {
  assert.equal(renderableImage([PUBLICA], API), PUBLICA);
});

test("acepta una ruta del propio sitio, que es lo que trae el snapshot", () => {
  assert.equal(renderableImage(["/vinos/bera.webp"], API), "/vinos/bera.webp");
});

test("descarta la ruta relativa de Storage (el bug H-49)", () => {
  // Exactamente lo que el panel guardaba antes de H-49: sin esquema, sin barra.
  const relativa = "9fc901c5-3455/95ecfe8a/productos/ca390c02/1784905694288.png";
  assert.equal(renderableImage([relativa], API), undefined);
});

test("descarta un host que no es el configurado, aunque sea https", () => {
  assert.equal(
    renderableImage(["https://evil.example/storage/v1/object/public/assets/x.png"], API),
    undefined,
  );
});

test("descarta el mismo host con otro pathname: remotePatterns tampoco lo permite", () => {
  assert.equal(
    renderableImage(["https://syvwfadxohizvytanjnx.supabase.co/rest/v1/productos"], API),
    undefined,
  );
});

test("descarta protocol-relative: es URL, no ruta del sitio", () => {
  assert.equal(renderableImage(["//evil.example/x.png"], API), undefined);
});

test("descarta esquemas que no son http(s)", () => {
  assert.equal(renderableImage(["javascript:alert(1)"], API), undefined);
  assert.equal(renderableImage(["data:image/png;base64,AAA"], API), undefined);
});

test("devuelve la PRIMERA renderizable, no la primera a secas", () => {
  assert.equal(renderableImage(["ruta/relativa/rota.png", PUBLICA], API), PUBLICA);
});

test("sin API configurada solo sobreviven las rutas del propio sitio", () => {
  assert.equal(renderableImage([PUBLICA], undefined), undefined);
  assert.equal(renderableImage(["/vinos/bera.webp"], undefined), "/vinos/bera.webp");
});

test("descarta una ruta del sitio fuera de la carpeta del snapshot", () => {
  // El snapshot solo emite /vinos/<archivo>. Todo lo demas es superficie sin uso:
  // el optimizador de Next haria un fetch de esa ruta contra el propio origen.
  assert.equal(renderableImage(["/api/interno/secreto"], API), undefined);
  assert.equal(renderableImage(["/_next/static/chunk.js"], API), undefined);
  assert.equal(renderableImage(["/es/vinos"], API), undefined);
  assert.equal(renderableImage(["/"], API), undefined);
});

test("descarta el escape con .. aunque empiece en la carpeta correcta", () => {
  assert.equal(renderableImage(["/vinos/../../api/interno"], API), undefined);
  // %2F NO es un escape: el optimizador no lo decodifica como separador y
  // hasLocalMatch lo trata como un nombre de archivo raro dentro de /vinos/.
  // Se fija para que nadie "arregle" de mas y rompa nombres legitimos con %.
  assert.equal(renderableImage(["/vinos/..%2F..%2Fx"], API), "/vinos/..%2F..%2Fx");
});

test("sigue aceptando lo que el snapshot realmente produce", () => {
  assert.equal(renderableImage(["/vinos/bera.png"], API), "/vinos/bera.png");
  assert.equal(renderableImage(["/vinos/sub/bera.webp"], API), "/vinos/sub/bera.webp");
});

test("tolera formas que el contrato dice que no llegan pero nadie garantiza", () => {
  assert.equal(renderableImage(undefined, API), undefined);
  assert.equal(renderableImage(null, API), undefined);
  assert.equal(renderableImage("no soy un array", API), undefined);
  assert.equal(renderableImage([], API), undefined);
  assert.equal(renderableImage([null, 42, {}, "   "], API), undefined);
});
