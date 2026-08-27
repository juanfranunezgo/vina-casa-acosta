import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidCatalog,
  optionsFor,
  readOptionValue,
  sanitizeDefinitions,
  technicalRowsFrom,
} from "../lib/afeleia/contract.ts";

/**
 * `definiciones_atributos` es una clave NUEVA del contrato v1, y la regla 3 de la
 * politica de extension dice que toda clave nueva es opcional en la lectura: el
 * snapshot committeado es una respuesta v1 vieja y no la trae. Por eso cada
 * funcion de aca tiene su caso "el bloque no viaja", y no como caso raro sino
 * como el caso que ocurre en cada modo degradado.
 *
 * La asimetria contra `isValidProduct` tambien se fija aca: un bloque de
 * definiciones roto NO invalida el catalogo. Las definiciones son una mejora;
 * los productos son el producto.
 */

const LINEA = {
  clave: "linea",
  etiqueta: "Linea",
  tipo: "opcion",
  orden: 1,
  opciones: ["Ombu", "Lajau"],
};

const FICHA = {
  clave: "ficha_tecnica",
  etiqueta: "Ficha tecnica",
  tipo: "grupo",
  orden: 11,
  subcampos: [
    { clave: "blend", etiqueta: "Composicion" },
    { clave: "alcohol", etiqueta: "Alcohol" },
    { clave: "volumen_ml", etiqueta: "Volumen (ml)" },
  ],
};

const FALLBACK = ["Ombu", "Lajau", "Estacion Francia"];

// --- sanitizeDefinitions ------------------------------------------------------

test("sanitizeDefinitions devuelve [] cuando el bloque no viaja", () => {
  assert.deepEqual(sanitizeDefinitions(undefined), []);
  assert.deepEqual(sanitizeDefinitions(null), []);
});

test("sanitizeDefinitions devuelve [] cuando el bloque no es una lista", () => {
  assert.deepEqual(sanitizeDefinitions({ linea: LINEA }), []);
  assert.deepEqual(sanitizeDefinitions("definiciones"), []);
});

test("sanitizeDefinitions conserva las entradas sanas y descarta solo las rotas", () => {
  const defs = sanitizeDefinitions([
    LINEA,
    null,
    "basura",
    { etiqueta: "Sin clave", tipo: "texto", orden: 2 },
    { clave: "", etiqueta: "Clave vacia", tipo: "texto", orden: 3 },
    { clave: "sin_tipo", etiqueta: "Sin tipo", orden: 4 },
    FICHA,
  ]);
  assert.deepEqual(
    defs.map((d) => d.clave),
    ["linea", "ficha_tecnica"],
    "una entrada rota no puede llevarse puestas a las sanas",
  );
});

test("sanitizeDefinitions no se atraganta con un tipo que no conoce", () => {
  // `tipo` es string a proposito: la politica del contrato permite tipos nuevos
  // y un consumidor v1 no puede romperse con uno que todavia no existe.
  const [def] = sanitizeDefinitions([
    { clave: "color", etiqueta: "Color", tipo: "color_hex", orden: 20 },
  ]);
  assert.equal(def.tipo, "color_hex");
});

test("sanitizeDefinitions limpia opciones y subcampos malformados sin tirar la definicion", () => {
  const [linea] = sanitizeDefinitions([{ ...LINEA, opciones: ["Ombu", "", 7, null, "Lajau"] }]);
  assert.deepEqual(linea.opciones, ["Ombu", "Lajau"]);

  const [ficha] = sanitizeDefinitions([
    {
      ...FICHA,
      subcampos: [{ clave: "blend", etiqueta: "Composicion" }, { etiqueta: "Sin clave" }, 3],
    },
  ]);
  assert.deepEqual(ficha.subcampos, [{ clave: "blend", etiqueta: "Composicion" }]);
});

test("sanitizeDefinitions cae a la clave cuando falta la etiqueta", () => {
  // Mostrar "volumen_ml" es feo; imprimir una clave de i18n cruda es un bug.
  const [def] = sanitizeDefinitions([{ clave: "volumen_ml", tipo: "texto", orden: 5 }]);
  assert.equal(def.etiqueta, "volumen_ml");
});

// --- optionsFor ---------------------------------------------------------------

test("optionsFor usa las opciones publicadas cuando existen", () => {
  assert.deepEqual(optionsFor([LINEA], "linea", FALLBACK), ["Ombu", "Lajau"]);
});

