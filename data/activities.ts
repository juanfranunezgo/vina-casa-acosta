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
export type ActivityPhoto = {
  src: string;
  alt: string;
  /**
   * `object-position` en la ranura, cuando el centro de la foto no es lo que
   * importa. Hoy sólo lo usa el panel del formulario del yoga: una foto
   * apaisada en un panel alto, donde el centro es la mesa y las caras están a
   * la izquierda.
   */
  position?: string;
};

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
   * Dd6 — mosaico: una apertura 16:9 y hasta tres verticales 2:3 (ninguna si
   * la actividad no tiene fotos para eso: los ñoquis). Si falta, la ficha
   * dibuja `GalleryPlaceholder` como siempre.
   *
   * `more` son las fotos que no caben en las ranuras: quedan detrás de "Ver
   * más fotos", como en la galería de Vendimia (Dv6). La viña pidió publicar
   * todo lo que mandó salvo las casi repetidas (2026-09-29).
   */
  gallery?: { wide: ActivityPhoto; portraits: ActivityPhoto[]; more?: ActivityExtraPhoto[] };
};

/**
 * Una foto de "Ver más fotos". Sale recortada a 3:2, o a 2:3 si es `vertical`:
 * las dos proporciones nativas de la cámara, para que el mosaico no tenga que
 * adivinar el alto de cada una.
 */
export type ActivityExtraPhoto = ActivityPhoto & { vertical?: boolean };

/**
 * De qué está hecha una etapa del horario. La ficha la pinta con un color de la
 * paleta —la mañana del yoga va del agua saborizada al vino— y por eso se
 * declara acá como dato y no se deduce del orden: un programa que arranca con
 * la cata no tiene por qué empezar en verde.
 */
export type ScheduleTone = "agua" | "parra" | "mesa" | "vino";

/** Una etapa del programa con horario. Título y texto viven en messages. */
export type ScheduleStage = { minutes: number; tone: ScheduleTone };

/**
 * Campos que el formulario de reserva pide además de los de siempre.
 *
 * - `eleccion` — lo que el grupo elige del menú (en el yoga, los sándwiches).
 *   El rótulo cambia con la actividad, así que sale de
 *   `activities.items.{slug}.form.choice*`.
 * - `restricciones` — alergias y restricciones alimentarias.
 *
 * Hubo un tercero, `segundaFecha`, que sólo pedía el yoga; la viña lo sacó el
 * 2026-09-25.
 */
export type BookingField = "eleccion" | "restricciones";

