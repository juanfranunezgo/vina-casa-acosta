import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowRight,
  MapPin,
  Clock,
  Users,
  CalendarDays,
  Check,
  Wine,
  Utensils,
  Grape,
  Star,
  Ticket,
  Footprints,
  Leaf,
  Warehouse,
  Pipette,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import ActivityBreadcrumbs from "@/components/ActivityBreadcrumbs";
import ActivityProgram from "@/components/ActivityProgram";
import ActivitySchedule, { type ScheduleStageView } from "@/components/ActivitySchedule";
import ActivityFaq, { type FaqEntry } from "@/components/ActivityFaq";
import Emphasis from "@/components/Emphasis";
import type { MenuCopy } from "@/components/ActivityMenu";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";
import ActivityRowCard from "@/components/ActivityRowCard";
import GalleryPlaceholder from "@/components/GalleryPlaceholder";
import ActivityGallery from "@/components/ActivityGallery";
import ActivitySectionNav from "@/components/ActivitySectionNav";
import IconBadge from "@/components/ui/IconBadge";
import ActivityReservationForm from "@/components/ActivityReservationForm";
import { mesesDeTemporada } from "@/lib/temporada";
import {
  activities,
  activitiesByCategory,
  activityPath,
  categoryIndexHref,
  getActivity,
  type ActivityPhoto,
} from "@/data/activities";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/alternates";
import JsonLd from "@/components/JsonLd";
import { buildActivityJsonLd } from "@/lib/activityJsonLd";

/**
 * Íconos de la lista "¿Qué incluye?", uno por ítem y en el MISMO orden que el
 * array `includes` de cada tour en `messages/*.json`. Si allá se agrega, quita
 * o reordena un ítem, hay que actualizar esta tabla: los ítems sobrantes caen
 * al tick genérico.
 */
const includeIcons: Record<string, LucideIcon[]> = {
  // copa de bienvenida · caminata · bodega y barricas · cata
  "ombu": [Wine, Footprints, Warehouse, Grape],
  // copa de bienvenida · caminata · bodega y barricas · desde barrica · cata
  "bera": [Wine, Footprints, Warehouse, Pipette, Grape],
  // copa de bienvenida · ampelografía · bodega y barricas · desde barrica · cata
  "carmenere": [Wine, Leaf, Warehouse, Pipette, Grape],
};

/**
 * Plus Jakarta Sans para el texto de las fichas —no para los títulos, que
 * siguen en Libre Caslon—. Pedido de Juan Francisco del 2026-09-24 sobre la
 * lectura de Quorum Legal, y sólo acá: menú, pie y el resto del sitio siguen en
 * Work Sans.
 *
 * Se aplica redefiniendo `--font-body` en cada bloque de primer nivel de la
 * ficha, así que todo `font-body` de adentro —componentes incluidos— cambia
 * sin tocarlos. No va en un `div` que envuelva la página porque el Navbar busca
 * el hero como `main > section` (components/Navbar.tsx) y un envoltorio lo
 * escondería. Si la ficha gana un bloque de primer nivel, lleva esta clase.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});
const FUENTE_FICHA = `${jakarta.variable} font-body [--font-body:var(--font-jakarta)]`;

/**
 * Parte "Con al menos 5 días de anticipación — coordinamos la fecha contigo" en
 * el dato y su aclaración, para la ficha rápida: el dato va destacado y lo que
 * sigue a la raya, debajo y más chico. Todos los `reservationNote` del catálogo
 * tienen esa forma en los tres idiomas; uno sin raya queda entero como dato.
 */
function splitNote(text: string): { value: string; note?: string } {
  const [value, ...rest] = text.split(" — ");
  const note = rest.join(" — ");
  return note
    ? { value, note: note.charAt(0).toLocaleUpperCase() + note.slice(1) }
    : { value: text };
}

