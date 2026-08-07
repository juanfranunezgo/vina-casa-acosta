import test from "node:test";
import assert from "node:assert/strict";
import { renderableDocument } from "../lib/afeleia/contract.ts";

/**
 * `ficha_tecnica_pdf` es un atributo de texto libre que el cliente escribe en su
 * panel, y el valor entra directo a un href. Hoy no es explotable —React 19
 * neutraliza los href javascript: y el navegador bloquea la navegacion a data:—
 * pero eso es una garantia del framework, no del codigo, y la CSP del sitio no
 * ayudaria: su script-src lleva 'unsafe-inline', que habilita los URI javascript:.
 *
 * El commit 8501eef endurecio el campo de imagenes y dejo este igual. Mismo
 * origen, misma confianza, mismo guard.
 */

test("acepta la ruta local de las fichas committeadas", () => {
  assert.equal(
    renderableDocument("/documentos/fichas-tecnicas/bera-rose.pdf"),
    "/documentos/fichas-tecnicas/bera-rose.pdf",
  );
});

test("acepta una URL http(s) absoluta: el PDF puede vivir en cualquier lado", () => {
  const remoto = "https://syvwfadxohizvytanjnx.supabase.co/storage/v1/object/public/a/f.pdf";
  assert.equal(renderableDocument(remoto), remoto);
  assert.equal(renderableDocument("http://ejemplo.cl/f.pdf"), "http://ejemplo.cl/f.pdf");
});

test("descarta los esquemas que ejecutan o embeben", () => {
  assert.equal(renderableDocument("javascript:alert(1)"), undefined);
  assert.equal(renderableDocument("JaVaScRiPt:alert(1)"), undefined);
  assert.equal(renderableDocument("data:text/html;base64,PHNjcmlwdD4="), undefined);
  assert.equal(renderableDocument("vbscript:msgbox(1)"), undefined);
  assert.equal(renderableDocument("file:///etc/passwd"), undefined);
});

test("descarta protocol-relative y rutas del sitio fuera de /documentos/", () => {
  assert.equal(renderableDocument("//evil.example/f.pdf"), undefined);
  assert.equal(renderableDocument("/api/interno"), undefined);
  assert.equal(renderableDocument("/documentos/../api/interno"), undefined);
});

test("descarta lo que no es texto util", () => {
  assert.equal(renderableDocument(undefined), undefined);
  assert.equal(renderableDocument(null), undefined);
  assert.equal(renderableDocument(42), undefined);
  assert.equal(renderableDocument("   "), undefined);
  assert.equal(renderableDocument("no soy una url"), undefined);
});
