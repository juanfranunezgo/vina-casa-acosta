import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import HistoriaTimeline from "@/components/HistoriaTimeline";
import StoryChapter from "@/components/StoryChapter";

// El hero B1 va en <picture> y no en next/image, porque next/image no hace art
// direction: elige a qué tamaño bajar una foto, no cuál de dos. El .webp sin
// sufijo es el master a su ancho nativo, se sirve tal cual.
const heroSources = {
  desktop: [
    "/images/historia/vinos-retro-1280.webp 1280w",
    "/images/historia/vinos-retro-1920.webp 1920w",
    "/images/historia/vinos-retro.webp 2400w",
  ].join(", "),
  movil: [828, 1200, 1600]
    .map((w) => `/images/historia/vinos-retro-movil-${w}.webp ${w}w`)
    .join(", "),
};

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

  // Galería (B3): placeholders del repo hasta tener fotos reales. Los alts vienen
  // del array `gallery.items` en messages, en el mismo orden que las imágenes.
  const galleryAlts = t.raw("gallery.items") as string[];
  const gallerySrcs = [
    "/images/historia/origen-tractor.webp",
    "/images/historia/cuadro-museo.webp",
    "/images/home/casa/tractor.webp",
    "/images/historia/galeria-familia.webp",
    "/images/historia/vinos-retro.webp",
    "/images/historia/bicicleta-retro-parras.webp",
  ];
  const galleryImages = gallerySrcs.map((src, i) => ({
    src,
    alt: galleryAlts[i] ?? "",
  }));

  return (
    <>
      {/* HERO (B1) — full-screen cinematográfico sobre la foto retro de los vinos
          Ombú. La imagen es oscura y cálida, así que el texto va claro con un
          degradado sutil (sin velo crema). El navbar se vuelve transparente y
          claro sobre este hero (ver Navbar → hasDarkHero incluye /historia). */}
      <section className="relative min-h-[100svh] w-full flex items-center overflow-hidden">
        {/* Dos encuadres: el 3:2 de siempre y un 9:16 para pantallas verticales
            (ver scripts/optimize-heros.mjs). `sizes` lleva el alto del viewport
            porque con object-cover en vertical la foto se estira hasta cubrir el
            alto, y ese ancho estirado —no el del contenedor— es el que hay que
            descargar. El 58% horizontal solo aplica al encuadre horizontal: el
            recorte vertical ya viene centrado en el tino con las botellas. */}
        <picture className="absolute inset-0">
          <source
            media="(min-aspect-ratio: 3/4)"
            srcSet={heroSources.desktop}
            sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          />
          <source srcSet={heroSources.movil} sizes="(max-aspect-ratio: 9/16) 56.25vh, 100vw" />
          <img
            src="/images/historia/vinos-retro-1920.webp"
            alt={t("hero.imageAlt")}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center apaisado:object-[58%_center] motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          />
        </picture>
        {/* Degradados para legibilidad del texto claro (lateral izq + base). */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop lg:pl-20 pt-24 pb-24">
          <div data-hero-text className="max-w-2xl mx-auto md:mx-0 text-center md:text-left">
            <Reveal delay={120}>
              <p className="font-accent italic font-light text-primary-fixed text-lg md:text-xl tracking-wide mb-4 drop-shadow-md">
                {t("hero.eyebrow")}
              </p>
            </Reveal>
            <Reveal delay={220}>
              <h1
                className="font-display text-on-primary mb-6 drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
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
              <p
                className="font-body text-on-primary/90 max-w-xl mx-auto md:mx-0 drop-shadow-md"
                style={{ fontSize: "clamp(1rem, 1.5vw, 1.25rem)", lineHeight: 1.6 }}
              >
                {t("hero.subtitle")}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* RELATO DE ORIGEN (B2) — 3 capítulos editoriales alternando foto/texto.
          El texto reusa las claves origin + twoCards; cada foto es placeholder
          hasta tener las definitivas (ver StoryChapter). */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-24 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <div className="space-y-16 md:space-y-28">
          <StoryChapter
            tag={t("origin.tag")}
            title={t("origin.title")}
            body={t("origin.body")}
            image={{
              src: "/images/historia/estacion-francia-sueno.webp",
              alt: t("origin.imageAlt"),
            }}
          />
          <StoryChapter
            tag={t("twoCards.card1.tag")}
            title={t("twoCards.card1.title")}
            body={t("twoCards.card1.body")}
            image={{
              src: "/images/historia/relevo-rueda.webp",
              alt: t("twoCards.card1.imageAlt"),
            }}
            reverse
          />
          <StoryChapter
            tag={t("twoCards.card2.tag")}
            title={t("twoCards.card2.title")}
            body={t("twoCards.card2.body")}
            image={{
              src: "/images/historia/artesania-barril.webp",
              alt: t("twoCards.card2.imageAlt"),
            }}
          />
        </div>
      </section>

      {/* GALERÍA (B3) — grilla "detrás de escena". Fotos placeholder por ahora. */}
      <section className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Reveal className="text-center mb-10 md:mb-14">
          <p className="font-accent italic font-light text-wine-accent text-lg md:text-xl tracking-wide mb-2">
            {t("gallery.eyebrow")}
          </p>
          <h2 className="font-display text-headline-h1-mobile md:text-headline-h1 text-primary">
            {t("gallery.title")}
          </h2>
        </Reveal>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 list-none p-0">
          {galleryImages.map((g, i) => (
            <Reveal
              as="li"
              key={g.src}
              delay={i * 60}
              className="group relative aspect-square overflow-hidden rounded-lg ambient-shadow"
            >
              <Image
                src={g.src}
                alt={g.alt}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </Reveal>
          ))}
        </ul>
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
            variant="primary"
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
