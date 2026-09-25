"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, ChevronDown, Filter, X } from "lucide-react";
import Reveal from "@/components/Reveal";
import AddToCartButton from "@/components/AddToCartButton";
import WineBottleImage from "@/components/WineBottleImage";
import { matchesWineType } from "@/data/wines";
import type { CatalogWine } from "@/lib/afeleia/catalog";
import { joinLabels, labelOr, translatedOr } from "@/lib/afeleia/copy";
import { FUENTE_FICHA } from "@/lib/fuenteFicha";

/**
 * La sombra de las tarjetas que flotan: la misma de las fichas (ficha rápida
 * de actividades, tarjeta de compra del vino). Sin borde: lo que las separa
 * del blanco es sólo la sombra.
 */
const SOMBRA_FLOTANTE =
  "shadow-[0_36px_70px_-30px_rgba(74,14,14,0.30),0_10px_30px_-14px_rgba(74,14,14,0.12)]";
/** La de las tarjetas de vino, más corta: son muchas y van en grilla. */
const SOMBRA_TARJETA =
  "shadow-[0_14px_34px_-22px_rgba(74,14,14,0.30),0_2px_6px_-2px_rgba(74,14,14,0.05)]";

/**
 * Un grupo de filtros como pastillas. Reemplazan a las casillas nativas
 * (2026-09-25): la lista de casillas medía unos 1.100px de alto para quince
 * opciones y se veía de formulario. Cada pastilla es un toggle, y
 * `aria-pressed` es lo que un lector de pantalla anuncia de ella.
 */
