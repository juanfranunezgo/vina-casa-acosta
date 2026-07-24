import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import CollectionBand, { type CollectionWine } from "@/components/CollectionBand";
import {
  wines,
  wineLines,
  lineSlugs,
  lineMeta,
  getWinesByLine,
  type Wine,
} from "@/data/wines";
import { buildWinesItemListJsonLd } from "@/lib/wineJsonLd";

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

      {/* C1 — Hero */}
      <section className="pt-32 pb-12 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto text-center">
        <Reveal>
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
      </section>

      {/* C2 — Colecciones por línea (banda editorial: foto de ambiente + tarjetas) */}
      {wineLines.map((line, lineIdx) => {
        const lineWines = getWinesByLine(line);
        if (lineWines.length === 0) return null;

        const meta = lineMeta[line];
        const cards: CollectionWine[] = lineWines.map((wine) => ({
          slug: wine.slug,
          href: `/${locale}/vinos/${wine.slug}`,
          image: wine.image,
          name: wine.name,
          eyebrow: eyebrowOf(wine),
          badge: wine.badge ? t(`badges.${wine.badge}`) : undefined,
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
            altBackground={lineIdx % 2 === 1}
            flip={lineIdx % 2 === 1}
            priorityImage={lineIdx === 0}
          />
        );
      })}
    </>
  );
}
