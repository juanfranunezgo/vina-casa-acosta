import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, CheckCircle2, Clock, Users, ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import ActivitiesTabs from "@/components/ActivitiesTabs";
import { tours, experiences } from "@/data/activities";
import { routing } from "@/i18n/routing";

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
    alternates: {
      canonical: path,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/actividades`]),
      ),
    },
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

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(priceLocale, {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <>
      {/* HERO (D1) — cinematográfico full-bleed sobre la foto grupal de un evento
          en el viñedo (mismo patrón que Inicio e Historia). Texto claro en la
          mitad-baja con degradados para legibilidad; el navbar pasa a modo claro
          sobre este hero (ver Navbar → hasDarkHero incluye /actividades). */}
      <section className="relative flex min-h-[92svh] w-full flex-col overflow-hidden md:min-h-screen">
        <Image
          src="/images/actividades/hero-grupal.webp"
          alt={t("hero.imageAlt")}
          fill
          priority
          quality={85}
          sizes="100vw"
          className="object-cover object-center motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
        />
        {/* Degradados: base fuerte para el texto, lateral izquierdo sutil y una
            franja superior que oscurece el cielo detrás del navbar claro. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />

        {/* Espaciador (en flujo): empuja el bloque a la mitad-baja — el ante-título
            arranca ~53% del alto. Al ir en el flujo, en pantallas chicas la sección
            crece en vez de recortar el texto (overflow-hidden solo clipa la foto). */}
        <div aria-hidden="true" className="min-h-[48svh] shrink-0 md:min-h-[53vh]" />
        <div className="relative z-10 w-full px-margin-mobile pb-14 md:px-margin-desktop md:pb-20">
          <div className="mx-auto max-w-(--container-max)">
            <div className="max-w-3xl">
              <Reveal delay={120}>
                <p className="mb-4 font-accent text-lg font-light italic tracking-wide text-primary-fixed drop-shadow-md md:text-xl">
                  {t("hero.eyebrow")}
                </p>
              </Reveal>
              <Reveal delay={220}>
                <h1
                  className="mb-5 font-display text-on-primary drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
                  style={{
                    fontSize: "clamp(2.5rem, 6.4vw, 4.5rem)",
                    lineHeight: 1.08,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {t("hero.title")}
                </h1>
              </Reveal>
              <Reveal delay={320}>
                <p className="max-w-2xl font-body text-body-lg text-on-primary/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                  {t("hero.subtitle")}
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* SUB-NAV DE SECCIÓN (D1b) — barra sticky debajo del hero (scroll-spy). */}
      <ActivitiesTabs
        labels={{
          tours: t("hero.tabs.tours"),
          experiences: t("hero.tabs.experiences"),
          events: t("hero.tabs.events"),
        }}
      />

      {/* TOURS */}
      <section id="tours" className="py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-40">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="mb-12 md:w-2/3">
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              {t("tours.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant">
              {t("tours.subtitle")}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
            {tours.map((tour, idx) => {
              const highlights = tTour.raw(`${tour.slug}.highlights`) as string[];
              return (
                <Reveal key={tour.slug} delay={idx * 100}>
                  <article
                    className={`bg-surface-container-low rounded-xl overflow-hidden group h-full flex flex-col hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.12)] transition-all duration-300 ${
                      idx === 1 ? "md:-mt-8 ring-1 ring-primary/20" : ""
                    }`}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={tour.image}
                        alt={tTour(`${tour.slug}.name`)}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {tour.premium && (
                        <span className="absolute top-4 left-4 bg-on-primary/95 backdrop-blur-sm text-primary px-3 py-1 text-label-sm uppercase tracking-wider rounded-full font-semibold">
                          ★ Premium
                        </span>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-4 gap-3">
                        <h3 className="font-display text-2xl text-primary">{tTour(`${tour.slug}.name`)}</h3>
                        <span className="shrink-0 font-body text-label-sm text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded uppercase tracking-wider font-semibold">
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
                            <Check className="h-4 w-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                            {h}
                          </li>
                        ))}
                      </ul>
                      <Button
                        href={`/${locale}/actividades/${tour.slug}`}
                        variant={tour.premium ? "primary" : "outline"}
                        fullWidth
                      >
                        {tour.premium ? t("tours.reservePremium") : t("tours.reserveStandard")}
                      </Button>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="glass-panel rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6 border border-outline-variant/30">
            <div className="flex items-start gap-4 flex-1">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-body font-semibold text-label-sm uppercase tracking-wider text-primary mb-1">
                  {t("tours.scheduleTitle")}
                </h4>
                <p className="font-body text-body-md text-on-surface">{t("tours.scheduleRegular")}</p>
                <p className="font-body text-body-md text-on-surface">{t("tours.scheduleExtended")}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 flex-1 border-t md:border-t-0 md:border-l border-outline-variant/50 pt-6 md:pt-0 md:pl-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-body font-semibold text-label-sm uppercase tracking-wider text-primary mb-1">
                  {t("tours.weekendTitle")}
                </h4>
                <p className="font-body text-body-md text-on-surface">{t("tours.weekendBody")}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* EXPERIENCIAS */}
      <section id="experiencias" className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-40">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              {t("experiences.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant max-w-2xl mx-auto">
              {t("experiences.subtitle")}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {experiences.map((exp, idx) => (
              <Reveal key={exp.slug} delay={idx * 100}>
                <article className="relative h-80 rounded-xl overflow-hidden group cursor-pointer">
                  <Image
                    src={exp.image}
                    alt={tExp(`${exp.slug}.name`)}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/35 to-transparent flex flex-col justify-end p-6">
                    <span className="font-body text-label-sm text-on-primary/85 uppercase tracking-wider mb-2">
                      {tExp(`${exp.slug}.badge`)}
                    </span>
                    <h3 className="font-display text-2xl text-on-primary">{tExp(`${exp.slug}.name`)}</h3>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTOS */}
      <section id="eventos" className="py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-40">
        <div className="max-w-(--container-max) mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
              {t("events.eyebrow")}
            </p>
            <h2 className="font-display text-headline-h1 text-primary mb-6">
              {t("events.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed mb-6">
              {t("events.body")}
            </p>
            <ul className="space-y-3 font-body text-body-md text-on-surface mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                {t("events.bullets.capacity")}
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                {t("events.bullets.catering")}
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
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
                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=70"
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
