import { cache } from "react";
/**
 * Las listas de `data/wines.ts` **ya no son la autoridad de validación**: desde la
 * Etapa D la autoridad es `definiciones_atributos`, que publica Afeleia. Acá
 * quedan degradadas a dos papeles, los dos legítimos:
 *
 *   1. fallback de modo degradado — cuando la respuesta no trae definiciones (el
 *      snapshot committeado, o una API vieja), `optionsFor` cae a estas listas y
 *      la tienda sigue teniendo filtros;
 *   2. fuente de siembra del importador, que fue de donde salieron las opciones
 *      que hoy están cargadas en el panel.
 *
 * No se agregan valores nuevos acá: un valor nuevo se crea en el panel. Tocar
 * estas listas para "habilitar" algo sería volver a poner el contenido del
 * cliente dentro del repo del sitio.
 */
import {
  cepaGroups,
  varieties,
  wineCategories,
  wineLines,
  wineTypes,
  type Wine,
} from "@/data/wines";
import catalogoFallback from "@/data/catalogo-fallback.json";
import {
  CONTRACT_VERSION,
  catalogEndpoint,
  emptyCatalog,
  isValidCatalog,
  optionsFor,
  readOptionValue,
  renderableDocument,
  renderableImage,
  sanitizeDefinitions,
  technicalRowsFrom,
  type ApiCatalog,
  type ApiProduct,
  type AttributeDefinition,
  type AttributeValue,
  type TechnicalRow,
} from "@/lib/afeleia/contract";

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
  "line" | "type" | "variety" | "cepaGroup" | "category" | "image" | "technicalSheet" | "technical"
> & {
  /**
   * Los cinco campos de lista cerrada son `string` y no uniones locales: sus
   * valores admitidos los publica Afeleia y pueden crecer sin que este repo se
   * entere. Escribirlos como unión obligaría a desplegar la web cada vez que el
   * cliente agrega una línea, que es exactamente lo que la Etapa D vino a
   * terminar. Siguen siendo opcionales: DEC-5, clave ausente = sin valor.
   */
  line?: string;
  type?: string;
  variety?: string;
  cepaGroup?: string;
  category?: string;
  image?: string;
  technicalSheet?: string;
  /**
   * Ficha técnica ya resuelta a filas dibujables, en el orden que declaró la
   * definición. Lista vacía —no `undefined`— porque "no hay ficha" y "la ficha no
   * tiene ninguna fila con valor" se dibujan igual: no se dibuja la sección.
   */
  technical: TechnicalRow[];
  agotado: boolean;
};

/** Ventana de revalidación del ISR, en segundos (spec M3: cambios visibles ≤60s). */
export const CATALOG_REVALIDATE_SECONDS = 60;

/**
 * Cuánto se espera a la API antes de darla por no disponible.
 *
 * Diez segundos es holgado para una Edge Function que responde en decenas de
 * milisegundos, y corto frente al timeout de un build de Netlify.
 */
const CATALOG_TIMEOUT_MS = 10_000;

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
  // El tipo `numero` del contrato viaja como number, pero el mismo dato cargado
  // como texto en el panel llega como "2024" y significa lo mismo.
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

// --- Adaptador ----------------------------------------------------------------

/**
 * Convierte un producto del contrato v1 al `Wine` que consumen los componentes.
 *
 * Es el inverso exacto del importador (`scripts/importar-catalogo-vina.mjs` en
 * el repo de Afeleia): lo que aquel escribió en `atributos_personalizados`,
 * esto lo devuelve a su campo de `CatalogWine`.
 *
 * Nada se colapsa a `""` ni a `0` para llenar un hueco: lo que la API no trae
 * sale `undefined` y cada sección decide si se dibuja (DEC-5).
 *
 * `definitions` son las listas publicadas por Afeleia. Cuando no viajan —el
 * snapshot— cada campo cae a la lista local de `data/wines.ts` y el comportamiento
 * es exactamente el de antes de la Etapa D: el modo degradado no pierde nada.
 */
