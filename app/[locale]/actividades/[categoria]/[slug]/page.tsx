import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  MapPin,
  Clock,
  Users,
  CalendarDays,
  Check,
  Wine,
  Utensils,
  Images,
  Grape,
  ListChecks,
  Star,
  Ticket,
  Footprints,
  Leaf,
  Warehouse,
  Pipette,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import ActivityBreadcrumbs from "@/components/ActivityBreadcrumbs";
import ActivityProgram from "@/components/ActivityProgram";
import ActivityRowCard from "@/components/ActivityRowCard";
import GalleryPlaceholder from "@/components/GalleryPlaceholder";
import ActivityGallery from "@/components/ActivityGallery";
import SeasonStrip from "@/components/SeasonStrip";
import ActivityReservationForm from "@/components/ActivityReservationForm";
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
  const description = tTour(`${slug}.tagline`);
  const path = activityPath(tour);
  // Ver la nota equivalente en vinos/[slug]: Open Graph no aplica la plantilla
  // de `title`, así que el título completo va escrito.
  const ogTitle = `${name} | ${tMeta("siteName")}`;
  return {
    title: searchTitle,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: "website",
      title: ogTitle,
      description,
      url: `/${locale}${path}`,
      images: [{ url: tour.image, alt: name }],
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
  const closing = tTour(`${slug}.closing`);

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
   * Cena Sensorial no trae inclusiones ni programa: el catálogo describe cinco
   * tiempos y no los enumera. Sin este cruce, la ficha dibuja "¿Qué incluye?"
   * seguido de nada — un encabezado que promete una lista inexistente.
   */
  const hasDetail = includes.length > 0 || program.length > 0;

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
      ? { src: tour.photos.reserve.src, alt: photoAlt(tour.photos.reserve) }
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
  // Undefined cuando la actividad no publica precio. La tarjeta de reserva
  // decide qué mostrar en ese caso.
  const priceFormatted =
    tour.priceCLP === undefined
      ? undefined
      : new Intl.NumberFormat(priceLocale, {
          style: "currency",
          currency: "CLP",
          maximumFractionDigits: 0,
        }).format(tour.priceCLP);

  const ficha = [
    { icon: MapPin, label: t("placeLabel"), value: t("placeValue") },
    { icon: Clock, label: t("durationLabel"), value: duration },
    { icon: Users, label: t("participantsLabel"), value: groupFrom },
    { icon: CalendarDays, label: t("reservationsLabel"), value: reservationNote },
  ];

  const conditions = [
    `${t("durationLabel")}: ${duration}`,
    groupFrom,
    reservationNote,
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
          { name, description: tagline, image: tour.image },
          crumbLabels,
        )}
      />

      {/* Dd1 — Hero */}
      <section className="relative">
        <div className="relative h-[52svh] min-h-[400px] w-full overflow-hidden md:h-[58vh] md:min-h-[460px]">
          <Image
            src={tour.image}
            alt={name}
            fill
            priority
            className="object-cover motion-safe:animate-[heroZoom_1.4s_cubic-bezier(0.16,1,0.3,1)_both]"
            sizes="100vw"
          />
          {/* Vignette vino oscuro para profundidad y legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0203]/85 via-[#1a0203]/40 to-[#1a0203]/15" />

          <div className="absolute inset-x-0 bottom-0 px-margin-mobile md:px-margin-desktop pb-16 md:pb-24">
            {/* data-hero-text: el Navbar lo usa para encender su velo cuando el
                título pasa por detrás (ver components/Navbar.tsx). */}
            <div data-hero-text className="max-w-(--container-max) mx-auto">
              {/* El nombre de la viña salía acá en versalitas, encima del título
                  de cada tour: la misma marca repetida en el hero de un sitio
                  que ya es de la viña. El dato sigue disponible abajo, en la
                  ficha rápida, como "Lugar". Queda el sello premium, que sí
                  distingue un tour de otro — y con él la fila, para que sin
                  sello no reste un margen vacío sobre el título. */}
              {tour.premium && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.16em] text-white/90">
                    <Star className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {t("premium")}
                  </span>
                </div>
              )}
              <h1
                className="font-display text-white leading-[1.05] mb-3 drop-shadow-[0_2px_16px_rgba(0,0,0,0.35)]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
              >
                {name}
              </h1>
              <p className="font-body text-body-lg text-white/85 max-w-2xl">{tagline}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dd1 — Ficha rápida (spec bar elevada) + intro + Dd2 sub-nav */}
      <section className="bg-surface">
        <div className="px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
          <div className="relative z-10 -mt-10 md:-mt-14 bg-surface rounded-xl ambient-shadow-lg ring-1 ring-outline-variant/40 border-t-2 border-primary/70">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x divide-outline-variant/25 lg:divide-y-0">
              {ficha.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-4 md:gap-3.5 md:p-7">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine-accent/10 md:h-11 md:w-11">
                    <Icon className="h-5 w-5 text-wine-accent" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-body text-label-sm uppercase tracking-wider text-outline mb-1">
                      {label}
                    </p>
                    <p className="font-body text-body-md leading-snug text-on-surface">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* La miga, sobre papel y no sobre la foto. Arriba eran cuatro
              niveles en blanco que en 375px se partían en dos líneas, con el
              nombre de la actividad colgando solo sobre una foto cualquiera.
              Va debajo de la ficha rápida y no pegada al hero porque la tarjeta
              se monta sobre la foto (-mt-14) y ahí no hay aire donde ponerla.
              Sigue siendo la vuelta a la categoría y lo que hace honesto el
              `BreadcrumbList` del JSON-LD. */}
          <div className="mt-8 md:mt-12">
            <ActivityBreadcrumbs
              tone="papel"
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

          <div className="py-10 md:py-16">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <div className="relative pl-6 border-l-2 border-primary/25">
                <Grape
                  className="absolute -left-[13px] top-1 h-6 w-6 text-wine-accent bg-surface rounded-full p-0.5"
                  aria-hidden="true"
                />
                <p className="font-display text-xl leading-relaxed text-on-surface/90 md:text-3xl">
                  {intro}
                </p>
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

            {/* Dd2 — Sub-nav ancla (misma pastilla flotante del resto del sitio) */}
            <div className="mt-10 flex justify-center md:mt-12">
              <nav
                aria-label={t("nav.aria")}
                className="grid w-full max-w-md grid-cols-3 gap-1 rounded-full border border-outline-variant/40 bg-surface p-1 ambient-shadow"
              >
                {[
                  { href: "#detalle", label: t("nav.detail"), Icon: ListChecks },
                  { href: "#galeria", label: t("nav.gallery"), Icon: Images },
                  { href: "#reserva", label: t("nav.reserve"), Icon: CalendarDays },
                ].map(({ href, label, Icon }) => (
                  <a
                    key={href}
                    href={href}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-2 py-2 text-center font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant transition-colors duration-200 hover:bg-primary hover:text-on-primary sm:text-label-sm sm:tracking-wider md:px-5"
                  >
                    <Icon className="hidden h-4 w-4 shrink-0 md:block" aria-hidden="true" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Dd3 — Estacionalidad. Va antes del detalle a propósito: si la
                actividad no se hace en la fecha de quien lee, el resto del
                contenido no le sirve. */}
            <div className="mt-10 md:mt-12">
              <SeasonStrip
                months={tour.months}
                locale={locale}
                labels={{
                  title: t("seasonTitle"),
                  allYear: t("seasonAllYear"),
                  // `t.raw` y no `t`: este mensaje lleva `{months}` y la
                  // enumeración la arma SeasonStrip con Intl.ListFormat, que
                  // sabe el locale. Con `t()`, next-intl parsea el ICU, no
                  // encuentra el argumento y devuelve la ruta de la clave como
                  // texto — la ficha imprime "activities.labels.seasonAvailableIn".
                  availableIn: t.raw("seasonAvailableIn"),
                  aria: t("seasonAria"),
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dd3 — Detalle / ¿Qué incluye? */}
      <section
        id="detalle"
        className="bg-surface-container-low border-t border-outline-variant/30 py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-24"
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
                  <p className="font-body text-body-md text-on-surface-variant mb-4">
                    {t("duringExperience")}
                  </p>
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

              {program.length > 0 && (
                <ActivityProgram steps={program} title={t("programTitle")} />
              )}
              {/* overflow-hidden: el ítem destacado pinta fondo y borde hasta el
                  filo, y sin esto se sale de las esquinas redondeadas. */}
              {includes.length > 0 && (
              <ul className="mb-10 overflow-hidden rounded-xl bg-surface border border-outline-variant/25 ambient-shadow divide-y divide-outline-variant/20">
                {includes.map((item, i) => {
                  const Icon = includeIcons[slug]?.[i] ?? Check;
                  return (
                    <li
                      key={item}
                      className="flex items-start gap-3.5 px-5 py-4 font-body text-body-md text-on-surface"
                    >
                      <span className="h-7 w-7 rounded-full bg-wine-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-wine-accent" aria-hidden="true" />
                      </span>
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
                    <span className="h-7 w-7 rounded-full bg-wine-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Utensils className="h-4 w-4 text-wine-accent" aria-hidden="true" />
                    </span>
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
                        className="flex items-start gap-3 bg-surface rounded-md pl-4 pr-5 py-3.5 border-l-[3px] border-primary/70 shadow-[0_2px_10px_-6px_rgba(74,14,14,0.15)] font-body text-body-md text-on-surface"
                      >
                        <Grape className="h-4 w-4 text-wine-accent mt-1 shrink-0" aria-hidden="true" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Callout: el maridaje solo lo tienen los tours; el cierre, todas. */}
              <div className="rounded-xl bg-primary/5 border border-primary/12 p-6 space-y-4">
                {isTour && (
                  <p className="flex items-start gap-3 font-body text-body-md text-on-surface">
                    <Utensils className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="font-semibold">{t("pairingLabel")}:</span> {pairing}
                    </span>
                  </p>
                )}
                <p className="flex items-start gap-3 font-body text-body-md text-on-surface">
                  <Wine className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{t("atCloseLabel")}:</span> {closing}
                  </span>
                </p>
              </div>
            </Reveal>
          </div>

          {/* Dd3/Dd4 — Tarjeta de reserva (precio + condiciones) + imagen */}
          <Reveal delay={120} className="order-first lg:order-none lg:col-span-1">
            <div className="overflow-hidden rounded-2xl bg-surface ambient-shadow-lg ring-1 ring-outline-variant/40 lg:sticky lg:top-28">
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
                    <p className="font-display text-3xl leading-tight text-primary md:text-4xl">
                      {t("priceOnRequest")}
                    </p>
                    <p className="font-body text-body-md text-on-surface-variant mt-2">
                      {t("priceOnRequestNote")}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl leading-none tabular-nums text-primary md:text-5xl">
                        {priceFormatted}
                      </span>
                    </div>
                    <p className="font-body text-body-md text-on-surface-variant mt-2">
                      {t("perPerson")}
                    </p>
                  </>
                )}
                <span className="block h-0.5 w-14 bg-primary/70 mt-5" />

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
                  {t("nav.reserve")}
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
        className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-24"
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

      {/* Dd6 — Reserva */}
      <section
        id="reserva"
        className="bg-surface-container-low border-t border-outline-variant/30 py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-24"
      >
        <div className="max-w-(--container-max) mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-2xl bg-surface ambient-shadow-lg ring-1 ring-outline-variant/40">
            <div className="p-8 md:p-12">
              <ActivityReservationForm
                activityName={name}
                minPeople={tour.minPeople}
                mode={tour.priceCLP === undefined ? "cotizacion" : "reserva"}
              />
            </div>
            <div className="relative order-first min-h-[260px] lg:order-none">
              <Image
                src={photos.reserve.src}
                alt={photos.reserve.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dd7 — Otros tours */}
      {otherTours.length > 0 && (
        <section className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
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
