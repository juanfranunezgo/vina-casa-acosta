import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  Croissant,
  Flame,
  Footprints,
  Grape,
  Scissors,
  Trophy,
  Wine,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import CollectionPhotos from "@/components/CollectionPhotos";
import ActivityBreadcrumbs from "@/components/ActivityBreadcrumbs";
import ActivityReservationForm from "@/components/ActivityReservationForm";
import VineyardYear from "@/components/VineyardYear";
import JsonLd from "@/components/JsonLd";
import { buildVendimiaJsonLd } from "@/lib/activityJsonLd";
import { alternatesFor } from "@/lib/alternates";
import {
  VENDIMIA_HUB,
  VENDIMIA_MONTHS,
  activityPath,
  vendimiaRelatedActivities,
} from "@/data/activities";

/**
 * Dv — Hub de Vendimia.
 *
 * Es una página informativa, no una ficha: cuenta qué es la vendimia y dónde cae
 * en el año de la viña, y recién después ofrece la jornada. Por eso la actividad
 * *corta, pisa y celebra* no tiene ficha propia — vive acá, y así no hay dos
 * páginas del sitio compitiendo por la misma búsqueda.
 *
 * **No publica fechas, precio ni mínimo de personas**, y no es un olvido: la
 * cosecha depende de la maduración de la uva y la viña confirma cada jornada por
 * temporada. El único dato de calendario es la franja de meses, que sale de
 * `VENDIMIA_MONTHS`. Lo cuida `tests/vendimia-hub.test.mjs`.
 *
 * **Registro visual — almanaque, no landing.** La página trata de tiempo: un
 * ciclo de un año, una jornada de un día, tres meses de temporada. El diseño lo
 * dice con los recursos de un impreso —filetes, medida de lectura corta y mucho
 * aire— y no con tarjetas: **el contenido no va en cajas**. Lo que separa un
 * bloque de otro es una línea de un píxel, y no hay íconos metidos en círculos
 * con tinte ni sombras ambientales alrededor del texto. Si un bloque vuelve a
 * necesitar un contorno para leerse, lo que le falta es jerarquía tipográfica.
 *
 * Dos excepciones, las dos deliberadas:
 *
 * 1. **Las fotos van redondeadas** (`rounded-xl`, y `rounded-lg` las
 *    miniaturas). Una foto con esquina blanda no es una tarjeta: no encierra
 *    contenido, es el contenido. Ojo con los tokens — `globals.css` redefine
 *    `--radius-xl` en 1,5rem, así que acá `rounded-xl` son 24px y `rounded-2xl`
 *    son 16px, al revés de lo que sugiere el nombre.
 * 2. **El formulario de Dv7 sí es una tarjeta**, y copia exactamente la de la
 *    ficha (Dd6). No es contenido editorial: es el mismo trámite que el
 *    visitante ya hizo en otra actividad del sitio, y que se vea igual es lo que
 *    lo hace reconocible.
 *
 * Toda la página va en papel. La versión anterior mandaba dos secciones a
 * penumbra —rojo oscuro sobre rojo oscuro, con el texto en rosa al 75%— y era
 * lo primero que la delataba como plantilla. El único momento oscuro es la foto
 * del hero, y se queda por una razón funcional: `Navbar.tsx` decide su
 * transparencia con `pathname.startsWith('/actividades')`, así que un hero claro
 * dejaría los enlaces blancos sobre fondo blanco.
 */

const HUB_PATH = VENDIMIA_HUB ?? "/actividades/vendimia";

