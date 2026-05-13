import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { wines, wineLines } from "@/data/wines";

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
  const tBadges = await getTranslations("vinos.badges");

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

      {wineLines.map((line, lineIdx) => {
        const lineWines = wines.filter((w) => w.line === line);
        if (lineWines.length === 0) return null;

        return (
          <section
            key={line}
            className={`px-margin-mobile md:px-margin-desktop py-16 ${
              lineIdx % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
            }`}
          >
            <div className="max-w-(--container-max) mx-auto">
              <Reveal className="mb-10 flex items-end justify-between gap-6 flex-wrap">
                <div>
                  <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-2">
                    {t("lineLabel")}
                  </span>
                  <h2 className="font-display text-headline-h1 text-primary">{line}</h2>
                </div>
                <p className="font-body text-body-md text-on-surface-variant max-w-lg">
                  {t(`lineDescriptions.${line}`)}
                </p>
              </Reveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {lineWines.map((wine, idx) => (
                  <Reveal key={wine.slug} delay={idx * 80}>
                    <Link
                      href={`/${locale}/vinos/${wine.slug}`}
                      className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.12)] transition-all duration-300 block h-full"
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-surface-container-low to-surface-container p-8 flex items-center justify-center">
                        <Image
                          src={wine.image}
                          alt={wine.name}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-700 drop-shadow-[0_12px_18px_rgba(74,14,14,0.18)]"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        {wine.badge && (
                          <span className="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 text-label-sm uppercase tracking-wider rounded font-semibold">
                            {tBadges(wine.badge)}
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <span className="font-body text-label-sm text-on-surface-variant uppercase tracking-widest block mb-2">
                          {wine.variety} · {t(`categories.${wine.category}`)}
                        </span>
                        <h3 className="font-display text-2xl text-primary mb-3">
                          {wine.name}
                        </h3>
                        <p className="font-body text-body-md text-on-surface-variant line-clamp-2">
                          {tWine(`${wine.slug}.shortDescription`)}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
