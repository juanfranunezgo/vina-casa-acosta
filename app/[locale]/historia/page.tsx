import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";

const milestoneKeys = ["m1998", "m2000", "m2003", "m2012", "today"] as const;
const milestoneSides = ["left", "right", "left", "right", "left"] as const;

const familyMembers = [
  {
    key: "damian",
    image:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=800&q=70",
  },
  {
    key: "andrea",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=70",
  },
  {
    key: "enrique",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=70",
  },
  {
    key: "alfonso",
    image:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=70",
  },
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/historia">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.historia" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HistoriaPage({
  params,
}: PageProps<"/[locale]/historia">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("historia");

  return (
    <>
      <section className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Reveal className="text-center mb-16">
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            {t("hero.eyebrow")}
          </p>
          <h1
            className="font-display text-primary mb-6"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
            }}
          >
            {t("hero.title")}
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </Reveal>

        <Reveal className="relative rounded-xl overflow-hidden min-h-[500px] flex items-end p-8 mb-gutter">
          <Image
            src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=2000&q=75"
            alt={t("origin.imageAlt")}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="relative z-10 glass-panel p-8 md:p-12 rounded-xl max-w-3xl ambient-shadow">
            <span className="font-body text-label-sm text-primary uppercase tracking-widest block mb-2">
              {t("origin.tag")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-4">
              {t("origin.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface leading-relaxed">
              {t("origin.body")}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mt-12">
          <Reveal className="bg-surface-container-low rounded-xl p-8 md:p-12 border border-outline-variant/30">
            <span className="font-body text-label-sm text-primary uppercase tracking-widest block mb-2">
              {t("twoCards.card1.tag")}
            </span>
            <h3 className="font-display text-headline-h2 text-primary mb-4">
              {t("twoCards.card1.title")}
            </h3>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
              {t("twoCards.card1.body")}
            </p>
          </Reveal>
          <Reveal className="bg-surface-container-low rounded-xl p-8 md:p-12 border border-outline-variant/30" delay={120}>
            <span className="font-body text-label-sm text-primary uppercase tracking-widest block mb-2">
              {t("twoCards.card2.tag")}
            </span>
            <h3 className="font-display text-headline-h2 text-primary mb-4">
              {t("twoCards.card2.title")}
            </h3>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
              {t("twoCards.card2.body")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="font-display text-headline-h1 text-primary">{t("timeline.title")}</h2>
          </Reveal>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-outline-variant md:-translate-x-1/2" />

            {milestoneKeys.map((key, idx) => {
              const side = milestoneSides[idx];
              return (
                <Reveal
                  key={key}
                  delay={idx * 80}
                  className={`relative flex items-center mb-12 ${
                    side === "right" ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`hidden md:block w-1/2 ${
                      side === "left" ? "pr-12 text-right" : "pl-12 text-left"
                    }`}
                  >
                    <h3 className="font-display text-headline-h2 text-primary">
                      {t(`timeline.milestones.${key}.year`)}
                    </h3>
                  </div>
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary md:-translate-x-1/2 ring-4 ring-surface-container-low shadow-[0_0_0_8px_rgba(42,0,2,0.06)]" />
                  <div
                    className={`ml-12 md:ml-0 md:w-1/2 ${
                      side === "left" ? "md:pl-12" : "md:pr-12 md:text-right"
                    }`}
                  >
                    <div className="md:hidden mb-2">
                      <h3 className="font-display text-2xl text-primary">
                        {t(`timeline.milestones.${key}.year`)}
                      </h3>
                    </div>
                    <div className="bg-surface p-6 rounded-xl border border-outline-variant/20 ambient-shadow inline-block w-full">
                      <span className="font-body text-label-sm text-primary uppercase tracking-wider">
                        {t(`timeline.milestones.${key}.title`)}
                      </span>
                      <p className="font-body text-body-md text-on-surface mt-2">
                        {t(`timeline.milestones.${key}.description`)}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAMILIA */}
      <section className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Reveal className="mb-12">
          <h2 className="font-display text-headline-h1 text-primary">{t("family.title")}</h2>
          <p className="font-body text-body-md text-on-surface-variant mt-2">
            {t("family.subtitle")}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {familyMembers.map((person, idx) => (
            <Reveal key={person.key} delay={idx * 80}>
              <article className="bg-surface rounded-xl border border-outline-variant/20 overflow-hidden group h-full flex flex-col">
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-container-high">
                  <Image
                    src={person.image}
                    alt={t(`family.members.${person.key}.name`)}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-display text-2xl text-primary">
                    {t(`family.members.${person.key}.name`)}
                  </h3>
                  <span className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mt-1">
                    {t(`family.members.${person.key}.role`)}
                  </span>
                  <p className="font-body text-body-md text-on-surface mt-3 flex-grow">
                    {t(`family.members.${person.key}.bio`)}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-xs text-on-surface-variant/70 text-center">
          {t("family.portraitDisclaimer")}
        </p>
      </section>
    </>
  );
}
