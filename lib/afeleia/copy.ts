/**
 * Textos del catálogo: traducción curada primero, dato del panel después.
 *
 * El sitio nació con los 13 vinos escritos a mano en `messages/{es,en,pt}.json`,
 * indexados por slug y por valor (`vinos.types.Tinto`, `vinos.badges.Insignia`).
 * Desde que el catálogo lo administra Afeleia, cualquiera puede crear un producto
 * en el panel — y ese producto no tiene claves en los mensajes.
 *
 * Sin esta capa, next-intl no falla de forma benigna:
 *
 *   t("wines.vino-nuevo.shortDescription")  → "wines.vino-nuevo.shortDescription"
 *   t.raw("wines.vino-nuevo.tastingNotes")  → "wines.vino-nuevo.tastingNotes"  (¡string!)
 *
 * Lo primero imprime la clave cruda en la página; lo segundo es peor, porque el
 * consumidor hace `.map()` sobre lo que cree un array y la ficha responde 500.
 *
 * La regla es entonces: si hay traducción curada, gana (es copy de marca en tres
 * idiomas). Si no la hay, se muestra el texto que el cliente cargó en el panel.
 * Un vino nuevo se ve en su idioma original antes que romper la página, y
 * traducirlo después es agregar la clave — sin tocar código.
 */

/** Lo que necesitamos de un traductor de next-intl, sin atarnos a su tipo genérico. */
type Translator = {
  (key: string): string;
  raw: (key: string) => unknown;
  has: (key: string) => boolean;
};

/**
 * Traducción de `key`, o `fallback` si esa clave no existe en los mensajes.
 *
 * `fallback` puede venir vacío (DEC-5: una clave ausente en la API significa
 * "sin valor"), y en ese caso devuelve cadena vacía en vez de la clave cruda.
 */
export function translatedOr(t: Translator, key: string, fallback: string | undefined): string {
  if (t.has(key)) return t(key);
  return fallback ?? "";
}

/**
 * Lista traducida de `key`, o `fallback` si no existe o si el mensaje no es una
 * lista. La comprobación de forma no es paranoia: `t.raw()` devuelve un string
 * cuando la clave falta, y ese es exactamente el valor que rompe el `.map()`.
 */
export function translatedListOr(
  t: Translator,
  key: string,
  fallback: string[],
): string[] {
  if (!t.has(key)) return fallback;
  const raw = t.raw(key);
  if (!Array.isArray(raw)) return fallback;
  return raw.filter((item): item is string => typeof item === "string");
}

/**
 * Etiqueta de un valor del catálogo (`types.Tinto`, `varieties.Carmenere`,
 * `badges.Insignia`, `categories.Reserva`).
 *
 * Los valores ya vienen legibles desde el panel, así que el propio valor es un
 * fallback razonable: un tipo nuevo se lee "Naranjo" en los tres idiomas hasta
 * que alguien agregue su traducción, que es mejor que "vinos.types.Naranjo".
 */
export function labelOr(t: Translator, prefix: string, value: string | undefined): string {
  if (!value) return "";
  return translatedOr(t, `${prefix}.${value}`, value);
}

/** Separador de las etiquetas del catálogo ("Tinto · Carmenere"). */
const LABEL_SEPARATOR = " · ";

/**
 * Une etiquetas descartando las vacías.
 *
 * Cualquier etiqueta puede faltar (un producto del panel sin cepa asignada), y
 * la plantilla `${a} · ${b}` no lo contempla: deja " · Carmenere" o "Tinto · "
 * impreso en la tarjeta. Unir solo lo que existe es la única forma de que la
 * ausencia se vea como ausencia.
 */
export function joinLabels(...labels: Array<string | undefined>): string {
  return labels.filter((label) => label && label.trim() !== "").join(LABEL_SEPARATOR);
}
