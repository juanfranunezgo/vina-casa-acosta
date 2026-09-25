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
import CompraSegura from "@/components/CompraSegura";
import SelloProducto from "@/components/SelloProducto";
import TastingProfile from "@/components/TastingProfile";
import WineBottleImage from "@/components/WineBottleImage";
import IconBadge from "@/components/ui/IconBadge";
import { getCatalog, getMinBottles, getWineBySlug } from "@/lib/afeleia/catalog";
import { checkoutIniciarUrl } from "@/lib/checkout";
import { FUENTE_FICHA } from "@/lib/fuenteFicha";
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

  // El sello de Mercado Pago, con la misma condición que el "Pagar" del
  // carrito (CartDrawer): sin checkout configurado el pedido cierra por
  // WhatsApp, y la ficha no puede prometer un pago en línea que no existe.
  const pagoEnLinea =
    checkoutIniciarUrl(process.env.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL) !== null;
  const minBottles = await getMinBottles();

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
      <section className={`pt-28 pb-section-gap px-margin-mobile md:pt-32 md:px-margin-desktop max-w-(--container-max) mx-auto ${FUENTE_FICHA}`}>
        <Button
          href={`/${locale}/vinos`}
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft className="h-4 w-4" />}
          className="-ml-2 mb-6 normal-case tracking-normal md:mb-10"
        >
          {t("backToCatalog")}
        </Button>

        {/* Tres piezas en el orden de celular: nombre, botella y el resto
            (compra, descripción, notas, maridaje, ficha técnica). En celular
            el nombre va sobre la botella —pedido de Juan Francisco del
            2026-09-25— y en escritorio la grilla lo sube a la columna derecha,
            junto a la botella, sin reordenar el DOM: el h1 sigue siendo lo
            primero que se lee. `md:grid-rows-[auto_1fr]` hace que la primera
            fila mida lo que el nombre y no la mitad de la botella. */}
        <div className="grid grid-cols-1 items-start gap-y-8 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-12 md:gap-y-0 lg:gap-x-16">
          <Reveal className="md:col-start-2 md:row-start-1 md:pt-4">
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
            <p className="font-body text-body-lg text-on-surface-variant">
              {joinLabels(
                labelOr(tVinos, "types", wine.type),
                labelOr(tVinos, "varieties", wine.variety),
                wine.vintage ? t("vintageLabel", { year: wine.vintage }) : t("noVintage"),
              )}
            </p>
          </Reveal>

          {/* La botella queda fija en escritorio mientras se baja por la
              información: antes subía con la página y, al leer la ficha
              técnica, la columna izquierda quedaba en blanco. La altura se
              acota a la pantalla, porque un `sticky` más alto que la ventana
              no llega a pegarse. En celular va 4:3 y no 3:4, para que el
              precio y el botón entren en la primera pantalla (medido a 375×812). */}
          <Reveal className="md:sticky md:top-28 md:col-start-1 md:row-span-2 md:row-start-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-gradient-to-br from-surface-container-low to-surface-container md:aspect-auto md:h-[min(calc(100svh-9rem),46rem)]">
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
                className="object-contain p-6 drop-shadow-[0_24px_32px_rgba(74,14,14,0.18)] md:p-12"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {wine.badge && (
                <SelloProducto className="top-5 left-5 md:top-6 md:left-6">
                  {translatedOr(tBadges, wine.badge, wine.badge)}
                </SelloProducto>
              )}
            </div>
          </Reveal>

          {/* Cada bloque entra con su propio `Reveal`. Con uno solo para toda
              la columna, el umbral (12% del elemento) caía sobre dos mil
              píxeles de alto: en celular la tarjeta de compra quedaba
              invisible en la primera pantalla hasta que uno bajaba. */}
          <div className="md:col-start-2 md:row-start-2 md:pt-8">
            {/* Tarjeta de compra, justo bajo el nombre. Hasta el 2026-09-25 el
                precio y el botón iban al final, después de la ficha técnica:
                para comprar había que bajar toda la página, y en celular eran
                cuatro pantallas. Blanca y sin borde, flota por la sombra como
                la ficha rápida de las actividades. `relative z-10` para que la
                sombra no la corte lo que viene abajo. */}
            <Reveal delay={120} className="relative z-10">
              <div className="relative z-10 rounded-[28px] bg-surface-container-lowest p-6 shadow-[0_36px_70px_-30px_rgba(74,14,14,0.30),0_10px_30px_-14px_rgba(74,14,14,0.12)] md:p-8">
                <p className="font-body text-[13px] text-on-surface-variant">{t("priceLabel")}</p>
                <p className="mt-1 font-body text-4xl font-bold leading-none tracking-tight tabular-nums text-primary md:text-[2.75rem]">
                  {priceFormatted}
                </p>
                <div className="mt-6">
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
                <div className="mt-7 border-t border-outline-variant/40 pt-6">
                  <CompraSegura pagoEnLinea={pagoEnLinea} minBottles={minBottles} />
                </div>
              </div>
            </Reveal>

            <Reveal>
              {description && (
                <p className="mt-10 font-body text-body-lg leading-relaxed text-on-surface">
                  {description}
                </p>
              )}

              {/* DEC-5: cada sección se dibuja solo si su dato existe. Un producto
                  creado en el panel sin notas ni maridajes dejaba dos encabezados
                  sobre listas vacías. Las secciones son h2: eran h3 directo bajo
                  el h1, un salto de nivel. */}
              {(tastingNotes.length > 0 || pairings.length > 0) && (
                <div className="mt-10 space-y-10">
                  {tastingNotes.length > 0 && (
                    <div>
                      <h2 className="font-body text-label-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                        <span className="h-px w-6 bg-primary/40" />
                        {t("tastingNotes")}
                      </h2>
                      <TastingProfile notes={tastingNotes} />
                    </div>
                  )}

                  {/* Cada plato con el círculo vino de las fichas de actividad
                      (`IconBadge`), en vez de las cajas grises de antes. */}
                  {pairings.length > 0 && (
                    <div>
                      <h2 className="font-body text-label-sm uppercase tracking-widest text-primary mb-5 flex items-center gap-2">
                        <span className="h-px w-6 bg-primary/40" />
                        {t("pairing")}
                      </h2>
                      <ul className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
                        {pairings.map((p) => (
                          <li
                            key={p}
                            className="flex items-center gap-3 font-body text-body-md text-on-surface"
                          >
                            <IconBadge size="sm">
                              <Utensils />
                            </IconBadge>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Reveal>

            <Reveal>
              {/* Ficha técnica. Las filas, su orden y sus etiquetas los publica
                  Afeleia: acá no hay ninguna lista de campos escrita a mano, así
                  que un subcampo nuevo aparece solo. La etiqueta usa la traducción
                  curada si existe —«Composición» y «Alcohol» son vocabulario de la
                  plantilla, no contenido del cliente— y cae a la etiqueta publicada
                  cuando este sitio no conoce ese subcampo: nunca una clave cruda.
                  Sin filas con valor no se dibuja nada.

                  Va en una tarjeta como la de compra, con la etiqueta chica arriba
                  y el valor abajo. Antes eran filas "etiqueta … valor" alineadas a
                  los extremos, y en media columna los valores largos se partían:
                  "90% Carmenere, / 10% Cabernet / Sauvignon", "7° – / 9°". El PDF
                  va al pie de la tarjeta; sin él (un producto del panel que no lo
                  trae) no queda un botón con href vacío. */}
              {(wine.technical.length > 0 || wine.technicalSheet) && (
                <div className="mt-12">
                  <h2 className="font-body text-label-sm uppercase tracking-widest text-primary mb-5 flex items-center gap-2">
                    <span className="h-px w-6 bg-primary/40" />
                    {t("technical.title")}
                  </h2>
                  <div className="rounded-[28px] bg-surface-container-lowest p-6 shadow-[0_36px_70px_-30px_rgba(74,14,14,0.30),0_10px_30px_-14px_rgba(74,14,14,0.12)] md:p-8">
                    {wine.technical.length > 0 && (
                      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                        {wine.technical.map((row) => (
                          <div key={row.clave}>
                            <dt className="font-body text-[13px] text-on-surface-variant">
                              {translatedOr(tTech, row.clave, row.etiqueta)}
                            </dt>
                            <dd className="mt-0.5 font-body text-[1.05rem] font-semibold leading-snug text-primary">
                              {row.valor}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {wine.technicalSheet && (
                      <div
                        className={
                          wine.technical.length > 0
                            ? "mt-7 border-t border-outline-variant/40 pt-5"
                            : ""
                        }
                      >
                        <Button
                          href={wine.technicalSheet}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="link"
                          iconLeft={<FileText className="h-4 w-4" />}
                          className="normal-case tracking-normal text-body-md"
                        >
                          {t("technicalSheet")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className={`bg-surface py-section-gap px-margin-mobile md:px-margin-desktop ${FUENTE_FICHA}`}>
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
                    className="group block overflow-hidden rounded-[28px] bg-surface shadow-[0_14px_34px_-22px_rgba(74,14,14,0.30),0_2px_6px_-2px_rgba(74,14,14,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-24px_rgba(74,14,14,0.34),0_4px_12px_-4px_rgba(74,14,14,0.08)]"
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
