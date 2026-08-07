/**
 * Serialización segura de structured data para `<script type="application/ld+json">`.
 *
 * `JSON.stringify` NO escapa `<`, y dentro de un `<script>` eso es ejecución de
 * código, no un detalle de formato. El parser de HTML cierra el bloque en el
 * primer `</script` literal que ve, sin importar que esté dentro de comillas
 * JSON — a partir de ahí, lo que sigue es markup vivo:
 *
 *   nombre = 'Vino</script><img src=x onerror=alert(1)>'
 *   → <script type="application/ld+json">{…"name":"Vino</script><img …>"…}</script>
 *                                                      ↑ el script cierra acá
 *
 * Desde que el catálogo lo administra Afeleia, `name`/`description`/`category`
 * son texto que se escribe desde el panel del cliente: contenido no confiable
 * llegando a un sink de HTML. Escaparlo es obligatorio, no defensivo.
 *
 * La sustitución es semánticamente neutra: "<" es la forma escapada de "<"
 * en JSON, así que el bloque parsea al MISMO string —los buscadores leen el
 * valor original intacto— pero ya no contiene el carácter que el parser de HTML
 * necesita para cerrar el bloque.
 *
 * U+2028 y U+2029 se escapan por una razón distinta: son saltos de línea
 * válidos en JSON pero terminadores de sentencia en JavaScript, y rompen a
 * cualquier consumidor que evalúe el bloque en vez de parsearlo.
 *
 * No usar `JSON.stringify` directo para JSON-LD: usar `<JsonLd>`
 * (`components/JsonLd.tsx`), que es el único emisor sancionado y ya llama acá.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
