import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Wine, MapPin } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import AboutSection from "@/components/AboutSection";
import HomeActivitiesShowcase from "@/components/HomeActivitiesShowcase";
import FeaturedLinesCarousel from "@/components/FeaturedLinesCarousel";
import { featuredLineOrder, lineSlugs } from "@/data/wines";
import { getCatalog, winesByLine } from "@/lib/afeleia/catalog";
import {
  tours as tourData,
  activityPath,
  categoryIndexHref,
} from "@/data/activities";
import { alternatesFor } from "@/lib/alternates";
import JsonLd from "@/components/JsonLd";
import { buildHomeJsonLd } from "@/lib/siteJsonLd";

// Tarjetas de experiencia del mosaico A4. Viven acá y no en `data/activities.ts`
// porque no son actividades del catálogo: son puertas de entrada. Las reemplaza
// `CategoryChooserCard` en el plan 3 —ver el spec de subpáginas de actividades—,
// donde pasan a desplegar un menú con las fichas de su categoría.
const experienceData = [
  { slug: "vendimia-2026", image: "/images/actividades/vendimia-2026.jpg" },
  { slug: "talleres", image: "/images/actividades/talleres.jpg" },
  { slug: "tren-efe", image: "/images/actividades/tren-efe.jpg" },
];

// El título y la descripción de la home son los del layout; acá solo se declara
// el canonical, que el layout dejó de proveer a propósito.
export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternatesFor(locale) };
}

// El carrusel de líneas destacadas se alimenta del catálogo de Afeleia (ISR 60s).
// Tiene que ser un literal: Next lee la config de segmento estáticamente.
export const revalidate = 60;

// El hero va en <picture> con dos encuadres (ver scripts/optimize-home-hero.mjs):
// el 3:2 de siempre para desktop y un 9:16 recortado para pantallas verticales.
// No usa next/image porque no hace art direction — necesitamos que el navegador
// elija *qué* foto bajar según el ancho, no solo a qué tamaño.
const heroSources = {
  desktop: [1280, 1920, 2560].map((w) => `/images/home/hero-${w}.webp ${w}w`).join(", "),
  movil: [828, 1200, 1600].map((w) => `/images/home/hero-movil-${w}.webp ${w}w`).join(", "),
};

const casaPhotoSources = {
  teaching: "/images/home/casa/teaching.webp",
  origins: "/images/home/casa/origins.jpg",
  tractor: "/images/home/casa/tractor.webp",
  family: "/images/home/casa/family.webp",
} as const;

const ctaImage = "/images/home/cta-parras.jpg";

