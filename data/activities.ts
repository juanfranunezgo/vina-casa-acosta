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

/**
 * Una foto propia de la actividad. `alt` NO es el texto alternativo: es la
 * clave bajo `activities.items.{slug}.photos` de donde sale, traducido, en los
 * tres idiomas. El texto de una foto describe lo que pasa en ella y eso se lee
 * en pantalla —lo lee un lector de pantalla— así que vive en messages como
 * cualquier otro copy, no acá.
 */
export type ActivityPhoto = { src: string; alt: string };

/**
 * Fotos propias de la actividad, una por ranura de la ficha. Ausente = la ficha
 * usa lo que ya tenía: la foto de la categoría en las ranuras de foto y el
 * marco vacío en la galería.
 *
 * Existe porque hasta acá TODAS las fichas mostraban las mismas dos fotos —el
 * letrero de la viña y la pareja en el columpio—, que son de la viña pero no de
 * la actividad. Una foto de otra actividad le dice al visitante que así se ve
 * esta, y no es cierto. El día que llegue el material de otra experiencia, es
 * un bloque más acá abajo y ninguna línea de página.
 */
export type ActivityPhotos = {
  /** Dd1 — junto a la bajada, ranura 4:3. */
  intro?: ActivityPhoto;
  /** Dd5 — cabecera de la tarjeta de reserva, 16:10. */
  card?: ActivityPhoto;
  /** Dd7 — panel junto al formulario; la ranura cambia de proporción. */
  reserve?: ActivityPhoto;
  /**
   * Dd6 — mosaico: una apertura 16:9 y hasta tres verticales 2:3. Si falta,
   * la ficha dibuja `GalleryPlaceholder` como siempre.
   */
  gallery?: { wide: ActivityPhoto; portraits: ActivityPhoto[] };
};

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
  /** Dd1 — hero de la ficha, y la miniatura en toda grilla que la liste. */
  image: string;
  photos?: ActivityPhotos;
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

/**
 * Categorías que HOY tienen en el índice `/actividades` una sección que las
 * LISTA. No es una preferencia de diseño: es el estado del índice. Solo `tours`
 * califica. Talleres no tiene sección, y la que se llama Experiencias son tres
 * tarjetas-puerta —Vendimia, Talleres, Tren EFE— donde no está ninguna de las
 * ocho experiencias del catálogo.
 *
 * La miga de una ficha y el redirect de la URL padre enlazan al ancla solo si
 * la categoría figura acá; el resto va al índice sin fragmento. Un ancla que no
 * existe no falla —el navegador deja al visitante arriba de la página— y una
 * que existe pero muestra otra cosa es peor: el `BreadcrumbList` declara una
 * jerarquía que la página no sostiene.
 *
 * `tests/actividades-anclas.test.mjs` empareja esta lista con los `id=` que el
 * índice renderiza, en las dos direcciones. Cuando el plan 3 estrene las
 * secciones que faltan, se pone rojo hasta que esta lista las reconozca.
 */
export const CATEGORIES_WITH_INDEX_ANCHOR: readonly ActivityCategory[] = [
  "tours",
];

