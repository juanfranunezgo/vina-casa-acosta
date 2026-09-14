import test from "node:test";
import assert from "node:assert/strict";
import {
  carritoParaCheckout,
  checkoutIniciarUrl,
  iniciarCheckout,
  minBottlesFrom,
} from "../lib/checkout.ts";

const URL_OK = "https://vina-casa-acosta.checkout.afeleia.cl/iniciar";

test("la URL del checkout tiene que ser https y terminar en /iniciar; localhost puede ser http", () => {
  assert.equal(checkoutIniciarUrl(URL_OK), URL_OK);
  assert.equal(checkoutIniciarUrl("http://localhost:8787/iniciar"), "http://localhost:8787/iniciar");
  assert.equal(checkoutIniciarUrl("http://vina.checkout.afeleia.cl/iniciar"), null);
  assert.equal(checkoutIniciarUrl("https://vina.checkout.afeleia.cl/otra"), null);
  assert.equal(checkoutIniciarUrl(""), null);
  assert.equal(checkoutIniciarUrl(undefined), null);
  assert.equal(checkoutIniciarUrl("no es url"), null);
});

test("el carrito manda solo slug y cantidad, y descarta cantidades no positivas", () => {
  assert.deepEqual(
    carritoParaCheckout([
      { slug: "ombu-carmenere", quantity: 6 },
      { slug: "lajau", quantity: 0 },
    ]),
    { items: [{ slug: "ombu-carmenere", cantidad: 6 }] },
  );
});

test("el mínimo sale del catálogo si es un entero positivo; si no, del respaldo", () => {
  assert.equal(minBottlesFrom({ checkout: { compra_minima_unidades: 12 } }, 6), 12);
  assert.equal(minBottlesFrom({ checkout: {} }, 6), 6);
  assert.equal(minBottlesFrom({}, 6), 6);
  assert.equal(minBottlesFrom(null, 6), 6);
  assert.equal(minBottlesFrom({ checkout: { compra_minima_unidades: 0 } }, 6), 6);
  assert.equal(minBottlesFrom({ checkout: { compra_minima_unidades: "12" } }, 6), 6);
});

function fetchQueResponde(status, body, capturar = () => {}) {
  return async (url, init) => {
    capturar(url, init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
}

test("200 con url del mismo origen redirige", async () => {
  let visto;
  const r = await iniciarCheckout(URL_OK, { items: [{ slug: "ombu", cantidad: 6 }] }, {
    fetch: fetchQueResponde(200, { url: "https://vina-casa-acosta.checkout.afeleia.cl/c/abc/entrar?t=xyz" }, (url, init) => (visto = { url, init })),
  });
  assert.deepEqual(r, { ok: true, url: "https://vina-casa-acosta.checkout.afeleia.cl/c/abc/entrar?t=xyz" });
  assert.equal(visto.url, URL_OK);
  assert.equal(visto.init.method, "POST");
  assert.equal(visto.init.headers.Accept, "application/json");
  assert.equal(visto.init.headers["Content-Type"], "application/json");
  assert.equal(visto.init.credentials, "omit");
  assert.equal(visto.init.body, '{"items":[{"slug":"ombu","cantidad":6}]}');
});

test("200 con una url de otro origen no se sigue", async () => {
  const r = await iniciarCheckout(URL_OK, { items: [] }, {
    fetch: fetchQueResponde(200, { url: "https://otro.example/c/abc" }),
  });
  assert.deepEqual(r, { ok: false, motivo: "no_disponible" });
});

test("400 y 409 son problema del carrito; 404, 429, 503 y 500 son no disponible", async () => {
  for (const status of [400, 409]) {
    const r = await iniciarCheckout(URL_OK, { items: [] }, { fetch: fetchQueResponde(status, {}) });
    assert.deepEqual(r, { ok: false, motivo: "carrito" }, `status ${status}`);
  }
  for (const status of [404, 429, 503, 500]) {
    const r = await iniciarCheckout(URL_OK, { items: [] }, { fetch: fetchQueResponde(status, {}) });
    assert.deepEqual(r, { ok: false, motivo: "no_disponible" }, `status ${status}`);
  }
});

test("una excepción de red o de timeout es no disponible", async () => {
  const r = await iniciarCheckout(URL_OK, { items: [] }, {
    fetch: async () => {
      throw new Error("TypeError: Failed to fetch");
    },
  });
  assert.deepEqual(r, { ok: false, motivo: "no_disponible" });
});
