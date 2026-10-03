import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// Como espacio de nombres y no con llaves: si `readSale` falta, falla cada test
// que la usa en vez de caerse el archivo entero al importar.
import * as contract from "../lib/afeleia/contract.ts";
import { razonParaNoDesplegar, razonParaRechazar } from "../scripts/catalogo-validacion.mjs";

/**
 * La rebaja de un producto: `precio_anterior` y `descuento_porcentaje`, dos
 * claves aditivas del contrato v1 que viajan las dos o ninguna.
 *
 * Dos cosas se cuidan acá. La primera es anterior a la rebaja y vale para
 * cualquier clave que Afeleia agregue: un lector v1 ignora lo que no conoce
 * (regla 2 de la política de extensión). Si este sitio validara «exactamente
 * estas claves», el día que la viña ponga su primera rebaja la tienda entera
 * caería al snapshot. La segunda es la regla de lectura: hay rebaja solo con las
 * dos claves, las dos números, el precio anterior mayor que el de venta y el
 * porcentaje entero de 1 a 99. Todo lo demás es «sin rebaja», nunca un error.
 */

const SITIO = "vina-casa-acosta";

const PRODUCTO = {
  slug: "ombu-carmenere",
  codigo: "VCA-001",
  nombre: "Ombú Carmenere",
  descripcion: null,
  descripcion_corta: null,
  precio: 9990,
  moneda: "CLP",
  imagenes: ["/vinos/ombu-carmenere.webp"],
  destacado: false,
  categoria: "vinos",
  agotado: false,
  atributos: {},
};

const REBAJADO = { ...PRODUCTO, precio_anterior: 12990, descuento_porcentaje: 23 };

function catalogoCon(producto, extra = {}) {
  return {
    version: 1,
    sitio: SITIO,
    generado_en: "2026-10-03T12:00:00.000Z",
    categorias: [],
    productos: [producto],
    ...extra,
  };
}

const raiz = new URL("../", import.meta.url);
const leer = (ruta) => readFile(new URL(ruta, raiz), "utf8");

// --- Un lector v1 ignora las claves que no conoce ------------------------------

const CON_CLAVES_NUEVAS = {
  "las dos claves de la rebaja": catalogoCon(REBAJADO),
  "una clave de producto que nadie conoce": catalogoCon({
    ...PRODUCTO,
    clave_del_futuro: { lo: "que sea" },
    otra_mas: ["a", 1, null],
  }),
  "una clave de primer nivel que nadie conoce": catalogoCon(PRODUCTO, {
    bloque_del_futuro: { activo: true },
  }),
};

for (const [caso, catalogo] of Object.entries(CON_CLAVES_NUEVAS)) {
  test(`el runtime acepta un catálogo con ${caso}`, () => {
    // El mismo guard lo aplica el carrito en el navegador (`CartDrawer`).
    assert.equal(contract.isValidCatalog(catalogo), true);
  });

  test(`el generador del snapshot acepta una respuesta con ${caso}`, () => {
    assert.equal(razonParaRechazar(catalogo, SITIO), null);
  });

  test(`el prebuild deja desplegar un snapshot con ${caso}`, () => {
    assert.equal(razonParaNoDesplegar(JSON.stringify(catalogo), SITIO), null);
  });
}

test("una rebaja mal formada NO invalida el catálogo", () => {
  // La misma asimetría que las definiciones: la rebaja es una mejora, los
  // productos son el producto. Si un `precio_anterior` roto mandara el sitio al
  // snapshot, un error en un adorno dejaría la tienda entera con precios viejos.
  for (const roto of [
    { precio_anterior: "12990", descuento_porcentaje: "23" },
    { precio_anterior: null, descuento_porcentaje: null },
    { precio_anterior: 12990 },
    { descuento_porcentaje: 150 },
  ]) {
    const catalogo = catalogoCon({ ...PRODUCTO, ...roto });
    assert.equal(contract.isValidCatalog(catalogo), true, JSON.stringify(roto));
    assert.equal(razonParaRechazar(catalogo, SITIO), null, JSON.stringify(roto));
  }
});

// --- readSale: cuándo hay rebaja ------------------------------------------------

test("con las dos claves hay rebaja, con los valores publicados", () => {
  assert.deepEqual(contract.readSale(REBAJADO), {
    previousPriceCLP: 12990,
    discountPercent: 23,
  });
});

test("sin ninguna de las dos claves no hay rebaja", () => {
  assert.equal(contract.readSale(PRODUCTO), undefined);
});

