import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, CheckCircle2, Clock, CalendarDays, MessageCircle, ArrowUpRight, ArrowRight, Star } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import ActivitiesTabs from "@/components/ActivitiesTabs";
import { tours, experiences } from "@/data/activities";
import { CONTACT_WHATSAPP_URL, CONTACT_PHONE_DISPLAY, INSTAGRAM_URL } from "@/lib/contact";
import { alternatesFor } from "@/lib/alternates";
import { jsonLdHtml } from "@/lib/jsonLd";
import { buildActividadesJsonLd } from "@/lib/siteJsonLd";

// El hero D1 va en <picture> y no en next/image, porque next/image no hace art
// direction: elige a qué tamaño bajar una foto, no cuál de dos. El .webp sin
// sufijo es el master a su ancho nativo, se sirve tal cual.
const heroSources = {
  desktop: [
    "/images/actividades/hero-grupal-1280.webp 1280w",
    "/images/actividades/hero-grupal-1920.webp 1920w",
    "/images/actividades/hero-grupal.webp 2880w",
  ].join(", "),
  movil: [828, 1200, 1600]
    .map((w) => `/images/actividades/hero-grupal-movil-${w}.webp ${w}w`)
    .join(", "),
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actividades">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.actividades" });
  const tHero = await getTranslations({ locale, namespace: "actividades.hero" });
  const path = `/${locale}/actividades`;
  const heroImage = {
    url: "/images/actividades/hero-grupal.webp",
    width: 2880,
    height: 1920,
    alt: tHero("imageAlt"),
  };

  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor(locale, "/actividades"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: path,
      images: [heroImage],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [heroImage.url],
    },
  };
}

