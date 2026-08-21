import { SITE_URL } from "@/lib/siteUrl";
import {
  type Activity,
  activityPath,
  categoryIndexHref,
  VENDIMIA_HUB,
} from "@/data/activities";

/**
 * Structured data de una ficha de actividad.
 *
 * No se modela como `Event` ni como `Course`: los dos exigen fechas
 * (`startDate`, `hasCourseInstance`) que el catálogo del cliente no publica, y
 * declararlas inventadas es peor que no tener rich result.
 *
 * El tipo lo decide el precio, porque es lo que decide si hay oferta:
 *
 * - **Con precio publicado → `Product` + `Offer`.** Es lo que
 *   `lib/siteJsonLd.ts` emite para los mismos tours en el índice, así que la
 *   actividad no se describe de dos formas distintas según la página.
 * - **Sin precio → `Service`,** prestado por la viña. Un `Product` sin
 *   `offers`, `review` ni `aggregateRating` no es marcado incompleto: es el
 *   error CRÍTICO que Search Console levantó contra las 13 fichas de vino a
 *   principios de agosto de 2026, y el que volvería con las fichas sin precio
 *   apenas Google las rastree. Sin precio no hay oferta que declarar, y una
 *   actividad que se cotiza es un servicio, no un producto en góndola.
 *   Ninguna de esas fichas figura en el `ItemList` del índice —solo lista
 *   tours—, así que la rama no puede contradecir a la otra página.
 *
 * El `Offer` aparece solo cuando el precio SE VE en la página, y lleva
 * `availability: InStock` porque el campo describe la OFERTA —el tour se vende
 * hoy, con su precio y su formulario a la vista—, no el cupo de una fecha
 * concreta. La reserva y el mínimo de personas se acuerdan después; ninguna de
 * las dos es lo que `availability` declara. Este archivo decía lo contrario
 * hasta el aviso de Search Console del 20-08-2026: de los cinco que llegaron,
 * era el único con un arreglo honesto.
 *
 * La entidad de la viña no se repite acá: la emite `buildActividadesJsonLd` y
 * el resto de las páginas principales. Este bloque la referencia por `@id`.
 */

const WINERY_ID = `${SITE_URL}/#winery`;
const WEBSITE_ID = `${SITE_URL}/#website`;

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

  const identity = {
    "@id": `${url}#activity`,
    name: copy.name,
    description: copy.description,
    image: absolute(copy.image),
    url,
  };

  const activityNode =
    activity.priceCLP === undefined
      ? {
          "@type": "Service",
          ...identity,
          provider: { "@id": WINERY_ID },
        }
      : {
          "@type": "Product",
          ...identity,
          brand: { "@type": "Brand", name: "Viña Casa Acosta" },
          offers: {
            "@type": "Offer",
            price: activity.priceCLP,
            priceCurrency: "CLP",
            availability: "https://schema.org/InStock",
            url,
            seller: { "@id": WINERY_ID },
          },
        };

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
      activityNode,
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

/**
 * Structured data del hub de Vendimia.
 *
 * Va como `WebPage` y no como `Event` ni `Product`, y las dos ausencias son la
 * misma decisión: `Event` exige `startDate` y `Product` pide un precio, y esta
 * página no publica ninguno de los dos porque la viña todavía no los definió.
 * Marcar una fecha o una cifra inventada para ganar un rich result es
 * exactamente el marcado que Google penaliza — y además le mentiría al visitante
 * que llega desde el resultado.
 *
 * Cuando la viña confirme fechas y precio de una temporada, el nodo pasa a
 * `Event` con `startDate`, `location` y `offers`, y este comentario sobra.
 */
export function buildVendimiaJsonLd(
  locale: string,
  copy: Copy,
  crumbLabels: { home: string; activities: string; vendimia: string },
) {
  const url = `${SITE_URL}/${locale}${VENDIMIA_HUB ?? "/actividades/vendimia"}`;

  const crumbs = [
    { name: crumbLabels.home, item: `${SITE_URL}/${locale}` },
    { name: crumbLabels.activities, item: `${SITE_URL}/${locale}/actividades` },
    { name: crumbLabels.vendimia, item: url },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name: copy.name,
        description: copy.description,
        inLanguage: locale,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": WINERY_ID },
        primaryImageOfPage: absolute(copy.image),
      },
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
