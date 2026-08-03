import { setRequestLocale } from "next-intl/server";
import CatalogOriginMeta from "@/components/CatalogOriginMeta";
import TiendaCatalogo from "@/components/TiendaCatalogo";
import { getCatalog } from "@/lib/afeleia/catalog";

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
  const catalog = await getCatalog();

  return (
    <>
      <CatalogOriginMeta />
      <TiendaCatalogo wines={catalog} />
    </>
  );
}