export type Activity = {
  /** Único en todo el catálogo. Es la clave en messages y el segmento de URL. */
  slug: string;
  category: ActivityCategory;
  /**
   * CLP por persona. Ausente = la ficha muestra "precio a consultar" y el
   * formulario pasa a modo cotización. No se inventan cifras: hoy tienen
   * precio confirmado por el cliente los tours, los talleres y el yoga; el
   * resto de las experiencias sigue a pedido.
   */
  priceCLP?: number;
  /**
   * `priceCLP` es neto y la ficha lo dice junto a la cifra ("$39.900 + IVA").
   * Ausente = la ficha no afirma nada sobre el IVA, porque el cliente no lo
   * dijo. Hasta el 2026-09-25 el yoga publicaba el precio con IVA y el neto en
   * chico para empresas y agencias; la viña pidió un solo precio, el neto.
   */
  priceExcludesVAT?: boolean;
  /** Piso de personas por reserva. */
  minPeople: number;
  /**
   * Días de anticipación con que se reserva. El calendario del formulario no
   * deja elegir antes de hoy + N (en hora de Chile). Ausente = desde hoy.
   * Si se declara, el `reservationNote` de la actividad tiene que decir el
   * mismo número en los tres idiomas: lo exige `tests/reserva-anticipacion`.
   */
  minAdvanceDays?: number;
  /** Meses en que se realiza, 1-12. Los doce = todo el año. */
  months: number[];
  /**
   * Duración en ISO 8601 para schema.org. Ausente cuando el catálogo no da una
   * duración medible ("jornada completa", "actividad breve de temporada").
   * La duración que se LEE en pantalla vive en messages, no acá.
   */
  durationISO?: string;
  /**
   * Programa con horario: minutos y tono de cada etapa, en orden. Si está, la
   * ficha dibuja la regla de la jornada en vez de la lista numerada de
   * `program`, y el copy va en `activities.items.{slug}.schedule`. Las etapas
   * tienen que sumar `durationISO`: lo exige `tests/yoga-entre-vinas`.
   */
  schedule?: ScheduleStage[];
  /** Campos extra del formulario de reserva. Ver `BookingField`. */
  bookingFields?: readonly BookingField[];
  /**
   * El precio y los dos botones de reserva van también en el hero, para que en
   * celular se vean sin bajar. Por ahora sólo el yoga: lo pidió la viña en su
   * documento y Juan Francisco decidió no extenderlo a las otras fichas.
   */
  heroBooking?: boolean;
  /** Dd1 — hero de la ficha, y la miniatura en toda grilla que la liste. */
  image: string;
  /**
   * `object-position` del hero, cuando el centro de la foto no es el punto
   * que importa. En escritorio el hero es apaisado y muestra sólo una franja
   * de una foto vertical; el título, centrado abajo, tapa lo que cae ahí.
   * Ausente = centro.
   */
  heroPosition?: string;
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
 * Foto por categoría, para las actividades que todavía no tienen material
 * propio. Son fotos que ya existen y están optimizadas en `public/`. Cuando
 * llega el de una actividad, su `image` pisa a la de su categoría.
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
    // El cliente confirmó el precio de los tres talleres el 2026-08-21: 39.900
    // por persona, el mismo para los tres. Hasta entonces salían sin cifra, y
    // la ficha caía sola en "precio a consultar" con el formulario en modo
    // cotización. Con precio, las tres pasan a modo reserva y su ficha publica
    // un Offer — ver lib/activityJsonLd.ts.
    priceCLP: 39900,
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    image: "/images/actividades/pizzas-armadas.webp",
    // Vertical: la franja del escritorio sube a las caras y las pizzas.
    heroPosition: "50% 35%",
    photos: {
      intro: { src: "/images/actividades/pizzas-amasado.webp", alt: "amasado" },
      card: { src: "/images/actividades/pizzas-ingredientes.webp", alt: "ingredientes" },
      // La del hero, repetida a propósito: pedido de Juan Francisco.
      reserve: { src: "/images/actividades/pizzas-armadas-panel.webp", alt: "armadas", position: "50% 45%" },
      gallery: {
        wide: { src: "/images/actividades/pizzas-bodega.webp", alt: "bodega" },
        portraits: [
          { src: "/images/actividades/pizzas-amasador.webp", alt: "amasador" },
          { src: "/images/actividades/pizzas-armado.webp", alt: "armado" },
          { src: "/images/actividades/pizzas-queso.webp", alt: "queso" },
          { src: "/images/actividades/pizzas-mesa.webp", alt: "mesa" },
        ],
      },
    },
  },
  {
    slug: "pastas",
    category: "talleres",
    priceCLP: 39900,
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    image: "/images/actividades/pastas-fideos.webp",
    heroPosition: "70% 65%",
    photos: {
      intro: { src: "/images/actividades/pastas-amasado.webp", alt: "amasado" },
      card: { src: "/images/actividades/pastas-plato.webp", alt: "plato" },
      reserve: { src: "/images/actividades/pastas-doblado.webp", alt: "doblado", position: "50% 50%" },
      gallery: {
        wide: { src: "/images/actividades/pastas-mesa.webp", alt: "mesa" },
        portraits: [
          { src: "/images/actividades/pastas-disco.webp", alt: "disco" },
          { src: "/images/actividades/pastas-relleno.webp", alt: "relleno" },
          { src: "/images/actividades/pastas-laminado.webp", alt: "laminado" },
        ],
      },
    },
  },
  {
    slug: "noquis",
    category: "talleres",
    priceCLP: 39900,
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    // Cinco fotos: la galería queda sólo con la apertura.
    image: "/images/actividades/noquis-masa.webp",
    // Los cilindros de masa están en el tercio de abajo a la izquierda.
    heroPosition: "20% 100%",
    photos: {
      intro: { src: "/images/actividades/noquis-formado.webp", alt: "formado" },
      card: { src: "/images/actividades/noquis-mesa.webp", alt: "mesa" },
      reserve: { src: "/images/actividades/noquis-sonrisa.webp", alt: "sonrisa", position: "100% 0%" },
      gallery: {
        wide: { src: "/images/actividades/noquis-bandeja.webp", alt: "bandeja" },
        portraits: [],
      },
    },
  },
  {
    slug: "ombu",
    category: "tours",
    priceCLP: 30000,
    minPeople: 2,
    months: TODO_EL_ANO,
    durationISO: "PT2H",
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    image: "/images/actividades/ombu-copas.webp",
    heroPosition: "50% 40%",
    photos: {
      intro: { src: "/images/actividades/ombu-reserva.webp", alt: "reserva" },
      card: { src: "/images/actividades/ombu-botella.webp", alt: "botella" },
      reserve: { src: "/images/actividades/ombu-rosado.webp", alt: "rosado", position: "45% 42%" },
      gallery: {
        wide: { src: "/images/actividades/ombu-barricas.webp", alt: "barricas" },
        portraits: [
          { src: "/images/actividades/ombu-mesa.webp", alt: "mesa" },
          { src: "/images/actividades/ombu-taponadora.webp", alt: "taponadora" },
          { src: "/images/actividades/ombu-bodega.webp", alt: "bodega" },
        ],
      },
    },
  },
  {
    slug: "bera",
    category: "tours",
    priceCLP: 35000,
    minPeople: 2,
    months: TODO_EL_ANO,
    durationISO: "PT2H30M",
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    // Seis fotos: la galería queda con una sola vertical.
    image: "/images/actividades/bera-vinedo.webp",
    heroPosition: "35% 6%",
    photos: {
      intro: { src: "/images/actividades/bera-barrica.webp", alt: "barrica" },
      card: { src: "/images/actividades/bera-sala-barricas.webp", alt: "salaBarricas" },
      reserve: { src: "/images/actividades/bera-mesa.webp", alt: "mesa", position: "50% 62%" },
      gallery: {
        wide: { src: "/images/actividades/bera-camino.webp", alt: "camino" },
        portraits: [
          { src: "/images/actividades/bera-pipeta.webp", alt: "pipeta" },
        ],
      },
    },
  },
  {
    slug: "carmenere",
    category: "tours",
    priceCLP: 45000,
    minPeople: 4,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    image: "/images/actividades/carmenere-grupo.webp",
    // En celular manda la X: 65% suma al anfitrión, a la derecha del grupo.
    heroPosition: "68% 28%",
    photos: {
      intro: { src: "/images/actividades/carmenere-gran-reserva.webp", alt: "granReserva" },
      card: { src: "/images/actividades/carmenere-guidai.webp", alt: "guidai" },
      reserve: { src: "/images/actividades/carmenere-espumante.webp", alt: "espumante", position: "50% 40%" },
      gallery: {
        wide: { src: "/images/actividades/carmenere-barricas.webp", alt: "barricas" },
        portraits: [
          { src: "/images/actividades/carmenere-pipeta.webp", alt: "pipeta" },
          { src: "/images/actividades/carmenere-copas.webp", alt: "copas" },
          { src: "/images/actividades/carmenere-mesa.webp", alt: "mesa" },
        ],
        more: [
          { src: "/images/actividades/carmenere-cata.webp", alt: "cata" },
          { src: "/images/actividades/carmenere-botella.webp", alt: "botella" },
          { src: "/images/actividades/carmenere-barrica-pipeta.webp", alt: "barricaPipeta" },
        ],
      },
    },
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
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    image: "/images/actividades/enologo-probeta.webp",
    heroPosition: "50% 45%",
    photos: {
      intro: { src: "/images/actividades/enologo-pipeta.webp", alt: "pipeta" },
      card: { src: "/images/actividades/enologo-mesa.webp", alt: "mesa" },
      reserve: { src: "/images/actividades/enologo-copa.webp", alt: "copa", position: "40% 50%" },
      gallery: {
        wide: { src: "/images/actividades/enologo-fichas.webp", alt: "fichas" },
        portraits: [
          { src: "/images/actividades/enologo-medicion.webp", alt: "medicion" },
          { src: "/images/actividades/enologo-embotellado.webp", alt: "embotellado" },
          { src: "/images/actividades/enologo-maridaje.webp", alt: "maridaje" },
        ],
        more: [
          { src: "/images/actividades/enologo-botellas.webp", alt: "botellas" },
          { src: "/images/actividades/enologo-varilla.webp", alt: "varilla" },
          { src: "/images/actividades/enologo-etiqueta.webp", alt: "etiqueta" },
          { src: "/images/actividades/enologo-botella-numerada.webp", alt: "botellaNumerada" },
        ],
      },
    },
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
          // Desde el 2026-09-29, en lugar de `piezas`: la mesa de canastos ya
          // estaba en el hero y en la apertura, y ésta es la única con la viña
          // y la cordillera. `piezas` pasa a "Ver más fotos".
          { src: "/images/actividades/mimbre-preparacion.webp", alt: "preparacion" },
        ],
        // De otro taller (tanda "Fotos Taller Web", `npm run fotos:actividades`).
        more: [
          { src: "/images/actividades/mimbre-presentacion.webp", alt: "presentacion" },
          { src: "/images/actividades/mimbre-grupo.webp", alt: "grupo" },
          { src: "/images/actividades/mimbre-piezas.webp", alt: "piezas", vertical: true },
          { src: "/images/actividades/mimbre-maestro-corte.webp", alt: "maestroCorte", vertical: true },
          { src: "/images/actividades/mimbre-ninas.webp", alt: "ninas", vertical: true },
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
    // Fotos de la tanda "Fotos Taller Web" (2026-09-29). Salen de
    // `npm run fotos:actividades`, cada una recortada a su ranura: ver
    // scripts/optimize-actividades.mjs y docs/FOTOS.md.
    image: "/images/actividades/alpacas-vellon.webp",
    heroPosition: "53% 40%",
    photos: {
      intro: { src: "/images/actividades/alpacas-fibra.webp", alt: "fibra" },
      card: { src: "/images/actividades/alpacas-rueca.webp", alt: "rueca" },
      reserve: { src: "/images/actividades/alpacas-tijeras.webp", alt: "tijeras", position: "46% 50%" },
      gallery: {
        wide: { src: "/images/actividades/alpacas-corral.webp", alt: "corral" },
        portraits: [
          { src: "/images/actividades/alpacas-instructor.webp", alt: "instructor" },
          { src: "/images/actividades/alpacas-cardado.webp", alt: "cardado" },
          { src: "/images/actividades/alpacas-madeja.webp", alt: "madeja" },
        ],
        more: [
          { src: "/images/actividades/alpacas-desayuno.webp", alt: "desayuno" },
          { src: "/images/actividades/alpacas-charla.webp", alt: "charla" },
          { src: "/images/actividades/alpacas-trasquila.webp", alt: "trasquila" },
          { src: "/images/actividades/alpacas-vellon-lavado.webp", alt: "vellonLavado" },
          { src: "/images/actividades/alpacas-artesana.webp", alt: "artesana" },
          { src: "/images/actividades/alpacas-hilado.webp", alt: "hilado" },
          { src: "/images/actividades/alpacas-rueca-hilado.webp", alt: "ruecaHilado" },
          { src: "/images/actividades/alpacas-telar.webp", alt: "telar" },
          { src: "/images/actividades/alpacas-urdimbre.webp", alt: "urdimbre" },
          { src: "/images/actividades/alpacas-telar-familia.webp", alt: "telarFamilia" },
          { src: "/images/actividades/alpacas-toldo.webp", alt: "toldo" },
          { src: "/images/actividades/alpacas-camino.webp", alt: "camino" },
          { src: "/images/actividades/alpacas-almuerzo.webp", alt: "almuerzo" },
        ],
      },
    },
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
    // Contenido final de la viña, "Contenido web de la experiencia Yoga entre
    // Viñas" (septiembre 2026): precio, duración, programa, brunch y preguntas.
    // Es la primera experiencia con precio publicado.
    slug: "yoga",
    category: "experiencias",
    // Pedido de la viña (2026-09-25): "$39.900 + IVA (por persona)".
    priceCLP: 39900,
    priceExcludesVAT: true,
    minPeople: 8,
    // Pedido de la viña (2026-09-23): el yoga se reserva con 5 días de aviso.
    // El documento de septiembre no lo menciona, pero tampoco lo contradice.
    minAdvanceDays: 5,
    months: TODO_EL_ANO,
    durationISO: "PT3H15M",
    // Recepción con agua saborizada · yoga entre las parras · brunch · cata.
    schedule: [
      { minutes: 15, tone: "agua" },
      { minutes: 60, tone: "parra" },
      { minutes: 60, tone: "mesa" },
      { minutes: 60, tone: "vino" },
    ],
    bookingFields: ["eleccion", "restricciones"],
    heroBooking: true,
    // Fotos de sesiones reales, mandadas por la viña el 2026-09-24. Salen de
    // `npm run fotos:yoga`, cada una recortada a su ranura: ver
    // scripts/optimize-yoga.mjs y docs/FOTOS.md.
    image: "/images/actividades/yoga-hero.webp",
    // La franja del escritorio baja un poco: centrada, el título caía sobre
    // las piernas de la postura. En celular la foto entra casi entera y esto
    // no se nota.
    heroPosition: "50% 58%",
    photos: {
      intro: { src: "/images/actividades/yoga-grupo.webp", alt: "grupo" },
      card: { src: "/images/actividades/yoga-mesa.webp", alt: "mesa" },
      reserve: {
        src: "/images/actividades/yoga-brunch-grupo.webp",
        alt: "brunch",
        position: "15% 50%",
      },
      gallery: {
        wide: { src: "/images/actividades/yoga-brunch.webp", alt: "brunch" },
        portraits: [
          { src: "/images/actividades/yoga-parras.webp", alt: "parras" },
          { src: "/images/actividades/yoga-relajacion.webp", alt: "relajacion" },
          { src: "/images/actividades/yoga-instructora.webp", alt: "instructora" },
        ],
      },
    },
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
