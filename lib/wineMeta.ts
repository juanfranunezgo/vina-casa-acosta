/**
 * Título y descripción de una ficha de vino **en el buscador**.
 *
 * No es el nombre del producto: el nombre lo escribe el cliente en el panel y se
 * respeta tal cual en la página, en el `<h1>` y en el `Product` del JSON-LD. Lo
 * que se arma acá es el texto del resultado de Google, que tiene otro trabajo:
 * contener las palabras que alguien escribe cuando busca. «Guidaí» no lo busca
 * nadie; «espumante rosado» sí.
 *
 * Es una regla y no trece títulos escritos a mano, por el mismo motivo que el
 * sitemap lee el catálogo y no `data/wines.ts`: el vino que carguen mañana en el
 * panel tiene que salir bien sin que nadie toque este repo. Un producto cuya
 * combinación no está contemplada cae en su nombre a secas —que es exactamente
 * lo que el sitio publica hoy—, así que la regla nunca empeora una ficha.
 *
 * Las palabras del sufijo viajan traducidas desde `messages/*.json` y no desde
 * el catálogo: el panel publica un solo idioma (español) y estas fichas se
 * sirven en tres.
 */

/** Lo que este módulo necesita mirar de un producto del catálogo. */
export type WineMetaProduct = {
  slug: string;
  name: string;
  /** Nivel del vino («Reserva», «Gran Reserva»), de `atributos.nivel`. */
  category?: string;
  /** Tipo («Tinto», «Rosado», «Espumante», «Dulce»), de `atributos.tipo`. */
  type?: string;
  /** Grupo de cepa («Ensamblaje», «Carmenere»…), de `atributos.grupo_cepa`. */
  cepaGroup?: string;
  shortDescription?: string;
  description?: string;
};

/**
 * Las palabras con las que se completa el título, ya traducidas.
 *
 * - `overrides` — sufijo fijo por slug. Existe porque hay tres datos de producto
 *   que el contrato v1 **no publica como campo**: que el Guidaí es rosado y que
 *   los dos Yaráy Guá son late harvest. Están en la prosa de la descripción, y
 *   leer prosa para armar un título es un título que se rompe el día que alguien
 *   reescribe una coma. El día que el panel publique esos atributos, la entrada
 *   del override se borra y la regla sigue sola.
 * - `blendRed` — sufijo de los ensamblajes tintos.
 * - `byType` — sufijo por tipo de vino, para lo que no cae en las anteriores.
 */
export type WineMetaDictionary = {
  overrides?: Record<string, string>;
  blendRed?: string;
  byType?: Record<string, string>;
};

/**
 * Niveles que además de decir algo del vino son términos que la gente escribe
 * («carmenere gran reserva»). Es una lista de permitidos y no de prohibidos:
 * un nivel nuevo del panel («Edición Limitada», y lo que inventen mañana) no
 * ensucia el título, simplemente no aparece.
 */
const NIVELES_BUSCADOS = new Set(["reserva", "gran reserva"]);

/** Sin acentos, sin mayúsculas y sin espacios de sobra, para comparar valores del panel. */
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * Largo máximo de la parte que escribe esta regla.
 *
 * La plantilla del layout le agrega « · Viña Casa Acosta» (19 caracteres) y
 * Google corta alrededor de los 60. Pasado el tope se publica el nombre solo:
 * cortar un sufijo por la mitad deja el título peor que sin sufijo, y el nombre
 * del vino no se toca nunca.
 */
export const LARGO_MAXIMO_DE_TITULO = 45;

/**
 * El título de la ficha en el buscador.
 *
 * Orden de precedencia, del dato más específico al más general:
 *
 * 1. **Override por slug** — es una decisión humana sobre ese vino.
 * 2. **Nivel** — «Ombú Carmenere Reserva», sin coma: así se lee una etiqueta.
 * 3. **Ensamblaje tinto** — solo cuando el tipo es tinto; el Berá es un
 *    ensamblaje rosado y tiene que caer en la regla del tipo, no en esta.
 * 4. **Tipo** — «Berá, vino rosé».
 * 5. **Nada** — el nombre solo.
 */
export function wineSearchTitle(
  wine: WineMetaProduct,
  dict: WineMetaDictionary = {},
): string {
  const sufijo = sufijoDe(wine, dict);
  if (!sufijo) return wine.name;

  const titulo = sufijo.pegado
    ? `${wine.name} ${sufijo.texto}`
    : `${wine.name}, ${sufijo.texto}`;

  return titulo.length > LARGO_MAXIMO_DE_TITULO ? wine.name : titulo;
}

/** El sufijo y si va pegado al nombre (nivel) o después de una coma. */
function sufijoDe(
  wine: WineMetaProduct,
  dict: WineMetaDictionary,
): { texto: string; pegado: boolean } | null {
  const override = dict.overrides?.[wine.slug];
  if (override) return { texto: override, pegado: false };

  if (wine.category && NIVELES_BUSCADOS.has(normalizar(wine.category))) {
    // Se imprime el valor del panel, no el de la lista: la lista es para
    // reconocerlo, y quien decide cómo se escribe «Gran Reserva» es el cliente.
    return { texto: wine.category, pegado: true };
  }

  const esTinto = wine.type !== undefined && normalizar(wine.type) === "tinto";
  const esEnsamblaje =
    wine.cepaGroup !== undefined && normalizar(wine.cepaGroup) === "ensamblaje";
  if (dict.blendRed && esTinto && esEnsamblaje) {
    return { texto: dict.blendRed, pegado: false };
  }

  const porTipo = wine.type ? dict.byType?.[normalizar(wine.type)] : undefined;
  return porTipo ? { texto: porTipo, pegado: false } : null;
}

/** Largo objetivo de la descripción: Google muestra alrededor de 155-160. */
export const LARGO_MAXIMO_DE_DESCRIPCION = 160;

/**
 * La descripción de la ficha en el buscador.
 *
 * Sale de la nota de cata completa y no de la corta, que es lo que se usaba
 * hasta acá: las cortas del panel andan por los 45-80 caracteres y Google muestra
 * 155, así que la mitad del espacio se regalaba. El texto sigue siendo del
 * cliente —no se le agrega nada— y se corta **por oraciones enteras**: una
 * descripción que termina en «de agradable fi…» se lee como un error del sitio.
 *
 * Si ni siquiera la primera oración entra, ahí sí se corta por palabra con
 * puntos suspensivos, que es lo que haría el buscador de todos modos.
 */
export function wineMetaDescription(
  wine: WineMetaProduct,
  largoMaximo = LARGO_MAXIMO_DE_DESCRIPCION,
): string {
  const fuente = (wine.description || wine.shortDescription || "").trim();
  if (fuente.length <= largoMaximo) return fuente;

  const oraciones = fuente.match(/[^.]+\.?/g) ?? [];
  let texto = "";
  for (const oracion of oraciones) {
    const siguiente = (texto + oracion).trimEnd();
    if (siguiente.length > largoMaximo) break;
    texto = texto + oracion;
  }
  texto = texto.trim();
  if (texto) return texto;

  const cortado = fuente.slice(0, largoMaximo - 1);
  const ultimoEspacio = cortado.lastIndexOf(" ");
  return `${(ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd()}…`;
}
