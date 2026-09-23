import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  VENDIMIA_CARRUSEL,
  VENDIMIA_FOTOS,
  VENDIMIA_GALERIA,
} from "../data/vendimiaGallery.ts";

/**
 * Las fotos del hub de Vendimia se declaran en `data/vendimiaGallery.ts` y se
 * cruzan con tres cosas que no fallan el build si se desalinean: el archivo en
 * public/, el `alt` en los tres bundles y la proporción de la fila que ocupa.
 * Es el mismo contrato que `actividades-fotos.test.mjs` cubre para las fichas;
 * el hub no está en el catálogo, así que ese test no lo ve.
 */

const raiz = new URL("../", import.meta.url);
const fuentePagina = await readFile(
  new URL("app/[locale]/actividades/vendimia/page.tsx", raiz),
  "utf8",
);

const LOCALES = ["es", "en", "pt"];
const bundles = Object.fromEntries(
  await Promise.all(
    LOCALES.map(async (locale) => [
      locale,
      JSON.parse(await readFile(new URL(`messages/${locale}.json`, raiz), "utf8")),
    ]),
  ),
);

const filas = [...VENDIMIA_GALERIA.visibles, ...VENDIMIA_GALERIA.mas];
const enGaleria = filas.flatMap((fila) => fila.fotos);
/** Las que la página nombra a mano, fuera del carrusel y la galería. */
const sueltas = [...fuentePagina.matchAll(/\bFOTO\.(\w+)/g)].map((m) => m[1]);
const usadas = [...VENDIMIA_CARRUSEL, ...enGaleria, ...sueltas];

const archivo = (foto) => fileURLToPath(new URL(`public${VENDIMIA_FOTOS[foto]}`, raiz));

test("cada foto declarada existe en public/", async () => {
  for (const foto of Object.keys(VENDIMIA_FOTOS)) {
    await assert.doesNotReject(stat(archivo(foto)), `falta ${VENDIMIA_FOTOS[foto]}`);
  }
});

test("ninguna foto se repite en la página", () => {
  const vistas = new Set();
  for (const foto of usadas) {
    assert.ok(!vistas.has(foto), `"${foto}" aparece dos veces en el hub de vendimia`);
    vistas.add(foto);
  }
});

test("toda foto declarada se usa en la página", () => {
  for (const foto of Object.keys(VENDIMIA_FOTOS)) {
    assert.ok(usadas.includes(foto), `"${foto}" está declarada y la página no la muestra`);
  }
});

test("cada foto de la galería sale con la proporción de su fila", async () => {
  for (const { proporcion, fotos } of filas) {
    const [ancho, alto] = proporcion.split("/").map(Number);
    for (const foto of fotos) {
      const { width, height } = await sharp(archivo(foto)).metadata();
      const error = Math.abs(width / height - ancho / alto) / (ancho / alto);
      assert.ok(
        error < 0.01,
        `${foto} mide ${width}x${height} y su fila es ${proporcion}: la recortaría object-cover`,
      );
    }
  }
});

test("las fotos propias del carrusel salen 4:5, la proporción de su marco", async () => {
  // El asado viene de la galería de contacto y tiene otro encuadre: el marco lo
  // recorta con object-cover, que es el comportamiento de siempre del carrusel.
  for (const foto of VENDIMIA_CARRUSEL.filter((f) => VENDIMIA_FOTOS[f].includes("/vendimia-"))) {
    const { width, height } = await sharp(archivo(foto)).metadata();
    assert.ok(Math.abs(width / height - 4 / 5) < 0.01, `${foto} mide ${width}x${height}`);
  }
});

test("cada fila trae entre una y cuatro fotos: las columnas que la página sabe dibujar", () => {
  for (const { fotos } of filas) {
    assert.ok(fotos.length >= 1 && fotos.length <= 4, `una fila de ${fotos.length}`);
  }
  assert.ok(VENDIMIA_GALERIA.mas.length > 0, "sin fotos extra, el botón Ver más no tiene nada que abrir");
});

test("cada foto del carrusel y de la galería trae su alt en los tres idiomas", () => {
  for (const locale of LOCALES) {
    const vendimia = bundles[locale].activities.vendimia;
    for (const foto of [...VENDIMIA_CARRUSEL, ...enGaleria]) {
      assert.ok(
        vendimia.photos[foto]?.trim(),
        `messages/${locale}.json no tiene activities.vendimia.photos.${foto}`,
      );
    }
    for (const clave of ["more", "moreLabel"]) {
      assert.ok(vendimia.gallery[clave]?.trim(), `falta activities.vendimia.gallery.${clave} en ${locale}`);
    }
  }
});
