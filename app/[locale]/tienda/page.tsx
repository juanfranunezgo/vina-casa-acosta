import { getTranslations, setRequestLocale } from "next-intl/server";
import CatalogOriginMeta from "@/components/CatalogOriginMeta";
import CompraSegura from "@/components/CompraSegura";
import JsonLd from "@/components/JsonLd";
import TiendaCatalogo from "@/components/TiendaCatalogo";
import { cepaGroups, wineLines, wineTypes } from "@/data/wines";
import { getCatalog, getCatalogDefinitions, getMinBottles } from "@/lib/afeleia/catalog";
import { optionsFor } from "@/lib/afeleia/contract";
import { joinLabels, labelOr } from "@/lib/afeleia/copy";
import { checkoutIniciarUrl } from "@/lib/checkout";
import { buildTiendaJsonLd } from "@/lib/siteJsonLd";
import { buildWinesItemListJsonLd } from "@/lib/wineJsonLd";

// El catálogo lo publica Afeleia (ISR: cambios de precio o stock visibles ≤60s).
// Next exige un literal acá: la config de segmento se lee estáticamente y una
// constante importada la invalida (`Invalid segment configuration export`).
export const revalidate = 60;

/**
 * La tienda se parte en dos: este servidor resuelve el catálogo contra la API y
 * `TiendaCatalogo` —cliente— se queda con los filtros, el orden y la grilla.
 * Un componente cliente no puede hacer el fetch con `revalidate`, y mandarlo al
 * browser expondría la lectura del catálogo a cada visita en vez de cachearla.
 */
export default async function TiendaPage({ params }: PageProps<"/[locale]/tienda">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Las dos lecturas comparten el `cache()` de `loadCatalog`: es un solo fetch.
  const [catalog, definitions] = await Promise.all([getCatalog(), getCatalogDefinitions()]);

  // Los filtros salen de las listas publicadas por Afeleia, y de las locales solo
  // cuando la respuesta no las trae (snapshot). Se resuelve acá, en el servidor,
  // para que el componente cliente no tenga que conocer el contrato.
  const tipos = optionsFor(definitions, "tipo", wineTypes);
  const lineas = optionsFor(definitions, "linea", wineLines);
  const cepas = optionsFor(definitions, "grupo_cepa", cepaGroups);

  // La misma condición que el "Pagar" del carrito (CartDrawer) y que el sello
  // de la ficha de vino: sin checkout configurado el pedido cierra por
  // WhatsApp, y ni la franja ni el aviso del pie pueden prometer un pago en
  // línea. Hasta el 2026-09-25 el aviso decía "Pago online disponible
  // próximamente" con el checkout ya cobrando en producción.
  const pagoEnLinea =
    checkoutIniciarUrl(process.env.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL) !== null;
  const minBottles = await getMinBottles();

  // Structured data (2026-09-25): la lista de vinos —el mismo ItemList de
  // `/vinos`, con las etiquetas que se leen en las tarjetas— y la tienda como
  // CollectionPage. Dos bloques ld+json en una página son válidos y Google los
  // une por @id. Van por <JsonLd>: nombre y descripción los escribe el cliente
  // en el panel, y ver lib/jsonLd.ts por qué no JSON.stringify.
  const tVinos = await getTranslations("vinos");
  const tMeta = await getTranslations("metadata.tienda");
  const listaJsonLd = buildWinesItemListJsonLd(catalog, locale, {
    shortDescription: (wine) => wine.shortDescription,
    category: (wine) =>
      joinLabels(labelOr(tVinos, "types", wine.type), labelOr(tVinos, "varieties", wine.variety)),
  });
  const paginaJsonLd = buildTiendaJsonLd(locale, {
    name: tMeta("title"),
    description: tMeta(pagoEnLinea ? "descriptionOnline" : "description"),
  });

  return (
    <>
      <JsonLd data={listaJsonLd} />
      <JsonLd data={paginaJsonLd} />
      <CatalogOriginMeta />
      {/* El sello es de servidor (lee sus textos con `getTranslations`) y la
          vitrina es de cliente: se arma acá y se le pasa armado. */}
      <TiendaCatalogo
        wines={catalog}
        tipos={tipos}
        lineas={lineas}
        cepas={cepas}
        pagoEnLinea={pagoEnLinea}
        confianza={
          <CompraSegura pagoEnLinea={pagoEnLinea} minBottles={minBottles} variante="franja" />
        }
      />
    </>
  );
}
