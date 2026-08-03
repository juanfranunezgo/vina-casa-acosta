import { cache } from "react";
import {
  cepaGroups,
  varieties,
  wineCategories,
  wineLines,
  wineTypes,
  type CepaGroup,
  type Variety,
  type Wine,
  type WineLine,
  type WineTechnical,
  type WineType,
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

/**
 * Un vino del catálogo, más el estado de stock que publica la API.
 *
 * NO es `Wine & { agotado }`. `Wine` describe los 13 vinos escritos a mano, donde
 * cada campo existe porque lo escribió un desarrollador. Un producto creado desde
 * el panel puede no tener foto, ni PDF de ficha, ni línea asignada — DEC-5 del
 * contrato dice justamente que una clave ausente significa "sin valor".
 *
 * Por eso los campos que el panel puede dejar vacíos son opcionales acá: si el
 * adaptador los colapsara a `""`/`0` para encajar en `Wine`, el consumidor no
 * podría distinguir "sin ficha técnica" de "ficha técnica en la URL vacía", y
 * terminaría dibujando un botón que no lleva a ninguna parte. Que el tipo diga
 * la verdad es lo que obliga a cada sección a decidir si se dibuja.
 */
export type CatalogWine = Omit<
  Wine,
  "line" | "type" | "variety" | "cepaGroup" | "image" | "technicalSheet" | "technical"
> & {
  line?: WineLine;
  type?: WineType;
  variety?: Variety;
  cepaGroup?: CepaGroup;
  image?: string;
  technicalSheet?: string;
  technical?: WineTechnical;
  agotado: boolean;
};

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
): Record<string, string> | undefined {
  const value = attrs[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, string>;
}

/**
 * Valor de un campo de unión (`linea`, `tipo`, `cepa`, `grupo_cepa`, `nivel`).
 *
 * Comprueba contra la unión real en vez de afirmar el tipo: el catálogo lo puede
 * editar cualquiera desde el panel, así que "el importador lo sembró desde
 * wines.ts" dejó de ser garantía el día que la viña creó su primer producto.
 * Un valor fuera de la unión vuelve como `undefined` —el mismo caso que "sin
 * valor"— y el consumidor ya sabe no dibujar esa etiqueta.
 */
function readUnion<T extends string>(
  attrs: Record<string, AttributeValue>,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = readText(attrs, key);
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/**
 * Ficha técnica: el grupo `ficha_tecnica` con subcampos en español (los definió
 * el importador) de vuelta a las claves en inglés del tipo `WineTechnical`.
 *
 * Devuelve `undefined` si el grupo entero falta: un producto del panel sin ficha
 * cargada no tiene una ficha con todos los campos en blanco, no tiene ficha.
 */
function readTechnical(attrs: Record<string, AttributeValue>): WineTechnical | undefined {
  const group = readGroup(attrs, "ficha_tecnica");
  if (!group) return undefined;
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
 * esto lo devuelve a su campo de `CatalogWine`.
 *
 * Nada se colapsa a `""` ni a `0` para llenar un hueco: lo que la API no trae
 * sale `undefined` y cada sección decide si se dibuja (DEC-5). Los campos de
 * unión se validan contra su lista, no se afirman: ver `readUnion`.
 */
export function apiProductToWine(product: ApiProduct): CatalogWine {
  const attrs = product.atributos ?? {};
  return {
    slug: product.slug,
    name: product.nombre,
    line: readUnion(attrs, "linea", wineLines),
    type: readUnion(attrs, "tipo", wineTypes),
    variety: readUnion(attrs, "cepa", varieties),
    cepaGroup: readUnion(attrs, "grupo_cepa", cepaGroups),
    sweet: readText(attrs, "dulce") === "si",
    category: readUnion(attrs, "nivel", wineCategories),
    image: product.imagenes[0],
    technicalSheet: readText(attrs, "ficha_tecnica_pdf"),
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

/**
 * De dónde salió el catálogo que se está sirviendo.
 *
 * `snapshot` significa modo degradado: la web se ve perfectamente sana pero los
 * precios y el stock son los del último snapshot committeado. Sin este dato el
 * único rastro es un `console.error` en los logs de Netlify, y un control que
 * solo se puede auditar entrando a los logs no es un control (H-30): por eso
 * viaja al HTML en `<CatalogOriginMeta>` y el script de go-live lo asevera
 * contra la URL pública real.
 */
export type CatalogOrigin = "api" | "snapshot";

export type CatalogLoad = {
  catalog: ApiCatalog;
  origin: CatalogOrigin;
};

/**
 * A partir de acá el snapshot deja de ser "el catálogo de ayer" y pasa a ser
 * dato viejo servido como vigente. No se deja de servir —una web con precios de
 * hace un mes es mejor que una web caída— pero se grita distinto y el go-live
 * lo puede distinguir.
 */
const SNAPSHOT_STALE_DAYS = 7;

/** El snapshot committeado: la web sirve esto cuando la API no está disponible. */
function fallbackCatalog(): ApiCatalog {
  return catalogoFallback as unknown as ApiCatalog;
}

/** Antigüedad del snapshot en días, o `null` si no trae `generado_en` legible. */
function snapshotAgeDays(catalog: ApiCatalog): number | null {
  const generated = Date.parse(catalog.generado_en ?? "");
  if (Number.isNaN(generated)) return null;
  return Math.floor((Date.now() - generated) / 86_400_000);
}

/**
 * El fallback nunca se muestra como error al visitante: se registra del lado
 * del servidor para que quede en los logs de Netlify.
 */
function reportFallback(reason: string): void {
  const catalog = fallbackCatalog();
  const age = snapshotAgeDays(catalog);
  const antiguedad =
    age === null
      ? "sin generado_en legible"
      : `generado hace ${age} día(s)`;
  const nivel = age !== null && age > SNAPSHOT_STALE_DAYS ? "VENCIDO" : "vigente";
  console.error(
    `[afeleia] catálogo desde el snapshot local (${nivel}, ${antiguedad}) — ${reason}`,
  );
}

function catalogEndpoint(): string | null {
  const base = process.env.NEXT_PUBLIC_AFELEIA_API_URL;
  const sitio = process.env.NEXT_PUBLIC_AFELEIA_SITIO;
  if (!base || !sitio) return null;
  return `${base.replace(/\/+$/, "")}/catalogo-publico?sitio=${encodeURIComponent(sitio)}`;
}

function degraded(reason: string): CatalogLoad {
  reportFallback(reason);
  return { catalog: fallbackCatalog(), origin: "snapshot" };
}

/**
 * `cache()` de React: dentro de UN mismo render, la página y el `<meta>` que
 * declara el origen comparten la misma lectura. Sin esto, emitir el origen
 * costaría un fetch extra por página solo para poder informarlo.
 */
const loadCatalog = cache(async (): Promise<CatalogLoad> => {
  const url = catalogEndpoint();
  if (!url) {
    return degraded("faltan NEXT_PUBLIC_AFELEIA_API_URL o NEXT_PUBLIC_AFELEIA_SITIO");
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
    });
    // 429 y 503 no son fallas del contrato sino respuestas normales bajo carga,
    // y como cualquier otra respuesta no-ok caen al snapshot.
    if (!response.ok) {
      return degraded(`la API respondió ${response.status}`);
    }
    const payload: unknown = await response.json();
    if (!isValidCatalog(payload)) {
      return degraded(`la respuesta no cumple el contrato v${CONTRACT_VERSION}`);
    }
    return { catalog: payload, origin: "api" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return degraded(`no se pudo consultar la API: ${detail}`);
  }
});

// --- API para las páginas -----------------------------------------------------

/** Catálogo completo, en el orden que publica la API (alfabético por nombre). */
export async function getCatalog(): Promise<CatalogWine[]> {
  const { catalog } = await loadCatalog();
  return catalog.productos.map(apiProductToWine);
}

/** Origen del catálogo de este render. Lo consume `<CatalogOriginMeta>`. */
export async function getCatalogOrigin(): Promise<CatalogOrigin> {
  const { origin } = await loadCatalog();
  return origin;
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
