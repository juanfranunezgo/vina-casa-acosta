import type { Wine } from "@/data/wines";
import { SITE_URL } from "@/lib/siteUrl";

type WineLabels = {
  /** Descripción corta ya traducida, por slug. */
  shortDescription: (slug: string) => string;
  /** Categoría legible ya traducida, ej. "Tinto · Carmenere". */
  category: (wine: Wine) => string;
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
 * Construye el JSON-LD `ItemList` de los vinos del catálogo (`/vinos`).
 *
 * Cada ítem es un `Product` con los campos que SÍ se ven en la página
 * (nombre, imagen, descripción, categoría). No se incluye `offers`/precio
 * porque el precio no es visible en esta página: el structured data debe
 * reflejar el contenido visible. El precio va en la ficha del producto.
 */
export function buildWinesItemListJsonLd(
  wines: Wine[],
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
      item: {
        "@type": "Product",
        name: wine.name,
        image: absoluteImage(wine.image),
        description: labels.shortDescription(wine.slug),
        category: labels.category(wine),
        brand: { "@type": "Brand", name: "Viña Casa Acosta" },
        url: `${SITE_URL}/${locale}/vinos/${wine.slug}`,
      },
    })),
  };
}