// El hero va en <img> con srcSet y no en next/image: los tres anchos ya están
// generados y versionados (scripts/optimize-heros.mjs), así que no hace falta
// pasar por el optimizador en cada visita.
//
// El `sizes` va en `vh` y no en `vw`, igual que los otros heros full-bleed del
// sitio, porque lo que decide cuánto se agranda la foto es el ALTO del hero:
// `object-cover` la escala hasta cubrirlo y recorta los lados. Con una foto 16:9
// el ancho pintado es `alto × 1,78`, así que sobre un hero de 45svh son 80vh y
// sobre uno de 70vh, 125vh. Pedir `100vw` bajaría un archivo del ancho de la
// pantalla para pintarlo al doble: es la causa exacta de los heros borrosos que
// el proyecto ya pagó una vez (ver docs/FOTOS.md).
//
// En móvil se pide 78vh y no 80vh a propósito: 80vh cae dos puntos por encima
// del candidato de 1280 y el navegador salta al de 1920, que pesa el doble por
// una diferencia que nadie ve (0,94 píxeles de origen por píxel de pantalla
// contra 1,07 — medido en 375×812 a DPR 2). El umbral 5/4 del segundo tramo es
// la proporción en la que el hero de escritorio deja de estirarse por alto y
// pasa a hacerlo por ancho.
const HERO_WIDTHS = [1280, 1920, 2560];
const HERO_SRCSET = HERO_WIDTHS.map(
  (w) => `/images/actividades/hero-vendimia-${w}.webp ${w}w`,
).join(", ");
const HERO_FALLBACK = "/images/actividades/hero-vendimia-1920.webp";
const HERO_SIZES = "(max-width: 768px) 78vh, (max-aspect-ratio: 5/4) 125vh, 100vw";

/**
 * Las fotos de la vendimia son encuadres de la MISMA aérea, sacados del original
 * de 36 megapíxeles (`scripts/optimize-vendimia.mjs`). Es material real de la
 * jornada: rellenar la página con fotos de otras actividades habría dicho que
 * así se ve la vendimia, y no es cierto. Las que no salen de ahí —el asado, la
 * mesa puesta y el viñedo en reposo— son de la viña y su `alt` no afirma que
 * sean de una vendimia.
 *
 * **Ninguna se repite.** La versión anterior usaba `mesa` dos veces y ponía
 * `parras` de fondo tapada al 88% —se descargaba entera para no verse— mientras
 * la galería mostraba cuatro recortes de la aérea como si fueran cuatro momentos
 * distintos. Ahora cada archivo aparece una sola vez, en la sección cuyo texto
 * describe.
 *
 * Son provisorias: la viña todavía tiene que mandar las definitivas. Por eso las
 * ranuras declaran su proporción y el reemplazo es una línea acá.
 */
const FOTO = {
  grupo: "/images/actividades/vendimia-grupo.webp",
  asado: "/images/contacto/asado.webp",
  // Fotos propias de la jornada (2026-08-18). Las cinco primeras reemplazaron
  // recortes de la aérea y fotos prestadas de otras actividades; son de una
  // vendimia de verdad, así que sus `alt` describen lo que efectivamente pasa
  // en cada una. Salen de `npm run fotos:vendimia` — ver docs/FOTOS.md.
  mosto: "/images/actividades/vendimia-mosto.webp",
  manoUva: "/images/actividades/vendimia-mano-uva.webp",
  pisoneo: "/images/actividades/vendimia-pisoneo.webp",
  desayuno: "/images/actividades/vendimia-desayuno.webp",
  personas: "/images/actividades/vendimia-personas.webp",
  bin: "/images/actividades/vendimia-bin.webp",
  charla: "/images/actividades/vendimia-charla.webp",
  formulario: "/images/actividades/vendimia-formulario.webp",
} as const;

/** Una etapa del ciclo de la vid, tal como viene de `messages`. */
type CycleStep = { season: string; name: string; description: string };

/** La etapa que esta página vende, resaltada dentro del ciclo. */
const HIGHLIGHTED_CYCLE_STEP = 4;

/**
 * Un ícono por paso de la jornada, en el MISMO orden que `program.steps` de
 * `messages/*.json`. Si allá se agrega, quita o reordena un paso, hay que
 * actualizar esta tabla — es la misma convención que `includeIcons` en la ficha
 * de actividad.
 *
 * Cada uno nombra lo que pasa en ese momento y no una idea abstracta de "paso":
 * se corta con tijera, se despalilla el racimo, se pisa con los pies. Un set de
 * círculos numerados o de ticks habría dicho "acá hay una lista", que es lo
 * único que el lector ya sabía.
 */
const PROGRAM_ICONS = [
  Croissant, // desayuno campestre de bienvenida
  Scissors, // corte de uva en el viñedo
  Grape, // despalillado: separar el grano del escobajo
  Footprints, // pisoneo tradicional, con los pies
  Flame, // almuerzo: asado campestre
  Trophy, // concursos y sorteos
  Wine, // brindis de cierre
];