/** Destino de la miga de categoría, con prefijo de idioma. */
export function categoryIndexHref(
  locale: string,
  category: ActivityCategory,
): string {
  return CATEGORIES_WITH_INDEX_ANCHOR.includes(category)
    ? `/${locale}/actividades#${category}`
    : `/${locale}/actividades`;
}

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
    slug: "cosecha-tu-historia",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    slug: "enologo-por-un-dia",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    // El catálogo lo llama "Taller mimbre" y lo clasifica como experiencia.
    // La taxonomía del cliente manda: el nombre dice taller, la URL dice
    // experiencias. Ver el spec de subpáginas de actividades.
    slug: "mimbre",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT4H",
    // Primera actividad con material propio (taller de 2026-08-19). Las ocho
    // fotos salen de `npm run fotos:mimbre` — cada una recortada a la ranura
    // que ocupa, ver scripts/optimize-mimbre.mjs y docs/FOTOS.md.
    image: "/images/actividades/mimbre-hero.webp",
    photos: {
      intro: { src: "/images/actividades/mimbre-tejido.webp", alt: "tejido" },
      card: { src: "/images/actividades/mimbre-manos.webp", alt: "manos" },
      reserve: { src: "/images/actividades/mimbre-desayuno.webp", alt: "desayuno" },
      gallery: {
        wide: { src: "/images/actividades/mimbre-canastos.webp", alt: "canastos" },
        portraits: [
          { src: "/images/actividades/mimbre-artesana.webp", alt: "artesana" },
          { src: "/images/actividades/mimbre-maestro.webp", alt: "maestro" },
          { src: "/images/actividades/mimbre-piezas.webp", alt: "piezas" },
        ],
      },
    },
  },
  {
    slug: "alpacas",
    category: "experiencias",
    minPeople: 20,
    months: [9, 10, 11],
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    // Sin `durationISO`: el catálogo dice "Actividad breve de temporada", que
    // no es una duración medible. Inventar PT1H sería marcar un dato que el
    // cliente no dio.
    slug: "lagrimas-de-invierno",
    category: "experiencias",
    minPeople: 10,
    months: [7, 8],
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    slug: "apicultura",
    category: "experiencias",
    minPeople: 8,
    months: [9, 10],
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    slug: "yoga",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
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

/**
 * Puerta de categoría: la tarjeta que despliega las fichas de su categoría en
 * vez de llevar a una sola. Las de alianza no despliegan nada — enlazan al
 * sitio del socio.
 */
export type CategoryDoor = {
  slug: string;
  image: string;
  /** Categoría que despliega. Ausente en las de alianza. */
  category?: ActivityCategory;
  /** Sitio del socio. Ausente en las que despliegan. */
  purchaseUrl?: string;
};

/**
 * Las tres puertas, en orden. Son las MISMAS tarjetas en el mosaico del Inicio
 * (A4) y en el índice de Actividades (D3), y hasta el 2026-08-21 vivían
 * duplicadas: una lista en cada página, sólo una de las dos abría menú y la del
 * Inicio mandaba al índice —o sea, a la página donde están estas tarjetas—.
 * Acá arriba no pueden divergir.
 *
 * El nombre visible sale de `messages → experiences.<slug>.name`, y no de este
 * archivo, porque cambia con el idioma.
 */
export const categoryDoors: CategoryDoor[] = [
  {
    slug: "experiencias",
    image: "/images/actividades/vendimia-2026.jpg",
    category: "experiencias",
  },
  {
    slug: "talleres",
    image: "/images/actividades/talleres.jpg",
    category: "talleres",
  },
  // Las alianzas entran solas: agregar una a `alliances` le da su puerta en las
  // dos páginas, sin repetir la URL en ninguna de las dos.
  ...alliances.map((alianza) => ({
    slug: alianza.slug,
    image: alianza.image,
    purchaseUrl: alianza.purchaseUrl,
  })),
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

/**
 * Ruta del hub de Vendimia, sin prefijo de idioma. `null` la apaga en todas las
 * superficies a la vez —navbar, índice y sitemap preguntan por ella— para no
 * enlazar a un 404 desde el sitio entero mientras la página no exista.
 *
 * `vendimia` es segmento reservado (ver RESERVED_ACTIVITY_SEGMENTS): la carpeta
 * estática gana sobre `[categoria]`, así que el hub y las fichas conviven.
 */
export const VENDIMIA_HUB: string | null = "/actividades/vendimia";

/**
 * Meses de vendimia. Es la única fecha que el hub publica, y a propósito: la
 * cosecha depende de la maduración de la uva, así que la viña confirma cada
 * jornada por temporada. Publicar un día concreto sería anunciar algo que
 * todavía no está decidido — y el material que teníamos era de la temporada
 * pasada.
 */
export const VENDIMIA_MONTHS: number[] = [4, 5];

/**
 * Actividades que el hub ofrece como "otras formas de vivir el ciclo": las dos
 * que siguen a la vid fuera de la cosecha. Es una lista explícita y no un filtro
 * por meses porque la relación es de contenido, no de calendario.
 */
export const VENDIMIA_RELATED_SLUGS: readonly string[] = [
  "cosecha-tu-historia",
  "lagrimas-de-invierno",
];

/** Las fichas que el hub enlaza, en el orden declarado arriba. */
export function vendimiaRelatedActivities(): Activity[] {
  return VENDIMIA_RELATED_SLUGS.map((slug) =>
    activities.find((activity) => activity.slug === slug),
  ).filter((activity): activity is Activity => activity !== undefined);
}

export type MenuColumn = { category: ActivityCategory; items: Activity[] };

/**
 * El árbol que consumen el mega-menú del navbar y las tarjetas selectoras. Una
 * sola fuente: que las dos superficies muestren lo mismo no puede depender de
 * que alguien se acuerde de actualizar las dos.
 */
export function activityMenu(): MenuColumn[] {
  return ACTIVITY_CATEGORIES.map((category) => ({
    category,
    items: activitiesByCategory(category),
  }));
}
