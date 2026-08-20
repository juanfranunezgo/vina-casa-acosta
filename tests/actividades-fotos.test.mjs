import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { activities } from "../data/activities.ts";

/**
 * Las fotos propias de una actividad (`photos`) se declaran en tres lugares que
 * tienen que coincidir: el archivo en public/, la clave del `alt` en los tres
 * bundles y la proporcion de la ranura que ocupa. Ninguno de los tres falla el
 * build si se desalinea:
 *
 * - un src equivocado se ve como un hueco solo si alguien abre la pagina;
 * - un `alt` sin traduccion se publica mostrando "activities.items.mimbre.
 *   photos.tejido" en el atributo, que es peor que no tener alt;
 * - una foto con la proporcion equivocada la recorta `object-cover` en el
 *   navegador, o sea que se descarga entera para mostrar la mitad.
 *
 * Este test es lo que los convierte en rojo. Barre el catalogo entero: la
 * proxima actividad con material propio entra sola.
 */

const LOCALES = ["es", "en", "pt"];

const bundles = Object.fromEntries(
  await Promise.all(
    LOCALES.map(async (locale) => [
      locale,
      JSON.parse(
        await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"),
      ),
    ]),
  ),
);

/** Todas las fotos de una actividad, con la ranura que ocupa cada una. */
function slots(activity) {
  const { photos } = activity;
  if (!photos) return [];
  return [
    // 4:3 — junto a la bajada (Dd1).
    ...(photos.intro ? [{ ranura: "intro", photo: photos.intro, ratio: 4 / 3 }] : []),
    // 16:10 — cabecera de la tarjeta de reserva (Dd5).
    ...(photos.card ? [{ ranura: "card", photo: photos.card, ratio: 16 / 10 }] : []),
    // Sin ratio: el panel del formulario (Dd7) cambia de proporcion con el
    // viewport y el encuadre lo resuelve `object-cover`.
    ...(photos.reserve ? [{ ranura: "reserve", photo: photos.reserve }] : []),
    ...(photos.gallery
      ? [
          { ranura: "gallery.wide", photo: photos.gallery.wide, ratio: 16 / 9 },
          ...photos.gallery.portraits.map((photo, i) => ({
            ranura: `gallery.portraits[${i}]`,
            photo,
            ratio: 2 / 3,
          })),
        ]
      : []),
  ];
}

const conFotos = activities.filter((a) => a.photos);

test("hay al menos una actividad con fotos propias", () => {
  // Sin esto los recorridos de abajo pasan en vacio: un `photos` borrado por
  // accidente dejaria el archivo verde sin afirmar nada.
  assert.ok(conFotos.length > 0, "ninguna actividad declara photos");
});

test("cada foto declarada existe en public/", async () => {
  for (const activity of conFotos) {
    for (const { ranura, photo } of slots(activity)) {
      assert.ok(
        photo.src.startsWith("/images/"),
        `${activity.slug}.${ranura}: el src tiene que ser una ruta local de /images/`,
      );
      const file = fileURLToPath(new URL(`../public${photo.src}`, import.meta.url));
      const info = await stat(file).catch(() => null);
      assert.ok(info?.isFile(), `${activity.slug}.${ranura}: falta ${photo.src}`);
      assert.ok(
        info.size < 500_000,
        `${activity.slug}.${ranura}: ${photo.src} pesa ${Math.round(info.size / 1024)} KB`,
      );
    }
  }
});

test("cada foto trae su alt traducido en los tres idiomas", () => {
  for (const activity of conFotos) {
    for (const { ranura, photo } of slots(activity)) {
      for (const locale of LOCALES) {
        const textos = bundles[locale].activities.items[activity.slug]?.photos;
        const alt = textos?.[photo.alt];
        assert.equal(
          typeof alt,
          "string",
          `${locale}: falta activities.items.${activity.slug}.photos.${photo.alt} (${ranura})`,
        );
        assert.ok(alt.length > 10, `${locale}.${activity.slug}.photos.${photo.alt} es muy corto`);
      }
    }
  }
});

test("ninguna foto se repite dentro de una actividad", () => {
  for (const activity of conFotos) {
    // Una foto en dos ranuras dice que la actividad tiene menos material del
    // que muestra; es lo que la version con la foto de categoria hacia en las
    // cinco ranuras a la vez.
    const usadas = [activity.image, ...slots(activity).map(({ photo }) => photo.src)];
    assert.equal(
      new Set(usadas).size,
      usadas.length,
      `${activity.slug}: hay una foto usada en dos ranuras`,
    );
  }
});

test("el mosaico no pide mas verticales de las que la fila dibuja", () => {
  for (const activity of conFotos) {
    const portraits = activity.photos.gallery?.portraits;
    if (!portraits) continue;
    // ActivityGallery las pone en una sola fila de tres, tambien en movil.
    assert.ok(portraits.length > 0 && portraits.length <= 3, activity.slug);
  }
});

test("cada foto sale con la proporcion de su ranura", async () => {
  for (const activity of conFotos) {
    for (const { ranura, photo, ratio } of slots(activity)) {
      if (!ratio) continue;
      const file = fileURLToPath(new URL(`../public${photo.src}`, import.meta.url));
      const { width, height, format } = await sharp(file).metadata();
      assert.equal(format, "webp", `${activity.slug}.${ranura}: ${photo.src} no es webp`);
      const actual = width / height;
      // 1% de tolerancia: el recorte redondea a pixel entero.
      assert.ok(
        Math.abs(actual - ratio) / ratio < 0.01,
        `${activity.slug}.${ranura}: ${photo.src} mide ${width}x${height} (${actual.toFixed(3)}), la ranura pide ${ratio.toFixed(3)}`,
      );
    }
  }
});
