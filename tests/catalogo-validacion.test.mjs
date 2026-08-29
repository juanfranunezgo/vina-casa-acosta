import test from "node:test";
import assert from "node:assert/strict";
import { avisoPorVaciado, razonParaRechazar } from "../scripts/catalogo-validacion.mjs";

/**
 * Qué respuesta puede convertirse en el snapshot que el sitio sirve cuando
 * Afeleia no contesta.
 *
 * Estas comprobaciones existen por dos hallazgos de review sobre la Etapa D, los
 * dos reproducidos contra una API controlada:
 *
 *   1. un 200 con el catalogo de OTRO cliente se aceptaba y quedaba sellado como
 *      fallback legitimo: el sitio habria publicado nombres y precios ajenos;
 *   2. un 200 malformado —productos sin `slug`— se aceptaba, y despues reventaba
 *      `generateStaticParams`, o sea que impedia desplegar.
 *
 * Desde que el snapshot se refresca en cada build, esto corre en cada deploy.
 */

const SITIO = "vina-casa-acosta";

const SANO = {
  version: 1,
  sitio: SITIO,
  generado_en: "2026-08-27T20:00:00.000Z",
  categorias: [],
  productos: [
    {
      slug: "bera",
      nombre: "Bera",
      precio: 23000,
      imagenes: [],
      agotado: false,
      atributos: {},
    },
  ],
};

test("acepta la respuesta sana del sitio que se pidio", () => {
  assert.equal(razonParaRechazar(SANO, SITIO), null);
});

test("RECHAZA un catalogo valido de otro sitio", () => {
  // El caso mas peligroso: 200, contrato cumplido, cliente equivocado. Nada
  // falla por si solo; el unico que puede notarlo es este chequeo.
  const ajeno = { ...SANO, sitio: "cliente-equivocado" };
  const razon = razonParaRechazar(ajeno, SITIO);
  assert.match(razon ?? "", /cliente-equivocado/);
  assert.match(razon ?? "", /vina-casa-acosta/);
});

test("RECHAZA la respuesta sin slug de sitio", () => {
  const sinSitio = { ...SANO };
  delete sinSitio.sitio;
  assert.ok(razonParaRechazar(sinSitio, SITIO));
});

test("RECHAZA un producto sin slug: es el que rompe el build", () => {
  const malformado = {
    ...SANO,
    productos: [{ imagenes: [], atributos: {} }],
  };
  const razon = razonParaRechazar(malformado, SITIO);
  assert.match(razon ?? "", /contrato/);
});

test("RECHAZA un producto sin precio numerico", () => {
  const sinPrecio = {
    ...SANO,
    productos: [{ ...SANO.productos[0], precio: "23000" }],
  };
  assert.ok(razonParaRechazar(sinPrecio, SITIO));
});

test("ACEPTA el catalogo vacio: despublicar todo es legitimo", () => {
  // El contrato lo declara valido y el runtime lo sirve, pero el generador lo
  // rechazaba, y esa incoherencia tenia consecuencia: el cliente despublica todo,
  // la API y el sitio vivo muestran cero productos, el snapshot se queda con los
  // de ayer y en la proxima caida REAPARECE inventario retirado. H-54 —un control
  // que reprueba un estado correcto es peor que no tenerlo— y ademas en silencio,
  // porque el build seguia verde.
  assert.equal(razonParaRechazar({ ...SANO, productos: [] }, SITIO), null);
});

test("RECHAZA productos que no sea una lista", () => {
  // Vacio es un estado; ausente o de otro tipo es una respuesta rota.
  for (const basura of [null, undefined, "", {}, 0]) {
    assert.ok(
      razonParaRechazar({ ...SANO, productos: basura }, SITIO),
      `productos: ${JSON.stringify(basura)} no puede pasar`,
    );
  }
});

test("RECHAZA otra version del contrato", () => {
  assert.match(razonParaRechazar({ ...SANO, version: 2 }, SITIO) ?? "", /version/);
});

test("RECHAZA lo que no es un objeto", () => {
  for (const basura of [null, undefined, "", 7, [], "una pagina de error"]) {
    assert.ok(razonParaRechazar(basura, SITIO), `${JSON.stringify(basura)} no puede pasar`);
  }
});

test("avisa cuando el catalogo se vacia, y no cuando ya estaba vacio", () => {
  // Aceptar el vacio sin decirlo seria cambiar un falso positivo por un silencio:
  // la tienda queda sin productos y el build sale verde igual. El aviso nombra
  // cuantos habia, que es el dato que permite distinguir "el cliente despublico
  // todo" de "algo se rompio del otro lado".
  assert.match(avisoPorVaciado(13, 0) ?? "", /13/);
  assert.equal(avisoPorVaciado(0, 0), null, "ya estaba vacio: no hay nada que anunciar");
  assert.equal(avisoPorVaciado(13, 12), null, "una baja normal no es asunto de este aviso");
  assert.equal(avisoPorVaciado(null, 0), null, "sin snapshot previo no hay comparacion");
});
