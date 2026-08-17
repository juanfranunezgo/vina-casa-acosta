import "./alias-hook.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  VENDIMIA_HUB,
  VENDIMIA_MONTHS,
  RESERVED_ACTIVITY_SEGMENTS,
  activities,
  vendimiaRelatedActivities,
} = await import("@/data/activities");
const sitemap = (await import("@/app/sitemap")).default;
const { routing } = await import("@/i18n/routing");

const LOCALES = ["es", "en", "pt"];

const source = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const messages = Object.fromEntries(
  await Promise.all(
    LOCALES.map(async (locale) => [
      locale,
      JSON.parse(await source(`messages/${locale}.json`)),
    ]),
  ),
);

/**
 * El hub de Vendimia es la unica pagina del sitio que describe una actividad
 * SIN publicar su precio, sus fechas ni su minimo de personas, y no por
 * descuido: la cosecha depende de la maduracion de la uva y la vina confirma
 * cada jornada por temporada. El material que existia era de la temporada
 * pasada. Estos tests son lo que evita que alguien "complete" esos datos mas
 * adelante creyendo que faltan.
 */

test("el hub existe y su ruta es la del segmento reservado", () => {
  assert.equal(VENDIMIA_HUB, "/actividades/vendimia");
  // `vendimia` tiene que seguir reservado: Next resuelve el segmento estatico
  // antes que [categoria], y sin la reserva un slug de actividad llamado igual
  // silenciaria una de las dos paginas sin fallar el build.
  assert.ok(RESERVED_ACTIVITY_SEGMENTS.includes("vendimia"));
  assert.ok(
    !activities.some((activity) => activity.slug === "vendimia"),
    "ninguna actividad puede usar el slug del hub",
  );
});

test("el sitemap declara el hub en los tres idiomas", () => {
  const urls = sitemap().map((entry) => entry.url);
  for (const locale of routing.locales) {
    const esperada = `/${locale}${VENDIMIA_HUB}`;
    assert.ok(urls.some((url) => url.endsWith(esperada)), `falta ${esperada}`);
  }
});

test("el sitemap deja de declararlo si el hub se apaga", async () => {
  // Lo que se afirma es que la ruta sale de la constante y no esta escrita a
  // mano en STATIC_PATHS: apagar el hub tiene que sacarla del sitemap sola.
  const texto = await source("app/sitemap.ts");
  assert.match(texto, /VENDIMIA_HUB/);
  assert.doesNotMatch(texto, /"\/actividades\/vendimia"/);
});

