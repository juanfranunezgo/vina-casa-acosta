import type { CatalogWine } from "@/lib/afeleia/catalog";
import { SITE_URL } from "@/lib/siteUrl";

type WineLabels = {
  /**
   * Descripción corta ya resuelta. Recibe el vino entero y no solo el slug
   * porque la traducción curada puede no existir (producto creado en el panel)
   * y hay que poder caer al texto que el propio vino trae.
   */
  shortDescription: (wine: CatalogWine) => string;
  /** Categoría legible ya traducida, ej. "Tinto · Carmenere". */
  category: (wine: CatalogWine) => string;
};

/**
 * URL absoluta de la foto del vino.
 *
 * Desde que el catálogo llega de la API de Afeleia, `image` puede ser tanto una
 * ruta de `public/` (snapshot de fallback) como una URL completa del Storage.
 * Concatenarle el dominio a la segunda deja un `https://casaacosta.clhttps://…`
 * roto en silencio dentro del structured data.
 */
function absoluteImage(image: string): string {
  return /^https?:\/\//i.test(image) ? image : `${SITE_URL}${image}`;
}

/**
 * Campos vacíos fuera del bloque.
 *
 * Un `"image": ""` o un `"category": ""` no son "sin dato" para un buscador:
 * son un dato inválido declarado, y ensucian el structured data del sitio.
 */
function withoutEmpty<T extends Record<string, unknown>>(item: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}

/**
 * Construye el JSON-LD `ItemList` de los vinos del catálogo (`/vinos`).
 *
 * Cada ítem es un `Product` con los campos que SÍ se ven en la página
 * (nombre, imagen, descripción, categoría). No se incluye `offers`/precio
 * porque el precio no es visible en esta página: el structured data debe
 * reflejar el contenido visible. El precio va en la ficha del producto.
 */
export function buildWinesItemListJsonLd(
  wines: CatalogWine[],
  locale: string,
  labels: WineLabels,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Nuestros vinos — Viña Casa Acosta",
    numberOfItems: wines.length,
    itemListElement: wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: withoutEmpty({
        "@type": "Product",
        name: wine.name,
        image: wine.image ? absoluteImage(wine.image) : undefined,
        description: labels.shortDescription(wine),
        category: labels.category(wine),
        brand: { "@type": "Brand", name: "Viña Casa Acosta" },
        url: `${SITE_URL}/${locale}/vinos/${wine.slug}`,
      }),
    })),
  };
}
