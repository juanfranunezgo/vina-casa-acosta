import type { CatalogWine } from "@/lib/afeleia/catalog";
import { SITE_URL } from "@/lib/siteUrl";
import { WINERY_ID, wineryNode } from "@/lib/siteJsonLd";

/**
 * Textos ya resueltos que necesita la ficha. Llegan armados desde la página y
 * no se traducen acá: el generador no tiene acceso al locale de next-intl, y
 * pedirle que lo tenga sería darle dos responsabilidades.
 */
type WineDetailCopy = {
  /** Descripción del vino: traducción curada, o el copy del panel si no existe. */
  description: string;
  /** Categoría legible ya traducida, ej. "Tinto · Carmenere". */
  category: string;
  /** Rótulo traducido de la añada, ej. "Cosecha". */
  vintageProperty: string;
  /** Descripción del sitio, para el nodo de la viña. */
  siteDescription: string;
};

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

/**
 * Structured data de la ficha de un vino.
 *
 * Hasta acá, las fichas del catálogo eran las únicas páginas de producto del
 * sitio sin structured data: la ficha de una *actividad* ya emitía `Product` +
 * `Offer`, y la del *vino* —que muestra el precio en pantalla y es lo que la
 * viña vende— no emitía nada. La asimetría no era una decisión, era una
 * omisión.
 *
 * Qué se declara, y por qué cada cosa:
 *
 * - `offers` SÍ lleva `price`, al revés que el `ItemList` de `/vinos`. No es
 *   una inconsistencia: allá la grilla no muestra el precio y acá se lee
 *   formateado junto al botón de compra. La regla es la misma en los dos
 *   lados —se marca lo que la página dice—, y da resultados distintos porque
 *   las páginas dicen cosas distintas.
 * - `availability` sale de `agotado`, que además de ser dato real del catálogo
 *   se ve: cuando está agotado el botón lo dice y queda deshabilitado. Es la
 *   diferencia con las actividades, donde no se declara disponibilidad porque
 *   nadie la confirma.
 * - La cosecha va como `additionalProperty` porque `Product` no tiene
 *   propiedad de añada, y va traducida porque `PropertyValue.name` es texto
 *   que se le muestra a una persona.
 *
 * Lo que queda afuera: graduación alcohólica, volumen, valle y sistema de
 * conducción. Son datos reales, pero viven en el PDF de la ficha técnica y no
 * en la página. Marcar lo que el visitante no puede leer es exactamente el
 * structured data que Google llama engañoso.
 *
 * El nodo de la viña se emite completo, igual que en las cinco páginas
 * principales y por el mismo motivo: una ficha que un crawler visita sola —el
 * caso normal cuando llega desde un buscador o desde un motor de IA— tiene que
 * poder resolver por sí misma quién vende ese vino, dónde está y cómo se lo
 * contacta, sin depender de que antes haya pasado por la portada.
 */
export function buildWineDetailJsonLd(
  wine: CatalogWine,
  locale: string,
  copy: WineDetailCopy,
) {
  const url = `${SITE_URL}/${locale}/vinos/${wine.slug}`;

  const product = withoutEmpty({
    "@type": "Product",
    "@id": `${url}#product`,
    name: wine.name,
    image: wine.image ? absoluteImage(wine.image) : undefined,
    description: copy.description,
    category: copy.category,
    brand: { "@type": "Brand", name: "Viña Casa Acosta" },
    url,
    // Ausente en los no-vintage (el Guidaí espumante), y entonces no se emite
    // la propiedad en vez de emitirla vacía.
    additionalProperty:
      wine.vintage === undefined
        ? undefined
        : {
            "@type": "PropertyValue",
            name: copy.vintageProperty,
            value: String(wine.vintage),
          },
    offers: {
      "@type": "Offer",
      price: wine.priceCLP,
      priceCurrency: "CLP",
      availability: wine.agotado
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url,
      seller: { "@id": WINERY_ID },
    },
  });

  return {
    "@context": "https://schema.org",
    "@graph": [product, wineryNode(locale, copy.siteDescription)],
  };
}
