import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CollectionBand, { type CollectionWine } from "@/components/CollectionBand";
import {
  wines,
  lineSlugs,
  lineMeta,
  getWinesByLine,
  type Wine,
  type WineLine,
} from "@/data/wines";
import { buildWinesItemListJsonLd } from "@/lib/wineJsonLd";

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

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD del catálogo para que los buscadores entiendan la lista de productos.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* C1 — Hero cinematográfico, en el lenguaje visual de Historia. */}
      <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
        <Image
          src="/images/vinos/hero-corchos.webp"
          alt={t("hero.imageAlt")}
          fill
          priority
          quality={84}
          className="object-cover object-center motion-safe:animate-[heroZoom_20s_ease-out_forwards]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        <div className="relative z-10 w-full px-margin-mobile pb-24 pt-24 md:px-margin-desktop lg:pl-20">
          <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
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
            heroImage={meta.heroImage}
            heroAlt={t("collectionPhotoAlt", { line })}
            wines={cards}
            moreLabel={t("showMore")}
            lessLabel={t("showLess")}
            altBackground={lineIdx % 2 === 1}
            flip={lineIdx % 2 === 1}
            priorityImage={lineIdx === 0}
          />
        );
      })}
    </>
  );
}
