import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Users,
  CalendarDays,
  Check,
  Wine,
  UtensilsCrossed,
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
import TourReservationForm from "@/components/TourReservationForm";
import { tours, getActivity } from "@/data/activities";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/alternates";

/**
 * Íconos de la lista "¿Qué incluye?", uno por ítem y en el MISMO orden que el
 * array `includes` de cada tour en `messages/*.json`. Si allá se agrega, quita
 * o reordena un ítem, hay que actualizar esta tabla: los ítems sobrantes caen
 * al tick genérico.
 */
const includeIcons: Record<string, LucideIcon[]> = {
  // copa de bienvenida · caminata · bodega y barricas · cata
  "tour-ombu": [Wine, Footprints, Warehouse, Grape],
  // copa de bienvenida · caminata · bodega y barricas · desde barrica · cata
  "tour-bera": [Wine, Footprints, Warehouse, Pipette, Grape],
  // copa de bienvenida · ampelografía · bodega y barricas · desde barrica · cata
  "tour-carmenere": [Wine, Leaf, Warehouse, Pipette, Grape],
};

export async function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    tours.map((t) => ({ locale, slug: t.slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actividades/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const tour = getActivity("tours", slug);
  if (!tour) return { title: "—" };
  const tTour = await getTranslations({ locale, namespace: "tours" });
  const tDetail = await getTranslations({ locale, namespace: "tourDetail" });
  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  const name = tTour(`${slug}.name`);
  const description = tDetail(`${slug}.tagline`);
  const path = `/actividades/${slug}`;
  // Ver la nota equivalente en vinos/[slug]: Open Graph no aplica la plantilla
  // de `title`, así que el título completo va escrito.
  const ogTitle = `${name} · ${tMeta("siteName")}`;
  return {
    title: name,
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

export default async function TourDetailPage({
  params,
}: PageProps<"/[locale]/actividades/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tour = getActivity("tours", slug);
  if (!tour) notFound();

  const t = await getTranslations("tourDetail");
  const tTour = await getTranslations("tours");

  const name = tTour(`${slug}.name`);
  const tagline = t(`${slug}.tagline`);
  const intro = t(`${slug}.intro`);
  const duration = t(`${slug}.duration`);
  const groupFrom = t(`${slug}.groupFrom`);
  const reservationNote = t(`${slug}.reservationNote`);
  const includes = t.raw(`${slug}.includes`) as string[];
  // Último ítem de "¿Qué incluye?", destacado dentro de la misma lista.
  const includesHighlight = t(`${slug}.includesHighlight`);
  const wines = t.raw(`${slug}.wines`) as string[];
  const pairing = t(`${slug}.pairing`);
  const closing = t(`${slug}.closing`);

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

  const otherTours = tours.filter((o) => o.slug !== slug);

  return (
    <>
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

          <div className="absolute top-24 left-0 right-0 px-margin-mobile md:px-margin-desktop">
            <div className="max-w-(--container-max) mx-auto">
              <Link
                href={`/${locale}/actividades`}
                className="inline-flex items-center gap-2 font-body text-label-sm uppercase tracking-wider text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("backToActivities")}
              </Link>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-margin-mobile md:px-margin-desktop pb-16 md:pb-24">
            {/* data-hero-text: el Navbar lo usa para encender su velo cuando el
                título pasa por detrás (ver components/Navbar.tsx). */}
            <div data-hero-text className="max-w-(--container-max) mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-10 bg-white/50" />
                <span className="font-body text-label-sm uppercase tracking-[0.3em] text-white/75">
                  {t("placeValue")}
                </span>
                {tour.premium && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.16em] text-white/90">
                    <Star className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {t("premium")}
                  </span>
                )}
              </div>
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
                    src="/images/actividades/letrero-vina.webp"
                    alt={t("introImageAlt")}
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
              <h2 className="font-display text-headline-h2 text-primary mb-6">
                {t("whatIncludes")}
              </h2>
              <p className="font-body text-body-md text-on-surface-variant mb-4">
                {t("duringExperience")}
              </p>
              {/* La lista de abajo son los tickets de la reserva: se canjean el
                  día de la visita, así que conviene decirlo antes de leerla. */}
              <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-wine-accent/25 bg-wine-accent/5 px-4 py-2 font-body text-body-md text-wine-accent">
                <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t("ticketsNote")}
              </p>
              {/* overflow-hidden: el ítem destacado pinta fondo y borde hasta el
                  filo, y sin esto se sale de las esquinas redondeadas. */}
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
                {/* Cierre de la lista: la tabla de maridaje va destacada. */}
                <li className="flex items-start gap-3.5 bg-wine-accent/8 border-l-[3px] border-wine-accent px-5 py-4 font-body text-body-md font-semibold text-on-surface">
                  <span className="h-7 w-7 rounded-full bg-wine-accent flex items-center justify-center shrink-0 mt-0.5">
                    <UtensilsCrossed className="h-4 w-4 text-on-primary" aria-hidden="true" />
                  </span>
                  {includesHighlight}
                </li>
              </ul>

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

              {/* Callout maridaje + cierre */}
              <div className="rounded-xl bg-primary/5 border border-primary/12 p-6 space-y-4">
                <p className="flex items-start gap-3 font-body text-body-md text-on-surface">
                  <UtensilsCrossed className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{t("pairingLabel")}:</span> {pairing}
                  </span>
                </p>
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
                  src={tour.image}
                  alt={name}
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
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl leading-none tabular-nums text-primary md:text-5xl">
                    {priceFormatted}
                  </span>
                </div>
                <p className="font-body text-body-md text-on-surface-variant mt-2">
                  {t("perPerson")}
                </p>
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

      {/* Dd5 — Galería (placeholder) */}
      <section
        id="galeria"
        className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-24"
      >
        <div className="max-w-(--container-max) mx-auto">
          <Reveal>
            <span className="block h-px w-12 bg-wine-accent/60 mb-5" />
            <h2 className="font-display text-headline-h2 text-primary mb-8">{t("galleryTitle")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-xl bg-gradient-to-br from-surface-container-low to-surface-container border border-outline-variant/25 flex items-center justify-center"
                >
                  <Images className="h-8 w-8 text-primary-container/30" aria-hidden="true" />
                </div>
              ))}
            </div>
            <p className="font-body text-body-md text-on-surface-variant/80 mt-6 italic">
              {t("galleryComing")}
            </p>
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
              <TourReservationForm tourName={name} minPeople={tour.minPeople} />
            </div>
            <div className="relative order-first min-h-[260px] lg:order-none">
              <Image
                src="/images/actividades/pareja-columpio.webp"
                alt={t("reserveImageAlt")}
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
              <h2 className="font-display text-headline-h2 text-primary">{t("otherTours")}</h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
              {otherTours.map((o, idx) => (
                <Reveal key={o.slug} delay={idx * 80}>
                  <Link
                    href={`/${locale}/actividades/${o.slug}`}
                    className="group flex gap-5 bg-surface rounded-xl overflow-hidden border border-outline-variant/25 ambient-shadow hover:-translate-y-1 hover:ambient-shadow-lg transition-all duration-300"
                  >
                    <div className="relative w-32 sm:w-44 shrink-0 overflow-hidden">
                      <Image
                        src={o.image}
                        alt={tTour(`${o.slug}.name`)}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="176px"
                      />
                    </div>
                    <div className="py-5 pr-5 flex flex-col justify-center">
                      <h3 className="font-display text-xl text-primary mb-1">{tTour(`${o.slug}.name`)}</h3>
                      <p className="font-body text-body-md text-on-surface-variant line-clamp-2 mb-2">
                        {tTour(`${o.slug}.description`)}
                      </p>
                      <span className="font-body text-label-sm uppercase tracking-wider font-semibold text-primary inline-flex items-center gap-1">
                        {t("nav.detail")}
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