const eventsImage = "/images/actividades/eventos.jpg";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tActivity = await getTranslations("activities.items");
  const tExp = await getTranslations("experiences");
  const tActividades = await getTranslations("actividades");
  const tMeta = await getTranslations("metadata");
  const lp = (path: string) => `/${locale}${path}`;

  const jsonLd = buildHomeJsonLd(locale, {
    name: tMeta("siteName"),
    description: tMeta("description"),
  });

  const showcaseTours = tourData.map((tr) => ({
    slug: tr.slug,
    name: tActivity(`${tr.slug}.name`),
    href: lp(activityPath(tr)),
    duration: tActivity(`${tr.slug}.duration`),
    image: tr.image,
    premium: tr.premium,
  }));

  const showcaseExperiences = experienceData.map((ex) => ({
    slug: ex.slug,
    name: tExp(`${ex.slug}.name`),
    image: ex.image,
  }));

  const catalog = await getCatalog();
  const featuredLineCards = featuredLineOrder.map((line) => {
    const slug = lineSlugs[line];
    const base = `featuredLines.lines.${slug}`;
    const lineWines = winesByLine(catalog, line);
    const details = [
      { label: t("featuredLines.detailLabels.estilo"), value: t(`${base}.estilo`) },
      { label: t("featuredLines.detailLabels.crianza"), value: t(`${base}.crianza`) },
      { label: t("featuredLines.detailLabels.premio"), value: t(`${base}.premio`) },
    ].filter((detail) => detail.value.trim() !== "");

    return {
      slug,
      name: line,
      description: t(`${base}.description`),
      chips: [
        t("featuredLines.wineCount", { count: lineWines.length }),
        t(`${base}.category`),
      ],
      details,
      collectionHref: lp(`/vinos#${slug}`),
      wines: lineWines.map((wine) => ({
        name: wine.name,
        label: wine.name.replace(`${line} `, ""),
        image: wine.image,
        href: lp(`/vinos/${wine.slug}`),
      })),
    };
  });

  const eventsBlock = {
    title: tActividades("events.title"),
    description: tActividades("events.body"),
    cta: t("activities.eventsCta"),
    image: eventsImage,
    // Cotizar un evento es una consulta directa: va al formulario de contacto,
    // no a la sección de eventos de /actividades.
    href: lp("/contacto"),
  };

  return (
    <>
      {/* Identidad de la viña (dirección, horario, coordenadas, perfiles) para
          buscadores y motores de IA. Ver lib/siteJsonLd.ts. */}
      <JsonLd data={jsonLd} />

      {/* HERO */}
      <section className="relative min-h-[100svh] w-full flex items-center justify-center overflow-hidden">
        {/* `sizes` lleva el alto del viewport y no solo el ancho: con object-cover
            en pantalla vertical la foto se estira hasta cubrir el alto, y ese
            ancho estirado —no el del contenedor— es el que hay que descargar.
            El umbral de cada media es la proporción de su propio encuadre. */}
        <picture className="absolute inset-0">
          <source
            media="(min-aspect-ratio: 3/4)"
            srcSet={heroSources.desktop}
            sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          />
          <source srcSet={heroSources.movil} sizes="(max-aspect-ratio: 9/16) 56.25vh, 100vw" />
          <img
            src="/images/home/hero-1920.webp"
            alt={t("hero.heroAlt")}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-[30%_center] apaisado:object-[center_72%] motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />

        <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto pt-20 pb-24">
          {/* data-hero-text: el Navbar lo usa para saber cuándo el texto del hero
              pasa por detrás y encender su velo (ver components/Navbar.tsx). */}
          <div data-hero-text className="max-w-3xl mx-auto md:mx-0 text-center md:text-left">
            <Reveal delay={120}>
              <h1
                className="font-display text-on-primary mb-4 md:mb-6 drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                style={{
                  fontSize: "clamp(2.25rem, 7vw, 5rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                {t("hero.title")}
              </h1>
            </Reveal>

            <Reveal delay={220}>
              <p
                className="font-body text-on-primary/90 mb-8 md:mb-10 max-w-2xl mx-auto md:mx-0 drop-shadow-md"
                style={{
                  fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                  lineHeight: 1.6,
                }}
              >
                {t("hero.subtitle")}
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="flex flex-row flex-nowrap gap-2.5 sm:gap-4 justify-center md:justify-start">
                <Button
                  href={lp("/tienda")}
                  variant="primary"
                  size="md"
                  iconLeft={<Wine className="h-4 w-4" />}
                  className="flex-1 md:flex-none min-w-0 text-sm sm:text-body-md !px-3 sm:!px-7 sm:h-12"
                >
                  {t("hero.ctaShop")}
                </Button>
                <Button
                  href={lp("/actividades")}
                  variant="glass"
                  size="md"
                  iconLeft={<MapPin className="h-4 w-4" />}
                  className="flex-1 md:flex-none min-w-0 text-sm sm:text-body-md !px-3 sm:!px-7 sm:h-12"
                >
                  {t("hero.ctaVisit")}
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CASA ACOSTA */}
      <AboutSection
        photos={[
          { src: casaPhotoSources.teaching, alt: t("about.photoAlts.teaching") },
          { src: casaPhotoSources.origins, alt: t("about.photoAlts.origins") },
          { src: casaPhotoSources.tractor, alt: t("about.photoAlts.tractor") },
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

      {/* LÍNEAS DESTACADAS (A3) */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-12 md:mb-16">
            <span
              className="font-accent italic font-light text-primary block mb-2"
              style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)" }}
            >
              {t("featuredLines.eyebrow")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary">
              {t("featuredLines.title")}
            </h2>
          </Reveal>

          <FeaturedLinesCarousel
            lines={featuredLineCards}
            labels={{
              prev: t("featuredLines.prevLabel"),
              next: t("featuredLines.nextLabel"),
              viewCollection: t("featuredLines.viewCollection"),
            }}
          />

          <div className="text-center mt-12 md:mt-16">
            <Button
              href={lp("/vinos")}
              variant="link"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {t("featuredLines.allCta")}
            </Button>
          </div>
        </div>
      </section>

      {/* ACTIVIDADES */}
      <section className="bg-surface py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto">
          <Reveal className="text-center mb-12 md:mb-16">
            <span
              className="font-accent italic font-light text-primary block mb-2"
              style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)" }}
            >
              {t("activities.eyebrow")}
            </span>
            <h2 className="font-display text-headline-h1 text-primary">
              {t("activities.title")}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant mt-3 max-w-xl mx-auto">
              {t("activities.subtitle")}
            </p>
          </Reveal>

          <HomeActivitiesShowcase            labels={{
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
            // Sin fragmento: la sección #experiencias del índice muestra tres
            // tarjetas-puerta y ninguna de las ocho experiencias del catálogo.
            // La regla vive en categoryIndexHref — ver data/activities.ts.
            experiencesHref={categoryIndexHref(locale, "experiencias")}
          />

          <div className="text-center mt-12 md:mt-16">
            <Button
              href={lp("/actividades")}
              variant="link"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {t("activities.allCta")}
            </Button>
          </div>
        </div>
      </section>

      {/* CTA CONTACTO */}
      <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
        <div className="max-w-(--container-max) mx-auto relative bg-primary text-on-primary rounded-xl px-8 md:px-16 py-16 md:py-24 text-center ambient-shadow overflow-hidden">
          {/* Foto de fondo (parras del viñedo) */}
          <Image
            src={ctaImage}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />
          {/* Velo vino-tinto para legibilidad del texto */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/55 to-primary/70" />
          {/* Subtle texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
            }}
          />
          <Reveal className="relative z-10">
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
