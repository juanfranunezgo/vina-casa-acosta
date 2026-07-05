import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Wine, MapPin, Grape, Sparkles, Sprout } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import AboutSection from "@/components/AboutSection";
import HomeActivitiesShowcase from "@/components/HomeActivitiesShowcase";
import FeaturedWinesCarousel from "@/components/FeaturedWinesCarousel";
import { getFeaturedWines } from "@/data/wines";
import { tours as tourData, experiences as experienceData } from "@/data/activities";

const heroImage = "/images/home/hero-v2.jpg";

const casaPhotoSources = {
  vineyard:
    "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1400&q=75",
  founder:
    "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1400&q=75",
  guests:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=75",
  family:
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1400&q=75",
} as const;

const eventsImage =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=70";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tWine = await getTranslations("wines");
  const tTours = await getTranslations("tours");
  const tTourDetail = await getTranslations("tourDetail");
  const tExp = await getTranslations("experiences");
  const tActividades = await getTranslations("actividades");
  const featured = getFeaturedWines();
  const lp = (path: string) => `/${locale}${path}`;

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(priceLocale, {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(amount);

  const showcaseTours = tourData.map((tr) => ({
    slug: tr.slug,
    name: tTours(`${tr.slug}.name`),
    price: formatPrice(tr.priceCLP),
    duration: tTourDetail(`${tr.slug}.duration`),
    image: tr.image,
    premium: tr.premium,
  }));

  const showcaseExperiences = experienceData.map((ex) => ({
    slug: ex.slug,
    name: tExp(`${ex.slug}.name`),
    image: ex.image,
  }));

  const featuredCards = featured.map((wine) => ({
    slug: wine.slug,
    name: wine.name,
    lineLabel: t("featured.lineLabel", { line: wine.line }),
    shortDescription: tWine(`${wine.slug}.shortDescription`),
    vintage: wine.vintage,
    image: wine.image,
    href: lp(`/vinos/${wine.slug}`),
  }));

  const featuredStrip = [
    { Icon: Grape, title: t("featured.strip.vineyards.title"), desc: t("featured.strip.vineyards.desc") },
    { Icon: Wine, title: t("featured.strip.oak.title"), desc: t("featured.strip.oak.desc") },
    { Icon: Sparkles, title: t("featured.strip.limited.title"), desc: t("featured.strip.limited.desc") },
    { Icon: Sprout, title: t("featured.strip.heritage.title"), desc: t("featured.strip.heritage.desc") },
  ];

  const eventsBlock = {
    title: tActividades("events.title"),
    description: tActividades("events.body"),
    cta: t("activities.eventsCta"),
    image: eventsImage,
    href: lp("/actividades#eventos"),
  };

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[100svh] w-full flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage}
          alt={t("hero.heroAlt")}
          fill
          priority
          quality={85}
          className="object-cover object-[center_72%] motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />

        <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto pt-20 pb-24">
          <div className="max-w-3xl mx-auto md:mx-0 text-center md:text-left">
            <Reveal>
              <p className="font-body text-xs uppercase tracking-[0.3em] text-on-primary/55 mb-6">
                {t("hero.eyebrow")}
              </p>
            </Reveal>

            <Reveal delay={120}>
              <h1
                className="font-display text-on-primary mb-6 drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                style={{
                  fontSize: "clamp(2.5rem, 7vw, 5rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                {t("hero.title")}
              </h1>
            </Reveal>

            <Reveal delay={220}>
              <p
                className="font-body text-on-primary/90 mb-10 max-w-2xl mx-auto md:mx-0 drop-shadow-md"
                style={{
                  fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                  lineHeight: 1.6,
                }}
              >
                {t("hero.subtitle")}
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="flex flex-row flex-wrap gap-3 sm:gap-4 justify-center md:justify-start">
                <Button
                  href={lp("/tienda")}
                  variant="primary"
                  size="md"
                  iconLeft={<Wine className="h-4 w-4" />}
                  className="sm:h-12 sm:px-7"
                >
                  {t("hero.ctaShop")}
                </Button>
                <Button
                  href={lp("/actividades")}
                  variant="glass"
                  size="md"
                  iconLeft={<MapPin className="h-4 w-4" />}
                  className="sm:h-12 sm:px-7"
                >
                  {t("hero.ctaVisit")}
                </Button>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 motion-safe:animate-[bounce_2.5s_ease-in-out_infinite]">
          <span className="font-body text-label-sm uppercase tracking-[0.25em] text-on-primary/70">
            {t("hero.scrollHint")}
          </span>
          <div className="h-10 w-px bg-gradient-to-b from-on-primary/60 to-transparent" />
        </div>
      </section>

      {/* CASA ACOSTA */}
      <AboutSection
        photos={[
          { src: casaPhotoSources.vineyard, alt: t("about.photoAlts.vineyard") },
          { src: casaPhotoSources.founder, alt: t("about.photoAlts.founder") },
          { src: casaPhotoSources.guests, alt: t("about.photoAlts.guests") },
          { src: casaPhotoSources.family, alt: t("about.photoAlts.family") },
        ]}
        eyebrow={t("about.eyebrow")}
        title={t("about.title")}
        paragraph1={t("about.paragraph1")}
        paragraph2={t("about.paragraph2")}
        prevLabel={t("about.prevPhoto")}
        nextLabel={t("about.nextPhoto")}
        cta={
          <Button
            href={lp("/historia")}
            variant="link"
            iconRight={<ArrowRight className="h-4 w-4" />}
          >
            {t("about.cta")}
          </Button>
        }
      />

      {/* VINOS DESTACADOS */}
      <section className="bg-gradient-to-b from-surface-container-low via-surface-container to-surface-dim py-section-gap px-margin-mobile md:px-margin-desktop relative overflow-hidden">
        <div className="max-w-(--container-max) mx-auto relative">
          <Reveal className="text-center mb-16">
            <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-3">
              {t("featured.eyebrow")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              {t("featured.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant max-w-xl mx-auto">
              {t("featured.subtitle")}
            </p>

            {/* Ornamento: filete — racimo (uvas.svg) — filete */}
            <span
              className="mt-7 flex items-center justify-center gap-4 text-primary-container"
              aria-hidden="true"
            >
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-current opacity-50" />
              <span
                className="h-11 w-9 bg-primary-container"
                style={{
                  WebkitMaskImage: "url(/ilustraciones/uvas.svg)",
                  maskImage: "url(/ilustraciones/uvas.svg)",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              />
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-current opacity-50" />
            </span>
          </Reveal>

          <FeaturedWinesCarousel
            wines={featuredCards}
            initialSlug="estacion-francia-carmenere"
            labels={{
              vintageLabel: t("featured.vintageLabel"),
              cardCta: t("featured.cardCta"),
              prevLabel: t("featured.prevLabel"),
              nextLabel: t("featured.nextLabel"),
            }}
          />

          <div className="text-center mt-16">
            <Button
              href={lp("/vinos")}
              variant="link"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {t("featured.allCta")}
            </Button>
          </div>

          {/* Franja de features */}
          <Reveal className="mt-16 md:mt-20">
            <div className="relative overflow-hidden rounded-2xl bg-primary text-on-primary ambient-shadow-lg">
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.5) 0%, transparent 45%)",
                }}
                aria-hidden="true"
              />
              <div className="relative grid grid-cols-2 gap-px bg-on-primary/10 md:grid-cols-4">
                {featuredStrip.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-col gap-3 bg-primary px-6 py-8 md:px-8 md:py-10"
                  >
                    <item.Icon
                      className="h-7 w-7 text-on-primary/80"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <p className="font-body text-label-sm uppercase tracking-[0.15em] text-on-primary">
                      {item.title}
                    </p>
                    <p className="font-body text-sm leading-relaxed text-on-primary/60">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ACTIVIDADES */}
      <section className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div>
              <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-2">
                {t("activities.eyebrow")}
              </span>
              <h2 className="font-display text-headline-h1 text-primary mb-4">
                {t("activities.title")}
              </h2>
              <p className="font-body text-body-md text-on-surface-variant max-w-md">
                {t("activities.subtitle")}
              </p>
            </div>
            <Button
              href={lp("/actividades")}
              variant="link"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {t("activities.allCta")}
            </Button>
          </Reveal>

          <HomeActivitiesShowcase
            locale={locale}
            labels={{
              all: t("activities.tabs.all"),
              tours: t("activities.tabs.tours"),
              experiences: t("activities.tabs.experiences"),
              events: t("activities.tabs.events"),
              catTour: t("activities.cat.tour"),
              catExperience: t("activities.cat.experience"),
              book: t("activities.book"),
              more: t("activities.more"),
            }}
            tours={showcaseTours}
            experiences={showcaseExperiences}
            events={eventsBlock}
            experiencesHref={lp("/actividades#experiencias")}
          />
        </div>
      </section>

      {/* CTA CONTACTO */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto relative bg-primary text-on-primary rounded-xl px-8 md:px-16 py-16 md:py-24 text-center ambient-shadow overflow-hidden">
          {/* Subtle texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
            }}
          />
          <Reveal>
            <h2
              className="font-display mb-6"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                lineHeight: 1.1,
              }}
            >
              {t("cta.title")}
            </h2>
            <p className="font-body text-body-lg text-on-primary/85 max-w-2xl mx-auto mb-10">
              {t("cta.subtitle")}
            </p>
            <Link
              href={lp("/contacto")}
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-md font-body font-semibold text-body-md bg-on-primary text-primary shadow-[0_12px_30px_-8px_rgba(0,0,0,0.4)] hover:shadow-[0_18px_38px_-8px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              {t("cta.button")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