test("con una sola de las dos claves no hay rebaja", () => {
  assert.equal(contract.readSale({ ...PRODUCTO, precio_anterior: 12990 }), undefined);
  assert.equal(contract.readSale({ ...PRODUCTO, descuento_porcentaje: 23 }), undefined);
});

test("un precio anterior igual o menor que el de venta no es una rebaja", () => {
  assert.equal(contract.readSale({ ...REBAJADO, precio_anterior: 9990 }), undefined);
  assert.equal(contract.readSale({ ...REBAJADO, precio_anterior: 9989 }), undefined);
  assert.equal(contract.readSale({ ...REBAJADO, precio_anterior: 0 }), undefined);
});

test("el porcentaje vale de 1 a 99: 0 y 100 no son una rebaja", () => {
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: 0 }), undefined);
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: 100 }), undefined);
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: -23 }), undefined);
});

test("los bordes del porcentaje, 1 y 99, sí son una rebaja", () => {
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: 1 })?.discountPercent, 1);
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: 99 })?.discountPercent, 99);
});

test("un porcentaje con decimales no es una rebaja", () => {
  // El contrato lo publica entero y ya redondeado. Redondearlo acá sería
  // calcular el porcentaje en la web, que es lo que el contrato prohíbe.
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: 23.5 }), undefined);
});

test("textos en vez de números no son una rebaja", () => {
  // No se convierten: "12990" es un dato mal publicado, y dibujarlo tachado
  // sería adivinar qué quiso decir la API.
  assert.equal(contract.readSale({ ...REBAJADO, precio_anterior: "12990" }), undefined);
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: "23" }), undefined);
  assert.equal(
    contract.readSale({ ...PRODUCTO, precio_anterior: "12990", descuento_porcentaje: "23" }),
    undefined,
  );
});

test("lo que no es un número finito tampoco es una rebaja", () => {
  for (const valor of [null, true, NaN, Infinity, [12990], { valor: 12990 }]) {
    assert.equal(
      contract.readSale({ ...REBAJADO, precio_anterior: valor }),
      undefined,
      `precio_anterior: ${String(valor)}`,
    );
    assert.equal(
      contract.readSale({ ...REBAJADO, descuento_porcentaje: valor }),
      undefined,
      `descuento_porcentaje: ${String(valor)}`,
    );
  }
});

test("el porcentaje no se calcula: se muestra el publicado", () => {
  // De 12.990 a 9.990 hay un 23 %. Si la API publica 50, la web dice 50: el
  // redondeo y la regla son de Afeleia, y dos cálculos terminan discrepando.
  assert.equal(contract.readSale({ ...REBAJADO, descuento_porcentaje: 50 })?.discountPercent, 50);
});

test("el snapshot committeado se lee igual: una respuesta vieja no trae rebajas", async () => {
  // Regla 3: toda clave nueva es opcional en la lectura. El respaldo de este
  // repo es una respuesta v1 anterior a las dos claves, o una donde ningún
  // producto está rebajado: cada producto se lee sin tirar y sin rebaja.
  //
  // Cuando se regenere con rebajas publicadas, esto pasa a comprobar lo otro:
  // que cada rebaja del respaldo se pueda dibujar. Si falla ahí, el problema está
  // en lo que publicó la API —una clave sola, un % fuera de 1 a 99— y no acá.
  const snapshot = JSON.parse(await leer("data/catalogo-fallback.json"));
  assert.ok(snapshot.productos.length > 0);
  for (const producto of snapshot.productos) {
    const declara = "precio_anterior" in producto || "descuento_porcentaje" in producto;
    const rebaja = contract.readSale(producto);
    if (declara) assert.ok(rebaja, `${producto.slug}: declara una rebaja que no se puede dibujar`);
    else assert.equal(rebaja, undefined, producto.slug);
  }
});

// --- El adaptador -----------------------------------------------------------------
// `lib/afeleia/catalog.ts` importa React y el snapshot, y `node --test` no puede
// cargarlo: lo que sigue se lee del fuente.

test("el adaptador lee la rebaja con readSale y no toca el precio de venta", async () => {
  const catalogo = (await leer("lib/afeleia/catalog.ts")).replace(/\r\n/g, "\n");
  assert.match(catalogo, /\n    sale: readSale\(product\),\n/);
  // `precio` sigue siendo lo que se cobra: es lo que llega al carrito.
  assert.match(catalogo, /\n    priceCLP: product\.precio,\n/);
});
