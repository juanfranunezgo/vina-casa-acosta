"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import Reveal from "@/components/Reveal";
import AddToCartButton from "@/components/AddToCartButton";
import { wines, wineLines, varieties, formatCLP, type WineLine, type Variety } from "@/data/wines";

export default function TiendaPage() {
  const [selectedLines, setSelectedLines] = useState<Set<WineLine>>(new Set());
  const [selectedVarieties, setSelectedVarieties] = useState<Set<Variety>>(new Set());
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc">("featured");

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
      next.has(line) ? next.delete(line) : next.add(line);
      return next;
    });
  };
  const toggleVariety = (v: Variety) => {
    setSelectedVarieties((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedLines(new Set());
    setSelectedVarieties(new Set());
  };
  const filterCount = selectedLines.size + selectedVarieties.size;

  return (
    <>
      <section className="pt-32 pb-10 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <Reveal>
          <p className="font-body text-label-sm uppercase tracking-[0.3em] text-outline mb-4">
            Tienda online
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">
            Colección Casa Acosta
          </h1>
          <p className="font-body text-body-md text-on-surface-variant max-w-2xl">
            Filtra por línea y variedad. Selecciona tus vinos y coordinamos el
            despacho contigo.
          </p>
        </Reveal>
      </section>

      <section className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto">
        <div className="flex flex-col md:flex-row gap-10">
          <aside className="w-full md:w-1/4 shrink-0">
            <div className="md:sticky md:top-28 bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/30 ambient-shadow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-primary">Filtros</h2>
                {filterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-label-sm font-body uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Limpiar ({filterCount})
                  </button>
                )}
              </div>

              <div className="mb-8">
                <h3 className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-4">
                  Línea
                </h3>
                <div className="space-y-3">
                  {wineLines.map((line) => (
                    <label key={line} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedLines.has(line)}
                        onChange={() => toggleLine(line)}
                        className="h-4 w-4 accent-primary rounded-sm"
                      />
                      <span className="font-body text-body-md text-on-surface group-hover:text-primary transition-colors">
                        {line}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-4">
                  Variedad
                </h3>
                <div className="space-y-3">
                  {varieties.map((v) => (
                    <label key={v} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedVarieties.has(v)}
                        onChange={() => toggleVariety(v)}
                        className="h-4 w-4 accent-primary rounded-sm"
                      />
                      <span className="font-body text-body-md text-on-surface group-hover:text-primary transition-colors">
                        {v}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="w-full md:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <p className="font-body text-body-md text-on-surface-variant">
                {filtered.length} {filtered.length === 1 ? "vino" : "vinos"}
              </p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="bg-surface-container-low border border-outline-variant/40 rounded px-3 py-2 font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
                aria-label="Ordenar"
              >
                <option value="featured">Destacados primero</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-surface-container-low rounded-lg">
                <p className="font-body text-body-lg text-on-surface-variant">
                  Ningún vino coincide con los filtros.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary font-body font-semibold underline underline-offset-4"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {filtered.map((wine) => (
                  <article
                    key={wine.slug}
                    className="group bg-surface-container-low rounded-lg overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300"
                  >
                    <Link
                      href={`/vinos/${wine.slug}`}
                      className="relative h-[320px] w-full bg-surface-container-highest p-8 flex items-center justify-center"
                    >
                      <Image
                        src={wine.image}
                        alt={`Botella ${wine.name}`}
                        fill
                        className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      {wine.badge && (
                        <span className="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 text-label-sm uppercase tracking-wider rounded">
                          {wine.badge}
                        </span>
                      )}
                    </Link>
                    <div className="p-6 flex flex-col flex-grow bg-surface-container-lowest">
                      <span className="font-body text-label-sm text-on-surface-variant uppercase tracking-widest mb-2">
                        {wine.line}
                      </span>
                      <Link
                        href={`/vinos/${wine.slug}`}
                        className="font-display text-xl text-primary mb-1 hover:underline underline-offset-4"
                      >
                        {wine.name}
                      </Link>
                      <p className="font-body text-body-md text-on-surface-variant mb-4 flex-grow">
                        {wine.variety} · {wine.category}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                        <span className="font-display text-xl text-primary">
                          {formatCLP(wine.priceCLP)}
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
              Pago online disponible próximamente · Por ahora coordinamos cada
              pedido por WhatsApp. Beber con moderación · Ley N° 19.925.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
