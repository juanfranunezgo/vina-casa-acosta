import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createTranslator } from "next-intl";

/**
 * Las medallas y puntajes de los vinos (2026-10-12, pedido de Juan Francisco).
 *
 * La viña mandó una carpeta por vino con sus premios. En la tarjeta —tienda y
 * `/vinos`— va UNA sola, chica, en la esquina inferior derecha de la foto; la
 * ficha del vino las muestra todas. Qué medalla lleva cada vino vive en
 * `data/medallas.ts`: el panel de Afeleia no tiene dónde guardar premios.
 *
 * Los datos y los textos se EJECUTAN; lo que depende de `next/image` (que no
 * carga en Node pelado) se lee del fuente, como el resto de los componentes.
 */

const raiz = new URL("../", import.meta.url);
const leer = async (ruta) => (await readFile(new URL(ruta, raiz), "utf8")).replace(/\r\n/g, "\n");

const LOCALES = ["es", "en", "pt"];
const mensajes = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, JSON.parse(await leer(`messages/${l}.json`))])),
);

/** El traductor que ya tienen la tarjeta y la ficha: el del espacio `vinos`. */
const traductor = (locale) =>
  createTranslator({ locale, messages: mensajes[locale], namespace: "vinos" });

// Se carga dentro de cada test: si el módulo falta, falla el test que lo
// necesita y no el archivo entero.
const datos = () => import("../data/medallas.ts");

test("cada medalla tiene su imagen en public/, en una carpeta que el optimizador sirve", async () => {
  // El modo de falla real: un id mal escrito no rompe el build, deja un hueco
  // con el texto alternativo sobre la foto de la botella. Y fuera de
  // `/images/**` el optimizador la rechaza por request (`localPatterns`).
  const { medallas } = await datos();
  const ids = Object.keys(medallas);
  assert.ok(ids.length > 0, "no hay ninguna medalla declarada");
  for (const id of ids) {
    const { src } = medallas[id];
    assert.equal(src, `/images/medallas/${id}.webp`, id);
    await access(new URL(`public${src}`, raiz));
  }
});

test("toda medalla asignada a un vino existe, y ningún vino repite una", async () => {
  const { medallas, medallasPorVino } = await datos();
  for (const [slug, ids] of Object.entries(medallasPorVino)) {
    assert.ok(ids.length > 0, `${slug} está en la tabla sin medallas`);
    assert.equal(new Set(ids).size, ids.length, `${slug} repite una medalla`);
    for (const id of ids) assert.ok(id in medallas, `${slug} → ${id} no existe`);
  }
});

test("los vinos con medalla son vinos del catálogo", async () => {
  // La tabla se lleva por slug, y el slug lo publica el panel. Un slug que no
  // está en el respaldo es un error de tipeo acá, o un vino renombrado allá:
  // en los dos casos la medalla dejaría de verse sin que nada falle.
  const { medallasPorVino } = await datos();
  const respaldo = JSON.parse(await leer("data/catalogo-fallback.json"));
  const slugs = new Set(respaldo.productos.map((p) => p.slug));
  for (const slug of Object.keys(medallasPorVino)) {
    assert.ok(slugs.has(slug), `${slug} no está en data/catalogo-fallback.json`);
  }
});

test("ninguna imagen de medalla queda sin vino que la muestre", async () => {
  const { medallas, medallasPorVino } = await datos();
  const usadas = new Set(Object.values(medallasPorVino).flat());
  for (const id of Object.keys(medallas)) assert.ok(usadas.has(id), `${id} no la usa ningún vino`);
});

test("un vino sin medallas devuelve una lista vacía, no un error", async () => {
  const { medallasDe } = await datos();
  assert.deepEqual(medallasDe("yaray-gua-tinto"), []);
  // Un producto recién creado en el panel: el slug no existe en ninguna tabla.
  assert.deepEqual(medallasDe("un-vino-nuevo-del-panel"), []);
});

test("las medallas de un vino salen en el orden declarado: la primera es la de la tarjeta", async () => {
  const { medallasDe } = await datos();
  // El caso con más premios: la carpeta "Ombu carmennere" trae cuatro.
  assert.deepEqual(
    medallasDe("ombu-carmenere").map((m) => m.id),
    ["catador-oro-2021", "catador-oro-2020", "la-cav-91", "la-cav-90"],
  );
  assert.deepEqual(medallasDe("lajau-betum"), [
    {
      id: "catador-oro-2023",
      src: "/images/medallas/catador-oro-2023.webp",
      tipo: "oro",
      concurso: "Catador World Wine Awards",
      anio: 2023,
    },
    {
      id: "la-cav-93",
      src: "/images/medallas/la-cav-93.webp",
      tipo: "puntos",
      concurso: "La CAV",
      puntos: 93,
    },
  ]);
});

test("una medalla de oro dice el premio, el concurso y el año, en los tres idiomas", async () => {
  const { medallasDe, medallaTexto } = await datos();
  const [oro] = medallasDe("lajau-betum");
  const premio = { es: "Medalla de Oro", en: "Gold Medal", pt: "Medalha de Ouro" };
  for (const locale of LOCALES) {
    assert.deepEqual(
      medallaTexto(oro, traductor(locale)),
      {
        premio: premio[locale],
        // El nombre del concurso es un nombre propio: no se traduce.
        origen: "Catador World Wine Awards 2023",
        alt: `${premio[locale]}, Catador World Wine Awards 2023`,
      },
      locale,
    );
  }
});

