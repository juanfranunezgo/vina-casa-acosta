import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import HistoriaTimeline from "@/components/HistoriaTimeline";

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
        <Reveal className="text-center mb-14 md:mb-20">
          <p className="font-accent italic font-light text-wine-accent text-lg md:text-xl tracking-wide mb-3">
            {t("hero.eyebrow")}
          </p>
          <h1
            className="font-display text-primary mb-5 md:mb-6"
            style={{
              fontSize: "clamp(2.25rem, 7vw, 5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {t("hero.title")}
          </h1>
          <p
            className="font-body text-on-surface-variant max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1rem, 1.5vw, 1.25rem)", lineHeight: 1.6 }}
          >
            {t("hero.subtitle")}
          </p>
        </Reveal>

        {/* En mobile se apila (foto arriba, texto en card abajo); en desktop la
            foto es fondo full-bleed y el texto flota en un panel glass. */}
        <Reveal className="mb-gutter overflow-hidden rounded-xl ambient-shadow md:relative md:flex md:items-end md:min-h-[540px]">
          <div className="relative aspect-[16/10] md:absolute md:inset-0 md:aspect-auto">
            <Image
              src="/images/historia/estacion-francia-sueno.webp"
              alt={t("origin.imageAlt")}
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 hidden md:block bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          </div>
          <div className="relative z-10 p-6 sm:p-8 md:p-12 md:m-5 md:max-w-2xl md:rounded-xl bg-surface-container-low md:bg-white/75 md:backdrop-blur-xl md:border md:border-white/20 md:ambient-shadow">
            <span className="font-body text-label-sm text-wine-accent uppercase tracking-widest block mb-2">
              {t("origin.tag")}
            </span>
            <h2 className="font-display text-headline-h1-mobile md:text-headline-h1 text-primary mb-3 md:mb-4 leading-tight">
              {t("origin.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface leading-relaxed">
              {t("origin.body")}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mt-12">
          <Reveal className="bg-surface-container-low rounded-xl p-8 md:p-12 border border-outline-variant/30">
            <span className="font-body text-label-sm text-wine-accent uppercase tracking-widest block mb-2">
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
            <span className="font-body text-label-sm text-wine-accent uppercase tracking-widest block mb-2">
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

      {/* TIMELINE (B4) */}
      <HistoriaTimeline />

      {/* CTA → STAFF (B5) */}
      <section className="pb-section-gap px-margin-mobile md:px-margin-desktop">
        <Reveal className="max-w-(--container-max) mx-auto text-center border-t border-outline-variant/30 pt-16 md:pt-20">
          <p className="font-accent italic font-light text-wine-accent text-lg md:text-xl mb-6">
            {t("staffCta.text")}
          </p>
          <Button
            href={`/${locale}/staff`}
            variant="outline"
            size="lg"
            iconRight={<ArrowRight className="h-4 w-4" />}
          >
            {t("staffCta.button")}
          </Button>
        </Reveal>
      </section>
    </>
  );
}
