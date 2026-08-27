import { setRequestLocale } from "next-intl/server";
import CatalogOriginMeta from "@/components/CatalogOriginMeta";
import TiendaCatalogo from "@/components/TiendaCatalogo";
import { cepaGroups, wineLines, wineTypes } from "@/data/wines";
import { getCatalog, getCatalogDefinitions } from "@/lib/afeleia/catalog";
import { optionsFor } from "@/lib/afeleia/contract";

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

  return (
    <>
      <CatalogOriginMeta />
      <TiendaCatalogo wines={catalog} tipos={tipos} lineas={lineas} cepas={cepas} />
    </>
  );
}
