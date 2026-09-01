import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, FileText, Utensils } from "lucide-react";
import CatalogOriginMeta from "@/components/CatalogOriginMeta";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import ProductPurchase from "@/components/ProductPurchase";
import TastingProfile from "@/components/TastingProfile";
import WineBottleImage from "@/components/WineBottleImage";
import { getCatalog, getWineBySlug } from "@/lib/afeleia/catalog";
import { joinLabels, labelOr, translatedOr } from "@/lib/afeleia/copy";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/alternates";
import { buildWineDetailJsonLd } from "@/lib/wineJsonLd";
import {
  wineMetaDescription,
  wineSearchTitle,
  type WineMetaDictionary,
} from "@/lib/wineMeta";

// El catálogo lo publica Afeleia: la ficha se reconstruye cada minuto en vez de
// quedar congelada en el build. Un vino nuevo que no estaba al compilar se
// renderiza on-demand (`dynamicParams` por defecto).
// Tiene que ser un literal: Next lee la config de segmento estáticamente.
export const revalidate = 60;

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return routing.locales.flatMap((locale) =>
    catalog.map((w) => ({ locale, slug: w.slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/vinos/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const wine = await getWineBySlug(slug);
  if (!wine) return { title: "—" };
  const tMeta = await getTranslations({ locale, namespace: "metadata" });
  // R1: la descripción es contenido del cliente y sale del catálogo, sin pasar
  // por next-intl. El repo del sitio guarda diseño; el texto del producto vive
  // en el panel y se edita ahí, no acá.
  //
  // Lo que sí pone el repo son las palabras genéricas del título («espumante
  // rosado», «ensamblaje tinto»): el panel publica un solo idioma y esta ficha
  // se sirve en tres. Ver `lib/wineMeta.ts` para la regla completa.
  const searchTitle = wineSearchTitle(
    wine,
    tMeta.raw("wineTitle") as WineMetaDictionary,
  );
  const description = wineMetaDescription(wine);
  const path = `/vinos/${slug}`;
  // El `title` recibe la plantilla del layout ("%s | Viña Casa Acosta"), pero
  // Open Graph no: hay que escribir el título completo a mano. Sin esto la ficha
  // heredaba el og del layout y compartir un vino por WhatsApp mostraba el
  // título y la foto genéricos del sitio en lugar de los del vino.
  const ogTitle = `${wine.name} | ${tMeta("siteName")}`;
  // `image` es opcional desde que el catálogo descarta las entradas que este
  // sitio no puede renderizar (H-49). Sin el guard, un vino sin foto declararía
  // `og:image` en undefined, que es peor que no declarar la etiqueta.
  const ogImages = wine.image ? [{ url: wine.image, alt: wine.name }] : undefined;
  return {
    title: searchTitle,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: "website",
      title: ogTitle,
      description,
      url: `/${locale}${path}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: wine.image ? [wine.image] : undefined,
    },
  };
}

export default async function WinePage({
  params,
}: PageProps<"/[locale]/vinos/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const catalog = await getCatalog();
  const wine = catalog.find((w) => w.slug === slug);
  if (!wine) notFound();

  const t = await getTranslations("wineDetail");
  const tVinos = await getTranslations("vinos");
  const tBadges = await getTranslations("vinos.badges");
  const tTech = await getTranslations("wineDetail.technicalFields");

  // R1 — contenido del cliente, directo del catálogo. Notas y maridajes se
  // editan en el panel y se ven publicados; ya no hay una copia en el repo que
  // pudiera ganarle y dejar la ficha mostrando algo que el cliente ya cambió.
  const tastingNotes = wine.tastingNotes;
  const pairings = wine.pairings;
  // La descripción larga, con la corta como respaldo: sin ninguna de las dos no
  // se dibuja el párrafo. Hasta hoy quedaba un <p> vacío ocupando su margen.
  const description = wine.description || wine.shortDescription;

  // "Línea Ombú · Reserva" — pero sin línea asignada no se imprime el rótulo solo.
  const lineEyebrow = wine.line
    ? joinLabels(
        `${tVinos("lineLabel")} ${wine.line}`,
        labelOr(tVinos, "categories", wine.category),
      )
    : labelOr(tVinos, "categories", wine.category);

  const sameLine = catalog
    .filter((w) => w.line === wine.line && w.slug !== wine.slug)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const related = [
    ...sameLine,
    ...catalog
      .filter((w) => w.line !== wine.line && w.slug !== wine.slug)
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))),
  ].slice(0, 4);

  const priceLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-CL";
  const priceFormatted = new Intl.NumberFormat(priceLocale, {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(wine.priceCLP);

  // Structured data de la ficha. Se arma acá abajo, con los mismos valores que
  // la página acaba de resolver para mostrarlos, y no con una segunda lectura
  // del catálogo: así lo marcado y lo visible no pueden separarse.
  const tMeta = await getTranslations("metadata");
  const jsonLd = buildWineDetailJsonLd(wine, locale, {
    description,
    category: joinLabels(
      labelOr(tVinos, "types", wine.type),
      labelOr(tVinos, "varieties", wine.variety),
    ),
    vintageProperty: t("vintageProperty"),
    siteDescription: tMeta("description"),
  });

  return (
    <>
      <CatalogOriginMeta />
      <JsonLd data={jsonLd} />
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
              <WineBottleImage
                src={wine.image}
                alt={wine.name}
                className="object-contain p-12 drop-shadow-[0_24px_32px_rgba(74,14,14,0.18)]"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {wine.badge && (
                <span className="absolute top-6 left-6 bg-primary text-on-primary px-3 py-1.5 text-label-sm uppercase tracking-wider rounded font-semibold">
                  {translatedOr(tBadges, wine.badge, wine.badge)}
                </span>
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className="md:pt-8">
            {lineEyebrow && (
              <p className="mb-3 font-accent text-xl font-light italic text-primary md:text-2xl">
                {lineEyebrow}
              </p>
            )}
            <h1
              className="font-display text-primary mb-3 leading-tight"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              }}
            >
              {wine.name}
            </h1>
            <p className="font-body text-body-lg text-on-surface-variant mb-6">
              {joinLabels(
                labelOr(tVinos, "types", wine.type),
                labelOr(tVinos, "varieties", wine.variety),
                wine.vintage ? t("vintageLabel", { year: wine.vintage }) : t("noVintage"),
              )}
            </p>

            {description && (
              <p className="font-body text-body-md text-on-surface leading-relaxed mb-8">
                {description}
              </p>
            )}

            {/* DEC-5: cada sección se dibuja solo si su dato existe. Un producto
                creado en el panel sin PDF dejaba antes un botón con href="" que
                abría una copia de esta misma página en una pestaña nueva; sin
                notas ni maridajes dejaba dos encabezados sobre listas vacías. */}
            {wine.technicalSheet && (
              <Button
                href={wine.technicalSheet}
                target="_blank"
                rel="noopener noreferrer"
                variant="link"
                iconLeft={<FileText className="h-4 w-4" />}
                className="mb-10 normal-case tracking-normal text-body-md"
              >
                {t("technicalSheet")}
              </Button>
            )}

            {(tastingNotes.length > 0 || pairings.length > 0) && (
              <div className="space-y-8 mb-10">
                {tastingNotes.length > 0 && (
                  <div>
                    <h3 className="font-body text-label-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                      <span className="h-px w-6 bg-primary/40" />
                      {t("tastingNotes")}
                    </h3>
                    <TastingProfile notes={tastingNotes} />
                  </div>
                )}

                {pairings.length > 0 && (
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
                          <Utensils
                            className="h-4 w-4 text-primary shrink-0"
                            aria-hidden="true"
                          />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Ficha técnica. Las filas, su orden y sus etiquetas los publica
                Afeleia: acá no hay ninguna lista de campos escrita a mano, así
                que un subcampo nuevo aparece solo. La etiqueta usa la traducción
                curada si existe —«Composición» y «Alcohol» son vocabulario de la
                plantilla, no contenido del cliente— y cae a la etiqueta publicada
                cuando este sitio no conoce ese subcampo: nunca una clave cruda.
                Sin filas con valor no se dibuja nada. */}
            {wine.technical.length > 0 && (
              <div className="mb-10">
                <h3 className="font-body text-label-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <span className="h-px w-6 bg-primary/40" />
                  {t("technical.title")}
                </h3>
                <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  {wine.technical.map((row) => (
                    <div
                      key={row.clave}
                      className="flex items-baseline justify-between gap-4 border-b border-outline-variant/20 py-2.5"
                    >
                      <dt className="font-body text-body-md text-on-surface-variant">
                        {translatedOr(tTech, row.clave, row.etiqueta)}
                      </dt>
                      <dd className="font-body text-body-md text-on-surface text-right">
                        {row.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex flex-col gap-6 border-t border-outline-variant/40 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                  {t("currency")}
                </span>
                <span className="font-display text-3xl text-primary tabular-nums">
                  {priceFormatted}
                </span>
              </div>
              <ProductPurchase
                agotado={wine.agotado}
                item={{
                  slug: wine.slug,
                  name: wine.name,
                  // El carrito muestra estos campos como texto: `undefined` se
                  // imprimiría literalmente en el panel lateral.
                  line: wine.line ?? "",
                  variety: wine.variety ?? "",
                  image: wine.image ?? "",
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
                {t("youMayAlsoLike")}
              </h2>
              <Button
                href={`/${locale}/vinos`}
                variant="link"
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                {tVinos("hero.title")}
              </Button>
            </Reveal>
            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r, idx) => (
                <Reveal key={r.slug} delay={idx * 80}>
                  <Link
                    href={`/${locale}/vinos/${r.slug}`}
                    className="group block bg-surface rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.12)] transition-all duration-300"
                  >
                    <div className="aspect-[3/4] relative bg-gradient-to-br from-surface-container-low to-surface-container">
                      <WineBottleImage
                        src={r.image}
                        alt={r.name}
                        className="object-contain p-8 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_12px_18px_rgba(74,14,14,0.15)]"
                        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-xl text-primary mb-1">{r.name}</h3>
                      <p className="font-body text-body-md text-on-surface-variant">
                        {joinLabels(
                          labelOr(tVinos, "types", r.type),
                          labelOr(tVinos, "varieties", r.variety),
                        )}
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