export default async function ActividadesPage({
  params,
}: PageProps<"/[locale]/actividades">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("actividades");
  const tTour = await getTranslations("tours");
  const tExp = await getTranslations("experiences");
  const tMeta = await getTranslations("metadata.actividades");

  // Solo los tours: son los que tienen ficha propia y precio a la vista. Las
  // `experiences` no tienen página de detalle ni precio publicado acá.
  const jsonLd = buildActividadesJsonLd(
    locale,
    { name: tMeta("title"), description: tMeta("description") },
    tours.map((tour) => ({
      slug: tour.slug,
      name: tTour(`${tour.slug}.name`),
      description: tTour(`${tour.slug}.description`),
      priceCLP: tour.priceCLP,
      image: tour.image,
    })),
  );

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(priceLocale, {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <>
      {/* CollectionPage + los tours con su precio, y la entidad de la viña.
          Ver lib/siteJsonLd.ts. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />

      {/* HERO (D1) — cinematográfico full-bleed sobre la foto grupal de un evento
          en el viñedo (mismo patrón que Inicio e Historia). Texto claro en la
          mitad-baja con degradados para legibilidad; el navbar pasa a modo claro
          sobre este hero (ver Navbar → hasDarkHero incluye /actividades). */}
      <section className="relative flex min-h-[92svh] w-full flex-col overflow-hidden md:min-h-screen">
        {/* Dos encuadres: el 3:2 de siempre y un 9:16 para pantallas verticales
            (ver scripts/optimize-heros.mjs). `sizes` lleva el alto del viewport
            porque con object-cover en vertical la foto se estira hasta cubrir el
            alto, y ese ancho estirado —no el del contenedor— es el que hay que
            descargar. El recorte vertical de la foto grupal viene centrado en el
            letrero: en 9:16 no entra el grupo completo. */}
        <picture className="absolute inset-0">
          <source
            media="(min-aspect-ratio: 3/4)"
            srcSet={heroSources.desktop}
            sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          />
          <source srcSet={heroSources.movil} sizes="(max-aspect-ratio: 9/16) 56.25vh, 100vw" />
          <img
            src="/images/actividades/hero-grupal-1920.webp"
            alt={t("hero.imageAlt")}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          />
        </picture>
        {/* Degradados: base fuerte para el texto, lateral izquierdo sutil y una
            franja superior que oscurece el cielo detrás del navbar claro. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />

        {/* Espaciador (en flujo): deja el bloque a la misma altura que los heros de
            Historia (B1) y Vinos (C1), donde el texto queda centrado vertical y el
            ante-título arranca ~40% del alto. Al ir en el flujo, en pantallas chicas
            la sección crece en vez de recortar el texto (overflow-hidden solo clipa
            la foto). */}
        <div aria-hidden="true" className="min-h-[42svh] shrink-0 md:min-h-[40vh]" />
        {/* Texto apoyado en el margen izquierdo, igual que los heros de Historia
            (B1) y Nuestros Vinos (C1): sin contenedor centrado, con `lg:pl-20`. */}
        <div className="relative z-10 w-full px-margin-mobile pb-14 md:px-margin-desktop md:pb-20 lg:pl-20">
          <div data-hero-text className="max-w-2xl">
            <Reveal delay={120}>
              <p className="mb-4 font-accent text-lg font-light italic tracking-wide text-primary-fixed drop-shadow-md md:text-xl">
                {t("hero.eyebrow")}
              </p>
            </Reveal>
            <Reveal delay={220}>
              <h1
                className="mb-5 font-display text-on-primary drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
                style={{
                  fontSize: "clamp(2.25rem, 6.4vw, 4.5rem)",
                  lineHeight: 1.14,
                  letterSpacing: "-0.015em",
                }}
              >
                {t("hero.title")}
              </h1>
            </Reveal>
            <Reveal delay={320}>
              <p className="max-w-xl font-body text-body-lg text-on-primary/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                {t("hero.subtitle")}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SUB-NAV DE SECCIÓN (D1b) — barra sticky debajo del hero (scroll-spy). */}
      <ActivitiesTabs
        labels={{
          tours: t("hero.tabs.tours"),
          experiences: t("hero.tabs.experiences"),
          events: t("hero.tabs.events"),
          aria: t("hero.tabs.aria"),
        }}
      />

      {/* TOURS */}
      <section id="tours" className="py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-48">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="mb-16 md:mb-20 max-w-2xl mx-auto text-center">
            <span
              className="font-accent italic font-light text-primary block mb-2"
              style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)" }}
            >
              {t("tours.eyebrow")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              {t("tours.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
              {t("tours.subtitle")}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
            {tours.map((tour, idx) => {
              const highlights = tTour.raw(`${tour.slug}.highlights`) as string[];
              return (
                <Reveal key={tour.slug} delay={idx * 100}>
                  {/* La tarjeta destacada es la del tour premium, no una posición
                      fija: el orden de `tours` va de menor a mayor precio. Se
                      distingue por anillo y sombra, sin desalinearse de la fila. */}
                  <article
                    className={`relative bg-surface-container-low rounded-xl overflow-hidden group h-full flex flex-col hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.12)] transition-all duration-300 ${
                      tour.premium ? "ring-1 ring-primary/25 ambient-shadow-lg" : ""
                    }`}
                  >
                    {/* La tarjeta completa enlaza al detalle; el botón "Reservar"
                        (z superior) salta directo a la reserva sin anidar <a>. */}
                    <Link
                      href={`/${locale}/actividades/${tour.slug}`}
                      className="absolute inset-0 z-[1]"
                      aria-label={tTour(`${tour.slug}.name`)}
                    />
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={tour.image}
                        alt={tTour(`${tour.slug}.name`)}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {/* Distintivo discreto: vidrio sobre la foto, no una etiqueta
                          blanca que compite con el título de la tarjeta. */}
                      {tour.premium && (
                        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.16em] text-white/90 backdrop-blur-md">
                          <Star className="h-3 w-3 shrink-0" aria-hidden="true" />
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-4 gap-3">
                        <h3 className="font-display text-2xl text-primary">{tTour(`${tour.slug}.name`)}</h3>
                        <span className="shrink-0 font-body text-body-md font-semibold tabular-nums text-on-surface bg-surface-container-high px-3 py-1 rounded-full">
                          {formatPrice(tour.priceCLP)}
                        </span>
                      </div>
                      <p className="font-body text-body-md text-on-surface-variant mb-4 flex-grow">
                        {tTour(`${tour.slug}.description`)}
                      </p>
                      <ul className="space-y-2 mb-6">
                        {highlights.map((h) => (
                          <li
                            key={h}
                            className="font-body text-body-md text-on-surface flex items-start gap-2.5"
                          >
                            <Check className="h-4 w-4 text-wine-accent mt-1 shrink-0" aria-hidden="true" />
                            {h}
                          </li>
                        ))}
                      </ul>
                      <Button
                        href={`/${locale}/actividades/${tour.slug}#reserva`}
                        variant={tour.premium ? "primary" : "outline"}
                        fullWidth
                        className="z-[2]"
                      >
                        {tour.premium ? t("tours.reservePremium") : t("tours.reserveStandard")}
                      </Button>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="text-center mb-8">
            <p className="font-body text-label-sm font-bold uppercase tracking-[0.3em] text-primary">
              {t("tours.planTitle")}
            </p>
          </Reveal>

          <Reveal className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 ambient-shadow overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y divide-outline-variant/40 md:divide-y-0 md:divide-x">
              {/* Horarios */}
              <div className="flex items-start gap-4 p-6 md:p-7">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wine-accent/10 text-wine-accent">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-body font-semibold text-label-sm uppercase tracking-wider text-primary mb-1.5">
                    {t("tours.scheduleTitle")}
                  </h3>
                  <p className="font-body text-body-md text-on-surface">{t("tours.scheduleRegular")}</p>
                  <p className="font-body text-body-md text-on-surface">{t("tours.scheduleExtended")}</p>
                </div>
              </div>

              {/* Domingos y feriados */}
              <div className="flex items-start gap-4 p-6 md:p-7">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wine-accent/10 text-wine-accent">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-body font-semibold text-label-sm uppercase tracking-wider text-primary mb-1.5">
                    {t("tours.weekendTitle")}
                  </h3>
                  <p className="font-body text-body-md text-on-surface">{t("tours.weekendBody")}</p>
                </div>
              </div>

              {/* Reservas → WhatsApp (canal real de contacto) */}
              <a
                href={CONTACT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 p-6 md:p-7 transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wine-accent/10 text-wine-accent transition-colors group-hover:bg-wine-accent group-hover:text-on-primary">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-body font-semibold text-label-sm uppercase tracking-wider text-primary mb-1.5">
                    {t("tours.reservationsTitle")}
                  </h3>
                  <p className="font-body text-body-md text-on-surface mb-1.5">{t("tours.reservationsBody")}</p>
                  <span className="inline-flex items-center gap-1 font-body text-body-md font-semibold tabular-nums text-primary">
                    {CONTACT_PHONE_DISPLAY}
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* EXPERIENCIAS */}
      <section id="experiencias" className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-48">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-12">
            <span
              className="font-accent italic font-light text-primary block mb-2"
              style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)" }}
            >
              {t("experiences.eyebrow")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              {t("experiences.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant max-w-2xl mx-auto">
              {t("experiences.subtitle")}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {experiences.map((exp, idx) => {
              const content = (
                <>
                  <Image
                    src={exp.image}
                    alt={tExp(`${exp.slug}.name`)}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/85 via-primary/35 to-transparent p-6">
                    <span className="mb-2 font-body text-label-sm uppercase tracking-wider text-on-primary/85">
                      {tExp(`${exp.slug}.badge`)}
                    </span>
                    <h3 className="font-display text-2xl text-on-primary">{tExp(`${exp.slug}.name`)}</h3>
                    {exp.purchaseUrl && (
                      <span className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-on-primary/45 bg-on-primary/10 px-4 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary backdrop-blur-sm transition-colors group-hover:bg-on-primary group-hover:text-primary">
                        {t("experiences.efeCta")}
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                </>
              );

              return (
                <Reveal key={exp.slug} delay={idx * 100}>
                  {exp.purchaseUrl ? (
                    <a
                      href={exp.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block h-80 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
                    >
                      {content}
                    </a>
                  ) : (
                    <article className="group relative h-80 overflow-hidden rounded-xl">{content}</article>
                  )}
                </Reveal>
              );
            })}
          </div>

          {/* Aviso: las experiencias son temporales; invitamos a dejar el contacto
              por WhatsApp para avisar de las próximas fechas y eventos. */}
          <Reveal className="mt-10 flex justify-center md:mt-12">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-5 py-3 text-center transition-colors hover:border-wine-accent/40 hover:bg-wine-accent/5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wine-accent/10 text-wine-accent transition-colors group-hover:bg-wine-accent group-hover:text-on-primary">
                <InstagramIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-body text-body-md text-on-surface">
                {t("experiences.stayTunedLead")}{" "}
                <span className="font-semibold text-primary">{t("experiences.stayTunedCta")}</span>
              </span>
            </a>
          </Reveal>
        </div>
      </section>

      {/* EVENTOS */}
      <section id="eventos" className="py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-48">
        <div className="max-w-(--container-max) mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <span
              className="font-accent italic font-light text-primary block mb-2"
              style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)" }}
            >
              {t("events.eyebrow")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-6">
              {t("events.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed mb-6">
              {t("events.body")}
            </p>
            <ul className="space-y-3 font-body text-body-md text-on-surface mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                {t("events.bullets.capacity")}
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                {t("events.bullets.catering")}
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-wine-accent mt-0.5 shrink-0" aria-hidden="true" />
                {t("events.bullets.coordination")}
              </li>
            </ul>
            <Button
              href={`/${locale}/contacto?asunto=evento`}
              variant="primary"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {t("events.cta")}
            </Button>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden ambient-shadow">
              <Image
                src="/images/actividades/eventos.jpg"
                alt={t("events.imageAlt")}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
