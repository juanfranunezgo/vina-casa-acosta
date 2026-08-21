import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * Los enlaces legales del footer apuntan a PDFs de `public/documentos/`. El modo
 * de falla que importa no se ve en pantalla: el enlace existe, el visitante lo
 * pincha y recibe un 404 donde debia estar la politica de privacidad. Pasa con
 * un renombre del archivo, que es justo lo que ocurre cuando llega una version
 * nueva del documento.
 *
 * Estos tests leen el mapa del propio Footer, asi que cubren cualquier documento
 * que se agregue despues sin tocar el test.
 */

const raiz = new URL("../", import.meta.url);
const footer = await readFile(new URL("components/Footer.tsx", raiz), "utf8");
const legal = await readFile(new URL("lib/legal.ts", raiz), "utf8");

/** Extrae `DOCUMENTOS_LEGALES` de lib/legal.ts: { locale: { clave: ruta } }. */
function mapaDeDocumentos(fuente) {
  const bloque = fuente.match(/DOCUMENTOS_LEGALES[^=]*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(bloque, "no se encontro el mapa `DOCUMENTOS_LEGALES` en lib/legal.ts");

  const mapa = {};
  for (const idioma of bloque[1].matchAll(/(\w+):\s*\{([\s\S]*?)\}/g)) {
    mapa[idioma[1]] = Object.fromEntries(
      [...idioma[2].matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
    );
  }
  return mapa;
}

const documentos = mapaDeDocumentos(legal);

test("cada documento legal enlazado existe en public/", async () => {
  const rutas = Object.values(documentos).flatMap((porIdioma) =>
    Object.values(porIdioma),
  );
  assert.ok(rutas.length > 0, "el footer no enlaza ningun documento legal");

  for (const ruta of rutas) {
    const archivo = new URL(`public${ruta}`, raiz);
    await assert.doesNotReject(
      access(archivo),
      `${ruta} esta enlazado en el footer y no existe en public/`,
    );
  }
});

test("los documentos legales son PDFs servidos por el propio sitio", () => {
  for (const porIdioma of Object.values(documentos)) {
    for (const ruta of Object.values(porIdioma)) {
      assert.match(ruta, /^\/documentos\//, `${ruta} deberia vivir en /documentos/`);
      assert.match(ruta, /\.pdf$/, `${ruta} deberia ser un PDF`);
    }
  }
});

test("cada etiqueta legal del footer tiene texto en los tres idiomas", async () => {
  const claves = [...footer.matchAll(/t\("legal\.(\w+)"\)/g)].map((m) => m[1]);
  assert.ok(claves.length > 0, "el footer no pide ninguna etiqueta legal");

  for (const idioma of ["es", "en", "pt"]) {
    const mensajes = JSON.parse(
      await readFile(fileURLToPath(new URL(`messages/${idioma}.json`, raiz)), "utf8"),
    );
    for (const clave of claves) {
      assert.ok(
        mensajes.footer?.legal?.[clave],
        `falta footer.legal.${clave} en messages/${idioma}.json`,
      );
    }
  }
});

test("un idioma sin documentos propios deja la etiqueta como texto", () => {
  // La regla: enlazar un PDF que el visitante no puede leer promete algo que el
  // sitio no cumple. Hoy solo `es` tiene documentos; cuando existan las
  // traducciones, este test sigue valiendo — lo que afirma es que el idioma sin
  // archivo no hereda el enlace del español.
  assert.match(
    footer,
    /DOCUMENTOS_LEGALES\[locale\]\s*\?\?\s*\{\}/,
    "el footer deberia caer a un mapa vacio cuando el idioma no tiene documentos",
  );
});

/**
 * La casilla nombra dos documentos —Terminos y Condiciones y Politica de
 * Privacidad—, asi que los dos tienen que existir, estar enlazados y viajar
 * versionados en el envio. Se recorre la lista: si manana la etiqueta suma un
 * tercero, se agrega aca su par de constantes y el test lo cubre igual.
 */
const DOCUMENTOS_DEL_CONSENTIMIENTO = [
  { constante: "PRIVACIDAD_PDF", version: "PRIVACIDAD_VERSION", clave: "privacy" },
  { constante: "TERMINOS_PDF", version: "TERMINOS_VERSION", clave: "terms" },
];

for (const { constante, version, clave } of DOCUMENTOS_DEL_CONSENTIMIENTO) {
  test(`el consentimiento apunta a ${clave}, que existe y declara su version`, async () => {
    // Un consentimiento sirve como registro sólo si dice qué se aceptó. Si el
    // PDF cambia de nombre, esto se pone rojo antes de que alguien acepte un
    // enlace roto.
    const pdf = legal.match(
      new RegExp(`${constante}\\s*=\\s*DOCUMENTOS_LEGALES\\.(\\w+)\\.${clave}`),
    );
    assert.ok(pdf, `${constante} deberia salir del mapa, no de una ruta escrita a mano`);
    await assert.doesNotReject(
      access(new URL(`public${documentos[pdf[1]][clave]}`, raiz)),
      `el documento que se ofrece al consentir (${clave}) no existe en public/`,
    );
    assert.match(
      legal,
      new RegExp(`${version}\\s*=\\s*"v\\d+\\.\\d+ \\(\\d{2}-\\d{2}-\\d{4}\\)"`),
      `${version} deberia declarar version y fecha de vigencia`,
    );

    const consent = await readFile(
      new URL("components/PrivacyConsent.tsx", raiz),
      "utf8",
    );
    assert.match(
      consent,
      new RegExp(constante),
      `la casilla nombra ${clave} y no lo enlaza: pedir que acepten un documento que no pueden abrir`,
    );
  });
}
