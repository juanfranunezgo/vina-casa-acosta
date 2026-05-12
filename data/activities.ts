export type Tour = {
  slug: string;
  name: string;
  description: string;
  priceCLP: number;
  duration: string;
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
    duration: "90 minutos",
    highlights: ["3 vinos Reserva", "Quesos locales", "Recorrido por viñedo"],
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "tour-bera",
    name: "Tour Berá",
    description:
      "Adéntrate en nuestra bodega subterránea. Degustación de 4 vinos Gran Reserva con maridajes exclusivos.",
    priceCLP: 35000,
    duration: "2 horas",
    highlights: ["4 vinos Gran Reserva", "Bodega subterránea", "Maridaje"],
    image:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "tour-carmenere",
    name: "Tour Carmenere",
    description:
      "Nuestra experiencia premium. Viaje detallado por la historia de la cepa insignia, con degustación de añadas históricas directamente de la barrica.",
    priceCLP: 45000,
    duration: "3 horas",
    highlights: ["Añadas históricas", "Cata desde barrica", "Almuerzo ligero"],
    image:
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1400&q=70",
    premium: true,
  },
];

export const experiences: Experience[] = [
  {
    slug: "vendimia-2026",
    name: "Vendimia 2026",
    badge: "Próximamente",
    image:
      "https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "dia-madres",
    name: "Almuerzo Día de las Madres",
    badge: "Mayo",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "tren-efe",
    name: "Experiencia Tren EFE",
    badge: "Alianza especial",
    image:
      "https://images.unsplash.com/photo-1581262177000-8139a463e531?auto=format&fit=crop&w=1400&q=70",
  },
];
