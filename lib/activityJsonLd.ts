import { SITE_URL } from "@/lib/siteUrl";
import { type Activity, activityPath, categoryIndexHref } from "@/data/activities";

/**
 * Structured data de una ficha de actividad.
 *
 * Se modela como `Product` y no como `Event` ni `Course`: los dos exigen fechas
 * (`startDate`, `hasCourseInstance`) que el catálogo del cliente no publica, y
 * declararlas inventadas es peor que no tener rich result. `Product` además es
 * lo que `lib/siteJsonLd.ts` ya emite para los tours en el índice, así que la
 * misma actividad no se describe de dos formas distintas según la página.
 *
 * `offers` solo aparece cuando el precio SE VE en la página. `availability`
 * nunca: las actividades se reservan y tienen mínimo de personas, así que
 * afirmar "InStock" sería decir algo que el sitio no dice.
 *
 * La entidad de la viña no se repite acá: la emite `buildActividadesJsonLd` y
 * el resto de las páginas principales. Este bloque la referencia por `@id`.
 */

const WINERY_ID = `${SITE_URL}/#winery`;

const absolute = (url: string) => (url.startsWith("http") ? url : `${SITE_URL}${url}`);

type Copy = { name: string; description: string; image: string };

/**
 * Los textos de la miga llegan traducidos desde la página y no se escriben acá:
 * tienen que ser los MISMOS que muestra `ActivityBreadcrumbs`. Un breadcrumb
 * marcado que no coincide con el visible es marcado inventado.
 */
type Crumbs = { home: string; activities: string; category: string };

export function buildActivityJsonLd(
  locale: string,
  activity: Activity,
  copy: Copy,
  crumbLabels: Crumbs,
) {
  const path = activityPath(activity);
  const url = `${SITE_URL}/${locale}${path}`;

  const product: Record<string, unknown> = {
    "@type": "Product",
    "@id": `${url}#activity`,
    name: copy.name,
    description: copy.description,
    image: absolute(copy.image),
    url,
    brand: { "@type": "Brand", name: "Viña Casa Acosta" },
  };

  if (activity.priceCLP !== undefined) {
    product.offers = {
      "@type": "Offer",
      price: activity.priceCLP,
      priceCurrency: "CLP",
      url,
      seller: { "@id": WINERY_ID },
    };
  }

  const crumbs = [
    { name: crumbLabels.home, item: `${SITE_URL}/${locale}` },
    { name: crumbLabels.activities, item: `${SITE_URL}/${locale}/actividades` },
    {
      name: crumbLabels.category,
      item: `${SITE_URL}${categoryIndexHref(locale, activity.category)}`,
    },
    { name: copy.name, item: url },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      product,
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.item,
        })),
      },
    ],
  };
}