test("la vendimia se publica por meses, nunca por fecha exacta", () => {
  assert.deepEqual(VENDIMIA_MONTHS, [3, 4, 5]);

  for (const locale of LOCALES) {
    const bloque = JSON.stringify(messages[locale].activities.vendimia);
    // Un dia concreto ("18 de abril", "April 18", "02/05") seria anunciar una
    // jornada que la vina todavia no confirmo.
    assert.doesNotMatch(bloque, /\d{1,2}\s*(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i, locale);
    assert.doesNotMatch(bloque, /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i, locale);
    assert.doesNotMatch(bloque, /\d{1,2}\/\d{1,2}/, locale);
    // Ni precio ni preventa: no hay cifra aprobada para publicar.
    assert.doesNotMatch(bloque, /\$\s*\d/, locale);
    // Ni minimo de personas.
    assert.doesNotMatch(bloque, /\b\d+\s*(personas|people|pessoas)\b/i, locale);
  }
});

test("la pagina no le pide un minimo de personas al formulario", async () => {
  const pagina = await source("app/[locale]/actividades/vendimia/page.tsx");
  // Se afirma sobre la etiqueta y no sobre el archivo entero: los comentarios
  // nombran `minPeople` para explicar por que no esta, y un match sobre todo el
  // texto convertiria esa explicacion en un rojo.
  const etiqueta = pagina.match(/<ActivityReservationForm[\s\S]*?\/>/)?.[0];
  assert.ok(etiqueta, "la pagina tiene que montar el formulario de consulta");
  assert.match(etiqueta, /mode="temporada"/);
  assert.doesNotMatch(etiqueta, /minPeople/);
});

test("el formulario acepta no tener minimo declarado", async () => {
  // Si `minPeople` vuelve a ser obligatorio, el hub tendria que inventar un
  // numero para compilar — que es justo lo que este trabajo evita.
  const form = await source("components/ActivityReservationForm.tsx");
  assert.match(form, /minPeople\?:\s*number/);
});

test("el menu del navbar ofrece el hub y lo apaga con la constante", async () => {
  const menu = await source("components/ActivitiesMenu.tsx");
  assert.match(menu, /VENDIMIA_HUB/);
  // Renderizado condicional a la constante, no al estado: un panel montado por
  // estado no existe en el HTML que sirve el servidor (ver
  // tests/navegacion-enlaces-source.test.mjs).
  assert.match(menu, /VENDIMIA_HUB\s*&&/);
  assert.match(menu, /\$\{locale\}\$\{VENDIMIA_HUB\}/);
});

test("el indice enlaza al hub", async () => {
  const indice = await source("app/[locale]/actividades/page.tsx");
  assert.match(indice, /VENDIMIA_HUB\s*&&/);
  assert.match(indice, /\$\{locale\}\$\{VENDIMIA_HUB\}/);
});

test("las dos actividades relacionadas existen en el catalogo", () => {
  const relacionadas = vendimiaRelatedActivities();
  assert.equal(relacionadas.length, 2);
  assert.deepEqual(
    relacionadas.map((activity) => activity.slug),
    ["cosecha-tu-historia", "lagrimas-de-invierno"],
  );
});

test("el structured data no declara fecha ni precio", async () => {
  const { buildVendimiaJsonLd } = await import("@/lib/activityJsonLd");
  const grafo = buildVendimiaJsonLd(
    "es",
    { name: "Vendimia", description: "…", image: "/images/actividades/hero-vendimia-1920.webp" },
    { home: "Inicio", activities: "Actividades", vendimia: "Vendimia" },
  );
  const texto = JSON.stringify(grafo);
  const tipos = grafo["@graph"].map((nodo) => nodo["@type"]);

  assert.deepEqual(tipos, ["WebPage", "BreadcrumbList"]);
  // Event pide startDate y Product pide precio. Marcar cualquiera de los dos
  // con un dato inventado es exactamente el marcado que Google penaliza.
  assert.doesNotMatch(texto, /startDate|"Event"|"Product"|offers|price/);
  assert.match(texto, /"BreadcrumbList"/);
});

test("la miga marcada dice lo mismo que la miga visible", async () => {
  const pagina = await source("app/[locale]/actividades/vendimia/page.tsx");
  // Las dos superficies leen `crumbLabels`: si alguien traduce una y no la
  // otra, el BreadcrumbList declara una jerarquia que la pagina no muestra.
  assert.match(pagina, /crumbLabels/);
  assert.match(pagina, /buildVendimiaJsonLd\(\s*\n?\s*locale,/);
  assert.match(pagina, /<ActivityBreadcrumbs/);
});

test("el hero pide un candidato mas ancho que el viewport en movil", async () => {
  const pagina = await source("app/[locale]/actividades/vendimia/page.tsx");
  // `object-cover` escala la foto hasta cubrir el ALTO del hero, asi que el
  // ancho que se pinta sale del alto y no del ancho de la pantalla: el `sizes`
  // va en vh. Con `100vw` el navegador baja un archivo del ancho del viewport y
  // lo estira al doble — los heros borrosos que ya se pagaron una vez.
  assert.match(pagina, /max-width: 768px\) 78vh/);
  assert.match(pagina, /125vh/);
  assert.doesNotMatch(pagina, /HERO_SIZES = "[^"]*vw[^"]*vw/);
  for (const ancho of [1280, 1920, 2560]) {
    assert.match(pagina, new RegExp(String(ancho)), `falta el candidato de ${ancho}px`);
  }
});