export function apiProductToWine(
  product: ApiProduct,
  definitions: readonly AttributeDefinition[] = [],
): CatalogWine {
  const attrs = product.atributos ?? {};
  return {
    slug: product.slug,
    name: product.nombre,
    line: readOptionValue(attrs, "linea", optionsFor(definitions, "linea", wineLines)),
    type: readOptionValue(attrs, "tipo", optionsFor(definitions, "tipo", wineTypes)),
    variety: readOptionValue(attrs, "cepa", optionsFor(definitions, "cepa", varieties)),
    cepaGroup: readOptionValue(
      attrs,
      "grupo_cepa",
      optionsFor(definitions, "grupo_cepa", cepaGroups),
    ),
    sweet: readText(attrs, "dulce") === "si",
    category: readOptionValue(attrs, "nivel", optionsFor(definitions, "nivel", wineCategories)),
    image: renderableImage(product.imagenes),
    technicalSheet: renderableDocument(readText(attrs, "ficha_tecnica_pdf")),
    shortDescription: product.descripcion_corta ?? "",
    description: product.descripcion ?? "",
    tastingNotes: readList(attrs, "notas_cata"),
    pairings: readList(attrs, "maridajes"),
    technical: technicalRowsFrom(definitions, attrs),
    priceCLP: product.precio,
    vintage: readNumber(attrs, "cosecha"),
    featured: product.destacado,
    badge: readText(attrs, "badge"),
    agotado: product.agotado,
  };
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

/**
 * El snapshot committeado: la web sirve esto cuando la API no está disponible.
 *
 * Se valida con el MISMO guard que la respuesta viva, y no por simetría: hasta
 * acá el snapshot se servía a ciegas, así que un archivo corrupto —un producto
 * sin `slug`— reventaba `generateStaticParams` y hacía fallar el build entero.
 * O sea: el archivo que existe para que una caída no tumbe el sitio podía ser
 * él mismo el que impidiera desplegarlo.
 *
 * `npm test` ya exige que el committeado sea válido y el generador se niega a
 * escribir uno que no lo sea, así que llegar acá significa que las dos barreras
 * anteriores fallaron. Aun así, el sitio queda en pie.
 */
function fallbackCatalog(): ApiCatalog {
  const snapshot: unknown = catalogoFallback;
  if (isValidCatalog(snapshot)) return snapshot;
  console.error(
    "[afeleia] el snapshot committeado NO cumple el contrato: se sirve un catálogo vacío " +
      "para no tumbar el sitio. Regenerarlo con `npm run catalogo:snapshot`.",
  );
  return emptyCatalog(process.env.NEXT_PUBLIC_AFELEIA_SITIO ?? "");
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
      // Una API que acepta la conexión y no contesta es peor que una caída: no
      // se distingue de "está tardando". Durante `next build` esa espera es la
      // del build entero —Next resuelve estas páginas ahí— y sin techo puede
      // terminar impidiendo desplegar. Con techo, cae al snapshot y sigue.
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
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
  const definitions = sanitizeDefinitions(catalog.definiciones_atributos);
  return catalog.productos.map((product) => apiProductToWine(product, definitions));
}

/** Origen del catálogo de este render. Lo consume `<CatalogOriginMeta>`. */
export async function getCatalogOrigin(): Promise<CatalogOrigin> {
  const { origin } = await loadCatalog();
  return origin;
}

/**
 * `generado_en` del catálogo que se está sirviendo, o `undefined` si no viene.
 *
 * En modo degradado esta fecha es la EDAD de la copia, y es el dato que convierte
 * «este sitio está degradado» en «este sitio está degradado y su copia tiene N
 * días». Viaja al HTML junto al origen porque es lo único auditable desde afuera:
 * con 100 sitios conectados nadie va a mirar 100 paneles de logs, pero un
 * chequeo automático sí puede leer un `<meta>` en la URL pública.
 */
export async function getCatalogGeneratedAt(): Promise<string | undefined> {
  const { catalog } = await loadCatalog();
  return typeof catalog.generado_en === "string" && catalog.generado_en !== ""
    ? catalog.generado_en
    : undefined;
}

/**
 * Definiciones publicadas para este sitio, o `[]` si la respuesta no las trae.
 *
 * Sale del mismo `cache()` que el catálogo: **no cuesta un fetch extra**, el mismo
 * truco que ya usa `getCatalogOrigin`. Una página que necesita las listas para
 * dibujar sus filtros no paga una segunda lectura por pedirlas.
 */
export async function getCatalogDefinitions(): Promise<AttributeDefinition[]> {
  const { catalog } = await loadCatalog();
  return sanitizeDefinitions(catalog.definiciones_atributos);
}

/** Un vino por slug, o `null` si el catálogo no lo trae. */
export async function getWineBySlug(slug: string): Promise<CatalogWine | null> {
  const catalog = await getCatalog();
  return catalog.find((wine) => wine.slug === slug) ?? null;
}

/**
 * Vinos de una línea. Puro: se aplica sobre un catálogo ya leído.
 *
 * `line` es `string` porque las líneas ya no son una unión de este repo. La
 * comparación es exacta contra el valor publicado: una línea que el sitio no
 * conoce simplemente no tiene banda, y sus vinos caen en «Otros vinos».
 */
export function winesByLine(catalog: CatalogWine[], line: string): CatalogWine[] {
  return catalog.filter((wine) => wine.line === line);
}