/**
 * Dónde cae cada etapa en la banda de doce meses de `VineyardYear`, que arranca
 * en junio. Alineado por índice con `cycle.steps`.
 *
 * Vive acá y no en `messages` a propósito: el calendario agrícola es el mismo en
 * los tres idiomas, y meterlo en los bundles sería pedirle a un traductor que no
 * mueva un dato que no es texto. `VineyardYear` reparte el año en partes iguales
 * si algún día los largos dejan de coincidir, así que sumar una etapa al mensaje
 * degrada el dibujo pero no rompe la página.
 *
 * **Ninguna etapa baja de dos columnas.** Con el reparto literal por estación,
 * "de la uva al vino" quedaba sola en mayo: 107px para un título de cuatro
 * palabras en Caslon, que se partía en tres líneas. Las estaciones siguen siendo
 * ciertas —el deshoje es de verano, la vendimia del fin del verano y la bodega
 * del otoño— y lo que se ajustó es dónde cae el corte entre meses vecinos, que
 * en el campo tampoco es una fecha.
 *
 * El tramo teñido de la línea NO sale de acá sino de `VENDIMIA_MONTHS`: son dos
 * cosas distintas —las etapas son el trabajo de la viña; el tramo en vino es
 * cuándo puede venir el visitante— aunque desde que la cosecha es de abril y
 * mayo las dos coincidan. Que coincidan es un hecho de este año, no una regla:
 * si la viña abre una jornada fuera de la cosecha, se mueve `VENDIMIA_MONTHS`
 * sin tocar el ciclo.
 */
const CYCLE_SPANS = [
  { start: 1, span: 3 }, // Poda y amarra — invierno: junio, julio, agosto
  { start: 4, span: 3 }, // Desbrote — primavera: septiembre, octubre, noviembre
  { start: 7, span: 2 }, // Deshoje — verano: diciembre, enero
  { start: 9, span: 2 }, // Maduración — fin del verano: febrero, marzo
  { start: 11, span: 2 }, // Vendimia — otoño: abril, mayo
];

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actividades/vendimia">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "activities.vendimia" });
  const tMeta = await getTranslations({ locale, namespace: "metadata" });

  const title = t("meta.title");
  const description = t("meta.description");
  // Open Graph no aplica la plantilla de `title`, así que el título completo va
  // escrito (misma nota que en la ficha y en la portada de vinos).
  const ogTitle = `${title} · ${tMeta("siteName")}`;
  const image = {
    url: "/images/actividades/hero-vendimia-1280.webp",
    width: 1280,
    height: 720,
    alt: t("hero.imageAlt"),
  };

  return {
    title,
    description,
    alternates: alternatesFor(locale, HUB_PATH),
    openGraph: {
      type: "website",
      title: ogTitle,
      description,
      url: `/${locale}${HUB_PATH}`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image.url],
    },
  };
}

