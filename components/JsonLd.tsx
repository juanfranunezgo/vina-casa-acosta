import { serializeJsonLd } from "@/lib/jsonLd";

/**
 * Único emisor sancionado de `<script type="application/ld+json">` del sitio.
 *
 * Existe para que el escape no sea algo que haya que recordar: cualquier bloque
 * nuevo de structured data (Organization, LocalBusiness, BreadcrumbList…) pasa
 * por acá y queda escapado por construcción. El test
 * `tests/json-ld-source.test.mjs` falla si alguien vuelve a escribir el sink
 * crudo (`dangerouslySetInnerHTML` + `JSON.stringify`) en otro archivo.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
