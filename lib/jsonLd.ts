/**
 * Serializa un valor a JSON-LD listo para inyectar en un `<script>`.
 *
 * El escape no es opcional: `JSON.stringify` deja pasar `</script>` tal cual, así
 * que basta con que un texto de catálogo o una traducción lo contenga para que la
 * etiqueta se cierre antes de tiempo y el resto del bloque se interprete como HTML.
 * Por eso `<` sale escapado: JSON lo vuelve a leer como `<`, así que el valor
 * parseado es idéntico. U+2028 y U+2029 también, porque son saltos de línea
 * válidos dentro de JSON pero ilegales dentro de un literal de JavaScript.
 *
 * Los patrones se arman con `new RegExp` sobre secuencias `\u....` en vez de
 * literales `/.../`: U+2028 es un terminador de línea para el parser de JS, así que
 * un literal de expresión regular no puede contenerlo. De paso, el archivo queda en
 * ASCII puro y ningún editor puede comerse un carácter invisible.
 *
 * NOTA DE MERGE: la rama `m3/catalogo-afeleia` agrega un helper equivalente dentro
 * de `lib/wineJsonLd.ts`. Cuando esa rama entre a `main`, unificar los dos acá y
 * borrar el duplicado. Se escribió aparte para no tocar `wineJsonLd.ts` mientras
 * ese trabajo está en vuelo.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);

const UNSAFE = new RegExp("[<\\u2028\\u2029]", "g");

export function jsonLdHtml(value: unknown): string {
  return JSON.stringify(value).replace(UNSAFE, (character) => {
    if (character === "<") return "\\u003c";
    if (character === LINE_SEPARATOR) return "\\u2028";
    return "\\u2029";
  });
}