export default async function VendimiaPage({
  params,
}: PageProps<"/[locale]/actividades/vendimia">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("activities.vendimia");
  const tLabels = await getTranslations("activities.labels");
  const tItems = await getTranslations("activities.items");

  const cycleSteps = t.raw("cycle.steps") as CycleStep[];
  const programSteps = t.raw("program.steps") as string[];
  const includes = t.raw("program.includes") as string[];
  const related = vendimiaRelatedActivities();

  // Los tres datos que la viña SÍ dio. No hay una cuarta casilla con el precio
  // ni con el mínimo de personas porque esos números todavía no existen.
  //
  // Van sin ícono: un calendario, un reloj y una silueta metidos cada uno en un
  // círculo con tinte al 10% eran la firma más visible de la versión anterior, y
  // no agregaban nada — las etiquetas ya dicen "Temporada", "Duración" y "Para
  // quién". Lo que ordena la fila es el filete de arriba.
  const facts = [
    { label: t("facts.seasonLabel"), value: t("facts.seasonValue") },
    { label: t("facts.durationLabel"), value: t("facts.durationValue") },
    { label: t("facts.audienceLabel"), value: t("facts.audienceValue") },
  ];

  // Los mismos textos que ve la miga en pantalla alimentan el BreadcrumbList:
  // un rastro marcado que no coincide con el visible es marcado inventado.
  const crumbLabels = {
    home: tLabels("breadcrumbHome"),
    activities: tLabels("breadcrumbActivities"),
    vendimia: t("breadcrumb"),
  };

  return (
    <>
      <JsonLd
        data={buildVendimiaJsonLd(
          locale,
          {
            name: t("hero.title"),
            description: t("meta.description"),
            image: HERO_FALLBACK,
          },
          crumbLabels,
        )}
      />

      {/* Dv1 — Hero. Tiene que ser el primer <section> de <main> y llevar
          data-hero-text: es lo que el Navbar busca para quedarse transparente
          sobre una foto oscura (ver components/Navbar.tsx).

          Se fue la tarjeta blanca de datos que flotaba montada sobre el filo
          (`-mt-10`): es el recurso más repetido de una landing genérica, y acá
          además dejaba una caja clara atrapada entre una foto y una banda
          oscura. Los tres datos ahora abren Dv2, en papel y sin caja. */}
      <section className="relative">
        {/* El alto de móvil no es estético: con 45svh el ancho que pinta
            `object-cover` entra justo en el candidato de 1280 (ver HERO_SIZES).
            Subirlo obliga a bajar el archivo de 1920, que pesa el doble. */}
        <div className="relative h-[45svh] min-h-[340px] w-full overflow-hidden md:h-[70vh] md:min-h-[520px]">
          {/* `<picture>` con un solo encuadre: no hay art direction que hacer
              —ver el comentario de HERO_SIZES— pero es la forma que el resto de
              los heros del sitio ya usa, y la que deja servir los tres anchos
              del repo sin pasar por el optimizador en cada visita. */}
          <picture className="absolute inset-0 block h-full w-full">
            <img
              src={HERO_FALLBACK}
              srcSet={HERO_SRCSET}
              sizes={HERO_SIZES}
              alt={t("hero.imageAlt")}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover object-center motion-safe:animate-[heroZoom_1.4s_cubic-bezier(0.16,1,0.3,1)_both]"
            />
          </picture>
          {/* Dos velos y no tres. El de abajo resuelve el contraste del título,
              el de arriba el de la miga y el navbar. La versión anterior apilaba
              un tercero y aun así le ponía `drop-shadow` al texto: una sombra
              sobre cada letra es el síntoma de que el velo no alcanzó, no un
              recurso. Con este el título se lee sin sombra. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#1a0203]/85 via-[#1a0203]/30 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#1a0203]/55 to-transparent"
          />

          <div className="absolute left-0 right-0 top-24 px-margin-mobile md:px-margin-desktop">
            <div className="mx-auto max-w-(--container-max)">
              <ActivityBreadcrumbs
                aria={tLabels("breadcrumbAria")}
                items={[
                  { href: `/${locale}`, label: crumbLabels.home },
                  { href: `/${locale}/actividades`, label: crumbLabels.activities },
                  { href: `/${locale}${HUB_PATH}`, label: crumbLabels.vendimia },
                ]}
              />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-margin-mobile pb-12 md:px-margin-desktop md:pb-16">
            <div data-hero-text className="mx-auto max-w-(--container-max)">
              {/* Sin antetítulo de meses. `hero.eyebrow` ("Marzo · Abril ·
                  Mayo") decía el mismo dato que la fila de datos de Dv2 y que la
                  banda del año, tres veces en la misma página, y obligaba a leer
                  un calendario antes que el título.
                  **La clave no se borra de `messages`**: la usa el índice de
                  actividades (`app/[locale]/actividades/page.tsx`), donde sí
                  hace falta porque ahí la vendimia es una tarjeta suelta que
                  necesita decir cuándo es. */}
              <h1
                className="mb-5 max-w-4xl font-display leading-[1.02] text-white"
                style={{ fontSize: "clamp(2.6rem, 6.6vw, 5rem)", letterSpacing: "-0.02em" }}
              >
                {t("hero.title")}
              </h1>
              <p className="max-w-xl font-body text-body-lg leading-relaxed text-white/80">
                {t("hero.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dv2 — Qué es la vendimia. En papel, no en penumbra. La respuesta corta
          va primero y en una sola oración: es lo que lee quien llega de una
          búsqueda, y lo que un buscador puede citar sin cortar a mitad de idea.

          El collage de dos fotos superpuestas se fue. Estaba afinado a mano
          (`-mt-16 ml-6 w-[72%] lg:-ml-12`), se descuadraba en todo ancho
          intermedio, y su pieza grande era `hileras` — un recorte de hileras sin
          sujeto. El elemento visual más prominente de la página era una textura
          borrosa. Ahora la foto es la gamela con la uva molida, que es
          literalmente lo que el texto describe. */}
      <section className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="mx-auto max-w-(--container-max)">
          <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-6 xl:col-span-5">
              <h2 className="font-display text-[2rem] leading-[1.12] text-primary md:text-[2.6rem]">
                {t("about.title")}
              </h2>
              {/* La entrada en Caslon grande y el cuerpo en Work Sans chico: el
                  contraste de escala es lo que da jerarquía sin necesitar una
                  caja. Antes las dos iban casi al mismo tamaño. */}
              <p className="mt-7 font-display text-[1.35rem] leading-[1.45] text-on-surface md:text-[1.6rem]">
                {t("about.lead")}
              </p>
              <p className="mt-6 max-w-[58ch] font-body text-[17px] leading-[1.7] text-on-surface-variant">
                {t("about.body")}
              </p>
            </Reveal>

            {/* Tríptico vertical, desplazado hacia abajo: la asimetría sale del
                desfase y del ancho desigual de las columnas, no de superponer
                dos fotos.

                Tres ranuras 2:3 iguales y sin escalonar. Escalonarlas era la
                tentación —y es justo lo que traía el collage que se sacó de acá,
                afinado a mano y descuadrado en todo ancho intermedio—. La
                verticalidad ya la da la proporción.

                En móvil van en fila de tres: a 2:3 y un tercio del ancho siguen
                siendo legibles, y apilarlas mandaba el resto de la sección
                debajo del pliegue. */}
            <Reveal delay={140} className="lg:col-span-6 lg:mt-20 xl:col-span-7">
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {[
                  { src: FOTO.mosto, alt: t("photos.mosto") },
                  { src: FOTO.manoUva, alt: t("photos.manoUva") },
                  { src: FOTO.pisoneo, alt: t("photos.pisoneo") },
                ].map(({ src, alt }) => (
                  <div
                    key={src}
                    className="relative aspect-[2/3] overflow-hidden rounded-xl"
                  >
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 30vw, 20vw"
                    />
                  </div>
                ))}
              </div>

              {/* El botón de temporada vivía al pie del ciclo (Dv3), a media
                  página de acá. Cuelga del tríptico porque este es el punto en
                  que el visitante ya sabe qué es la vendimia y todavía no bajó:
                  es donde la pregunta "¿cuándo puedo ir?" aparece sola. */}
              <div className="mt-8">
                <Button
                  href="#consulta"
                  variant="primary"
                  iconRight={<ArrowRight className="h-4 w-4" />}
                >
                  {tLabels("form.titleSeason")}
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Los tres datos ciertos, como una fila de filetes. Sin caja, sin
              sombra y sin íconos en círculo. */}
          <Reveal delay={80}>
            <dl className="mt-20 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3 md:mt-24">
              {facts.map(({ label, value }) => (
                <div key={label} className="border-t border-outline-variant pt-4">
                  {/* 12px y no 11: es el piso del token `label-sm` y el mínimo
                      legible en móvil. El rótulo va en vino y no en gris: es el
                      color con que el resto de la página marca los rótulos
                      (`Cómo transcurre el día`, `La jornada incluye`, la etapa
                      destacada del ciclo), y acá quedaban como el único gris.
                      Contraste 9,4:1 sobre papel — el gris /70 que había daba
                      4,7:1, así que el cambio también sube. */}
                  <dt className="font-body text-[12px] font-semibold uppercase tracking-[0.16em] text-wine-accent">
                    {label}
                  </dt>
                  <dd className="mt-2 font-display text-xl leading-snug text-primary">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Dv4 — La jornada. Numerada, porque el orden ES la información: se
          desayuna, se corta, se pisa y recién ahí se celebra.

          No usa `ActivityProgram`: ese componente pinta cada paso con un número
          dentro de un círculo con tinte y anillo, unidos por un hilo vertical, y
          es justo el vocabulario que esta página abandona. Sigue intacto para
          las fichas (Dd4), que son las que lo estrenaron.

          Acá cada paso lleva un ícono que dice qué pasa en ese momento —tijera,
          racimo, pies, fuego, copa— y lo que separa los pasos es un filete. El
          orden **no** se perdió al sacar los numerales: sigue siendo un `<ol>`,
          que es lo que un lector de pantalla anuncia como secuencia. Los íconos
          van `aria-hidden` porque el texto de al lado ya nombra el paso. */}
      <section
        id="jornada"
        className="scroll-mt-24 bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop"
      >
        <div className="mx-auto max-w-(--container-max)">
          {/* El encabezado va a todo el ancho y no dentro de la columna de 7:
              la foto arrancaba a la altura del título y se lo comía. Ahora el
              título abre la sección solo y la grilla —con ella, la foto—
              empieza en "Cómo transcurre el día". */}
          <Reveal>
            <h2 className="font-display text-[2rem] leading-[1.12] text-primary md:text-[2.6rem]">
              {t("program.title")}
            </h2>
            <p className="mt-5 max-w-[58ch] font-body text-[17px] leading-[1.7] text-on-surface-variant">
              {t("program.lead")}
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal delay={80}>
                <h3 className="font-accent text-lg font-light italic text-wine-accent">
                  {t("program.stepsTitle")}
                </h3>
                <ol className="mt-5">
                  {programSteps.map((step, index) => {
                    // Si algún día `messages` suma un paso, el que sobre cae en la
                    // uva: es el ícono más neutro del set sin ser un tick genérico.
                    const Icon = PROGRAM_ICONS[index] ?? Grape;
                    return (
                      <li
                        key={step}
                        className="grid grid-cols-[1.75rem_1fr] items-start gap-x-5 border-t border-outline-variant py-5"
                      >
                        {/* Decorativo: el ícono ilustra el paso, no lo nombra —
                            eso lo hace el texto de al lado. Y el orden lo sigue
                            comunicando el <ol>, que es lo que importaba cuando los
                            pasos iban numerados a la vista. */}
                        <Icon
                          aria-hidden="true"
                          strokeWidth={1.5}
                          className="mt-0.5 h-7 w-7 text-wine-accent"
                        />
                        <p className="font-body text-[17px] leading-[1.65] text-on-surface">
                          {step}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </Reveal>

              <Reveal delay={120}>
                <h3 className="mt-14 font-accent text-lg font-light italic text-wine-accent">
                  {t("program.includesTitle")}
                </h3>
                {/* Sin check dentro de un círculo: el filete de arriba ya separa un
                    ítem del siguiente. */}
                <ul className="mt-5 grid gap-x-12 sm:grid-cols-2">
                  {includes.map((item) => (
                    <li
                      key={item}
                      className="border-t border-outline-variant py-4 font-body text-[17px] leading-[1.6] text-on-surface"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                {/* Sin tarjeta de precio ni de mínimo de personas: la ficha de una
                    actividad las trae porque el catálogo las declara, y para la
                    vendimia todavía no existen. Un "desde $X" o un "grupos desde
                    N" inventado acá sería el dato que el visitante recuerda. */}

                {/* La invitación cierra la jornada, no la abre: recién acá el
                    visitante sabe qué está reservando. Apunta al mismo #consulta
                    que el botón de Dv2 — ese es el que ve quien no baja hasta acá. */}
                <div className="mt-10">
                  <Button
                    href="#consulta"
                    variant="primary"
                    iconRight={<ArrowRight className="h-4 w-4" />}
                  >
                    {t("program.cta")}
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal delay={80}>
                {/* El mismo carrusel de las bandas de colección de /vinos: marco
                    4:5, crossfade, flechas, puntos y swipe. Se reusa entero en vez
                    de escribir otro — es la ranura de la misma proporción.

                    Las dos fotos son escenas distintas (el desayuno y el asado),
                    así que el `alt` va por foto: prestarle a una el texto de la
                    otra le describe a quien no ve algo que no está en pantalla.
                    Esa es la razón de que `CollectionPhotos` acepte un arreglo.

                    Abre el desayuno, que es de una vendimia de verdad y además el
                    primer hito del día; el asado —que viene de la galería de
                    contacto— queda segundo. */}
                <div className="lg:sticky lg:top-28">
                  <CollectionPhotos
                    photos={[FOTO.desayuno, FOTO.asado]}
                    alt={[t("photos.desayuno"), t("photos.asado")]}
                    prevLabel={t("photos.prev")}
                    nextLabel={t("photos.next")}
                    goToLabels={[1, 2].map((index) =>
                      t("photos.goTo", { index, total: 2 }),
                    )}
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Dv3 — El año de la viña. Una sola pieza donde antes había dos secciones
          (la grilla de cinco etapas y la franja de doce meses). El detalle del
          dibujo está en components/VineyardYear.tsx. */}
      <section className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="mx-auto max-w-(--container-max)">
          <Reveal className="mb-14 max-w-2xl md:mb-16">
            <p className="mb-3 font-accent text-xl font-light italic text-wine-accent">
              {t("breadcrumb")}
            </p>
            <h2 className="font-display text-[2rem] leading-[1.12] text-primary md:text-[2.6rem]">
              {t("cycle.title")}
            </h2>
            <p className="mt-5 font-body text-[17px] leading-[1.7] text-on-surface-variant">
              {t("cycle.lead")}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <VineyardYear
              stages={cycleSteps}
              spans={CYCLE_SPANS}
              harvestMonths={VENDIMIA_MONTHS}
              highlight={HIGHLIGHTED_CYCLE_STEP}
              locale={locale}
              labels={{
                // `t.raw`: el mensaje trae {months} y la enumeración la arma
                // VineyardYear con Intl.ListFormat. Con `t()` next-intl parsea
                // el ICU, no encuentra el argumento y la página imprime la ruta
                // de la clave.
                availableIn: tLabels.raw("seasonAvailableIn"),
                aria: tLabels("seasonAria"),
              }}
            />
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-12 max-w-2xl font-body text-[17px] leading-[1.7] text-on-surface-variant">
              {t("season.note")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Dv6 — Galería. Una imagen de apertura ancha y tres de apoyo, todas con
          proporción declarada.

          Las ranuras son deliberadamente genéricas y no están afinadas al
          material de hoy: las fotos son provisorias —la viña tiene que mandar
          las definitivas— así que diseñar el mosaico alrededor de estos
          encuadres sería trabajo que hay que rehacer. Antes eran seis piezas
          donde cuatro eran recortes de la misma aérea, y eso es lo que la hacía
          ver armada con relleno. */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="mx-auto max-w-(--container-max)">
          <Reveal className="mb-12">
            <h2 className="font-display text-[2rem] leading-[1.12] text-primary md:text-[2.6rem]">
              {t("gallery.title")}
            </h2>
            <p className="mt-5 max-w-[58ch] font-body text-[17px] leading-[1.7] text-on-surface-variant">
              {t("gallery.note")}
            </p>
          </Reveal>

          <Reveal>
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
              <Image
                src={FOTO.grupo}
                alt={t("photos.grupo")}
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-gutter grid grid-cols-2 gap-gutter md:grid-cols-3">
              {[
                { src: FOTO.personas, alt: t("photos.personas") },
                { src: FOTO.bin, alt: t("photos.bin") },
                { src: FOTO.charla, alt: t("photos.charla") },
              ].map(({ src, alt }) => (
                <div
                  key={src}
                  className="group relative aspect-[4/5] overflow-hidden rounded-xl last:col-span-2 md:last:col-span-1"
                >
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dv7 — Consulta. En modo `temporada` y sin `minPeople`: nadie cotiza una
          jornada que se repite todos los años; lo que se pide acá es que avisen
          cuándo es la próxima. El orden galería → consulta → otras es el mismo
          de la ficha; el spec numeraba "otras" antes, pero mandar a otra página
          justo antes del formulario es perder la visita.

          **El bloque copia el de la ficha (Dd6) a propósito**: mismo fondo de
          sección, misma tarjeta redondeada con sombra y anillo, misma grilla
          1.1/0.9. Es la única excepción a la regla de "nada de tarjetas" de esta
          página, y la razón es que el formulario no es contenido editorial sino
          el mismo trámite que el visitante ya hizo en cualquier otra actividad
          del sitio: que se vea igual es lo que lo hace reconocible. Si el de la
          ficha cambia, este cambia con él.

          La foto es `parras`, que en la versión anterior estaba puesta de fondo
          del ciclo tapada al 88% — se descargaba entera para no verse. */}
      <section
        id="consulta"
        className="scroll-mt-24 border-t border-outline-variant/30 bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop"
      >
        <div className="mx-auto max-w-(--container-max)">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-surface ambient-shadow-lg ring-1 ring-outline-variant/40 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 md:p-12">
              <ActivityReservationForm activityName={t("hero.title")} mode="temporada" />
            </div>
            {/* Decorativa: acompaña al formulario y no aporta información que el
                formulario no diga, así que va con `alt=""` y no con el texto de
                otra foto prestado.

                El tema —la gamela roja con la uva cortada— ocupa del 11% al 57%
                del ancho del cuadro. Centrada, la ranura angosta del formulario
                la parte al medio y deja el callejón vacío de la derecha.

                El anclaje es 16% y no `object-left`: en escritorio la ranura sólo
                muestra el 53% del ancho de la foto, así que pegada al borde
                izquierdo la ventana termina en 53% y le corta el canto derecho a
                la gamela. Con 16% la ventana va de 7% a 60% y la deja entera, sin
                dejar de estar corrida hacia la izquierda. En móvil la ranura es
                más ancha que alta, entra el 83% del cuadro y la gamela cae
                cómoda igual. */}
            <div className="relative order-first min-h-[300px] lg:order-none">
              <Image
                src={FOTO.formulario}
                alt=""
                aria-hidden="true"
                fill
                className="object-cover object-[16%_center]"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dv5 — Otras formas de vivir el ciclo. Las dos fichas salen de
          `VENDIMIA_RELATED_SLUGS`: si el catálogo suma otra experiencia de
          temporada, se agrega ahí y aparece acá sola.

          Se dibujan acá y no con `ActivityRowCard` por lo mismo que el programa
          no usa `ActivityProgram`: esa tarjeta va redondeada, con sombra
          ambiental y con un salto al pasar el mouse, y sería lo único con forma
          de tarjeta en una página que no tiene ninguna. El componente sigue
          intacto para la ficha (Dd8). */}
      {related.length > 0 && (
        // `surface` y no `surface-container-low`: Dv7 pasó a llevar el fondo del
        // formulario de la ficha, y con este bloque en el mismo tono quedaban
        // tres secciones seguidas del mismo color. Entre Dv6 y Dv7 la repetición
        // no molesta porque el formulario va en una tarjeta clara que marca el
        // corte sola; acá no hay tarjeta que lo marque.
        <section className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
          <div className="mx-auto max-w-(--container-max)">
            <Reveal className="mb-10">
              <h2 className="font-display text-[1.75rem] leading-[1.15] text-primary md:text-[2.1rem]">
                {t("others.title")}
              </h2>
              <p className="mt-4 max-w-[58ch] font-body text-[17px] leading-[1.7] text-on-surface-variant">
                {t("others.lead")}
              </p>
            </Reveal>

            <ul className="grid grid-cols-1 gap-x-16 sm:grid-cols-2">
              {related.map((activity) => (
                <li key={activity.slug} className="border-t border-outline-variant">
                  <Link
                    href={`/${locale}${activityPath(activity)}`}
                    className="group flex gap-6 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-accent/60"
                  >
                    <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg sm:w-28">
                      <Image
                        src={activity.image}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="112px"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl leading-snug text-primary">
                        {tItems(`${activity.slug}.name`)}
                      </h3>
                      <p className="mt-1.5 font-body text-base leading-[1.6] text-on-surface-variant sm:text-[15px]">
                        {tItems(`${activity.slug}.description`)}
                      </p>
                      <span className="mt-2.5 inline-flex items-center gap-1.5 font-body text-[12px] font-semibold uppercase tracking-[0.16em] text-wine-accent">
                        {tLabels("nav.detail")}
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
