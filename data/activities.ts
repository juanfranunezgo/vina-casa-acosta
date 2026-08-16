/**
 * Catálogo de actividades — SOLO datos duros.
 *
 * Todo el texto visible (nombre, bajada, programa, duración en palabras) vive en
 * `messages/{es,en,pt}.json`, namespace `activities.items.{slug}`. Acá no se
 * escribe copy: hasta la versión anterior de este archivo los campos `name`,
 * `description`, `highlights` y `duration` estaban duplicados con los mensajes
 * y ninguna parte del sitio los leía. Con 15 actividades esa duplicación son 15
 * lugares donde el nombre puede quedar distinto del que se muestra.
 *
 * `slug` es la clave en `messages` Y el segmento de la URL. Es único en todo el
 * catálogo, no por categoría: `tests/actividades-catalogo.test.mjs` lo afirma.
 */

export const ACTIVITY_CATEGORIES = ["tours", "talleres", "experiencias"] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export type Activity = {
  /** Único en todo el catálogo. Es la clave en messages y el segmento de URL. */
  slug: string;
  category: ActivityCategory;
  /**
   * CLP por persona. Ausente = la ficha muestra "precio a consultar" y el
   * formulario pasa a modo cotización. No se inventan cifras: el catálogo del
   * cliente solo trae precio para los tours.
   */
  priceCLP?: number;
  /** Piso de personas por reserva. */
  minPeople: number;
  /** Meses en que se realiza, 1-12. Los doce = todo el año. */
  months: number[];
  /**
   * Duración en ISO 8601 para schema.org. Ausente cuando el catálogo no da una
   * duración medible ("jornada completa", "actividad breve de temporada").
   * La duración que se LEE en pantalla vive en messages, no acá.
   */
  durationISO?: string;
  image: string;
  premium?: boolean;
};

/** Alianza vendida por un tercero: no es actividad nuestra ni tiene ficha. */
export type Alliance = {
  slug: string;
  image: string;
  purchaseUrl: string;
};

/**
 * Segmentos que la ruta `[categoria]` NO puede recibir porque ya existen —o van
 * a existir— como carpeta estática bajo `/actividades`. Next resuelve el
 * estático antes que el dinámico, así que una colisión no falla el build:
 * silencia una de las dos páginas.
 */
export const RESERVED_ACTIVITY_SEGMENTS: readonly string[] = [
  "vendimia",
  "eventos-privados",
];

const TODO_EL_ANO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Foto por categoría. Son fotos que ya existen y están optimizadas en `public/`:
 * el cliente todavía no entregó material por actividad. Cuando llegue, se agrega
 * `image` en la actividad y pisa a la de su categoría — una línea por foto.
 */
const CATEGORY_IMAGE: Record<ActivityCategory, string> = {
  tours: "/images/actividades/tour-carmenere.webp",
  talleres: "/images/actividades/talleres.jpg",
  experiencias: "/images/actividades/pareja-columpio.webp",
};

/**
 * Orden fijo: tours de menor a mayor precio. Es el que se ve en el submenú del
 * navbar, en la grilla D2 y en "otras actividades" de la ficha.
 */
export const activities: Activity[] = [
  {
    slug: "pizzas",
    category: "talleres",
    // Sin precio: el catálogo del cliente no publica ninguno para los talleres.
    // La ficha pasa sola a "precio a consultar" y el formulario, a cotización.
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.talleres,
  },
  {
    slug: "pastas",
    category: "talleres",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.talleres,
  },
  {
    slug: "noquis",
    category: "talleres",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.talleres,
  },
  {
    slug: "ombu",
    category: "tours",
    priceCLP: 30000,
    minPeople: 2,
    months: TODO_EL_ANO,
    durationISO: "PT2H",
    image:
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "bera",
    category: "tours",
    priceCLP: 35000,
    minPeople: 2,
    months: TODO_EL_ANO,
    durationISO: "PT2H30M",
    image:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "carmenere",
    category: "tours",
    priceCLP: 45000,
    minPeople: 4,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.tours,
    premium: true,
  },
  {
    slug: "cena-sensorial",
    category: "experiencias",
    minPeople: 12,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
];

export const alliances: Alliance[] = [
  {
    slug: "tren-efe",
    image: "/images/actividades/tren-efe.jpg",
    purchaseUrl: "https://pasajes.efe.cl/turistico/casa-acosta",
  },
];

export function activitiesByCategory(category: ActivityCategory): Activity[] {
  return activities.filter((activity) => activity.category === category);
}

/**
 * Busca por categoría Y slug. Que exija las dos no es redundante aunque el slug
 * sea único: la ruta recibe ambos de la URL, y sin el cruce
 * `/actividades/talleres/ombu` renderizaría el tour bajo una URL mentirosa.
 */
export function getActivity(category: string, slug: string): Activity | undefined {
  return activities.find(
    (activity) => activity.category === category && activity.slug === slug,
  );
}

/** Vista derivada. Los consumidores actuales siguen importando `tours`. */
export const tours: Activity[] = activitiesByCategory("tours");

/**
 * Ruta de la ficha, SIN prefijo de idioma. Es la única función que arma esta
 * URL: navbar, home, índice, sitemap y JSON-LD la consumen. Que exista una sola
 * es lo que hace que la próxima mudanza sea un cambio de una línea — la
 * anterior obligó a tocar cinco archivos y a publicar tres redirects.
 */
export function activityPath(activity: Activity): string {
  return `/actividades/${activity.category}/${activity.slug}`;
}
