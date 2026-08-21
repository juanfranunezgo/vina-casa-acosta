import { SITE_URL } from "@/lib/siteUrl";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_E164,
  FACEBOOK_URL,
  GOOGLE_MAPS_URL,
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
 * El nodo se emite completo en las cinco páginas principales y en cada ficha de
 * vino (`lib/wineJsonLd.ts` lo reusa desde acá). Es lo que hace cualquier sitio
 * con LocalBusiness y lo que Google espera: así ninguna página depende de que el
 * crawler haya visitado otra para resolver la entidad — que es justo el caso
 * cuando la visita llega desde un buscador o desde un motor de IA.
 */

export const WINERY_ID = `${SITE_URL}/#winery`;
const WEBSITE_ID = `${SITE_URL}/#website`;


/**
 * Horario tal como se lee en `/contacto` y en el pie: "Lun a Vie · 08:00 –
 * 16:30" y "Sáb · 08:00 – 12:00 y 13:00 – 17:00". El sábado va en DOS bloques y
 * no en uno de 08:00 a 17:00: el corte de mediodía existe, y declararlo corrido
 * le promete a Google —y a quien lea la ficha del negocio— una hora en que no
 * hay nadie.
 */
const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "16:30",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Saturday"],
    opens: "08:00",
    closes: "12:00",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Saturday"],
    opens: "13:00",
    closes: "17:00",
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
export function wineryNode(locale: string, description: string) {
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

/**
 * Una persona del equipo, con los textos ya traducidos por la pagina.
 *
 * `key` no es decorativo: es el fragmento del `@id` de su nodo, y por eso tiene
 * que ser el mismo identificador que usa `staffMembers` en la pagina. Si un dia
 * se renombra alli, el `@id` de esa persona cambia y Google lo lee como otra
 * entidad — no como la misma con otro nombre.
 */
type StaffMember = {
  key: string;
  name: string;
  /** Cargo tal como se lee sobre el nombre, ej. "Agronomo". */
  role: string;
  /** Resena de la persona, el mismo parrafo que muestra la pagina. */
  bio: string;
  /** Retrato, ruta de `public/`. */
  image: string;
};

/**
 * Staff: las personas del equipo como entidades, no como texto suelto.
 *
 * Por que vale la pena: es la pagina donde el sitio demuestra que detras de la
 * vina hay gente con nombre, cargo y trayectoria — exactamente la senal de
 * experiencia y autoria que Google evalua bajo E-E-A-T, y lo primero que un
 * motor de IA busca cuando alguien pregunta "quien hace este vino". Hasta ahora
 * esa informacion estaba solo en el HTML de la pagina, legible para una persona
 * y opaca para un parser.
 *
 * Cada `Person` declara unicamente lo que la ficha muestra: nombre, cargo,
 * resena y retrato. No hay `sameAs` porque el sitio no publica perfiles
 * personales de nadie, y no hay `email` ni `telephone` porque los datos de
 * contacto son los de la vina, no los de cada persona. Inventar un perfil o
 * repartir el telefono del negocio entre cuatro personas serian dos formas
 * distintas de decir algo que la pagina no dice.
 *
 * `worksFor` y `employee` son el mismo vinculo declarado desde los dos lados.
 * Es redundante a proposito: los consumidores de structured data no recorren el
 * grafo igual, y con la relacion en ambas direcciones ninguno tiene que
 * inferirla.
 */
export function buildStaffJsonLd(
  locale: string,
  copy: PageCopy,
  members: StaffMember[],
) {
  const url = `${SITE_URL}/${locale}/staff`;

  const personas = members.map((member) => ({
    "@type": "Person",
    "@id": `${url}#${member.key}`,
    name: member.name,
    jobTitle: member.role,
    description: member.bio,
    image: `${SITE_URL}${member.image}`,
    worksFor: { "@id": WINERY_ID },
  }));

  return graph([
    {
      ...wineryNode(locale, copy.description),
      employee: personas.map((persona) => ({ "@id": persona["@id"] })),
    },
    ...personas,
    {
      "@type": "AboutPage",
      "@id": `${url}#page`,
      url,
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
  /**
   * Ruta de la ficha SIN prefijo de idioma, tal como la arma `activityPath()`.
   * Llega armada a propósito: reconstruirla acá desde el slug fue lo que dejó
   * este `ItemList` apuntando a la URL plana anterior a la migración por
   * categoría, que hoy es un 404.
   */
  path: string;
  /** Ausente cuando la actividad no publica precio: entonces no se emite `offers`. */
  priceCLP?: number;
  image: string;
};

/**
 * Actividades: la colección de tours, cada uno con su precio.
 *
 * El precio se declara porque **se ve en la página** (la grilla lo muestra
 * formateado), y el `Offer` lleva `availability: InStock` porque el campo
 * describe la OFERTA —el tour se vende hoy, con su precio a la vista—, no el
 * cupo de una fecha concreta: la reserva y el mínimo de personas se acuerdan
 * después, y ninguna de las dos es lo que `availability` declara. Este archivo
 * decía lo contrario hasta el aviso de Search Console del 20-08-2026, que
 * nombró a los tres tours de ESTA lista —el `ItemList` de la página es lo que
 * Google tenía rastreado, no las fichas—. La viña confirmó ese día que los tres
 * tienen cupo. `lib/activityJsonLd.ts` lo declara con el mismo criterio.
 *
 * Por el mismo criterio, una actividad sin precio publicado sale **sin**
 * `offers`: un `Offer` sin `price` no produce rich result y afirma una oferta
 * que la página no hace.
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
          url: `${SITE_URL}/${locale}${tour.path}`,
          brand: { "@type": "Brand", name: "Viña Casa Acosta" },
          ...(tour.priceCLP === undefined
            ? {}
            : {
                offers: {
                  "@type": "Offer",
                  price: tour.priceCLP,
                  priceCurrency: "CLP",
                  availability: "https://schema.org/InStock",
                  url: `${SITE_URL}/${locale}${tour.path}`,
                  seller: { "@id": WINERY_ID },
                },
              }),
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
