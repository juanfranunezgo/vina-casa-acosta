/**
 * Medallas y puntajes de los vinos.
 *
 * La viña los mandó el 2026-09-29, una carpeta por vino (`Premios/`). En la
 * tarjeta de cada vino —tienda y `/vinos`— va UNA sola, chica, sobre la foto;
 * la ficha del vino las lista todas.
 *
 * Vive en el repo y no en el panel porque Afeleia no tiene dónde guardar
 * premios: el producto trae precio, ficha técnica y notas, no reconocimientos.
 * La consecuencia está aceptada: sumar o quitar una medalla es un cambio acá,
 * no algo que la viña haga desde el panel.
 *
 * La tabla se lleva por `slug`, que sí publica el panel. Un vino que no está en
 * ella —o uno recién creado— simplemente no muestra medalla.
 */

type Premio =
  | { tipo: "oro"; concurso: string; anio: number }
  | { tipo: "puntos"; concurso: string; puntos: number };

// El nombre del concurso va como lo escribe la propia medalla. Es un nombre
// propio: no se traduce.
const CATADOR = "Catador World Wine Awards";
const LA_CAV = "La CAV";

const premios = {
  "catador-oro-2025": { tipo: "oro", concurso: CATADOR, anio: 2025 },
  "catador-oro-2023": { tipo: "oro", concurso: CATADOR, anio: 2023 },
  "catador-oro-2022": { tipo: "oro", concurso: CATADOR, anio: 2022 },
  "catador-oro-2021": { tipo: "oro", concurso: CATADOR, anio: 2021 },
  // La edición 2020 todavía no llevaba "World" en el nombre.
  "catador-oro-2020": { tipo: "oro", concurso: "Catador Wine Awards", anio: 2020 },
  "carmenere-al-mundo-oro-2022": { tipo: "oro", concurso: "Carmenère al Mundo", anio: 2022 },
  // La viña no mandó el año de los puntajes: no se inventa.
  "la-cav-93": { tipo: "puntos", concurso: LA_CAV, puntos: 93 },
  "la-cav-91": { tipo: "puntos", concurso: LA_CAV, puntos: 91 },
  "la-cav-90": { tipo: "puntos", concurso: LA_CAV, puntos: 90 },
} as const satisfies Record<string, Premio>;

export type MedallaId = keyof typeof premios;

export type Medalla = Premio & {
  id: MedallaId;
  /** En `public/images/medallas/`, salida de `npm run fotos:medallas`. */
  src: string;
};

export const medallas = Object.fromEntries(
  Object.entries(premios).map(([id, premio]) => [
    id,
    { id, src: `/images/medallas/${id}.webp`, ...premio },
  ]),
) as Record<MedallaId, Medalla>;

/**
 * Qué medallas lleva cada vino, **en orden: la primera es la de la tarjeta**.
 *
 * El criterio con que se ordenaron: primero las medallas de oro, de la más
 * reciente a la más antigua, y después los puntajes, del más alto al más bajo.
 */
export const medallasPorVino: Record<string, readonly MedallaId[]> = {
  "lajau-betum": ["catador-oro-2023", "la-cav-93"],
  "lajau-betum-yu": ["catador-oro-2025"],
  "lajau-deti": ["catador-oro-2022", "la-cav-93"],
  "lajau-sam": ["catador-oro-2022", "la-cav-91"],
  guidai: ["catador-oro-2022", "la-cav-90"],
  "estacion-francia-carmenere": ["catador-oro-2023", "carmenere-al-mundo-oro-2022", "la-cav-91"],
  "ombu-sauvignon": ["catador-oro-2023", "la-cav-91"],
  "ombu-carmenere": ["catador-oro-2021", "catador-oro-2020", "la-cav-91", "la-cav-90"],
  "ombu-tannat": ["catador-oro-2022", "la-cav-91"],
  bera: ["la-cav-91", "la-cav-90"],
};

/** Las medallas de un vino, en orden. Lista vacía si no tiene. */
export function medallasDe(slug: string): Medalla[] {
  return (medallasPorVino[slug] ?? []).map((id) => medallas[id]);
}

/** Lo que hace falta de un traductor de next-intl, sin atarse a su tipo genérico. */
type Translator = (key: string, values?: Record<string, number>) => string;

export type MedallaTexto = {
  /** «Medalla de Oro» o «93 puntos». */
  premio: string;
  /** Quién lo dio: «Catador World Wine Awards 2023», «La CAV». */
  origen: string;
  /** Las dos cosas en una frase: el texto alternativo de la imagen. */
  alt: string;
};

/**
 * Los textos de una medalla en el idioma de la página.
 *
 * `t` es el traductor del espacio `vinos`, que la tarjeta y la ficha ya tienen.
 */
export function medallaTexto(medalla: Medalla, t: Translator): MedallaTexto {
  const premio =
    medalla.tipo === "oro"
      ? t("medallas.oro")
      : t("medallas.puntos", { puntos: medalla.puntos });
  const origen =
    medalla.tipo === "oro" ? `${medalla.concurso} ${medalla.anio}` : medalla.concurso;
  return { premio, origen, alt: `${premio}, ${origen}` };
}

/**
 * La medalla de la tarjeta de un vino —la primera de su lista—, lista para
 * `MedallaVino`. `undefined` si el vino no tiene ninguna.
 */
export function medallaDeTarjeta(
  slug: string,
  t: Translator,
): { src: string; alt: string } | undefined {
  const [medalla] = medallasDe(slug);
  return medalla && { src: medalla.src, alt: medallaTexto(medalla, t).alt };
}
