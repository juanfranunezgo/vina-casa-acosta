/**
 * Contrato v1 del catálogo público de Afeleia: tipos, endpoint y validación.
 *
 * Vive aparte de `catalog.ts` porque lo consumen los dos lados. `catalog.ts`
 * importa el snapshot de fallback (`data/catalogo-fallback.json`) y es código de
 * servidor; el `CartDrawer` corre en el browser y necesita el mismo contrato sin
 * arrastrar ese JSON al bundle. Por eso este archivo NO importa nada.
 */

/** Versión del contrato que esta web sabe leer. */
export const CONTRACT_VERSION = 1;

export type AttributeValue = string | number | string[] | Record<string, string>;

export type ApiProduct = {
  slug: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  descripcion_corta: string | null;
  precio: number;
  moneda: string;
  imagenes: string[];
  destacado: boolean;
  categoria: string | null;
  agotado: boolean;
  atributos: Record<string, AttributeValue>;
};

export type ApiCatalog = {
  version: number;
  sitio: string;
  generado_en: string;
  categorias: Array<{ slug: string; nombre: string; orden: number }>;
  productos: ApiProduct[];
};

/**
 * Prefijo de toda URL pública de Supabase Storage. Se exige, y no solo el host,
 * porque `images.remotePatterns` de `next.config.ts` lo exige: una URL del mismo
 * host con otro pathname es un `src` que el optimizador rechaza.
 *
 * De acá lo deriva `next.config.ts`: son una sola regla y salen de un solo lugar.
 * Que se cumpla la contención —lo que este guard acepta, la config también— lo
 * asserta `tests/afeleia-image-config-parity.test.mjs` con el matcher real de Next.
 */
export const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";

/**
 * Primera imagen del producto que esta web puede realmente dibujar, o `undefined`.
 *
 * `imagenes` lo llena el cliente desde su panel y llega por la red. Aunque el
 * contrato v1 ya solo emite URLs absolutas, "absoluta" no es lo mismo que
 * "renderizable acá": `next/image` solo acepta un `src` que empiece con `/` o que
 * matchee `images.remotePatterns`, y con cualquier otra cosa el comportamiento va
 * de la foto rota en producción a una excepción en desarrollo. Una excepción
 * dentro de una página SSG/ISR no rompe la foto: rompe la página entera.
 *
 * Por eso el descarte es acá y no en el componente — el manual de conexión lo pide
 * en §3.11 y §8.D, y hasta H-49 el sitio no lo tenía implementado.
 */
export function renderableImage(
  imagenes: unknown,
  apiUrl: string | undefined = process.env.NEXT_PUBLIC_AFELEIA_API_URL,
): string | undefined {
  if (!Array.isArray(imagenes)) return undefined;

  const allowedOrigin = storageOrigin(apiUrl);
  for (const entry of imagenes) {
    if (typeof entry !== "string") continue;
    const value = entry.trim();
    if (value === "") continue;

    // Ruta del propio sitio: lo que produce el snapshot de fallback (`/vinos/x.webp`).
    // `//` queda afuera a propósito: es una URL protocol-relative, no una ruta.
    if (value.startsWith("/") && !value.startsWith("//")) return value;

    if (!allowedOrigin) continue;
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      continue;
    }
    if (parsed.origin !== allowedOrigin) continue;
    if (!parsed.pathname.startsWith(STORAGE_PUBLIC_PREFIX)) continue;
    return value;
  }
  return undefined;
}

/** Origen `https://host:puerto` de la API de Afeleia, o `null` si no está configurada. */
function storageOrigin(apiUrl: string | undefined): string | null {
  if (!apiUrl) return null;
  try {
    const { origin, protocol } = new URL(apiUrl);
    return protocol === "http:" || protocol === "https:" ? origin : null;
  } catch {
    return null;
  }
}

export function catalogEndpoint(): string | null {
  const base = process.env.NEXT_PUBLIC_AFELEIA_API_URL;
  const sitio = process.env.NEXT_PUBLIC_AFELEIA_SITIO;
  if (!base || !sitio) return null;
  return `${base.replace(/\/+$/, "")}/catalogo-publico?sitio=${encodeURIComponent(sitio)}`;
}

/**
 * Campos que TODO producto del contrato v1 trae. Si falta uno, la respuesta no
 * se renderiza: la web sirve el snapshot. Un catálogo a medias se ve peor que
 * un catálogo viejo, y encima sin avisar.
 *
 * Valida un subconjunto de `ApiProduct` a propósito: los campos que el sitio lee
 * para decidir qué mostrar. El resto del tipo describe el contrato, no lo exige.
 */
function isValidProduct(value: unknown): value is ApiProduct {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Record<string, unknown>;
  return (
    typeof product.slug === "string" &&
    product.slug !== "" &&
    typeof product.nombre === "string" &&
    product.nombre !== "" &&
    typeof product.precio === "number" &&
    Number.isFinite(product.precio) &&
    Array.isArray(product.imagenes) &&
    typeof product.agotado === "boolean" &&
    typeof product.atributos === "object" &&
    product.atributos !== null
  );
}

export function isValidCatalog(value: unknown): value is ApiCatalog {
  if (typeof value !== "object" || value === null) return false;
  const catalog = value as Record<string, unknown>;
  if (catalog.version !== CONTRACT_VERSION) return false;
  if (!Array.isArray(catalog.productos)) return false;
  return catalog.productos.every(isValidProduct);
}
