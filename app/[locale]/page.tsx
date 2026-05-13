import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Wine, MapPin } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import { getFeaturedWines } from "@/data/wines";

const heroImage =
  "https://images.unsplash.com/photo-1543418219-44e30b057fea?auto=format&fit=crop&w=2400&q=75";

const casaImage =
  "https://images.unsplash.com/photo-1514982506064-7a5f78fb5cf6?auto=format&fit=crop&w=1400&q=75";

const activities = [
  {
    key: "tour",
    image:
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1200&q=70",
    href: "/actividades#tours",
  },
  {
    key: "eventos",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=70",
    href: "/actividades#eventos",
  },
  {
    key: "experiencias",
    image:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=70",
    href: "/actividades#experiencias",
  },
] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tWine = await getTranslations("wines");
  const featured = getFeaturedWines();
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[100svh] w-full flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage}
          alt={t("hero.heroAlt")}
          fill
          priority
          className="object-cover scale-105 motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto pt-20 pb-24">
          <div className="max-w-3xl">
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
                className="font-body text-on-primary/90 mb-10 max-w-2xl drop-shadow-md"
                style={{
                  fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                  lineHeight: 1.6,
                }}
              >
                {t("hero.subtitle")}
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="flex flex-row flex-wrap gap-3 sm:gap-4">
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
      <section className="relative bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
          <Reveal className="md:col-span-5 md:col-start-2 relative z-10 mb-12 md:mb-0">
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden ambient-shadow">
              <Image
                src={casaImage}
                alt={t("about.imageAlt")}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </Reveal>
          <Reveal className="md:col-span-5 md:col-start-8" delay={120}>
            <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-3">
              {t("about.eyebrow")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-6 leading-tight">
              {t("about.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant mb-6 leading-relaxed">
              {t("about.paragraph1")}
            </p>
            <p className="font-body text-body-md text-on-surface-variant mb-8 leading-relaxed">
              {t("about.paragraph2")}
            </p>
            <Button
              href={lp("/historia")}
              variant="link"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {t("about.cta")}
            </Button>
          </Reveal>
        </div>
      </section>

      {/* VINOS DESTACADOS */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop relative overflow-hidden">
        {/* Subtle decorative texture */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #4a0e0e 0%, transparent 40%), radial-gradient(circle at 85% 80%, #4a0e0e 0%, transparent 40%)",
          }}
          aria-hidden="true"
        />
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
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter md:gap-8">
            {featured.map((wine, idx) => (
              <Reveal key={wine.slug} delay={idx * 100}>
                <Link
                  href={lp(`/vinos/${wine.slug}`)}
                  className="group relative block bg-surface rounded-xl overflow-hidden border border-outline-variant/30 hover:border-primary/20 hover:-translate-y-2 hover:shadow-[0_32px_60px_-16px_rgba(74,14,14,0.22)] transition-all duration-500"
                >
                  {/* Decorative corner serifs */}
                  <span
                    className="absolute top-3 left-3 h-3 w-3 border-t border-l border-primary/15 pointer-events-none z-20"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute top-3 right-3 h-3 w-3 border-t border-r border-primary/15 pointer-events-none z-20"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-primary/15 pointer-events-none z-20"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-primary/15 pointer-events-none z-20"
                    aria-hidden="true"
                  />

                  {/* Bottle stage */}
                  <div className="relative aspect-[4/5] bg-gradient-to-b from-surface-container-low via-surface-container to-surface-container-high overflow-hidden">
                    {/* Vintage stamp */}
                    <span className="absolute top-5 right-6 z-10 flex flex-col items-end leading-tight">
                      <span className="font-body text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70">
                        {t("featured.vintageLabel")}
                      </span>
                      <span className="font-display text-lg text-primary tabular-nums">
                        {wine.vintage}
                      </span>
                    </span>

                    {/* Spotlight */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.55) 0%, transparent 55%)",
                      }}
                      aria-hidden="true"
                    />

                    {/* Bottle */}
                    <Image
                      src={wine.image}
                      alt={wine.name}
                      fill
                      quality={95}
                      className="object-contain p-8 group-hover:scale-105 group-hover:-rotate-1 transition-transform duration-700 drop-shadow-[0_24px_28px_rgba(74,14,14,0.22)]"
                      sizes="(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 420px"
                    />

                    {/* Podium reflection */}
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-[50%] bg-primary/15 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-7 bg-surface relative">
                    <p className="font-body text-label-sm text-on-surface-variant uppercase tracking-[0.2em] mb-1">
                      {t("featured.lineLabel", { line: wine.line })}
                    </p>
                    <h3 className="font-display text-2xl text-primary mb-2 leading-tight">
                      {wine.name}
                    </h3>
                    <p className="font-body text-body-md text-on-surface-variant mb-6 line-clamp-2">
                      {tWine(`${wine.slug}.shortDescription`)}
                    </p>

                    <span className="inline-flex items-center justify-between w-full text-primary font-body font-semibold uppercase tracking-[0.15em] text-label-sm pt-4 border-t border-outline-variant/40">
                      {t("featured.cardCta")}
                      <span className="inline-flex items-center gap-1 transition-transform duration-300 group-hover:translate-x-1">
                        <span className="h-px w-4 bg-primary" aria-hidden="true" />
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="text-center mt-16">
            <Button
              href={lp("/vinos")}
              variant="link"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {t("featured.allCta")}
            </Button>
          </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {activities.map((a, idx) => (
              <Reveal key={a.key} delay={idx * 100}>
                <Link
                  href={lp(a.href)}
                  className="group relative block rounded-lg overflow-hidden aspect-[4/5] ambient-shadow"
                >
                  <Image
                    src={a.image}
                    alt={t(`activities.items.${a.key}.name`)}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                    <h3 className="font-display text-2xl md:text-3xl text-on-primary mb-2">
                      {t(`activities.items.${a.key}.name`)}
                    </h3>
                    <p className="font-body text-body-md text-on-primary/90 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300">
                      {t(`activities.items.${a.key}.description`)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-on-primary font-body font-semibold text-label-sm uppercase tracking-wider">
                      {t("activities.exploreCta")}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
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
