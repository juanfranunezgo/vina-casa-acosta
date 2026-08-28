import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import CatalogOriginMeta from "@/components/CatalogOriginMeta";
import CollectionBand, { type CollectionWine } from "@/components/CollectionBand";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
import WineCard from "@/components/WineCard";
import Button from "@/components/ui/Button";
import { WINE_CATEGORY, lineSlugs, lineMeta, type WineLine } from "@/data/wines";
import { getCatalog, winesByLine, type CatalogWine } from "@/lib/afeleia/catalog";
import { excludingOtherCategories, winesOutsideLines } from "@/lib/afeleia/contract";
import { joinLabels, labelOr } from "@/lib/afeleia/copy";
import { buildWinesItemListJsonLd } from "@/lib/wineJsonLd";
import { alternatesFor } from "@/lib/alternates";
import { buildVinosJsonLd } from "@/lib/siteJsonLd";

// El catálogo lo publica Afeleia (ISR: cambios visibles en ≤60s).
// Tiene que ser un literal: Next lee la config de segmento estáticamente.
export const revalidate = 60;

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
  const tCart = await getTranslations("cart");
  const todoElCatalogo = await getCatalog();

  /**
   * Esta página es el catálogo de VINOS, y el catálogo de Afeleia no es solo de
   * vinos: desde el mismo panel el cliente puede vender delicatessen o cualquier
   * otra cosa, y todo llega por la misma API. Un producto declarado en otra
   * categoría no entra acá — mostrarlo le pondría «Cosecha» y «Notas de cata» a
   * algo que no es una botella.
   *
   * Lo que no tiene categoría sí entra: ver `excludingOtherCategories`.
   */
  const catalog = excludingOtherCategories(todoElCatalogo, WINE_CATEGORY);

  /**
   * Vinos que ninguna banda editorial va a mostrar: los de una línea que este
   * repo no conoce y los que todavía no tienen línea asignada.
   *
   * Las bandas se arman con activos de diseño locales —fotos, tier, ancla de URL,
   * copy de marca— y nada de eso puede venir de la API. Sin esta sección, un
   * producto recién creado en el panel quedaba invisible en la página de catálogo
   * de su propio dueño. El invariante que esto sostiene: **todo producto del
   * catálogo aparece en /vinos, en /tienda y en /vinos/<slug>**, tenga los
   * atributos que tenga.
   */
  const otherWines = winesOutsideLines(catalog, collectionLines);

  // `joinLabels` y no plantillas con " · ": un producto del panel puede no traer
  // tipo o cepa, y concatenar a ciegas deja separadores colgando ("Tinto · ").
  const eyebrowOf = (wine: CatalogWine) =>
    joinLabels(labelOr(t, "types", wine.type), labelOr(t, "varieties", wine.variety));
  const cardEyebrowOf = (wine: CatalogWine) => {
    if (wine.line === "Ombú") return t("categories.Reserva");
    if (wine.line === "Lajau") {
      return joinLabels(t("categories.Reserva"), t("varieties.Ensamblaje"));
    }
    if (wine.line === "Estación Francia") {
      return joinLabels(t("categories.Gran Reserva"), labelOr(t, "varieties", wine.variety));
    }
    if (wine.category) {
      return joinLabels(
        labelOr(t, "categories", wine.category),
        labelOr(t, "varieties", wine.variety),
      );
    }
    return eyebrowOf(wine);
  };

  // El texto del producto sale del catálogo, sin pasar por next-intl (R1): el
  // contenido es del panel. Lo que se traduce acá son las etiquetas de la
  // plantilla —"Tinto", "Carmenere"—, que sí son vocabulario del sitio.
  const jsonLd = buildWinesItemListJsonLd(catalog, locale, {
    shortDescription: (wine) => wine.shortDescription,
    category: eyebrowOf,
  });

  const tMeta = await getTranslations("metadata.vinos");
  const pageJsonLd = buildVinosJsonLd(locale, {
    name: tMeta("title"),
    description: tMeta("description"),
  });

  return (
    <>
      {/* JSON-LD del catálogo para que los buscadores entiendan la lista de
          productos. Va por <JsonLd> y NUNCA por JSON.stringify a mano: `name` y
          `description` los escribe el cliente en el panel, y `JSON.stringify` no
          escapa `</script>` (ver lib/jsonLd.ts). */}
      <JsonLd data={jsonLd} />
      <CatalogOriginMeta />

      {/* CollectionPage + la entidad de la viña, aparte del ItemList de arriba:
          dos bloques ld+json en una página son válidos y Google los une por
          @id. */}
      <JsonLd data={pageJsonLd} />

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
        const lineWines = winesByLine(catalog, line);
        if (lineWines.length === 0) return null;

        const meta = lineMeta[line];
        const cards: CollectionWine[] = lineWines.map((wine) => ({
          slug: wine.slug,
          href: `/${locale}/vinos/${wine.slug}`,
          image: wine.image,
          name: wine.name,
          eyebrow: cardEyebrowOf(wine),
          agotado: wine.agotado,
          soldOutLabel: tCart("soldOut"),
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

      {/* C2b — «Otros vinos»: la red de seguridad del catálogo.
          Solo aparece cuando hay algo que mostrar, así que en el estado normal
          —los seis colecciones completas— esta sección no existe.

          Usa `WineCard`, la misma tarjeta que dibujan las bandas: no se duplica
          markup, el aviso de agotado viaja con ella y `CollectionBand` no se
          toca, así que el layout editorial vivo queda intacto. */}
      {otherWines.length > 0 && (
        <section className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop">
          <div className="mx-auto max-w-(--container-max)">
            <Reveal className="mb-12">
              <h2 className="font-display text-headline-h2 text-primary">{t("otherLine.title")}</h2>
              <p className="mt-3 max-w-2xl font-body text-body-md text-on-surface-variant">
                {t("otherLine.description")}
              </p>
            </Reveal>
            <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
              {otherWines.map((wine, idx) => (
                <li key={wine.slug}>
                  <Reveal delay={idx * 80}>
                    <WineCard
                      href={`/${locale}/vinos/${wine.slug}`}
                      image={wine.image}
                      name={wine.name}
                      eyebrow={eyebrowOf(wine)}
                      agotado={wine.agotado}
                      soldOutLabel={tCart("soldOut")}
                    />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

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
