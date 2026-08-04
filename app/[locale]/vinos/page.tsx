import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import CollectionBand, { type CollectionWine } from "@/components/CollectionBand";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import {
  wines,
  lineSlugs,
  lineMeta,
  getWinesByLine,
  type Wine,
  type WineLine,
} from "@/data/wines";
import { buildWinesItemListJsonLd } from "@/lib/wineJsonLd";
import { alternatesFor } from "@/lib/alternates";
import { jsonLdHtml } from "@/lib/jsonLd";
import { buildVinosJsonLd } from "@/lib/siteJsonLd";

// El hero C1 va en <picture> y no en next/image, porque next/image no hace art
// direction: elige a qué tamaño bajar una foto, no cuál de dos. El .webp sin
// sufijo es el master a su ancho nativo, se sirve tal cual.
const heroSources = {
  desktop: [
    "/images/vinos/hero-corchos-1280.webp 1280w",
    "/images/vinos/hero-corchos-1920.webp 1920w",
    "/images/vinos/hero-corchos.webp 2560w",
  ].join(", "),
  movil: [828, 1200, 1600]
    .map((w) => `/images/vinos/hero-corchos-movil-${w}.webp ${w}w`)
    .join(", "),
};

const collectionLines = [
  "Estación Francia",
  "Ombú",
  "Lajau",
  "Berá",
  "Guidaí",
  "Yaráy Guá",
] satisfies WineLine[];

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vinos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.vinos" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor(locale, "/vinos"),
  };
}

export default async function VinosPage({ params }: PageProps<"/[locale]/vinos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vinos");
  const tWine = await getTranslations("wines");

  const eyebrowOf = (wine: Wine) =>
    `${t(`types.${wine.type}`)} · ${t(`varieties.${wine.variety}`)}`;
  const cardEyebrowOf = (wine: Wine) => {
    if (wine.line === "Ombú") return t("categories.Reserva");
    if (wine.line === "Lajau") {
      return `${t("categories.Reserva")} · ${t("varieties.Ensamblaje")}`;
    }
    if (wine.line === "Estación Francia") {
      return `${t("categories.Gran Reserva")} · ${t(`varieties.${wine.variety}`)}`;
    }
    if (wine.category) {
      return `${t(`categories.${wine.category}`)} · ${t(`varieties.${wine.variety}`)}`;
    }
    return eyebrowOf(wine);
  };

  const jsonLd = buildWinesItemListJsonLd(wines, locale, {
    shortDescription: (slug) => tWine(`${slug}.shortDescription`),
    category: eyebrowOf,
  });

  const tMeta = await getTranslations("metadata.vinos");
  const pageJsonLd = buildVinosJsonLd(locale, {
    name: tMeta("title"),
    description: tMeta("description"),
  });

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD del catálogo para que los buscadores entiendan la lista de productos.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* CollectionPage + la entidad de la viña. Va en su propio bloque para no
          tocar wineJsonLd.ts mientras m3/catalogo-afeleia lo reescribe; dos
          bloques ld+json en una página son válidos y Google los une por @id. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd) }}
      />

      {/* C1 — Hero cinematográfico, en el lenguaje visual de Historia. */}
      <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
        {/* Dos encuadres: el 3:2 de siempre y un 9:16 para pantallas verticales
            (ver scripts/optimize-heros.mjs). `sizes` lleva el alto del viewport
            porque con object-cover en vertical la foto se estira hasta cubrir el
            alto, y ese ancho estirado —no el del contenedor— es el que hay que
            descargar. El umbral de cada media es la proporción de su encuadre. */}
        <picture className="absolute inset-0">
          <source
            media="(min-aspect-ratio: 3/4)"
            srcSet={heroSources.desktop}
            sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          />
          <source srcSet={heroSources.movil} sizes="(max-aspect-ratio: 9/16) 56.25vh, 100vw" />
          <img
            src="/images/vinos/hero-corchos-1920.webp"
            alt={t("hero.imageAlt")}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        <div className="relative z-10 w-full px-margin-mobile pb-24 pt-24 md:px-margin-desktop lg:pl-20">
          <div data-hero-text className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
            <p className="mb-4 font-accent text-lg font-light italic tracking-wide text-primary-fixed drop-shadow-md md:text-xl">
              {t("hero.eyebrow")}
            </p>
            <h1
              className="mb-6 font-display text-on-primary drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
              style={{
                fontSize: "clamp(2.25rem, 6.4vw, 4.5rem)",
                lineHeight: 1.14,
                letterSpacing: "-0.015em",
              }}
            >
              {t("hero.title")}
            </h1>
            <p
              className="mx-auto max-w-xl font-body text-on-primary/90 drop-shadow-md md:mx-0"
              style={{ fontSize: "clamp(1rem, 1.5vw, 1.25rem)", lineHeight: 1.6 }}
            >
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* C2 — Colecciones por línea (banda editorial: foto de ambiente + tarjetas) */}
      {collectionLines.map((line, lineIdx) => {
        const lineWines = getWinesByLine(line);
        if (lineWines.length === 0) return null;

        const meta = lineMeta[line];
        const cards: CollectionWine[] = lineWines.map((wine) => ({
          slug: wine.slug,
          href: `/${locale}/vinos/${wine.slug}`,
          image: wine.image,
          name: wine.name,
          eyebrow: cardEyebrowOf(wine),
        }));

        return (
          <CollectionBand
            key={line}
            id={lineSlugs[line]}
            kicker={`${t("lineLabel")} · ${t(`${meta.tier.group}.${meta.tier.key}`)}`}
            name={line}
            description={t(`lineDescriptions.${line}`)}
            photos={meta.photos}
            photosAlt={t("collectionPhotoAlt", { line })}
            photoPrevLabel={t("photoPrev", { line })}
            photoNextLabel={t("photoNext", { line })}
            photoGoToLabels={meta.photos.map((_, idx) =>
              t("photoGoTo", { index: idx + 1, total: meta.photos.length, line }),
            )}
            wines={cards}
            altBackground={lineIdx % 2 === 1}
            flip={lineIdx % 2 === 1}
            priorityImage={lineIdx === 0}
          />
        );
      })}

      {/* C3 — Cierre: puente del catálogo a la tienda. */}
      <section className="bg-surface">
        <div className="mx-auto max-w-(--container-max) px-margin-mobile py-16 text-center md:px-margin-desktop lg:py-20">
          <Reveal>
            <p className="mb-2 font-accent text-xl font-light italic text-primary md:text-2xl">
              {t("storeCta.eyebrow")}
            </p>
            <h2 className="font-display text-headline-h1-mobile text-primary md:text-headline-h1">
              {t("storeCta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-body text-body-md text-on-surface-variant">
              {t("storeCta.subtitle")}
            </p>
            <div className="mt-8">
              <Button
                href={`/${locale}/tienda`}
                size="lg"
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                {t("storeCta.button")}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
