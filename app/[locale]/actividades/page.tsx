import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, CheckCircle2, Clock, Users, ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import ActivitiesTabs from "@/components/ActivitiesTabs";
import { tours, experiences } from "@/data/activities";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/actividades">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.actividades" });
  return {
    title: t("title"),
    description: t("description"),
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
      <section className="pt-32 pb-12 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto text-center">
        <Reveal>
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            {t("hero.eyebrow")}
          </p>
          <h1
            className="font-display text-primary mb-6"
            style={{
              fontSize: "clamp(2.25rem, 5.5vw, 4rem)",
              lineHeight: 1.08,
            }}
          >
            {t("hero.title")}
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
            {t("hero.subtitle")}
          </p>
          <ActivitiesTabs
            labels={{
              tours: t("hero.tabs.tours"),
              experiences: t("hero.tabs.experiences"),
              events: t("hero.tabs.events"),
            }}
          />
        </Reveal>
      </section>

      {/* TOURS */}
      <section id="tours" className="py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-24">
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
                        href={`/${locale}/contacto?asunto=tour`}
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
      <section id="experiencias" className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-24">
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
      <section id="eventos" className="py-section-gap px-margin-mobile md:px-margin-desktop scroll-mt-24">
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