test("optionsFor cae al fallback cuando el bloque no viaja", () => {
  // El caso del snapshot: sin definiciones, los filtros se siguen dibujando.
  assert.deepEqual(optionsFor([], "linea", FALLBACK), FALLBACK);
});

test("optionsFor cae al fallback cuando la clave no esta definida", () => {
  assert.deepEqual(optionsFor([FICHA], "linea", FALLBACK), FALLBACK);
});

test("optionsFor cae al fallback cuando la lista publicada esta vacia", () => {
  // Una lista vacia dejaria la tienda sin ningun filtro: es peor que la local.
  assert.deepEqual(optionsFor([{ ...LINEA, opciones: [] }], "linea", FALLBACK), FALLBACK);
});

// --- readOptionValue ----------------------------------------------------------

test("readOptionValue acepta un valor que esta en la lista", () => {
  assert.equal(readOptionValue({ linea: "Lajau" }, "linea", ["Ombu", "Lajau"]), "Lajau");
});

test("readOptionValue descarta un valor ajeno a la lista", () => {
  assert.equal(readOptionValue({ linea: "afeleia" }, "linea", ["Ombu", "Lajau"]), undefined);
});

test("readOptionValue trata la clave ausente como sin valor", () => {
  assert.equal(readOptionValue({}, "linea", ["Ombu"]), undefined);
});

test("readOptionValue descarta lo que no es texto", () => {
  assert.equal(readOptionValue({ linea: 7 }, "linea", ["7"]), undefined);
  assert.equal(readOptionValue({ linea: ["Ombu"] }, "linea", ["Ombu"]), undefined);
});

// --- technicalRowsFrom --------------------------------------------------------

test("technicalRowsFrom respeta el orden declarado, no el del objeto", () => {
  // El panel guarda las claves en cualquier orden; la ficha se lee en el orden
  // que declaro la definicion.
  const filas = technicalRowsFrom([FICHA], {
    ficha_tecnica: { volumen_ml: "750", alcohol: "13,5%", blend: "100% Carmenere" },
  });
  assert.deepEqual(
    filas.map((f) => f.clave),
    ["blend", "alcohol", "volumen_ml"],
  );
  assert.deepEqual(filas[0], {
    clave: "blend",
    etiqueta: "Composicion",
    valor: "100% Carmenere",
  });
});

test("technicalRowsFrom descarta los subcampos sin valor", () => {
  const filas = technicalRowsFrom([FICHA], {
    ficha_tecnica: { blend: "100% Tannat", alcohol: "   ", volumen_ml: "" },
  });
  assert.deepEqual(
    filas.map((f) => f.clave),
    ["blend"],
  );
});

test("technicalRowsFrom devuelve [] cuando falta cualquiera de las dos partes", () => {
  assert.deepEqual(technicalRowsFrom([], { ficha_tecnica: { blend: "100% Tannat" } }), []);
  assert.deepEqual(technicalRowsFrom([FICHA], {}), []);
  assert.deepEqual(technicalRowsFrom([FICHA], { ficha_tecnica: "no es un grupo" }), []);
});

test("technicalRowsFrom solo mira la clave que se le pide", () => {
  const otra = { ...FICHA, clave: "ficha_larga" };
  assert.equal(technicalRowsFrom([otra], { ficha_larga: { blend: "x" } }, "ficha_larga").length, 1);
  assert.deepEqual(technicalRowsFrom([otra], { ficha_larga: { blend: "x" } }), []);
});

// --- isValidCatalog: la asimetria deliberada ----------------------------------

const CUERPO_SANO = {
  version: 1,
  sitio: "vina-casa-acosta",
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

test("un catalogo SIN definiciones_atributos sigue siendo valido", () => {
  // Es el snapshot committeado, y es tambien toda respuesta v1 anterior a la
  // Etapa B. Si esto fallara, el sitio entero caeria a modo degradado.
  assert.equal(isValidCatalog(CUERPO_SANO), true);
});

test("un bloque de definiciones roto NO empuja al catalogo a modo snapshot", () => {
  for (const roto of ["", 7, {}, [null], [{ sin: "clave" }]]) {
    assert.equal(
      isValidCatalog({ ...CUERPO_SANO, definiciones_atributos: roto }),
      true,
      "definiciones_atributos roto no puede invalidar el catalogo: " + JSON.stringify(roto),
    );
  }
});

test("un producto roto SI invalida el catalogo: esa asimetria es a proposito", () => {
  assert.equal(isValidCatalog({ ...CUERPO_SANO, productos: [{ slug: "bera" }] }), false);
});
