import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, UtensilsCrossed } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import ProductPurchase from "@/components/ProductPurchase";
import TastingProfile from "@/components/TastingProfile";
import { wines, getWineBySlug } from "@/data/wines";
import { routing } from "@/i18n/routing";

export async function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    wines.map((w) => ({ locale, slug: w.slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vinos/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const wine = getWineBySlug(slug);
  if (!wine) return { title: "—" };
  const tWine = await getTranslations({ locale, namespace: "wines" });
  return {
    title: wine.name,
    description: tWine(`${slug}.shortDescription`),
  };
}

export default async function WinePage({
  params,
}: PageProps<"/[locale]/vinos/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const wine = getWineBySlug(slug);
  if (!wine) notFound();

  const t = await getTranslations("wineDetail");
  const tVinos = await getTranslations("vinos");
  const tWine = await getTranslations("wines");
  const tBadges = await getTranslations("vinos.badges");

  const tastingNotes = tWine.raw(`${slug}.tastingNotes`) as string[];
  const pairings = tWine.raw(`${slug}.pairings`) as string[];

  const related = wines
    .filter((w) => w.line === wine.line && w.slug !== wine.slug)
    .slice(0, 3);

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const priceFormatted = new Intl.NumberFormat(priceLocale, {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(wine.priceCLP);

  return (
    <>
      <section className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Button
          href={`/${locale}/vinos`}
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft className="h-4 w-4" />}
          className="-ml-2 mb-10 normal-case tracking-normal"
        >
          {t("backToCatalog")}
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <Reveal>
            <div className="relative aspect-[3/4] bg-gradient-to-br from-surface-container-low to-surface-container rounded-xl overflow-hidden">
              {/* Subtle radial spotlight */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)",
                }}
              />
              <Image
                src={wine.image}
                alt={wine.name}
                fill
                className="object-contain p-12 drop-shadow-[0_24px_32px_rgba(74,14,14,0.18)]"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {wine.badge && (
                <span className="absolute top-6 left-6 bg-primary text-on-primary px-3 py-1.5 text-label-sm uppercase tracking-wider rounded font-semibold">
                  {tBadges(wine.badge)}
                </span>
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className="md:pt-8">
            <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-3">
              {tVinos("lineLabel")} {wine.line} · {tVinos(`categories.${wine.category}`)}
            </p>
            <h1
              className="font-display text-primary mb-3 leading-tight"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              }}
            >
              {wine.name}
            </h1>
            <p className="font-body text-body-lg text-on-surface-variant mb-6">
              {wine.variety} · {t("vintageLabel", { year: wine.vintage })}
            </p>

            <p className="font-body text-body-md text-on-surface leading-relaxed mb-8">
              {tWine(`${slug}.description`)}
            </p>

            <div className="space-y-8 mb-10">
              <div>
                <h3 className="font-body text-label-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <span className="h-px w-6 bg-primary/40" />
                  {t("tastingNotes")}
                </h3>
                <TastingProfile notes={tastingNotes} />
              </div>

              <div>
                <h3 className="font-body text-label-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <span className="h-px w-6 bg-primary/40" />
                  {t("pairing")}
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-body text-body-md text-on-surface-variant">
                  {pairings.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-3 bg-surface-container-low rounded-md px-3 py-2.5 border border-outline-variant/20"
                    >
                      <UtensilsCrossed className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-outline-variant/40 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex flex-col">
                <span className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                  {t("currency")}
                </span>
                <span className="font-display text-3xl text-primary tabular-nums">
                  {priceFormatted}
                </span>
              </div>
              <ProductPurchase
                item={{
                  slug: wine.slug,
                  name: wine.name,
                  line: wine.line,
                  variety: wine.variety,
                  image: wine.image,
                  priceCLP: wine.priceCLP,
                }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
          <div className="max-w-(--container-max) mx-auto">
            <Reveal className="mb-12 flex items-end justify-between gap-4 flex-wrap">
              <h2 className="font-display text-headline-h2 text-primary">
                {t("alsoFromLine", { line: wine.line })}
              </h2>
              <Button
                href={`/${locale}/vinos`}
                variant="link"
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                {tVinos("hero.title")}
              </Button>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {related.map((r, idx) => (
                <Reveal key={r.slug} delay={idx * 80}>
                  <Link
                    href={`/${locale}/vinos/${r.slug}`}
                    className="group block bg-surface rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.12)] transition-all duration-300"
                  >
                    <div className="aspect-[3/4] relative bg-gradient-to-br from-surface-container-low to-surface-container">
                      <Image
                        src={r.image}
                        alt={r.name}
                        fill
                        className="object-contain p-8 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_12px_18px_rgba(74,14,14,0.15)]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-xl text-primary mb-1">{r.name}</h3>
                      <p className="font-body text-body-md text-on-surface-variant">
                        {r.variety}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
