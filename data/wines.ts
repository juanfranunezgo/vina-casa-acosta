export type WineLine = "Ombú" | "Lajau" | "Estación Francia" | "Berá" | "Guidaí" | "Yaráy Guá";

/**
 * Tipo de vino (filtro de la tienda).
 *
 * "Dulce" es la categoría comercial de la línea Yaráy Guá (cosecha tardía). El
 * cliente NO considera blanco al Yaráy Guá Chardonnay Viognier, así que el
 * filtro "Blanco" queda hoy sin vinos asociados a propósito.
 */
export type WineType = "Tinto" | "Rosado" | "Blanco" | "Espumante" | "Dulce";

/** Cepa o estilo principal, tal como se muestra en las tarjetas y fichas. */
export type Variety =
  | "Carmenere"
  | "Tannat"
  | "Cabernet Sauvignon"
  | "Chardonnay + Viognier"
  | "Ensamblaje";

/**
 * Agrupación de cepa para el filtro de la tienda. Se declara por vino en vez de
 * derivarse de `variety` porque varios vinos se etiquetan por su cepa dominante
 * pero técnicamente son ensamblaje (Estación Francia 95/5, Berá 90/10, Guidaí 90/10).
 */
export type CepaGroup = "Monovarietario" | "Ensamblaje" | "Chardonnay + Viognier";

/** Ficha técnica real extraída del documento del cliente. */
export type WineTechnical = {
  /** Composición de cepas, ej. "100% Carmenere". */
  blend: string;
  /** Graduación alcohólica, ej. "13,5%". */
  alcohol: string;
  /** Valle de origen. */
  valley: string;
  /** Sistema de conducción. */
  training: string;
  /** Volumen de la botella en ml. */
  volumeMl: number;
  /** Tipo de cierre / tapa. */
  closure: string;
  /** Temperatura de servicio recomendada, ej. "16° – 18°". */
  serve: string;
};

export type Wine = {
  slug: string;
  name: string;
  line: WineLine;
  type: WineType;
  variety: Variety;
  /** Grupo de cepa para el filtro de la tienda. */
  cepaGroup: CepaGroup;
  /**
   * Vino dulce / de cosecha tardía. Lo hace aparecer bajo el filtro "Dulce"
   * además de bajo su propio tipo (el Yaráy Guá Carmenere es tinto Y dulce).
   */
  sweet?: boolean;
  /** Nivel de la línea. Solo se asigna cuando es real (documento o etiqueta). */
  category?: "Reserva" | "Gran Reserva" | "Edición Limitada";
  image: string;
  /** PDF oficial para consultar la ficha técnica del vino. */
  technicalSheet: string;
  shortDescription: string;
  description: string;
  tastingNotes: string[];
  pairings: string[];
  technical: WineTechnical;
  priceCLP: number;
  /** Cosecha. Ausente en no-vintage (ej. Guidaí Espumante). */
  vintage?: number;
  featured?: boolean;
  badge?: string;
};

/**
 * Catálogo de vinos — Fase 1: datos estáticos.
 *
 * CLASIFICACIÓN y FICHA TÉCNICA: datos REALES tomados de
 * "Información de Vinos - Viña Casa Acosta.md" (13 vinos del cliente).
 *
 * PRECIOS: aún son ESTIMACIONES de demo (el documento del cliente no incluye
 * precios). El cliente debe validarlos antes de Fase 2 (Supabase).
 */
