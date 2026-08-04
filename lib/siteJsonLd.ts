import { SITE_URL } from "@/lib/siteUrl";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_E164,
  FACEBOOK_URL,
  INSTAGRAM_URL,
} from "@/lib/contact";

/**
 * JSON-LD de la viña como entidad: quién es, dónde está, cuándo abre y con qué
 * perfiles se corresponde.
 *
 * Todo lo que sale acá es dato verificado del negocio, no relleno:
 *
 * - Dirección y horario salen del texto visible de `/contacto`
 *   (`messages/*.json` → `contacto.cards`), no de una suposición.
 * - Las coordenadas se leyeron del propio listado de Google del negocio, al que
 *   el footer ya enlaza (`maps.app.goo.gl/oWWNuFKGuqojD86B9` resuelve a
 *   `.../VIÑA+CASA+ACOSTA/@-34.465133,-71.009675`). No es un geocode adivinado a
 *   partir de la dirección: es lo que Google mismo tiene fichado para este local.
 * - `sameAs` son los tres perfiles que el footer ya muestra. No se inventa ninguno.
 *
 * Lo que NO está, y por qué: `priceRange` (no se declara en ninguna parte del
 * sitio) y `aggregateRating` (no hay reseñas propias publicadas; inventarlas o
 * copiarlas de Google sería marcado falso y motivo de penalización).
 *
 * El nodo se emite completo en las cinco páginas principales. Es lo que hace
 * cualquier sitio con LocalBusiness y lo que Google espera: así ninguna página
 * depende de que el crawler haya visitado otra para resolver la entidad.
 */

const WINERY_ID = `${SITE_URL}/#winery`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Perfil oficial en Google Maps — el mismo link del footer. */
const GOOGLE_MAPS_URL = "https://maps.app.goo.gl/oWWNuFKGuqojD86B9";

/**
 * Horario tal como se lee en `/contacto`: "Lun a Sáb · 10:00 – 18:00" con
 * "Jueves hasta las 20:00". Por eso el jueves va en su propio bloque.
 */
const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"],
    opens: "10:00",
    closes: "18:00",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Thursday"],
    opens: "10:00",
    closes: "20:00",
  },
];

/**
 * La viña como local visitable.
 *
 * El tipo se declara doble a propósito. `Winery` ya es subtipo de
 * `LocalBusiness`, así que en teoría alcanza con el específico; en la práctica
 * hay validadores y parsers que solo tienen fichados los tipos de primer nivel y
 * ante `Winery` a secas no aplican las reglas de `LocalBusiness` (lo comprobamos:
 * el validador lo reportaba como tipo desconocido y se salteaba los requeridos).
 * Declarar los dos es JSON-LD válido, no cuesta nada y hace que lo reconozca
 * todo el mundo sin perder la precisión de decir que es una viña.
 */
function wineryNode(locale: string, description: string) {
  return {
    "@type": ["Winery", "LocalBusiness"],
    "@id": WINERY_ID,
    name: "Viña Casa Acosta",
    description,
    url: `${SITE_URL}/${locale}`,
    image: `${SITE_URL}/brand/og-image.png`,
    logo: `${SITE_URL}/brand/logo-negro.png`,
    telephone: `+${CONTACT_PHONE_E164}`,
    email: CONTACT_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Fundo El Llano, lote 6",
      addressLocality: "San Vicente de Tagua Tagua",
      addressRegion: "O'Higgins",
      addressCountry: "CL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -34.4651334,
      longitude: -71.0096746,
    },
    hasMap: GOOGLE_MAPS_URL,
    openingHoursSpecification: OPENING_HOURS,
    sameAs: [INSTAGRAM_URL, FACEBOOK_URL, GOOGLE_MAPS_URL],
  };
}

function webSiteNode(locale: string, name: string, description: string) {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name,
    description,
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
    publisher: { "@id": WINERY_ID },
  };
}

type PageCopy = { name: string; description: string };

/** Envuelve los nodos en un único `@graph`, que es como se enlazan por `@id`. */
function graph(nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** Inicio: la entidad del negocio + el sitio. */
export function buildHomeJsonLd(locale: string, copy: PageCopy) {
  return graph([
    wineryNode(locale, copy.description),
    webSiteNode(locale, copy.name, copy.description),
  ]);
}

/** Nuestra historia: página "acerca de" que habla de la viña. */
export function buildHistoriaJsonLd(locale: string, copy: PageCopy) {
  return graph([
    wineryNode(locale, copy.description),
    {
      "@type": "AboutPage",
      "@id": `${SITE_URL}/${locale}/historia#page`,
      url: `${SITE_URL}/${locale}/historia`,
      name: copy.name,
      description: copy.description,
      inLanguage: locale,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": WINERY_ID },
    },
  ]);
}

/**
 * Nuestros vinos: la página es una colección. El `ItemList` con los 13 vinos ya
 * lo emite `lib/wineJsonLd.ts` en su propio bloque, y se deja ahí a propósito
 * para no tocar ese archivo mientras `m3/catalogo-afeleia` lo está reescribiendo.
 * Dos bloques `ld+json` en la misma página son válidos y Google los une.
 */
export function buildVinosJsonLd(locale: string, copy: PageCopy) {
  return graph([
    wineryNode(locale, copy.description),
    {
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/${locale}/vinos#page`,
      url: `${SITE_URL}/${locale}/vinos`,
      name: copy.name,
      description: copy.description,
      inLanguage: locale,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": WINERY_ID },
    },
  ]);
}

type TourEntry = {
  slug: string;
  name: string;
  description: string;
  priceCLP: number;
  image: string;
};

/**
 * Actividades: la colección de tours, cada uno con su precio.
 *
 * El precio se declara porque **se ve en la página** (la grilla lo muestra
 * formateado). No se declara `availability`: los tours se reservan y tienen
 * mínimo de personas, así que afirmar "InStock" sería decir algo que el sitio
 * no dice. Google puede no mostrar rich result sin ese campo — preferible eso a
 * marcar disponibilidad que no está confirmada.
 */
export function buildActividadesJsonLd(
  locale: string,
  copy: PageCopy,
  tours: TourEntry[],
) {
  return graph([
    wineryNode(locale, copy.description),
    {
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/${locale}/actividades#page`,
      url: `${SITE_URL}/${locale}/actividades`,
      name: copy.name,
      description: copy.description,
      inLanguage: locale,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": WINERY_ID },
    },
    {
      "@type": "ItemList",
      name: copy.name,
      numberOfItems: tours.length,
      itemListElement: tours.map((tour, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: tour.name,
          description: tour.description,
          image: tour.image.startsWith("http")
            ? tour.image
            : `${SITE_URL}${tour.image}`,
          url: `${SITE_URL}/${locale}/actividades/${tour.slug}`,
          brand: { "@type": "Brand", name: "Viña Casa Acosta" },
          offers: {
            "@type": "Offer",
            price: tour.priceCLP,
            priceCurrency: "CLP",
            url: `${SITE_URL}/${locale}/actividades/${tour.slug}`,
            seller: { "@id": WINERY_ID },
          },
        },
      })),
    },
  ]);
}

/** Contacto: la página que da los datos del local. */
export function buildContactoJsonLd(locale: string, copy: PageCopy) {
  return graph([
    wineryNode(locale, copy.description),
    {
      "@type": "ContactPage",
      "@id": `${SITE_URL}/${locale}/contacto#page`,
      url: `${SITE_URL}/${locale}/contacto`,
      name: copy.name,
      description: copy.description,
      inLanguage: locale,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": WINERY_ID },
    },
  ]);
}