test("un puntaje dice los puntos y quién los dio, en los tres idiomas", async () => {
  const { medallasDe, medallaTexto } = await datos();
  const [, puntaje] = medallasDe("lajau-betum");
  const premio = { es: "93 puntos", en: "93 points", pt: "93 pontos" };
  for (const locale of LOCALES) {
    assert.deepEqual(
      medallaTexto(puntaje, traductor(locale)),
      // La viña no mandó el año de los puntajes: no se inventa.
      { premio: premio[locale], origen: "La CAV", alt: `${premio[locale]}, La CAV` },
      locale,
    );
  }
});

test("la tarjeta de un vino lleva una sola medalla: la primera, con su texto en el idioma de la página", async () => {
  const { medallaDeTarjeta } = await datos();
  assert.deepEqual(medallaDeTarjeta("ombu-carmenere", traductor("en")), {
    src: "/images/medallas/catador-oro-2021.webp",
    alt: "Gold Medal, Catador World Wine Awards 2021",
  });
  // Sin premios de oro, la de la tarjeta es el puntaje más alto.
  assert.deepEqual(medallaDeTarjeta("bera", traductor("es")), {
    src: "/images/medallas/la-cav-91.webp",
    alt: "91 puntos, La CAV",
  });
  assert.equal(medallaDeTarjeta("yaray-gua-tinto", traductor("es")), undefined);
});

test("las dos tarjetas muestran esa medalla con el mismo componente, abajo a la derecha de la foto", async () => {
  const vitrina = await leer("components/TiendaCatalogo.tsx");
  const tarjeta = await leer("components/WineCard.tsx");
  const banda = await leer("components/CollectionBand.tsx");
  const vinos = await leer("app/[locale]/vinos/page.tsx");

  // Tienda: la vitrina es de cliente y ya tiene el traductor de `vinos`.
  assert.match(vitrina, /import MedallaVino from "@\/components\/MedallaVino"/);
  assert.match(vitrina, /<MedallaVino\s+medalla=\{medallaDeTarjeta\(wine\.slug, tVinos\)\}/);

  // `/vinos`: la tarjeta no sabe de idiomas; la página le pasa la medalla
  // resuelta, en las bandas por línea y en «Otros vinos».
  assert.match(tarjeta, /import MedallaVino from "@\/components\/MedallaVino"/);
  assert.match(tarjeta, /<MedallaVino\s+medalla=\{medalla\}/);
  assert.match(banda, /medalla=\{wine\.medalla\}/);
  assert.equal((vinos.match(/medallaDeTarjeta\(wine\.slug, t\)/g) ?? []).length, 2);

  // Abajo a la derecha de la foto, en las dos.
  for (const [nombre, fuente] of [["tienda", vitrina], ["/vinos", tarjeta]]) {
    const clases = fuente.match(/<MedallaVino[\s\S]*?className="([^"]*)"/)?.[1];
    assert.ok(clases, `${nombre}: falta el className de la medalla`);
    assert.match(clases, /\babsolute\b/, nombre);
    assert.match(clases, /\bbottom-\d/, nombre);
    assert.match(clases, /\bright-\d/, nombre);
  }
});

test("la ficha del vino muestra todas sus medallas, con su texto", async () => {
  const ficha = await leer("app/[locale]/vinos/[slug]/page.tsx");
  assert.match(ficha, /const premios = medallasDe\(wine\.slug\)\.map\(/);
  // La lista completa, bajo un título propio y sólo si hay algo que listar.
  assert.match(ficha, /premios\.length > 0 && \([\s\S]*?tVinos\("medallas\.titulo"\)[\s\S]*?premios\.map\(/);
  for (const locale of LOCALES) {
    assert.equal(typeof mensajes[locale].vinos.medallas.titulo, "string", locale);
  }
  // Y lo que la página dice, lo marca: los mismos textos van al JSON-LD.
  assert.match(ficha, /awards: premios\.map\(\(p\) => p\.alt\)/);
});

test("las imágenes salen de `npm run fotos:medallas`, que conoce cada medalla", async () => {
  // Una medalla nueva en `data/medallas.ts` sin su fila en el script queda sin
  // forma de regenerarse el día que haya que cambiarle el tamaño.
  const { medallas } = await datos();
  const paquete = JSON.parse(await leer("package.json"));
  assert.equal(paquete.scripts["fotos:medallas"], "node scripts/optimize-medallas.mjs");
  const script = await leer("scripts/optimize-medallas.mjs");
  for (const id of Object.keys(medallas)) assert.match(script, new RegExp(`"${id}"`), id);
});

test("las medallas van chicas: la mitad del tamaño con que nacieron", async () => {
  // Pedido de Juan Francisco (2026-10-12) al verlas a 56 px sobre la foto:
  // "más chicos, a la mitad". 28 px en las tarjetas y en la lista de la ficha;
  // sobre el panel de la botella, que es más grande, 32 px y 40 en escritorio.
  const etiquetas = async (ruta) =>
    [...(await leer(ruta)).matchAll(/<MedallaVino[\s\S]*?\/>/g)].map((m) => m[0]);

  for (const ruta of ["components/TiendaCatalogo.tsx", "components/WineCard.tsx"]) {
    const [tarjeta] = await etiquetas(ruta);
    assert.ok(tarjeta, ruta);
    assert.match(tarjeta, /className="[^"]*\bh-7 w-7\b/, ruta);
    assert.match(tarjeta, /sizes="28px"/, ruta);
  }

  const [panel, lista] = await etiquetas("app/[locale]/vinos/[slug]/page.tsx");
  assert.match(panel, /className="[^"]*\bh-8 w-8\b[^"]*\bmd:h-10 md:w-10\b/);
  assert.match(panel, /sizes="\(max-width: 767px\) 32px, 40px"/);
  assert.match(lista, /className="[^"]*\bh-7 w-7\b/);
  assert.match(lista, /sizes="28px"/);
});
