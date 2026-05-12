export type WineLine = "Ombú" | "Lajau" | "Estación Francia" | "Berá" | "Guidaí" | "Yaráy Guá";

export type Variety =
  | "Carmenere"
  | "Tannat"
  | "Cabernet Sauvignon"
  | "Sauvignon Blanc"
  | "Ensamblaje"
  | "Blanco"
  | "Tinto";

export type Wine = {
  slug: string;
  name: string;
  line: WineLine;
  variety: Variety;
  category: "Reserva" | "Gran Reserva" | "Edición Limitada" | "Ícono";
  image: string;
  shortDescription: string;
  description: string;
  tastingNotes: string[];
  pairings: string[];
  priceCLP: number;
  vintage: number;
  featured?: boolean;
  badge?: string;
};

/**
 * Catálogo de vinos — Fase 1: datos estáticos.
 * Precios y notas de cata son ESTIMACIONES de demo. El cliente debe validar
 * cada ficha antes de Fase 2 (Supabase).
 */
export const wines: Wine[] = [
  {
    slug: "ombu-carmenere",
    name: "Ombú Carmenere",
    line: "Ombú",
    variety: "Carmenere",
    category: "Reserva",
    image: "/vinos/ombu-carmenere.png",
    shortDescription: "Carmenere Reserva del Valle del Cachapoal.",
    description:
      "Nuestro Carmenere Reserva insignia. Frutos rojos maduros, especias dulces y un toque sutil de roble que reflejan el carácter cálido del Cachapoal.",
    tastingNotes: ["Frambuesa", "Pimienta negra", "Cacao", "Tabaco"],
    pairings: ["Carnes rojas", "Asado al palo", "Quesos curados"],
    priceCLP: 18900,
    vintage: 2022,
    featured: true,
    badge: "Insignia",
  },
  {
    slug: "ombu-tannat",
    name: "Ombú Tannat",
    line: "Ombú",
    variety: "Tannat",
    category: "Reserva",
    image: "/vinos/ombu-tannat.png",
    shortDescription: "Tannat Reserva, robusto y estructurado.",
    description:
      "Homenaje a las raíces uruguayas de la familia. Estructura firme, taninos elegantes y aromas a moras oscuras con chocolate amargo.",
    tastingNotes: ["Mora", "Chocolate amargo", "Cuero", "Regaliz"],
    pairings: ["Cordero al horno", "Quesos azules", "Estofados"],
    priceCLP: 18900,
    vintage: 2022,
  },
  {
    slug: "ombu-sauvignon",
    name: "Ombú Cabernet Sauvignon",
    line: "Ombú",
    variety: "Cabernet Sauvignon",
    category: "Reserva",
    image: "/vinos/ombu-sauvignon.png",
    shortDescription: "Cabernet Sauvignon clásico y elegante.",
    description:
      "Notas de cassis y cedro con un final largo y persistente. La elegancia clásica del Cabernet Sauvignon en el terroir del Cachapoal.",
    tastingNotes: ["Cassis", "Cedro", "Menta", "Grafito"],
    pairings: ["Bife de chorizo", "Pastas con ragú", "Queso parmesano"],
    priceCLP: 18900,
    vintage: 2022,
  },
  {
    slug: "lajau-sam",
    name: "Lajau Sam",
    line: "Lajau",
    variety: "Ensamblaje",
    category: "Edición Limitada",
    image: "/vinos/lajau-sam.png",
    shortDescription: "Ensamblaje único de edición limitada.",
    description:
      "Un ensamble que evoluciona en la copa. Complejidad estructurada, lleno de matices y producción muy acotada cada cosecha.",
    tastingNotes: ["Cereza negra", "Especias dulces", "Vainilla", "Cuero suave"],
    pairings: ["Cordero magallánico", "Risotto de hongos", "Caza menor"],
    priceCLP: 32500,
    vintage: 2021,
    featured: true,
    badge: "Edición Limitada",
  },
  {
    slug: "lajau-deti",
    name: "Lajau Detí",
    line: "Lajau",
    variety: "Carmenere",
    category: "Gran Reserva",
    image: "/vinos/lajau-deti.png",
    shortDescription: "Carmenere Gran Reserva, sedoso y elegante.",
    description:
      "Expresión pura de la fruta con una acidez equilibrada y textura sedosa inconfundible. 12 meses en barricas de roble francés.",
    tastingNotes: ["Ciruela", "Violeta", "Café", "Roble fino"],
    pairings: ["Magret de pato", "Quesos semicurados", "Carrillera"],
    priceCLP: 28000,
    vintage: 2021,
  },
  {
    slug: "lajau-betum",
    name: "Lajau Betúm",
    line: "Lajau",
    variety: "Tannat",
    category: "Gran Reserva",
    image: "/vinos/lajau-betum.png",
    shortDescription: "Tannat Gran Reserva, profundo y misterioso.",
    description:
      "Profundo y misterioso, con capas de sabor que revelan notas terrosas y frutos negros. Maridaje ideal para la mesa larga.",
    tastingNotes: ["Mora silvestre", "Tierra húmeda", "Tabaco", "Especias"],
    pairings: ["Cordero al merkén", "Carnes ahumadas", "Quesos azules"],
    priceCLP: 28000,
    vintage: 2021,
  },
  {
    slug: "lajau-betum-yu",
    name: "Lajau Betúm Yú",
    line: "Lajau",
    variety: "Tannat",
    category: "Ícono",
    image: "/vinos/lajau-betum-yu.png",
    shortDescription: "Tannat Ícono, expresión cumbre de la línea Lajau.",
    description:
      "Selección parcelaria de las mejores uvas Tannat. 18 meses en barricas nuevas. Producción ultra limitada.",
    tastingNotes: ["Frutos negros confitados", "Cedro", "Chocolate negro 70%", "Trufa"],
    pairings: ["Lomo Wellington", "Caza mayor", "Quesos añejos"],
    priceCLP: 48000,
    vintage: 2020,
    badge: "Ícono",
  },
  {
    slug: "estacion-francia-carmenere",
    name: "Estación Francia Carmenere",
    line: "Estación Francia",
    variety: "Carmenere",
    category: "Gran Reserva",
    image: "/vinos/estacion-francia-carmenere.png",
    shortDescription: "Homenaje al origen — Francia '98.",
    description:
      "La línea que celebra el momento fundacional de la viña, junto al Mundial de Francia '98. Carmenere de gran complejidad y guarda.",
    tastingNotes: ["Frutilla madura", "Pimienta", "Chocolate", "Roble francés"],
    pairings: ["Asado argentino", "Plateada al jugo", "Empanadas de pino"],
    priceCLP: 24000,
    vintage: 2021,
    featured: true,
  },
  {
    slug: "estacion-francia-tannat",
    name: "Estación Francia Tannat",
    line: "Estación Francia",
    variety: "Tannat",
    category: "Gran Reserva",
    image: "/vinos/estacion-francia-tannat.png",
    shortDescription: "Tannat con alma uruguaya.",
    description:
      "Estructura potente y final persistente. Un Tannat que conecta el terroir chileno con la herencia familiar uruguaya.",
    tastingNotes: ["Cassis", "Pimienta negra", "Cedro", "Cuero"],
    pairings: ["Asado de tira", "Cordero patagónico", "Quesos curados"],
    priceCLP: 24000,
    vintage: 2021,
  },
  {
    slug: "bera",
    name: "Berá",
    line: "Berá",
    variety: "Cabernet Sauvignon",
    category: "Gran Reserva",
    image: "/vinos/bera.png",
    shortDescription: "Cabernet Sauvignon Gran Reserva.",
    description:
      "Estructura imponente con elegancia. Cassis, cedro y un final largo y persistente. Listo para crecer en botella.",
    tastingNotes: ["Cassis", "Cedro", "Tabaco", "Grafito"],
    pairings: ["Bife angosto", "Plateada", "Quesos duros"],
    priceCLP: 26000,
    vintage: 2021,
  },
  {
    slug: "guidai",
    name: "Guidaí",
    line: "Guidaí",
    variety: "Ensamblaje",
    category: "Edición Limitada",
    image: "/vinos/guidai.png",
    shortDescription: "Ensamblaje de edición limitada.",
    description:
      "Ensamblaje exclusivo en honor a la palabra charrúa para 'luna'. Vino de guarda, elegante y meditado.",
    tastingNotes: ["Frutos rojos maduros", "Especias finas", "Cacao", "Roble dulce"],
    pairings: ["Caza menor", "Confit de pato", "Hongos al vino"],
    priceCLP: 36000,
    vintage: 2020,
  },
  {
    slug: "yaray-gua-tinto",
    name: "Yaráy Guá Tinto",
    line: "Yaráy Guá",
    variety: "Tinto",
    category: "Reserva",
    image: "/vinos/yaray-gua-tinto.png",
    shortDescription: "Tinto joven, fresco y frutal.",
    description:
      "Línea fresca y frutal pensada para el disfrute diario. Acceso ideal al universo Casa Acosta.",
    tastingNotes: ["Frambuesa", "Cereza", "Hierbas suaves"],
    pairings: ["Pizzas", "Pastas con tomate", "Carnes blancas"],
    priceCLP: 12000,
    vintage: 2023,
  },
  {
    slug: "yaray-gua-blanco",
    name: "Yaráy Guá Blanco",
    line: "Yaráy Guá",
    variety: "Sauvignon Blanc",
    category: "Reserva",
    image: "/vinos/yaray-gua-blanco.png",
    shortDescription: "Blanco fresco y aromático.",
    description:
      "Sauvignon Blanc con notas cítricas y tropicales. Acidez vibrante, ideal para días cálidos junto al mar o al lago.",
    tastingNotes: ["Pomelo", "Maracuyá", "Hierba fresca", "Cítricos"],
    pairings: ["Ceviche", "Mariscos", "Quesos frescos"],
    priceCLP: 12000,
    vintage: 2024,
  },
];

export const wineLines: WineLine[] = ["Ombú", "Lajau", "Estación Francia", "Berá", "Guidaí", "Yaráy Guá"];

export const varieties: Variety[] = [
  "Carmenere",
  "Tannat",
  "Cabernet Sauvignon",
  "Sauvignon Blanc",
  "Ensamblaje",
];

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