export const wines: Wine[] = [
  {
    slug: "ombu-carmenere",
    name: "Ombú Carmenere",
    line: "Ombú",
    type: "Tinto",
    variety: "Carmenere",
    cepaGroup: "Monovarietario",
    category: "Reserva",
    image: "/vinos/ombu-carmenere.png",
    technicalSheet: "/documentos/fichas-tecnicas/ombu-carmenere.pdf",
    shortDescription: "Carmenere Reserva 100%, de intensas notas especiadas y frutos negros maduros.",
    description:
      "Intenso color rojo cereza. Nariz compleja, de intensas notas especiadas y frutos negros maduros. En boca, taninos suaves y redondos, de buena estructura, largo y agradable final.",
    tastingNotes: ["Frutos negros maduros", "Especias", "Rojo cereza", "Taninos redondos"],
    pairings: ["Pastas", "Filete mignon", "Pastelera de maíz"],
    technical: {
      blend: "100% Carmenere",
      alcohol: "13,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 9900,
    vintage: 2024,
    featured: true,
    badge: "Insignia",
  },
  {
    slug: "ombu-tannat",
    name: "Ombú Tannat",
    line: "Ombú",
    type: "Tinto",
    variety: "Tannat",
    cepaGroup: "Monovarietario",
    category: "Reserva",
    image: "/vinos/ombu-tannat.png",
    technicalSheet: "/documentos/fichas-tecnicas/ombu-tannat.pdf",
    shortDescription: "Tannat Reserva 100%, de taninos firmes y buen potencial de guarda.",
    description:
      "Rojo cereza. En nariz, aromas a frutos negros como arándanos y moras, con algo de especias como pimienta negra y clavo de olor. De cuerpo complejo, con taninos firmes, acidez equilibrada y buen potencial de guarda.",
    tastingNotes: ["Arándanos", "Moras", "Pimienta negra", "Clavo de olor"],
    pairings: ["Carnes rojas", "Quesos maduros"],
    technical: {
      blend: "100% Tannat",
      alcohol: "13,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 9900,
    vintage: 2024,
  },
  {
    slug: "ombu-sauvignon",
    name: "Ombú Cabernet Sauvignon",
    line: "Ombú",
    type: "Tinto",
    variety: "Cabernet Sauvignon",
    cepaGroup: "Monovarietario",
    category: "Reserva",
    image: "/vinos/ombu-sauvignon.png",
    technicalSheet: "/documentos/fichas-tecnicas/ombu-cabernet-sauvignon.pdf",
    shortDescription: "Cabernet Sauvignon 100% del Valle del Cachapoal, equilibrado y sedoso.",
    description:
      "Nariz fresca, con notas a frutos secos, especias y frutos rojos maduros, y un leve toque de vainilla. Es equilibrado y carnoso, con taninos presentes pero sedosos, buen volumen y un final largo de muy buena persistencia.",
    tastingNotes: ["Frutos secos", "Especias", "Frutos rojos maduros", "Vainilla"],
    pairings: ["Cordero al palo", "Comida árabe"],
    technical: {
      blend: "100% Cabernet Sauvignon",
      alcohol: "13,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 9900,
    vintage: 2024,
  },
  {
    slug: "lajau-sam",
    name: "Lajau Sam",
    line: "Lajau",
    type: "Tinto",
    variety: "Ensamblaje",
    cepaGroup: "Ensamblaje",
    category: "Edición Limitada",
    image: "/vinos/lajau-sam.png",
    technicalSheet: "/documentos/fichas-tecnicas/lajau-sam.pdf",
    shortDescription: "Ensamblaje Carmenere–Tannat, estructurado y de largo retrogusto.",
    description:
      "Aromas a frutos negros muy maduros, especias y chocolate amargo. En boca es estructurado, equilibrado y de largo retrogusto.",
    tastingNotes: ["Frutos negros maduros", "Especias", "Chocolate amargo", "Largo retrogusto"],
    pairings: ["Masas con carne", "Entraña"],
    technical: {
      blend: "68% Carmenere, 32% Tannat",
      alcohol: "13,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 9900,
    vintage: 2024,
    featured: true,
    badge: "Edición Limitada",
  },
  {
    slug: "lajau-deti",
    name: "Lajau Detí",
    line: "Lajau",
    type: "Tinto",
    variety: "Ensamblaje",
    cepaGroup: "Ensamblaje",
    category: "Edición Limitada",
    image: "/vinos/lajau-deti.png",
    technicalSheet: "/documentos/fichas-tecnicas/lajau-deti.pdf",
    shortDescription: "Ensamblaje de Carmenere, Cabernet Sauvignon y Petit Verdot, elegante y complejo.",
    description:
      "Interesante rojo cereza con aromas frescos y complejos: intensa fruta negra, cacao y humo. Boca estructurada, de taninos suaves y elegantes, largo y de agradable final.",
    tastingNotes: ["Fruta negra", "Cacao", "Humo", "Taninos elegantes"],
    pairings: ["Quesos maduros", "Jabalí al romero"],
    technical: {
      blend: "50% Carmenere, 40% Cabernet Sauvignon, 10% Petit Verdot",
      alcohol: "13,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 9900,
    vintage: 2024,
  },
  {
    slug: "lajau-betum",
    name: "Lajau Betúm",
    line: "Lajau",
    type: "Tinto",
    variety: "Ensamblaje",
    cepaGroup: "Ensamblaje",
    category: "Edición Limitada",
    image: "/vinos/lajau-betum.png",
    technicalSheet: "/documentos/fichas-tecnicas/lajau-betum.pdf",
    shortDescription: "Ensamblaje de cuatro cepas, complejo y de gran volumen.",
    description:
      "Vino de intenso color rojo rubí con tintes violáceos. Muy complejo: fruta roja madura y fruta negra, con toques de humo y pimienta. Boca de buena estructura y volumen, de taninos jugosos, gran retrogusto y largo final.",
    tastingNotes: ["Fruta roja madura", "Fruta negra", "Humo", "Pimienta"],
    pairings: ["Queso de cabra", "Pato a la naranja", "Cordero"],
    technical: {
      blend: "30% Carmenere, 30% Cot, 20% Carignan, 20% Tannat",
      alcohol: "13,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 9900,
    vintage: 2024,
  },
  {
    slug: "lajau-betum-yu",
    name: "Lajau Betúm Yú",
    line: "Lajau",
    type: "Tinto",
    variety: "Ensamblaje",
    cepaGroup: "Ensamblaje",
    category: "Edición Limitada",
    image: "/vinos/lajau-betum-yu.png",
    technicalSheet: "/documentos/fichas-tecnicas/lajau-betum-yu.pdf",
    shortDescription: "Ensamblaje de cinco cepas, expresión cumbre de la línea Lajau.",
    description:
      "Vino de intenso color rojo rubí, de taninos presentes pero redondos y una acidez equilibrada. Final de boca con un toque a chocolate amargo y algo de humo, de largo final.",
    tastingNotes: ["Rojo rubí", "Chocolate amargo", "Humo", "Taninos redondos"],
    pairings: ["Carnes rojas a la parrilla"],
    technical: {
      blend: "40% Carmenere, 20% Syrah, 20% Cabernet Franc, 10% Marselan, 10% Arinarnoa",
      alcohol: "13,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 9900,
    vintage: 2024,
    badge: "Edición Limitada",
  },
  {
    slug: "estacion-francia-carmenere",
    name: "Estación Francia Carmenere",
    line: "Estación Francia",
    type: "Tinto",
    variety: "Carmenere",
    cepaGroup: "Ensamblaje",
    category: "Gran Reserva",
    image: "/vinos/estacion-francia-carmenere.png",
    technicalSheet: "/documentos/fichas-tecnicas/estacion-francia-carmenere.pdf",
    shortDescription: "Gran Reserva de Carmenere y Petit Verdot, de gran complejidad y guarda.",
    description:
      "Vivo color rojo guinda, con notas violáceas. Aromas a frutos negros, chocolate y especias, con toques de grosella, frutos secos y tabaco. En boca hay taninos sedosos; es jugoso y de buen equilibrio, con un final persistente.",
    tastingNotes: ["Frutos negros", "Chocolate", "Grosella", "Tabaco"],
    pairings: ["Costillas de cerdo", "Morcillas a la parrilla"],
    technical: {
      blend: "95% Carmenere, 5% Petit Verdot",
      alcohol: "14%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 18800,
    vintage: 2021,
    featured: true,
  },
  {
    slug: "estacion-francia-tannat",
    name: "Estación Francia Tannat",
    line: "Estación Francia",
    type: "Tinto",
    variety: "Tannat",
    cepaGroup: "Ensamblaje",
    category: "Gran Reserva",
    image: "/vinos/estacion-francia-tannat.png",
    technicalSheet: "/documentos/fichas-tecnicas/estacion-francia-tannat.pdf",
    shortDescription: "Gran Reserva de Tannat y Carmenere, potente y de gran estructura.",
    description:
      "Vino de intenso color. Aromas a frutos rojos maduros, ciruela y mora, con toques a cereza negra y notas a tabaco. Boca potente y de gran estructura, cuerpo robusto, largo y persistente.",
    tastingNotes: ["Frutos rojos maduros", "Ciruela", "Cereza negra", "Tabaco"],
    pairings: ["Garrón de cordero", "Quesos azules"],
    technical: {
      blend: "90% Tannat, 10% Carmenere",
      alcohol: "14%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "16° – 18°",
    },
    priceCLP: 18800,
    vintage: 2021,
  },
  {
    slug: "bera",
    name: "Berá",
    line: "Berá",
    type: "Rosado",
    variety: "Carmenere",
    cepaGroup: "Ensamblaje",
    image: "/vinos/bera.png",
    technicalSheet: "/documentos/fichas-tecnicas/bera-rose.pdf",
    shortDescription: "Rosé fresco y floral de Carmenere y Cabernet Sauvignon.",
    description:
      "Rosé de color rosa y perfil complejo. Aromas a frambuesa fresca, muy floral, con notas a cereza roja. Boca fresca, de interesante acidez, jugoso y de agradable final.",
    tastingNotes: ["Frambuesa fresca", "Floral", "Cereza roja", "Acidez jugosa"],
    pairings: ["Comida oriental", "Panaché de verduras", "Pastrami", "Paella"],
    technical: {
      blend: "90% Carmenere, 10% Cabernet Sauvignon",
      alcohol: "13%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "DIAM",
      serve: "7° – 9°",
    },
    priceCLP: 9120,
    vintage: 2025,
  },
  {
    slug: "guidai",
    name: "Guidaí",
    line: "Guidaí",
    type: "Espumante",
    variety: "Carmenere",
    cepaGroup: "Ensamblaje",
    category: "Edición Limitada",
    image: "/vinos/guidai.png",
    technicalSheet: "/documentos/fichas-tecnicas/guidai-espumante.pdf",
    shortDescription: "Espumante rosado, fresco y de burbuja fina.",
    description:
      "Espumante de color rosado pálido. Aromas a fresas, con un toque picante. Corona blanquecina, con persistentes burbujas pequeñas; fresco y de equilibrada acidez.",
    tastingNotes: ["Fresas", "Rosado pálido", "Burbuja fina", "Acidez fresca"],
    pairings: ["Comida thai", "Sashimi de salmón"],
    technical: {
      blend: "90% Carmenere, 10% Cabernet Sauvignon",
      alcohol: "12,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 750,
      closure: "Natural, doble arandela",
      serve: "6° – 8°",
    },
    priceCLP: 22460,
    badge: "Espumante",
  },
  {
    slug: "yaray-gua-tinto",
    name: "Yaráy Guá Carmenere",
    line: "Yaráy Guá",
    type: "Tinto",
    variety: "Carmenere",
    cepaGroup: "Monovarietario",
    sweet: true,
    image: "/vinos/yaray-gua-tinto.png",
    technicalSheet: "/documentos/fichas-tecnicas/yaray-gua-carmenere.pdf",
    shortDescription: "Carmenere de cosecha tardía, goloso y de dulzor balanceado.",
    description:
      "Color rojo teja. Aromas de frutas rojas confitadas, higos y miel. En boca es goloso, con un dulzor balanceado y una acidez que evita que sea empalagoso.",
    tastingNotes: ["Frutas rojas confitadas", "Higos", "Miel", "Rojo teja"],
    pairings: ["Chocolate amargo", "Queso azul"],
    technical: {
      blend: "100% Carmenere",
      alcohol: "14,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 500,
      closure: "DIAM",
      serve: "10° – 12°",
    },
    priceCLP: 9120,
    vintage: 2023,
    badge: "Cosecha Tardía",
  },
  {
    slug: "yaray-gua-blanco",
    name: "Yaráy Guá Chardonnay Viognier",
    line: "Yaráy Guá",
    type: "Dulce",
    variety: "Chardonnay + Viognier",
    cepaGroup: "Chardonnay + Viognier",
    sweet: true,
    image: "/vinos/yaray-gua-blanco.png",
    technicalSheet: "/documentos/fichas-tecnicas/yaray-gua-chardonnay-viognier.pdf",
    shortDescription: "Blanco de cosecha tardía, untuoso y de retrogusto complejo.",
    description:
      "Color amarillo oro con marcados reflejos ambarinos y brillantes. De gran volumen, potente, de grata acidez firme y vibrante. Final larguísimo y untuoso, con un retrogusto complejo donde regresan las notas de mermelada de naranja amarga, frutos secos tostados y un sutil toque de miel.",
    tastingNotes: ["Mermelada de naranja", "Frutos secos tostados", "Miel", "Amarillo oro"],
    pairings: ["Foie gras", "Cheesecake de maracuyá"],
    technical: {
      blend: "85% Chardonnay, 15% Viognier",
      alcohol: "14,5%",
      valley: "Valle Cachapoal, Chile",
      training: "Espaldera Vertical",
      volumeMl: 500,
      closure: "DIAM",
      serve: "8° – 10°",
    },
    priceCLP: 9120,
    vintage: 2023,
    badge: "Cosecha Tardía",
  },
];

export const wineLines: WineLine[] = ["Ombú", "Lajau", "Estación Francia", "Berá", "Guidaí", "Yaráy Guá"];

/** Slug URL/i18n de cada línea (para anclas en /vinos y claves de mensajes). */
export const lineSlugs: Record<WineLine, string> = {
  "Ombú": "ombu",
  "Lajau": "lajau",
  "Estación Francia": "estacion-francia",
  "Berá": "bera",
  "Guidaí": "guidai",
  "Yaráy Guá": "yaray-gua",
};

/**
 * Metadata editorial por línea para la página /vinos (banda de colección).
 * La foto de ambiente le da identidad propia a cada colección.
 */
export type LineMeta = {
  /**
   * Fotos de ambiente (en /public) del carrusel de la colección, en orden de
   * aparición. La primera es la portada. Masters 4:5 generados por
   * `npm run fotos:colecciones`.
   */
  photos: string[];
  /**
   * Nivel/estilo de la línea para el antetítulo del banner. Referencia a una
   * clave YA EXISTENTE de messages (`vinos.categories` | `types` | `badges`),
   * así no se duplica copy y se mantiene el i18n es/en/pt.
   */
  tier: { group: "categories" | "types" | "badges"; key: string };
};

export const lineMeta: Record<WineLine, LineMeta> = {
  "Ombú": {
    photos: [
      "/images/vinos/coleccion-ombu.webp",
      "/images/vinos/coleccion-ombu-2.webp",
      "/images/vinos/coleccion-ombu-3.webp",
    ],
    tier: { group: "categories", key: "Reserva" },
  },
  "Lajau": {
    photos: [
      "/images/vinos/coleccion-lajau.webp",
      "/images/vinos/coleccion-lajau-2.webp",
      "/images/vinos/coleccion-lajau-3.webp",
    ],
    tier: { group: "categories", key: "Edición Limitada" },
  },
  "Estación Francia": {
    photos: [
      "/images/vinos/coleccion-estacion-francia.webp",
      "/images/vinos/coleccion-estacion-francia-2.webp",
      "/images/vinos/coleccion-estacion-francia-3.webp",
      "/images/vinos/coleccion-estacion-francia-4.webp",
    ],
    tier: { group: "categories", key: "Gran Reserva" },
  },
  "Berá": {
    photos: [
      "/images/vinos/coleccion-bera.webp",
      "/images/vinos/coleccion-bera-2.webp",
    ],
    tier: { group: "types", key: "Rosado" },
  },
  "Guidaí": {
    photos: [
      "/images/vinos/coleccion-guidai-v2.webp",
      "/images/vinos/coleccion-guidai-2.webp",
    ],
    tier: { group: "types", key: "Espumante" },
  },
  // Sin fotos propias todavía: el carrusel se muestra como una foto sola.
  "Yaráy Guá": {
    photos: ["/images/home/cta-parras.jpg"],
    tier: { group: "badges", key: "Cosecha Tardía" },
  },
};

/** Líneas destacadas en el home (A3), en orden de aparición. */
export const featuredLineOrder: WineLine[] = ["Ombú", "Lajau", "Estación Francia"];

export function getWinesByLine(line: WineLine): Wine[] {
  return wines.filter((w) => w.line === line);
}

/** Tipos de vino disponibles para el filtro de la tienda. */
export const wineTypes: WineType[] = ["Tinto", "Rosado", "Blanco", "Espumante", "Dulce"];

/** Opciones del filtro "Cepa" de la tienda. */
export const cepaGroups: CepaGroup[] = ["Monovarietario", "Ensamblaje", "Chardonnay + Viognier"];

/**
 * ¿Cae el vino bajo este tipo del filtro? "Dulce" cruza los tipos: incluye a
 * todo vino de cosecha tardía, aunque su tipo propio sea Tinto.
 */
export function matchesWineType(wine: Wine, type: WineType): boolean {
  if (type === "Dulce") return wine.type === "Dulce" || wine.sweet === true;
  return wine.type === type;
}

export function getWineBySlug(slug: string): Wine | undefined {
  return wines.find((w) => w.slug === slug);
}

export function getFeaturedWines(): Wine[] {
  return wines.filter((w) => w.featured);
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}
