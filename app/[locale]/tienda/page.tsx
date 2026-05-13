"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Filter, X } from "lucide-react";
import Reveal from "@/components/Reveal";
import AddToCartButton from "@/components/AddToCartButton";
import { wines, wineLines, varieties, type WineLine, type Variety } from "@/data/wines";

export default function TiendaPage() {
  const t = useTranslations("tienda");
  const tVinos = useTranslations("vinos");
  const tBadges = useTranslations("vinos.badges");
  const locale = useLocale();

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(priceLocale, {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(amount);

  const [selectedLines, setSelectedLines] = useState<Set<WineLine>>(new Set());
  const [selectedVarieties, setSelectedVarieties] = useState<Set<Variety>>(new Set());
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [isFiltering, setIsFiltering] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Brief loading state on filter/sort change for perceived responsiveness
  useEffect(() => {
    setIsFiltering(true);
    const id = setTimeout(() => setIsFiltering(false), 280);
    return () => clearTimeout(id);
  }, [selectedLines, selectedVarieties, sort]);

  const filtered = useMemo(() => {
    let list = wines.filter((w) => {
      if (selectedLines.size > 0 && !selectedLines.has(w.line)) return false;
      if (selectedVarieties.size > 0 && !selectedVarieties.has(w.variety)) return false;
      return true;
    });

    if (sort === "price-asc") list = [...list].sort((a, b) => a.priceCLP - b.priceCLP);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.priceCLP - a.priceCLP);
    if (sort === "featured")
      list = [...list].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

    return list;
  }, [selectedLines, selectedVarieties, sort]);

  const toggleLine = (line: WineLine) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };
  const toggleVariety = (v: Variety) => {
    setSelectedVarieties((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedLines(new Set());
    setSelectedVarieties(new Set());
  };
  const filterCount = selectedLines.size + selectedVarieties.size;

  const filtersPanel = (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl text-primary">{t("filters.title")}</h2>
        {filterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-label-sm font-body uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors"
          >
            {t("filters.clear", { count: filterCount })}
          </button>
        )}
      </div>

      <div className="mb-8">
        <h3 className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-4">
          {t("filters.line")}
        </h3>
        <div className="space-y-2.5">
          {wineLines.map((line) => {
            const checked = selectedLines.has(line);
            return (
              <label
                key={line}
                className={`flex items-center gap-3 cursor-pointer group rounded-md px-2 -mx-2 py-1.5 transition-colors ${
                  checked ? "bg-primary/5" : "hover:bg-surface-container-low"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleLine(line)}
                  className="h-4 w-4 accent-primary rounded-sm"
                />
                <span
                  className={`font-body text-body-md transition-colors ${
                    checked
                      ? "text-primary font-semibold"
                      : "text-on-surface group-hover:text-primary"
                  }`}
                >
                  {line}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-4">
          {t("filters.variety")}
        </h3>
        <div className="space-y-2.5">
          {varieties.map((v) => {
            const checked = selectedVarieties.has(v);
            return (
              <label
                key={v}
                className={`flex items-center gap-3 cursor-pointer group rounded-md px-2 -mx-2 py-1.5 transition-colors ${
                  checked ? "bg-primary/5" : "hover:bg-surface-container-low"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleVariety(v)}
                  className="h-4 w-4 accent-primary rounded-sm"
                />
                <span
                  className={`font-body text-body-md transition-colors ${
                    checked
                      ? "text-primary font-semibold"
                      : "text-on-surface group-hover:text-primary"
                  }`}
                >
                  {v}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <>
      <section className="pt-32 pb-10 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Reveal>
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            {t("hero.eyebrow")}
          </p>
          <h1
            className="font-display text-primary mb-4"
            style={{
              fontSize: "clamp(2.25rem, 5.5vw, 4rem)",
              lineHeight: 1.08,
            }}
          >
            {t("hero.title")}
          </h1>
          <p className="font-body text-body-md text-on-surface-variant max-w-2xl">
            {t("hero.subtitle")}
          </p>
        </Reveal>
      </section>

      <section className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-1/4 shrink-0">
            <div className="sticky top-28 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 ambient-shadow">
              {filtersPanel}
            </div>
          </aside>

          {/* Mobile filter trigger */}
          <div className="md:hidden flex items-center justify-between -mt-2">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-outline-variant bg-surface-container-low font-body text-body-md font-semibold"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              {t("filters.title")}
              {filterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-xs">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile filter sheet */}
          <div
            className={`md:hidden fixed inset-0 z-[65] transition-opacity duration-300 ${
              mobileFiltersOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileFiltersOpen(false)}
              aria-hidden="true"
            />
            <aside
              className={`absolute left-0 right-0 bottom-0 bg-surface rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto transition-transform duration-300 ${
                mobileFiltersOpen ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant/30">
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-on-surface-variant"
                  aria-label={t("filters.close")}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="font-body text-body-md text-on-surface-variant">
                  {filtered.length === 1
                    ? t("countSingular", { count: filtered.length })
                    : t("countPlural", { count: filtered.length })}
                </span>
              </div>
              {filtersPanel}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-8 w-full inline-flex items-center justify-center h-12 rounded-md bg-primary text-on-primary font-body font-semibold shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)]"
              >
                {t("filters.apply")}
              </button>
            </aside>
          </div>

          <div className="w-full md:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <p className="font-body text-body-md text-on-surface-variant tabular-nums">
                {filtered.length === 1
                  ? t("countSingular", { count: filtered.length })
                  : t("countPlural", { count: filtered.length })}
              </p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="bg-surface-container-low border border-outline-variant/40 rounded px-3 py-2 font-body text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label={t("sort.label")}
              >
                <option value="featured">{t("sort.featured")}</option>
                <option value="price-asc">{t("sort.priceAsc")}</option>
                <option value="price-desc">{t("sort.priceDesc")}</option>
              </select>
            </div>

            {isFiltering ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-low rounded-lg overflow-hidden flex flex-col"
                  >
                    <div className="h-[320px] skeleton" />
                    <div className="p-6 space-y-3">
                      <div className="h-3 w-16 skeleton rounded" />
                      <div className="h-5 w-3/4 skeleton rounded" />
                      <div className="h-4 w-2/3 skeleton rounded" />
                      <div className="flex justify-between items-center pt-4 border-t border-outline-variant/30">
                        <div className="h-5 w-20 skeleton rounded" />
                        <div className="h-11 w-11 skeleton rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <p className="font-body text-body-lg text-on-surface-variant">
                  {t("empty.title")}
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary font-body font-semibold underline underline-offset-4"
                >
                  {t("empty.cta")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {filtered.map((wine) => (
                  <article
                    key={wine.slug}
                    className="group bg-surface-container-low rounded-xl overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.12)] transition-all duration-300"
                  >
                    <Link
                      href={`/${locale}/vinos/${wine.slug}`}
                      className="relative h-[320px] w-full bg-gradient-to-br from-surface-container-highest to-surface-container p-8 flex items-center justify-center"
                    >
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
                    </Link>
                    <div className="p-6 flex flex-col flex-grow bg-surface-container-lowest">
                      <span className="font-body text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
                        {wine.line}
                      </span>
                      <Link
                        href={`/${locale}/vinos/${wine.slug}`}
                        className="font-display text-xl text-primary mb-1 hover:underline underline-offset-4"
                      >
                        {wine.name}
                      </Link>
                      <p className="font-body text-body-md text-on-surface-variant mb-4 flex-grow">
                        {wine.variety} · {tVinos(`categories.${wine.category}`)}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                        <span className="font-display text-xl text-primary tabular-nums">
                          {formatPrice(wine.priceCLP)}
                        </span>
                        <AddToCartButton
                          variant="icon"
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
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="mt-10 text-center text-xs text-on-surface-variant/70 font-body">
              {t("disclaimer")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