function GrupoFiltro({
  titulo,
  opciones,
  elegidas,
  etiqueta,
  onToggle,
}: {
  titulo: string;
  opciones: readonly string[];
  elegidas: ReadonlySet<string>;
  etiqueta: (opcion: string) => string;
  onToggle: (opcion: string) => void;
}) {
  return (
    <div role="group" aria-label={titulo}>
      {/* Texto y no h3: los encabezados de la página son los vinos. El grupo
          ya se anuncia por su `aria-label`. */}
      <p className="mb-3 font-body text-[13px] text-on-surface-variant">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const prendida = elegidas.has(opcion);
          return (
            <button
              key={opcion}
              type="button"
              aria-pressed={prendida}
              onClick={() => onToggle(opcion)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-body text-[14px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                prendida
                  ? "border-primary bg-primary text-on-primary shadow-[0_6px_14px_-6px_rgba(74,14,14,0.55)]"
                  : "border-outline-variant/70 bg-surface-container-lowest text-on-surface hover:border-primary/50 hover:text-primary"
              }`}
            >
              {prendida && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {etiqueta(opcion)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vitrina de la tienda: filtros, orden y grilla.
 *
 * Los filtros son estado del cliente, pero el catálogo lo resuelve el servidor
 * contra la API de Afeleia. Por eso la página (`app/[locale]/tienda/page.tsx`)
 * hace el fetch y este componente recibe los vinos ya resueltos.
 *
 * `tipos`, `lineas` y `cepas` llegan igual: ya resueltos desde el servidor, que
 * es quien sabe si vinieron de las definiciones publicadas o del fallback local.
 * Mantener esa decisión afuera deja a este componente sin conocimiento del
 * contrato — acá solo hay strings que dibujar.
 */
export default function TiendaCatalogo({
  wines,
  tipos,
  lineas,
  cepas,
  pagoEnLinea,
  confianza,
}: {
  wines: CatalogWine[];
  tipos: readonly string[];
  lineas: readonly string[];
  cepas: readonly string[];
  /** Si el checkout está configurado: decide el aviso del pie. */
  pagoEnLinea: boolean;
  /** La franja "Compra segura" bajo el encabezado, armada en el servidor. */
  confianza: ReactNode;
}) {
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

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [selectedCepas, setSelectedCepas] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [isFiltering, setIsFiltering] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    };
  }, []);

  const startFiltering = () => {
    setIsFiltering(true);
    if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    filterTimeoutRef.current = setTimeout(() => {
      setIsFiltering(false);
      filterTimeoutRef.current = null;
    }, 280);
  };

  const filtered = useMemo(() => {
    // Un producto sin línea (o sin grupo de cepa) NO cae bajo ningún filtro de
    // esos: sigue apareciendo en la vitrina sin filtrar, que es donde el cliente
    // lo va a encontrar mientras termina de completarlo en el panel.
    let list = wines.filter((w) => {
      if (selectedTypes.size > 0 && ![...selectedTypes].some((type) => matchesWineType(w, type)))
        return false;
      if (selectedLines.size > 0 && (!w.line || !selectedLines.has(w.line))) return false;
      if (selectedCepas.size > 0 && (!w.cepaGroup || !selectedCepas.has(w.cepaGroup))) return false;
      return true;
    });

    if (sort === "price-asc") list = [...list].sort((a, b) => a.priceCLP - b.priceCLP);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.priceCLP - a.priceCLP);
    if (sort === "featured")
      list = [...list].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

    return list;
  }, [wines, selectedTypes, selectedLines, selectedCepas, sort]);

  const toggleType = (type: string) => {
    startFiltering();
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };
  const toggleLine = (line: string) => {
    startFiltering();
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };
  const toggleCepa = (cepa: string) => {
    startFiltering();
    setSelectedCepas((prev) => {
      const next = new Set(prev);
      if (next.has(cepa)) next.delete(cepa);
      else next.add(cepa);
      return next;
    });
  };

  const clearFilters = () => {
    startFiltering();
    setSelectedTypes(new Set());
    setSelectedLines(new Set());
    setSelectedCepas(new Set());
  };
  const filterCount = selectedTypes.size + selectedLines.size + selectedCepas.size;

  const filtersPanel = (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Texto y no h2 (2026-09-25): el panel está dos veces en el HTML —el
            de escritorio y la hoja del celular— y sus títulos eran los únicos
            encabezados bajo el h1, repetidos. Los encabezados son los vinos. */}
        <p className="font-display text-2xl text-primary">{t("filters.title")}</p>
        {filterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full px-3 py-1.5 font-body text-[13px] font-medium text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
          >
            {t("filters.clear", { count: filterCount })}
          </button>
        )}
      </div>

      <div className="space-y-7">
        <GrupoFiltro
          titulo={t("filters.type")}
          opciones={tipos}
          elegidas={selectedTypes}
          etiqueta={(type) => labelOr(tVinos, "types", type)}
          onToggle={toggleType}
        />
        <GrupoFiltro
          titulo={t("filters.line")}
          opciones={lineas}
          elegidas={selectedLines}
          etiqueta={(line) => line}
          onToggle={toggleLine}
        />
        <GrupoFiltro
          titulo={t("filters.cepa")}
          opciones={cepas}
          elegidas={selectedCepas}
          etiqueta={(cepa) => labelOr(tVinos, "cepaGroups", cepa)}
          onToggle={toggleCepa}
        />
      </div>
    </>
  );

  const contador =
    filtered.length === 1
      ? t("countSingular", { count: filtered.length })
      : t("countPlural", { count: filtered.length });

  return (
    <>
      {/* F1 — Encabezado y franja de confianza. Cada sección lleva la letra de
          las fichas (`FUENTE_FICHA`): la tienda y la ficha de vino van y
          vienen, y tienen que sentirse una. */}
      <section className={`pt-32 pb-10 px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto ${FUENTE_FICHA}`}>
        <Reveal>
          <p className="mb-2 font-accent text-xl font-light italic text-primary md:text-2xl">
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
          <p className="font-body text-body-lg text-on-surface-variant max-w-2xl">
            {t("hero.subtitle")}
          </p>
          <div className="mt-7">{confianza}</div>
        </Reveal>
      </section>

      {/* F2 — Catálogo. */}
      <section className={`pb-section-gap px-margin-mobile md:px-margin-desktop max-w-(--container-max) mx-auto ${FUENTE_FICHA}`}>
        <div className="flex flex-col md:flex-row gap-10">
          {/* Filtros de escritorio: tarjeta blanca que flota por la sombra,
              sin borde, como las de las fichas. */}
          <aside className="hidden md:block w-1/4 shrink-0">
            <div className={`sticky top-28 rounded-[28px] bg-surface-container-lowest p-6 ${SOMBRA_FLOTANTE}`}>
              {filtersPanel}
            </div>
          </aside>

          {/* Mobile filter trigger */}
          <div className="md:hidden flex items-center justify-between -mt-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className={`inline-flex h-11 items-center gap-2 rounded-full bg-surface-container-lowest px-5 font-body text-body-md font-semibold text-primary ${SOMBRA_TARJETA}`}
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
              className={`absolute left-0 right-0 bottom-0 bg-surface rounded-t-[28px] p-6 max-h-[85vh] overflow-y-auto transition-transform duration-300 ${
                mobileFiltersOpen ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-on-surface-variant"
                  aria-label={t("filters.close")}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="font-body text-body-md text-on-surface-variant">{contador}</span>
              </div>
              {filtersPanel}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-8 w-full inline-flex items-center justify-center h-12 rounded-full bg-primary text-on-primary font-body font-semibold shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)]"
              >
                {t("filters.apply")}
              </button>
            </aside>
          </div>

          <div className="w-full md:w-3/4">
            <div className="flex justify-between items-center gap-4 mb-6">
              <p className="font-body text-body-md text-on-surface-variant tabular-nums">{contador}</p>
              {/* El orden sigue siendo un `<select>` nativo —teclado, lector de
                  pantalla y la rueda del celular funcionan como siempre—; la
                  pastilla y la flecha son sólo el estilo. */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => {
                    startFiltering();
                    setSort(e.target.value as typeof sort);
                  }}
                  className={`h-11 cursor-pointer appearance-none rounded-full bg-surface-container-lowest pl-5 pr-11 font-body text-[14px] font-medium text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${SOMBRA_TARJETA}`}
                  aria-label={t("sort.label")}
                >
                  <option value="featured">{t("sort.featured")}</option>
                  <option value="price-asc">{t("sort.priceAsc")}</option>
                  <option value="price-desc">{t("sort.priceDesc")}</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                  aria-hidden="true"
                />
              </div>
            </div>

            {isFiltering ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex flex-col overflow-hidden rounded-[28px] bg-surface-container-lowest ${SOMBRA_TARJETA}`}
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
              <div className={`rounded-[28px] bg-surface-container-lowest py-20 text-center ${SOMBRA_TARJETA}`}>
                <p className="font-body text-body-lg text-on-surface-variant">
                  {t("empty.title")}
                </p>
                <button
                  type="button"
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
                    className={`group flex flex-col overflow-hidden rounded-[28px] bg-surface-container-lowest transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-24px_rgba(74,14,14,0.34),0_4px_12px_-4px_rgba(74,14,14,0.08)] ${SOMBRA_TARJETA}`}
                  >
                    {/* El degradado claro del panel de la botella en la ficha,
                        no el gris `surface-container-highest` de antes, que
                        sobre el sitio blanco se leía sucio. */}
                    <Link
                      href={`/${locale}/vinos/${wine.slug}`}
                      className="relative h-[320px] w-full bg-gradient-to-br from-surface-container-low to-surface-container p-8 flex items-center justify-center"
                    >
                      <WineBottleImage
                        src={wine.image}
                        alt={wine.name}
                        className="object-contain p-6 group-hover:scale-105 transition-transform duration-700 drop-shadow-[0_12px_18px_rgba(74,14,14,0.18)]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      {wine.badge && (
                        <span className="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 text-label-sm uppercase tracking-wider rounded font-semibold">
                          {translatedOr(tBadges, wine.badge, wine.badge)}
                        </span>
                      )}
                    </Link>
                    <div className="p-6 flex flex-col flex-grow">
                      {/* La línea en vino (`wine-accent`, 9,9:1 sobre el blanco
                          de la tarjeta), no en el gris de las etiquetas: es la
                          colección, lo primero que distingue un vino de otro. */}
                      {wine.line && (
                        <span className="font-body text-label-sm text-wine-accent uppercase tracking-widest mb-2">
                          {wine.line}
                        </span>
                      )}
                      {/* El nombre es el encabezado de la tarjeta: bajo el h1
                          de la tienda, cada vino es un h2. */}
                      <h2 className="mb-1 font-display text-xl font-normal text-primary">
                        <Link
                          href={`/${locale}/vinos/${wine.slug}`}
                          className="hover:underline underline-offset-4"
                        >
                          {wine.name}
                        </Link>
                      </h2>
                      <p className="font-body text-body-md text-on-surface-variant mb-4 flex-grow">
                        {joinLabels(
                          labelOr(tVinos, "types", wine.type),
                          labelOr(tVinos, "varieties", wine.variety),
                        )}
                      </p>
                      {/* El precio como en la ficha de vino: Jakarta en negrita. */}
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                        <span className="font-body text-xl font-bold tracking-tight text-primary tabular-nums">
                          {formatPrice(wine.priceCLP)}
                        </span>
                        <AddToCartButton
                          variant="icon"
                          agotado={wine.agotado}
                          item={{
                            slug: wine.slug,
                            name: wine.name,
                            // El carrito los renderiza como texto: `undefined`
                            // se imprimiría literalmente en el panel lateral.
                            line: wine.line ?? "",
                            variety: wine.variety ?? "",
                            image: wine.image ?? "",
                            priceCLP: wine.priceCLP,
                          }}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Dice cómo se paga de verdad: con el checkout configurado, Mercado
                Pago; sin él, WhatsApp. */}
            <p className="mt-10 text-center text-xs text-on-surface-variant/70 font-body">
              {pagoEnLinea ? t("disclaimerOnline") : t("disclaimer")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