export async function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    activities.map((activity) => ({
      locale,
      categoria: activity.category,
      slug: activity.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actividades/[categoria]/[slug]">): Promise<Metadata> {
  const { locale, categoria, slug } = await params;
  const tour = getActivity(categoria, slug);
  if (!tour) return { title: "—" };
  const tTour = await getTranslations({ locale, namespace: "activities.items" });
  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  const name = tTour(`${slug}.name`);
  // El nombre de la actividad y su título en el buscador son cosas distintas.
  // «Lágrimas de invierno» es el nombre y no dice qué es: era lo único que se
  // leía en Google, y ahí nadie busca por nombre propio. `metaTitle` agrega las
  // palabras que sí se escriben («la poda de la parra») sin tocar la página, que
  // sigue mostrando el nombre. Por el mismo motivo el og se queda con el nombre:
  // quien recibe el link por WhatsApp ya sabe de qué viña le hablan.
  //
  // Se pregunta con `has` porque next-intl NO falla cuando falta una clave:
  // devuelve la ruta como texto, y el título del resultado diría
  // «activities.items.yoga.metaTitle». La paridad la cubre
  // `tests/actividades-i18n-parity.test.mjs`; esto es el cinturón.
  const searchTitle = tTour.has(`${slug}.metaTitle`)
    ? tTour(`${slug}.metaTitle`)
    : name;
  // Lo mismo con la descripción: la bajada del hero es una frase para leer
  // bajo el título, no un resumen para el buscador. Donde la actividad trae
  // una propia (el yoga, desde el documento de la viña), manda esa.
  const description = tTour.has(`${slug}.metaDescription`)
    ? tTour(`${slug}.metaDescription`)
    : tTour(`${slug}.tagline`);
  // `keywords` propias sólo donde la actividad las trae (el yoga, pedido de
  // Juan Francisco). Google no usa esta etiqueta para posicionar; lo que
  // posiciona "yoga cerca de San Fernando" es el título, la descripción y el
  // texto visible, que llevan las mismas palabras. Sin ellas manda la lista
  // general del layout.
  const keywords = tTour.has(`${slug}.metaKeywords`)
    ? tTour(`${slug}.metaKeywords`)
    : undefined;
  const heroAlt = tTour.has(`${slug}.photos.hero`) ? tTour(`${slug}.photos.hero`) : name;
  const path = activityPath(tour);
  // Ver la nota equivalente en vinos/[slug]: Open Graph no aplica la plantilla
  // de `title`, así que el título completo va escrito.
  const ogTitle = `${name} | ${tMeta("siteName")}`;
  return {
    title: searchTitle,
    description,
    ...(keywords && { keywords }),
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: "website",
      title: ogTitle,
      description,
      url: `/${locale}${path}`,
      images: [{ url: tour.image, alt: heroAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [tour.image],
    },
  };
}

export default async function ActivityDetailPage({
  params,
}: PageProps<"/[locale]/actividades/[categoria]/[slug]">) {
  const { locale, categoria, slug } = await params;
  setRequestLocale(locale);
  const tour = getActivity(categoria, slug);
  if (!tour) notFound();

  const t = await getTranslations("activities.labels");
  const tTour = await getTranslations("activities.items");
  const tCategories = await getTranslations("activities.categories");

  const name = tTour(`${slug}.name`);
  const tagline = tTour(`${slug}.tagline`);
  const intro = tTour(`${slug}.intro`);
  const duration = tTour(`${slug}.duration`);
  const groupFrom = tTour(`${slug}.groupFrom`);
  const reservationNote = tTour(`${slug}.reservationNote`);

  /**
   * Textos que sólo algunas actividades traen. Se pregunta con `has` antes de
   * pedirlos por lo mismo que en `asList` (más abajo): una clave ausente no
   * lanza, pero devuelve la ruta como texto y deja un MISSING_MESSAGE por
   * página en el build.
   *
   * `closing` era de todas hasta el yoga: su programa termina en la cata, y un
   * "al cierre" debajo repetía el último paso con otras palabras.
   */
  const optional = (key: string) =>
    tTour.has(`${slug}.${key}`) ? tTour(`${slug}.${key}`) : undefined;
  const introMore = optional("introMore");
  // El `alt` del hero: una descripción de la foto donde la actividad la trae
  // (con el lugar, que también es SEO); si no, el nombre.
  const heroAlt = optional("photos.hero") ?? name;
  // Para el JSON-LD: la meta descripción dice qué es y dónde; la bajada es una
  // frase para leer bajo el título.
  const seoDescription = optional("metaDescription") ?? tagline;
  // Todas las fotos propias, para el `image` del Product: Google prefiere
  // varias. Sin fotos propias queda sólo el hero, como antes.
  const seoImages = [
    tour.image,
    ...[tour.photos?.intro, tour.photos?.card, tour.photos?.reserve, tour.photos?.gallery?.wide]
      .concat(tour.photos?.gallery?.portraits ?? [])
      .filter((photo): photo is ActivityPhoto => photo !== undefined)
      .map((photo) => photo.src),
  ];
  const closing = optional("closing");
  const priceNote = optional("priceNote");
  // "Consultar disponibilidad" en el yoga; el resto sigue con "Reserva".
  const cta = optional("cta") ?? t("nav.reserve");
  const formCopy = {
    title: optional("form.title"),
    subtitle: optional("form.subtitle"),
    submit: optional("cta"),
    waIntro: optional("form.waIntro"),
  };
  const choiceCopy = tTour.has(`${slug}.form.choiceLabel`)
    ? {
        label: tTour(`${slug}.form.choiceLabel`),
        placeholder: tTour(`${slug}.form.choicePlaceholder`),
        hint: tTour(`${slug}.form.choiceHint`),
      }
    : undefined;

  /**
   * El mensaje con que abre WhatsApp desde el hero y desde las preguntas. Es
   * el del formulario sin los datos del grupo, que ahí todavía no existen.
   */
  const whatsappHref = `${CONTACT_WHATSAPP_URL}?text=${encodeURIComponent(
    formCopy.waIntro ?? t("form.waIntro", { activity: name }),
  )}`;

  /**
   * Tres formas de contar lo mismo, y el catálogo del cliente las distingue:
   *
   * - Tours: `includes` es una lista de tickets canjeables, más los vinos y el
   *   maridaje. El aviso de tickets solo aplica acá.
   * - Talleres: `includes` es lo que el taller incluye —ingredientes, recetas
   *   impresas, jugos para menores—. No tiene orden y numerarlo lo haría leer
   *   como pasos de la jornada.
   * - Experiencias: `program` sí es una secuencia (desayuno → oficio → tejido →
   *   cierre) y se dibuja como línea de tiempo numerada.
   *
   * Qué bloque aparece lo decide el dato presente, no un flag aparte que pueda
   * contradecir a la categoría.
   *
   * `t.raw` de una clave ausente NO devuelve undefined: devuelve la ruta de la
   * clave como string. Sin este `Array.isArray` el `.map` de más abajo revienta
   * en pleno build con "map is not a function".
   */
  const isTour = tour.category === "tours";
  const asList = (key: string) => {
    // `has` antes de `raw`: pedir una clave ausente NO lanza, pero next-intl
    // escribe un MISSING_MESSAGE en la consola del servidor igual. Como cada
    // ficha pregunta por las tres formas y solo tiene una, sin este cruce el
    // build imprime cuatro errores por página que no son errores — y tapan los
    // que sí lo son. El `Array.isArray` de abajo se queda: cubre el caso de una
    // clave que existe con el tipo equivocado.
    if (!tTour.has(`${slug}.${key}`)) return [];
    const raw = tTour.raw(`${slug}.${key}`);
    return Array.isArray(raw) ? (raw as string[]) : [];
  };

  const includes = asList("includes");
  // Último ítem de "¿Qué incluye?", destacado dentro de la misma lista.
  const includesHighlight = isTour ? tTour(`${slug}.includesHighlight`) : "";
  const wines = asList("wines");
  const pairing = isTour ? tTour(`${slug}.pairing`) : "";
  const program = asList("program");

  /**
   * El programa con horario: minutos y tono desde `data/`, título, texto y
   * carta desde messages, emparejados por posición. Que los dos lados tengan el
   * mismo largo lo cuida `tests/yoga-entre-vinas`.
   */
  const scheduleCopy = tour.schedule
    ? (tTour.raw(`${slug}.schedule`) as { title: string; text: string; menu?: MenuCopy }[])
    : [];
  const schedule: ScheduleStageView[] = (tour.schedule ?? []).map((stage, index) => ({
    ...stage,
    ...scheduleCopy[index],
  }));

  const faq = tTour.has(`${slug}.faq`) ? (tTour.raw(`${slug}.faq`) as FaqEntry[]) : [];
  const extraConditions = asList("conditions");

  /**
   * Cena Sensorial no trae inclusiones ni programa: el catálogo describe cinco
   * tiempos y no los enumera. Sin este cruce, la ficha dibuja "¿Qué incluye?"
   * seguido de nada — un encabezado que promete una lista inexistente.
   */
  const hasDetail = includes.length > 0 || program.length > 0 || schedule.length > 0;

  /**
   * Las fotos de las tres ranuras fijas, ya resueltas: la propia de la
   * actividad si la hay, y si no la de siempre —el letrero de la viña y la
   * pareja en el columpio—, que son de la viña pero no de la actividad.
   *
   * El `alt` de una foto propia sale de `activities.items.{slug}.photos.{clave}`
   * y por eso se lee acá y no en `data/`: describe lo que pasa en la foto y
   * tiene que estar en los tres idiomas. Se pide SOLO cuando la foto existe —
   * una clave ausente no lanza, pero deja un MISSING_MESSAGE por página en el
   * build (ver `asList` arriba). Foto y `alt` entran juntos o no entra ninguno.
   */
  const photoAlt = (photo: ActivityPhoto) => tTour(`${slug}.photos.${photo.alt}`);
  const photos = {
    intro: tour.photos?.intro
      ? { src: tour.photos.intro.src, alt: photoAlt(tour.photos.intro) }
      : { src: "/images/actividades/letrero-vina.webp", alt: t("introImageAlt") },
    card: tour.photos?.card
      ? { src: tour.photos.card.src, alt: photoAlt(tour.photos.card) }
      : { src: tour.image, alt: name },
    reserve: tour.photos?.reserve
      ? {
          src: tour.photos.reserve.src,
          alt: photoAlt(tour.photos.reserve),
          position: tour.photos.reserve.position,
        }
      : { src: "/images/actividades/pareja-columpio.webp", alt: t("reserveImageAlt") },
  };

  /** Galería: mosaico si la actividad trae fotos; si no, los marcos vacíos. */
  const gallery = tour.photos?.gallery
    ? {
        wide: {
          src: tour.photos.gallery.wide.src,
          alt: photoAlt(tour.photos.gallery.wide),
        },
        portraits: tour.photos.gallery.portraits.map((photo) => ({
          src: photo.src,
          alt: photoAlt(photo),
        })),
      }
    : undefined;

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const clp = new Intl.NumberFormat(priceLocale, {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
  // Undefined cuando la actividad no publica precio. La tarjeta de reserva
  // decide qué mostrar en ese caso.
  const priceFormatted = tour.priceCLP === undefined ? undefined : clp.format(tour.priceCLP);
  // "por persona · IVA incluido" sólo si la actividad declaró su neto: es la
  // única forma de saber que la cifra lleva IVA. Ver `priceNetCLP`.
  const perPerson =
    tour.priceNetCLP === undefined
      ? t("perPerson")
      : `${t("perPerson")} · ${t("vatIncluded")}`;
  const netPrice =
    tour.priceNetCLP === undefined
      ? undefined
      : t("netPrice", { price: clp.format(tour.priceNetCLP) });

  const ficha = [
    { icon: MapPin, label: t("placeLabel"), value: t("placeValue"), note: t("placeNote") },
    { icon: Clock, label: t("durationLabel"), value: duration },
    { icon: Users, label: t("participantsLabel"), value: groupFrom },
    { icon: CalendarDays, label: t("reservationsLabel"), ...splitNote(reservationNote) },
  ];

  /**
   * La temporada, sólo cuando no es todo el año. Vivía en su propia caja
   * ("¿Cuándo se hace?") que en once de catorce fichas decía "Todo el año";
   * Juan Francisco la sacó el 2026-09-24. En las tres de temporada el dato sí
   * importa y pasa a ser una condición más.
   *
   * `t.raw` y no `t`: el mensaje trae `{months}` y la enumeración la arma
   * `mesesDeTemporada` con Intl. Con `t()` next-intl parsea el ICU, no
   * encuentra el argumento y devuelve la ruta de la clave como texto.
   */
  const season = mesesDeTemporada(tour.months, locale);
  const seasonCondition =
    season === undefined
      ? []
      : [(t.raw("seasonAvailableIn") as string).replace("{months}", season)];

  // Las propias de la actividad van antes de la ley de alcoholes, que cierra
  // la lista en todas las fichas.
  const conditions = [
    `${t("durationLabel")}: ${duration}`,
    groupFrom,
    reservationNote,
    ...seasonCondition,
    ...extraConditions,
    t("conditionMinors"),
  ];

  // Hermanas de la MISMA categoría: un taller no propone tours al cerrar.
  const otherTours = activitiesByCategory(tour.category).filter(
    (o) => o.slug !== slug,
  );

  // Las MISMAS tres traducciones que recibe la miga visible: el BreadcrumbList
  // describe lo que está en pantalla, no una jerarquía aparte para el crawler.
  const crumbLabels = {
    home: t("breadcrumbHome"),
    activities: t("breadcrumbActivities"),
    category: tCategories(`${tour.category}.name`),
  };

  return (
    <>
      {/* Product + BreadcrumbList de esta actividad. La entidad de la viña la
          emiten las páginas principales; acá se referencia por @id.
          Ver lib/activityJsonLd.ts. */}
      <JsonLd
        data={buildActivityJsonLd(
          locale,
          tour,
          { name, description: seoDescription, image: seoImages },
          crumbLabels,
        )}
      />

      {/* Dd1 — Hero. Con `heroBooking` es más alto: suma el precio y los
          botones. Desde el 2026-09-24 es más alto en todas las fichas (la foto
          baja más) y el texto va centrado: pedido de Juan Francisco. Sin
          antetítulo: la categoría del documento de la viña ("Bienestar entre
          viñas") salía encima del título y se sacó por el mismo pedido. */}
      <section className={`relative ${FUENTE_FICHA}`}>
        <div
          className={`relative w-full overflow-hidden ${
            tour.heroBooking
              ? "h-[78svh] min-h-[580px] md:h-[76vh] md:min-h-[600px]"
              : "h-[64svh] min-h-[460px] md:h-[68vh] md:min-h-[520px]"
          }`}
        >
          <Image
            src={tour.image}
            alt={heroAlt}
            fill
            priority
            className="object-cover motion-safe:animate-[heroZoom_1.4s_cubic-bezier(0.16,1,0.3,1)_both]"
            style={tour.heroPosition ? { objectPosition: tour.heroPosition } : undefined}
            sizes="100vw"
          />
          {/* Vignette vino oscuro para profundidad y legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0203]/85 via-[#1a0203]/40 to-[#1a0203]/15" />
          {/* Y uno arriba, para el menú. Con fotos de cielo abierto —la del
              yoga— el 15% de arriba no alcanzaba y los enlaces en blanco se
              perdían en las nubes. Es el mismo del hub de Vendimia (Dv1). */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#1a0203]/55 to-transparent"
          />

          <div className="absolute inset-x-0 bottom-0 px-margin-mobile pb-12 md:px-margin-desktop md:pb-20">
            {/* data-hero-text: el Navbar lo usa para encender su velo cuando el
                título pasa por detrás (ver components/Navbar.tsx). */}
            <div data-hero-text className="mx-auto flex max-w-(--container-max) flex-col items-center text-center">
              {/* El nombre de la viña salía acá en versalitas, encima del título
                  de cada tour: la misma marca repetida en el hero de un sitio
                  que ya es de la viña. El dato sigue disponible abajo, en la
                  ficha rápida, como "Lugar". Queda el sello premium, que sí
                  distingue un tour de otro — y con él la fila, para que sin
                  sello no reste un margen vacío sobre el título. */}
              {tour.premium && (
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.16em] text-white/90">
                    <Star className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {t("premium")}
                  </span>
                </div>
              )}
              <h1
                className="font-display text-white leading-[1.05] mb-3 text-balance drop-shadow-[0_2px_16px_rgba(0,0,0,0.35)]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
              >
                {name}
              </h1>
              <p className="max-w-2xl text-balance font-body text-body-lg text-white/85">{tagline}</p>

              {/* Precio y reserva sin bajar. El documento del yoga pide que en
                  celular el precio y el botón aparezcan antes del primer
                  desplazamiento largo, y la tarjeta de precio queda tres
                  pantallas más abajo.

                  Los mismos dos botones que la portada del sitio —primario y
                  vidrio— sobre la misma clase de foto. En celular el de
                  WhatsApp queda como ícono: con su texto, los dos no caben en
                  una fila de 327px. El texto sigue ahí para el lector de
                  pantalla. */}
              {tour.heroBooking && priceFormatted && (
                <div className="mt-7 flex w-full flex-col items-center gap-4 md:mt-9 md:w-auto md:flex-row md:gap-10">
                  <p className="font-body text-[15px] text-white/80">
                    <span className="mr-2 font-body text-[1.9rem] font-bold leading-none tracking-tight tabular-nums text-white">
                      {priceFormatted}
                    </span>
                    {perPerson}
                  </p>
                  <div className="flex w-full justify-center gap-2.5 sm:w-auto sm:gap-3">
                    <Button
                      href="#reserva"
                      variant="primary"
                      iconRight={<ArrowRight className="h-4 w-4" />}
                      className="flex-1 sm:flex-none"
                    >
                      {cta}
                    </Button>
                    <Button
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="glass"
                      iconLeft={<MessageCircle className="h-4 w-4" />}
                      className="w-11 shrink-0 !gap-0 !px-0 sm:w-auto sm:!gap-2 sm:!px-6"
                    >
                      <span className="sr-only sm:not-sr-only">{t("form.whatsapp")}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dd1 — Migas, centradas bajo el hero. Pedido de Juan Francisco del
          2026-09-24: primero dónde estás, después la píldora y recién ahí la
          ficha rápida. Van sobre blanco y no sobre la foto: arriba eran cuatro
          niveles en blanco que en 375px se partían en dos líneas. Siguen siendo
          la vuelta a la categoría y lo que hace honesto el `BreadcrumbList`. */}
      <section className={`bg-surface-container-lowest px-margin-mobile pt-7 md:px-margin-desktop md:pt-9 ${FUENTE_FICHA}`}>
        <div className="mx-auto max-w-(--container-max)">
          <ActivityBreadcrumbs
            tone="papel"
            align="center"
            aria={t("breadcrumbAria")}
            items={[
              { href: `/${locale}`, label: crumbLabels.home },
              { href: `/${locale}/actividades`, label: crumbLabels.activities },
              {
                href: categoryIndexHref(locale, tour.category),
                label: crumbLabels.category,
              },
              { href: `/${locale}${activityPath(tour)}`, label: name },
            ]}
          />
        </div>
      </section>

      {/* Desde acá hasta el formulario acompaña la píldora de secciones (Dd2).
          El `div` existe por ella: un `sticky` sólo se pega dentro de su
          contenedor, y éste abarca de la introducción a la reserva. Al llegar
          a "otras actividades" la píldora se va con el resto. */}
      <div className={`relative bg-surface-container-lowest ${FUENTE_FICHA}`}>
        <ActivitySectionNav
          items={[
            { id: "detalle", label: t("nav.detail") },
            { id: "galeria", label: t("nav.gallery") },
            ...(faq.length > 0 ? [{ id: "preguntas", label: t("nav.faq") }] : []),
          ]}
          cta={{ id: "reserva", label: t("nav.reserve") }}
          aria={t("nav.aria")}
        />

      {/* Dd1 — Ficha rápida, después de las migas y la píldora. Tarjeta blanca
          flotante fuera del hero, ya no
          montada sobre la foto: pedido de Juan Francisco del 2026-09-24 sobre
          la referencia de Quorum Legal. Montada (-mt-14) le tapaba el pie a la
          foto y competía con el título; separada, la foto termina entera y la
          tarjeta se lee como lo que es, el resumen de la actividad.

          Sin bordes, también por pedido suyo: ni el contorno de la tarjeta ni
          los filetes entre casillas. Lo que la separa del fondo blanco es sólo
          la sombra —de ahí que flote— y lo que separa las casillas es el aire.

          Una columna en celular, dos desde `sm` y cuatro desde `lg`. En celular
          iban dos columnas y "Sujeto a disponibilidad — coordinamos la fecha
          contigo" se partía en seis líneas.

          `relative z-10`: la sombra de la tarjeta cae sobre el bloque de
          abajo, y sin posición ese bloque —que viene después y tiene fondo—
          la pinta encima y la corta en seco. */}
      <section className="bg-surface-container-lowest px-margin-mobile pt-3 md:px-margin-desktop md:pt-5">
        <div className="mx-auto max-w-(--container-max)">
          <div className="relative z-10 rounded-[28px] bg-surface-container-lowest px-1 py-2 shadow-[0_36px_70px_-30px_rgba(74,14,14,0.30),0_10px_30px_-14px_rgba(74,14,14,0.12)] sm:p-2 lg:py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {ficha.map(({ icon: Icon, label, value, note }) => (
                <div key={label} className="flex items-start gap-4 px-5 py-4 sm:p-5 lg:p-6">
                  <IconBadge>
                    <Icon />
                  </IconBadge>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-body text-[13px] text-on-surface-variant">{label}</p>
                    <p className="mt-0.5 font-body text-[1.05rem] font-semibold leading-snug text-primary md:text-[1.1rem]">
                      {value}
                    </p>
                    {note && (
                      <p className="mt-1.5 font-body text-[14px] leading-snug text-on-surface-variant">
                        {note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Introducción. Las migas que la abrían subieron bajo el hero.

          La caja "¿Cuándo se hace?" (Dd3) que cerraba esta sección se fue el
          2026-09-24: en once de catorce fichas decía "Todo el año". En las de
          temporada el dato pasó a las condiciones de la tarjeta de precio. */}
      <section className="bg-surface-container-lowest px-margin-mobile pb-16 pt-14 md:px-margin-desktop md:pb-24 md:pt-20">
        <div className="mx-auto max-w-(--container-max)">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="relative pl-6 border-l-2 border-primary/25">
              <Grape
                className="absolute -left-[13px] top-1 h-6 w-6 text-wine-accent bg-surface-container-lowest rounded-full p-0.5"
                aria-hidden="true"
              />
              <p className="font-display text-xl leading-relaxed text-on-surface/90 md:text-3xl">
                {intro}
              </p>
              {/* El segundo párrafo, cuando lo hay, en Work Sans y más chico:
                  dos párrafos en Caslon de 30px eran un muro. El contraste de
                  escala es el mismo recurso del hub de Vendimia (Dv2). */}
              {introMore && (
                <p className="mt-6 max-w-[58ch] font-body text-[17px] leading-[1.7] text-on-surface-variant">
                  <Emphasis text={introMore} />
                </p>
              )}
            </div>
            <Reveal delay={120}>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden ambient-shadow-lg ring-1 ring-outline-variant/30">
                <Image
                  src={photos.intro.src}
                  alt={photos.intro.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Dd3 — Detalle / ¿Qué incluye? */}
      <section
        id="detalle"
        className="bg-surface-container-lowest py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-40 md:scroll-mt-44"
      >
        <div className="max-w-(--container-max) mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
          <div className="lg:col-span-2">
            <Reveal>
              <span className="block h-px w-12 bg-wine-accent/60 mb-5" />
              {hasDetail && (
                <>
                  <h2 className="font-display text-headline-h2 text-primary mb-6">
                    {t("whatIncludes")}
                  </h2>
                  {/* "Durante la experiencia disfrutarás de:" anuncia una
                      lista. Encima de la regla con horario era un tercer
                      encabezado apilado antes del contenido. */}
                  {schedule.length === 0 && (
                    <p className="font-body text-body-md text-on-surface-variant mb-4">
                      {t("duringExperience")}
                    </p>
                  )}
                </>
              )}
              {/* La lista de abajo son los tickets de la reserva: se canjean el
                  día de la visita, así que conviene decirlo antes de leerla.
                  Solo aplica a los tours — un taller no entrega tickets. */}
              {isTour && (
                <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-wine-accent/25 bg-wine-accent/5 px-4 py-2 font-body text-body-md text-wine-accent">
                  <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("ticketsNote")}
                </p>
              )}

              {/* Con horario manda `schedule`; si no, la lista numerada. Una
                  actividad no trae los dos: el test del yoga exige que el
                  `program` viejo se haya ido. */}
              {schedule.length > 0 ? (
                <ActivitySchedule
                  stages={schedule}
                  title={t("programTitle")}
                  locale={locale}
                />
              ) : (
                program.length > 0 && (
                  <ActivityProgram steps={program} title={t("programTitle")} />
                )
              )}
              {/* overflow-hidden: el ítem destacado pinta fondo y borde hasta el
                  filo, y sin esto se sale de las esquinas redondeadas. */}
              {includes.length > 0 && (
              <ul className="mb-10 overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/25 ambient-shadow divide-y divide-outline-variant/20">
                {includes.map((item, i) => {
                  const Icon = includeIcons[slug]?.[i] ?? Check;
                  return (
                    <li
                      key={item}
                      className="flex items-start gap-3.5 px-5 py-4 font-body text-body-md text-on-surface"
                    >
                      <IconBadge size="sm" className="mt-0.5">
                        <Icon />
                      </IconBadge>
                      {item}
                    </li>
                  );
                })}
                {/* Cierre de la lista: la tabla de maridaje va destacada. Solo
                    los tours la tienen. */}
                {isTour && (
                  // El `pl` compensa los 3px del filete: con `px-5` a secas, el
                  // icono de esta fila cae 3px a la derecha del de sus hermanas
                  // y la columna de círculos se ve torcida.
                  //
                  // El círculo va tenue como los demás. La fila ya se distingue
                  // por el fondo, el filete y la negrita; con el círculo en vino
                  // sólido eran cuatro énfasis para un mismo renglón.
                  <li className="flex items-start gap-3.5 bg-wine-accent/8 border-l-[3px] border-wine-accent pl-[17px] pr-5 py-4 font-body text-body-md font-semibold text-on-surface">
                    <IconBadge size="sm" className="mt-0.5">
                      <Utensils />
                    </IconBadge>
                    {includesHighlight}
                  </li>
                )}
              </ul>
              )}

              {isTour && (
                <>
                  <div className="flex items-center gap-2.5 mb-4">
                    <Wine className="h-5 w-5 text-wine-accent" aria-hidden="true" />
                    <h3 className="font-body text-label-sm uppercase tracking-widest text-wine-accent">
                      {t("tastingLabel")}
                    </h3>
                  </div>
                  <ul className="space-y-2.5 mb-10">
                    {wines.map((w) => (
                      <li
                        key={w}
                        className="flex items-start gap-3 bg-surface-container-lowest rounded-md pl-4 pr-5 py-3.5 border-l-[3px] border-primary/70 shadow-[0_2px_10px_-6px_rgba(74,14,14,0.15)] font-body text-body-md text-on-surface"
                      >
                        <Grape className="h-4 w-4 text-wine-accent mt-1 shrink-0" aria-hidden="true" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Callout: el maridaje solo lo tienen los tours; el cierre, las
                  que lo traen. Sin ninguno de los dos, la caja no se dibuja. */}
              {(isTour || closing) && (
                <div className="rounded-xl bg-primary/5 border border-primary/12 p-6 space-y-4">
                  {isTour && (
                    <p className="flex items-start gap-3 font-body text-body-md text-on-surface">
                      <Utensils className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="font-semibold">{t("pairingLabel")}:</span> {pairing}
                      </span>
                    </p>
                  )}
                  {closing && (
                    <p className="flex items-start gap-3 font-body text-body-md text-on-surface">
                      <Wine className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="font-semibold">{t("atCloseLabel")}:</span> {closing}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </Reveal>
          </div>

          {/* Dd3/Dd4 — Tarjeta de reserva (precio + condiciones) + imagen */}
          <Reveal delay={120} className="order-first lg:order-none lg:col-span-1">
            <div className="overflow-hidden rounded-2xl bg-surface-container-lowest ambient-shadow-lg ring-1 ring-outline-variant/40 lg:sticky lg:top-28">
              <div className="relative aspect-[16/8] md:aspect-[16/10]">
                <Image
                  src={photos.card.src}
                  alt={photos.card.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0203]/25 to-transparent" />
              </div>
              <div className="p-5 md:p-8">
                <p className="font-body text-label-sm uppercase tracking-[0.2em] text-wine-accent mb-2">
                  {t("priceLabel")}
                </p>
                {/* Sin precio publicado la tarjeta lo dice y explica de qué
                    depende, en vez de dejar el hueco donde iba la cifra. */}
                {priceFormatted === undefined ? (
                  <>
                    <p className="font-body text-2xl font-bold leading-tight tracking-tight text-primary md:text-3xl">
                      {t("priceOnRequest")}
                    </p>
                    <p className="font-body text-body-md text-on-surface-variant mt-2">
                      {t("priceOnRequestNote")}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-body text-4xl font-bold leading-none tracking-tight tabular-nums text-primary md:text-[2.75rem]">
                        {priceFormatted}
                      </span>
                    </div>
                    <p className="font-body text-body-md text-on-surface-variant mt-2">
                      {perPerson}
                    </p>
                    {/* El neto, para quien cotiza como empresa o agencia. En
                        chico y debajo: el precio que paga una persona es el de
                        arriba, y dos cifras del mismo tamaño harían dudar
                        cuál es. */}
                    {netPrice && (
                      <p className="mt-1 font-body text-[13px] tabular-nums text-on-surface-variant/80">
                        {netPrice}
                      </p>
                    )}
                  </>
                )}
                <span className="block h-0.5 w-14 bg-primary/70 mt-5" />
                {priceNote && (
                  <p className="mt-5 font-body text-[15px] leading-relaxed text-on-surface-variant">
                    {priceNote}
                  </p>
                )}

                <ul className="space-y-3.5 my-7">
                  <li className="flex items-center gap-3 font-body text-body-md text-on-surface">
                    <Clock className="h-4 w-4 text-wine-accent shrink-0" aria-hidden="true" />
                    {duration}
                  </li>
                  <li className="flex items-center gap-3 font-body text-body-md text-on-surface">
                    <Users className="h-4 w-4 text-wine-accent shrink-0" aria-hidden="true" />
                    {groupFrom}
                  </li>
                </ul>

                <Button href="#reserva" variant="primary" fullWidth iconRight={<ArrowRight className="h-4 w-4" />}>
                  {cta}
                </Button>
              </div>

              {/* Dd4 — Condiciones (zona inferior diferenciada) */}
              <div className="border-t border-outline-variant/30 bg-surface-container-low px-5 py-6 md:px-8">
                <h4 className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-3">
                  {t("conditionsTitle")}
                </h4>
                <ul className="space-y-2.5">
                  {conditions.map((c) => (
                    <li
                      key={c}
                      className="font-body text-body-md text-on-surface-variant flex items-start gap-2.5 leading-snug"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-wine-accent mt-2 shrink-0" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dd5 — Galería. Con fotos propias es un mosaico; sin ellas, los marcos
          de diseño y el aviso de que están por llegar. Ver ActivityGallery. */}
      <section
        id="galeria"
        className="bg-surface-container-lowest py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-40 md:scroll-mt-44"
      >
        <div className="max-w-(--container-max) mx-auto">
          <Reveal>
            {gallery ? (
              <ActivityGallery
                title={t("galleryTitle")}
                wide={gallery.wide}
                portraits={gallery.portraits}
              />
            ) : (
              <GalleryPlaceholder title={t("galleryTitle")} coming={t("galleryComing")} />
            )}
          </Reveal>
        </div>
      </section>

      {/* Dd6b — Preguntas frecuentes, sólo si la actividad las trae. En papel
          como la galería, separadas de ella por un filete; el formulario de
          abajo ya va en el gris de las secciones de trámite. */}
      {faq.length > 0 && (
        <section
          id="preguntas"
          className="bg-surface-container-lowest py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-40 md:scroll-mt-44"
        >
          <div className="max-w-(--container-max) mx-auto">
            <Reveal>
              <ActivityFaq
                title={t("faqTitle")}
                entries={faq}
                more={t("faqMore")}
                whatsappLabel={t("faqWhatsapp")}
                whatsappHref={whatsappHref}
                expandAll={t("faqExpandAll")}
                collapseAll={t("faqCollapseAll")}
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* Dd6 — Reserva */}
      <section
        id="reserva"
        className="bg-surface-container-lowest py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-40 md:scroll-mt-44"
      >
        <div className="max-w-(--container-max) mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-2xl bg-surface-container-lowest ambient-shadow-lg ring-1 ring-outline-variant/40">
            <div className="p-8 md:p-12">
              <ActivityReservationForm
                activityName={name}
                minPeople={tour.minPeople}
                minAdvanceDays={tour.minAdvanceDays}
                mode={tour.priceCLP === undefined ? "cotizacion" : "reserva"}
                copy={formCopy}
                extraFields={tour.bookingFields}
                choiceCopy={choiceCopy}
              />
            </div>
            <div className="relative order-first min-h-[260px] lg:order-none">
              <Image
                src={photos.reserve.src}
                alt={photos.reserve.alt}
                fill
                className="object-cover"
                style={
                  "position" in photos.reserve && photos.reserve.position
                    ? { objectPosition: photos.reserve.position }
                    : undefined
                }
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      </div>

      {/* Dd7 — Otros tours */}
      {otherTours.length > 0 && (
        <section className={`bg-surface-container-lowest py-section-gap px-margin-mobile md:px-margin-desktop ${FUENTE_FICHA}`}>
          <div className="max-w-(--container-max) mx-auto">
            <Reveal className="mb-10">
              <span className="block h-px w-12 bg-wine-accent/60 mb-5" />
              <h2 className="font-display text-headline-h2 text-primary">{t("otherInCategory")}</h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
              {otherTours.map((o, idx) => (
                <Reveal key={o.slug} delay={idx * 80}>
                  <ActivityRowCard
                    href={`/${locale}${activityPath(o)}`}
                    image={o.image}
                    name={tTour(`${o.slug}.name`)}
                    description={tTour(`${o.slug}.description`)}
                    cta={t("nav.detail")}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
