import type {
  CepaGroup,
  Variety,
  Wine,
  WineLine,
  WineTechnical,
  WineType,
} from "@/data/wines";
import catalogoFallback from "@/data/catalogo-fallback.json";

/**
 * Catálogo servido por la API pública de Afeleia (contrato v1).
 *
 * La web no tiene credenciales de ningún tipo: solo conoce la URL de la API y
 * el slug público del sitio. El adaptador de este archivo convierte la
 * respuesta al tipo `Wine` que ya usaban los componentes, así que ninguna
 * tarjeta, ficha ni filtro cambió de props.
 *
 * Contrato completo: `supabase/functions/catalogo-publico/README.md` del repo
 * de Afeleia.
 */

/** Un vino del catálogo, más el estado de stock que publica la API. */
export type CatalogWine = Wine & { agotado: boolean };

/** Versión del contrato que esta web sabe leer. */
const CONTRACT_VERSION = 1;

/** Ventana de revalidación del ISR, en segundos (spec M3: cambios visibles ≤60s). */
export const CATALOG_REVALIDATE_SECONDS = 60;

/** Valor de un atributo por sitio, según el `tipo` de su definición. */
type AttributeValue = string | number | string[] | Record<string, string>;

type ApiProduct = {
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

type ApiCatalog = {
  version: number;
  sitio: string;
  generado_en: string;
  categorias: Array<{ slug: string; nombre: string; orden: number }>;
  productos: ApiProduct[];
};

// --- Lectura de atributos -----------------------------------------------------
// DEC-5 del contrato: si una clave está presente, tiene valor no vacío; y una
// clave ausente significa "sin valor". Por eso nada de esto asume que la clave
// existe: devuelve `undefined` (o lista/objeto vacío) y el consumidor decide si
// dibuja la sección o no.

function readText(attrs: Record<string, AttributeValue>, key: string): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function readNumber(attrs: Record<string, AttributeValue>, key: string): number | undefined {
  const value = attrs[key];
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  // El tipo `numero` viaja como number, pero un subcampo de grupo siempre es
  // texto: `volumen_ml` llega como "750".
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readList(attrs: Record<string, AttributeValue>, key: string): string[] {
  const value = attrs[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item !== "");
}

function readGroup(
  attrs: Record<string, AttributeValue>,
  key: string,
): Record<string, string> {
  const value = attrs[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, string>;
}

/**
 * Ficha técnica: el grupo `ficha_tecnica` con subcampos en español (los definió
 * el importador) de vuelta a las claves en inglés del tipo `WineTechnical`.
 */
function readTechnical(attrs: Record<string, AttributeValue>): WineTechnical {
  const group = readGroup(attrs, "ficha_tecnica");
  return {
    blend: group.blend ?? "",
    alcohol: group.alcohol ?? "",
    valley: group.valle ?? "",
    training: group.conduccion ?? "",
    volumeMl: readNumber(group, "volumen_ml") ?? 0,
    closure: group.cierre ?? "",
    serve: group.servicio ?? "",
  };
}

// --- Adaptador ----------------------------------------------------------------

/**
 * Convierte un producto del contrato v1 al `Wine` que consumen los componentes.
 *
 * Es el inverso exacto del importador (`scripts/importar-catalogo-vina.mjs` en
 * el repo de Afeleia): lo que aquel escribió en `atributos_personalizados`,
 * esto lo devuelve a su campo de `Wine`.
 *
 * Los campos de unión (`line`, `type`, `variety`, `cepaGroup`) se afirman contra
 * su tipo porque el catálogo lo siembra ese mismo importador desde `wines.ts`.
 * Un valor fuera de la unión no rompe el render, pero sí deja sin traducción la
 * etiqueta que lo muestra — ver la nota de i18n en el README de conexión.
 */
export function apiProductToWine(product: ApiProduct): CatalogWine {
  const attrs = product.atributos ?? {};
  return {
    slug: product.slug,
    name: product.nombre,
    line: readText(attrs, "linea") as WineLine,
    type: readText(attrs, "tipo") as WineType,
    variety: readText(attrs, "cepa") as Variety,
    cepaGroup: readText(attrs, "grupo_cepa") as CepaGroup,
    sweet: readText(attrs, "dulce") === "si",
    category: readText(attrs, "nivel") as Wine["category"],
    image: product.imagenes[0] ?? "",
    technicalSheet: readText(attrs, "ficha_tecnica_pdf") ?? "",
    shortDescription: product.descripcion_corta ?? "",
    description: product.descripcion ?? "",
    tastingNotes: readList(attrs, "notas_cata"),
    pairings: readList(attrs, "maridajes"),
    technical: readTechnical(attrs),
    priceCLP: product.precio,
    vintage: readNumber(attrs, "cosecha"),
    featured: product.destacado,
    badge: readText(attrs, "badge"),
    agotado: product.agotado,
  };
}

// --- Validación del contrato --------------------------------------------------

/**
 * Campos que TODO producto del contrato v1 trae. Si falta uno, la respuesta no
 * se renderiza: la web sirve el snapshot. Un catálogo a medias se ve peor que
 * un catálogo viejo, y encima sin avisar.
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

function isValidCatalog(value: unknown): value is ApiCatalog {
  if (typeof value !== "object" || value === null) return false;
  const catalog = value as Record<string, unknown>;
  if (catalog.version !== CONTRACT_VERSION) return false;
  if (!Array.isArray(catalog.productos)) return false;
  return catalog.productos.every(isValidProduct);
}

// --- Fetch con fallback -------------------------------------------------------

/** El snapshot committeado: la web sirve esto cuando la API no está disponible. */
function fallbackCatalog(): ApiCatalog {
  return catalogoFallback as unknown as ApiCatalog;
}

/**
 * El fallback nunca se muestra como error al visitante: se registra del lado
 * del servidor para que quede en los logs de Netlify.
 */
function reportFallback(reason: string): void {
  console.error(`[afeleia] catálogo desde el snapshot local — ${reason}`);
}

function catalogEndpoint(): string | null {
  const base = process.env.NEXT_PUBLIC_AFELEIA_API_URL;
  const sitio = process.env.NEXT_PUBLIC_AFELEIA_SITIO;
  if (!base || !sitio) return null;
  return `${base.replace(/\/+$/, "")}/catalogo-publico?sitio=${encodeURIComponent(sitio)}`;
}

async function loadCatalog(): Promise<ApiCatalog> {
  const url = catalogEndpoint();
  if (!url) {
    reportFallback("faltan NEXT_PUBLIC_AFELEIA_API_URL o NEXT_PUBLIC_AFELEIA_SITIO");
    return fallbackCatalog();
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
    });
    // 429 y 503 no son fallas del contrato sino respuestas normales bajo carga,
    // y como cualquier otra respuesta no-ok caen al snapshot.
    if (!response.ok) {
      reportFallback(`la API respondió ${response.status}`);
      return fallbackCatalog();
    }
    const payload: unknown = await response.json();
    if (!isValidCatalog(payload)) {
      reportFallback(`la respuesta no cumple el contrato v${CONTRACT_VERSION}`);
      return fallbackCatalog();
    }
    return payload;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    reportFallback(`no se pudo consultar la API: ${detail}`);
    return fallbackCatalog();
  }
}

// --- API para las páginas -----------------------------------------------------

/** Catálogo completo, en el orden que publica la API (alfabético por nombre). */
export async function getCatalog(): Promise<CatalogWine[]> {
  const catalog = await loadCatalog();
  return catalog.productos.map(apiProductToWine);
}

/** Un vino por slug, o `null` si el catálogo no lo trae. */
export async function getWineBySlug(slug: string): Promise<CatalogWine | null> {
  const catalog = await getCatalog();
  return catalog.find((wine) => wine.slug === slug) ?? null;
}

/** Vinos de una línea. Puro: se aplica sobre un catálogo ya leído. */
export function winesByLine(catalog: CatalogWine[], line: WineLine): CatalogWine[] {
  return catalog.filter((wine) => wine.line === line);
}
