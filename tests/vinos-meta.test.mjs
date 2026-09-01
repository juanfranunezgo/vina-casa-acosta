import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";

const { wineSearchTitle, wineMetaDescription, LARGO_MAXIMO_DE_TITULO } =
  await import("@/lib/wineMeta");

/**
 * Qué dice de un vino el resultado de Google.
 *
 * El bug de origen: el título de la ficha era el nombre del producto y nada más
 * («Guidaí · Viña Casa Acosta»), así que la página solo podía ganar búsquedas de
 * marca —y «Guidaí» no lo busca nadie—. Las palabras que la gente escribe
 * («espumante rosado», «carmenere gran reserva», «late harvest») estaban en el
 * catálogo y no llegaban al buscador.
 *
 * Se prueba ejecutando la regla y no leyendo el archivo: lo que importa no es
 * que la línea esté escrita, sino que un ensamblaje rosado NO termine anunciado
 * como tinto y que un vino sin datos no invente nada.
 */

/** El diccionario de sufijos, tal como viaja desde messages/es.json. */
const ES = {
  blendRed: "ensamblaje tinto",
  byType: { rosado: "vino rosé", espumante: "espumante" },
  overrides: {
    guidai: "espumante rosado",
    "yaray-gua-tinto": "late harvest dulce",
    "yaray-gua-blanco": "late harvest",
  },
};

// --- El nivel, que es lo que la gente escribe --------------------------------

test("un Reserva lo dice en el titulo, sin coma y como lo escribio el panel", () => {
  const titulo = wineSearchTitle(
    { slug: "ombu-carmenere", name: "Ombú Carmenere", category: "Reserva", type: "Tinto" },
    ES,
  );
  assert.equal(titulo, "Ombú Carmenere Reserva");
});

test("«Gran Reserva» tambien, y se reconoce con mayusculas o acentos raros", () => {
  for (const nivel of ["Gran Reserva", "GRAN RESERVA", "gran reserva"]) {
    const titulo = wineSearchTitle(
      { slug: "ef-tannat", name: "Estación Francia Tannat", category: nivel, type: "Tinto" },
      ES,
    );
    assert.equal(titulo, `Estación Francia Tannat ${nivel}`);
  }
});

test("un nivel que no es termino de busqueda no ensucia el titulo", () => {
  // «Edición Limitada» es cierto y no lo busca nadie. Un nivel nuevo del panel
  // cae igual: la lista es de permitidos, así que lo desconocido no aparece.
  const titulo = wineSearchTitle(
    { slug: "lajau-deti", name: "Lajau Detí", category: "Edición Limitada", type: "Tinto" },
    {},
  );
  assert.equal(titulo, "Lajau Detí");
});

// --- Ensamblajes: la trampa del rosado ---------------------------------------

test("un ensamblaje tinto se anuncia como ensamblaje tinto", () => {
  const titulo = wineSearchTitle(
    {
      slug: "lajau-betum",
      name: "Lajau Betúm",
      category: "Edición Limitada",
      type: "Tinto",
      cepaGroup: "Ensamblaje",
    },
    ES,
  );
  assert.equal(titulo, "Lajau Betúm, ensamblaje tinto");
});

test("un ensamblaje ROSADO no se anuncia como tinto", () => {
  // El Berá es «grupo_cepa: Ensamblaje» y «tipo: Rosado». Sin el guard del tipo,
  // la ficha del rosé de la viña le decía «tinto» a Google.
  const titulo = wineSearchTitle(
    { slug: "bera", name: "Berá", type: "Rosado", cepaGroup: "Ensamblaje" },
    ES,
  );
  assert.equal(titulo, "Berá, vino rosé");
});

// --- Overrides: los datos que el contrato v1 no publica ----------------------

test("el override por slug gana sobre la regla general", () => {
  const titulo = wineSearchTitle(
    { slug: "guidai", name: "Guidaí", category: "Edición Limitada", type: "Espumante" },
    ES,
  );
  assert.equal(titulo, "Guidaí, espumante rosado");
});

test("sin override, el tipo sigue dando un sufijo correcto", () => {
  const titulo = wineSearchTitle(
    { slug: "otro-espumante", name: "Otro", type: "Espumante" },
    ES,
  );
  assert.equal(titulo, "Otro, espumante");
});

// --- Lo que la regla se niega a hacer ----------------------------------------

test("un vino sin datos conocidos se publica con su nombre y nada mas", () => {
  assert.equal(wineSearchTitle({ slug: "x", name: "Vino X" }, ES), "Vino X");
});

test("con el diccionario vacio nunca se inventa una palabra", () => {
  const wine = { slug: "bera", name: "Berá", type: "Rosado", cepaGroup: "Ensamblaje" };
  assert.equal(wineSearchTitle(wine), "Berá");
});

test("un titulo que se pasa del tope se publica sin sufijo, no cortado", () => {
  const name = "Vino con un nombre larguísimo de la línea de la casa";
  assert.ok(name.length > LARGO_MAXIMO_DE_TITULO);
  assert.equal(wineSearchTitle({ slug: "x", name, type: "Rosado" }, ES), name);
});

// --- Descripción -------------------------------------------------------------

test("la descripcion usa la nota de cata completa, no la corta", () => {
  const wine = {
    slug: "bera",
    name: "Berá",
    shortDescription: "Rosé fresco y floral.",
    description: "Rosé de color rosa y perfil complejo. Aromas a frambuesa fresca.",
  };
  assert.equal(
    wineMetaDescription(wine),
    "Rosé de color rosa y perfil complejo. Aromas a frambuesa fresca.",
  );
});

test("cuando no entra, se corta por oraciones enteras", () => {
  const wine = {
    slug: "bera",
    name: "Berá",
    description:
      "Rosé de color rosa y perfil complejo. Aromas a frambuesa fresca, muy floral, con notas a cereza roja. Boca fresca, de interesante acidez, jugoso y de agradable final.",
  };
  const texto = wineMetaDescription(wine);
  assert.ok(texto.length <= 160, `${texto.length} caracteres`);
  assert.ok(texto.endsWith("."), texto);
  assert.equal(
    texto,
    "Rosé de color rosa y perfil complejo. Aromas a frambuesa fresca, muy floral, con notas a cereza roja.",
  );
});

test("si ni la primera oracion entra, se corta por palabra y se avisa con puntos", () => {
  const wine = { slug: "x", name: "X", description: "palabra ".repeat(40).trim() };
  const texto = wineMetaDescription(wine);
  assert.ok(texto.length <= 160);
  assert.ok(texto.endsWith("…"));
  assert.ok(!texto.includes("palab…"), texto);
});

test("sin nota de cata larga se usa la corta, y sin ninguna no revienta", () => {
  assert.equal(
    wineMetaDescription({ slug: "x", name: "X", shortDescription: "Corta." }),
    "Corta.",
  );
  assert.equal(wineMetaDescription({ slug: "x", name: "X" }), "");
});
