export type Tour = {
  slug: string;
  name: string;
  description: string;
  priceCLP: number;
  duration: string;
  /** Tamaño mínimo de grupo para reservar. Usado en ficha y condiciones del detalle. */
  minPeople: number;
  highlights: string[];
  image: string;
  premium?: boolean;
};

export type Experience = {
  slug: string;
  name: string;
  badge: string;
  image: string;
};

export const tours: Tour[] = [
  {
    slug: "tour-ombu",
    name: "Tour Ombú",
    description:
      "Recorrido introductorio por los viñedos centenarios. Finaliza con la degustación de 3 vinos reserva acompañados de quesos locales.",
    priceCLP: 30000,
    duration: "2 horas",
    minPeople: 2,
    highlights: ["3 vinos Reserva", "Quesos locales", "Recorrido por viñedo"],
    image:
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "tour-carmenere",
    name: "Tour Carmenere",
    description:
      "Nuestra experiencia premium. Viaje detallado por la historia de la cepa insignia, con degustación de añadas históricas directamente de la barrica.",
    priceCLP: 45000,
    duration: "3 horas",
    minPeople: 4,
    highlights: ["Añadas históricas", "Cata desde barrica", "Almuerzo ligero"],
    image: "/images/actividades/tour-carmenere.webp",
    premium: true,
  },
  {
    slug: "tour-bera",
    name: "Tour Berá",
    description:
      "Adéntrate en nuestra bodega subterránea. Degustación de 4 vinos Gran Reserva con maridajes exclusivos.",
    priceCLP: 35000,
    duration: "2 horas y 30 minutos",
    minPeople: 2,
    highlights: ["4 vinos Gran Reserva", "Bodega subterránea", "Maridaje"],
    image:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=70",
  },
];

export const experiences: Experience[] = [
  {
    slug: "vendimia-2026",
    name: "Vendimia 2026",
    badge: "Próximamente",
    image: "/images/actividades/vendimia-2026.jpg",
  },
  {
    slug: "talleres",
    name: "Talleres y clases prácticas",
    badge: "Todo el año",
    image: "/images/actividades/talleres.jpg",
  },
  {
    slug: "tren-efe",
    name: "Experiencia Tren EFE",
    badge: "Alianza especial",
    image: "/images/actividades/tren-efe.jpg",
  },
];

export const getTourBySlug = (slug: string): Tour | undefined =>
  tours.find((t) => t.slug === slug);
