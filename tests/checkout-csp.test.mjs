import test from "node:test";
import assert from "node:assert/strict";

async function cspCon(valor) {
  if (valor === undefined) delete process.env.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL;
  else process.env.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL = valor;
  // Import fresco: la config se evalúa al importar y `headers()` al llamar.
  const mod = await import(`../next.config.ts?csp=${encodeURIComponent(String(valor))}`);
  const headers = await mod.default.headers();
  const csp = headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy");
  return csp.value;
}

test("con la URL del checkout, form-action y connect-src suman su origen", async () => {
  const csp = await cspCon("https://vina-casa-acosta.checkout.afeleia.cl/iniciar");
  assert.match(csp, /form-action 'self' https:\/\/vina-casa-acosta\.checkout\.afeleia\.cl(;|$)/);
  assert.match(csp, /connect-src 'self'[^;]* https:\/\/vina-casa-acosta\.checkout\.afeleia\.cl(;|$)/);
});

test("sin la URL, la CSP queda como estaba", async () => {
  const csp = await cspCon(undefined);
  assert.match(csp, /form-action 'self'(;|$)/);
});

test("una URL inválida no abre nada", async () => {
  const csp = await cspCon("http://vina-casa-acosta.checkout.afeleia.cl/iniciar");
  assert.match(csp, /form-action 'self'(;|$)/);
});
