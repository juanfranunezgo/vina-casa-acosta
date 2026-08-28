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

/** Un subcampo de una definición de tipo `grupo` (los siete de `ficha_tecnica`). */
export type AttributeSubfield = {
  clave: string;
  etiqueta: string;
};

/**
 * Cómo se llama, qué forma tiene y qué valores admite un atributo del sitio.
 *
 * `tipo` es `string` y no una unión **a propósito**: la política de extensión del
 * contrato v1 permite tipos nuevos, y un consumidor v1 no puede atragantarse con
 * uno que todavía no existe. Estrechar esto a `"texto" | "opcion" | ...` haría
 * que agregar un tipo en Afeleia rompiera el build de cada web conectada.
 */
export type AttributeDefinition = {
  clave: string;
  etiqueta: string;
  tipo: string;
  orden: number;
  opciones?: string[];
  subcampos?: AttributeSubfield[];
};

export type ApiCatalog = {
  version: number;
  sitio: string;
  generado_en: string;
  /**
   * Clave agregada por la Etapa B, y **opcional en la lectura** por la regla 3 de
   * la política de extensión: el snapshot committeado en cada web es una respuesta
   * v1 vieja y no la trae hasta que alguien lo regenere. Todo lo que la lea tiene
   * que funcionar sin ella.
   */
  definiciones_atributos?: AttributeDefinition[];
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
 * Carpeta de `public/` donde el snapshot deja las fotos de botella.
 *
 * El generador la escribe como `LOCAL_IMAGE_DIR` (`scripts/catalogo-snapshot.mjs`)
 * y es el ÚNICO prefijo local que el snapshot emite. El guard no acepta otro: una
 * ruta arbitraria del sitio termina siendo un fetch del optimizador de Next contra
 * el propio origen, y nada del catálogo necesita eso.
 */
export const SNAPSHOT_IMAGE_PREFIX = "/vinos/";

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

    // Ruta del propio sitio: solo la carpeta que produce el snapshot de fallback
    // (`/vinos/x.webp`). Cualquier otra ruta la pediría el optimizador de Next
    // contra el propio origen, y el catálogo no tiene por qué apuntar ahí.
    // `//` queda afuera solo: una URL protocol-relative no empieza con `/vinos/`.
    // `..` también, porque el optimizador resolvería el escape antes de pedirla.
    if (value.startsWith(SNAPSHOT_IMAGE_PREFIX)) {
      if (value.split("/").includes("..")) continue;
      return value;
    }

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

/** Carpeta de `public/` donde viven las fichas técnicas committeadas. */
export const LOCAL_DOCUMENT_PREFIX = "/documentos/";

/**
 * Enlace de ficha técnica que esta web puede publicar, o `undefined`.
 *
 * `ficha_tecnica_pdf` es texto libre del panel del cliente y va directo a un
 * `href`. Que hoy no se pueda ejecutar nada por ahí es mérito de React —que
 * neutraliza los `href` `javascript:`— y del navegador, que bloquea la navegación
 * top-level a `data:`. Ninguna de las dos es una garantía de este código, y la
 * CSP del sitio no cubre el hueco: su `script-src` lleva `'unsafe-inline'`, que
 * es justamente lo que habilita los URI `javascript:`.
 *
 * A diferencia de las imágenes, acá NO se restringe el host: la viña puede alojar
 * su PDF donde quiera y bloquearlo sería romperle una función. Lo que se exige es
 * el esquema — `http(s)` — o una ruta de `public/documentos/`.
 */
export function renderableDocument(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  if (url === "") return undefined;

  if (url.startsWith(LOCAL_DOCUMENT_PREFIX)) {
    return url.split("/").includes("..") ? undefined : url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : undefined;
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

/**
 * `isValidCatalog` NO mira `definiciones_atributos`, y eso es la decisión, no un
 * olvido: ver la asimetría explicada en `sanitizeDefinitions`.
 */
export function isValidCatalog(value: unknown): value is ApiCatalog {
  if (typeof value !== "object" || value === null) return false;
  const catalog = value as Record<string, unknown>;
  if (catalog.version !== CONTRACT_VERSION) return false;
  if (!Array.isArray(catalog.productos)) return false;
  return catalog.productos.every(isValidProduct);
}

/**
 * Un catálogo vacío pero VÁLIDO, para cuando no hay ninguno servible.
 *
 * Es el último escalón del modo degradado: si hasta el snapshot committeado está
 * corrupto, el sitio muestra una tienda vacía en vez de tirar. Suena peor de lo
 * que es — un producto sin `slug` revienta `generateStaticParams` y con eso el
 * build entero, o sea que un archivo roto impediría desplegar cualquier otra
 * cosa del sitio. Vacío y ruidoso se arregla; caído, no.
 */
export function emptyCatalog(sitio = ""): ApiCatalog {
  return {
    version: CONTRACT_VERSION,
    sitio,
    generado_en: "",
    categorias: [],
    productos: [],
  };
}

// --- Definiciones de atributos ------------------------------------------------
// Todo lo de acá abajo vive en este archivo, y no en `catalog.ts`, porque
// `catalog.ts` importa React y el snapshot: `node --test` no puede cargarlo. Acá
// es donde la lógica queda cubierta por tests.

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function sanitizeOptions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((option): option is string => nonEmptyString(option) !== undefined);
}

function sanitizeSubfields(value: unknown): AttributeSubfield[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const subfields: AttributeSubfield[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { clave, etiqueta } = entry as Record<string, unknown>;
    const key = nonEmptyString(clave);
    if (!key) continue;
    subfields.push({ clave: key, etiqueta: nonEmptyString(etiqueta) ?? key });
  }
  return subfields;
}

/**
 * Las definiciones publicadas que esta web puede usar, en el orden en que llegan.
 *
 * **Asimetría deliberada frente a `isValidProduct`, y no se "arregla":** un bloque
 * de definiciones malformado devuelve `[]` en vez de invalidar el catálogo. Las
 * definiciones son una MEJORA —mejores etiquetas, listas al día—; los productos
 * son el producto. Si un bloque roto empujara al sitio a modo snapshot, un error
 * en el bloque menos importante de la respuesta dejaría la tienda entera con
 * precios viejos. Una entrada rota se descarta sola, sin llevarse a las sanas.
 *
 * No se reordena por `orden`: la API ya las emite ordenadas y el único consumidor
 * que depende de una secuencia —`technicalRowsFrom`— usa el orden de `subcampos`.
 * Reordenar acá sería una segunda regla de orden compitiendo con la del emisor.
 */
export function sanitizeDefinitions(value: unknown): AttributeDefinition[] {
  if (!Array.isArray(value)) return [];

  const definitions: AttributeDefinition[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    const clave = nonEmptyString(raw.clave);
    const tipo = nonEmptyString(raw.tipo);
    if (!clave || !tipo) continue;

    const definition: AttributeDefinition = {
      clave,
      // Sin etiqueta se muestra la clave: feo, pero legible. La alternativa que
      // importa evitar —imprimir una clave de i18n cruda— la cubre `labelOr`.
      etiqueta: nonEmptyString(raw.etiqueta) ?? clave,
      tipo,
      orden: typeof raw.orden === "number" && Number.isFinite(raw.orden) ? raw.orden : Number.MAX_SAFE_INTEGER,
    };

    const opciones = sanitizeOptions(raw.opciones);
    if (opciones) definition.opciones = opciones;
    const subcampos = sanitizeSubfields(raw.subcampos);
    if (subcampos) definition.subcampos = subcampos;

    definitions.push(definition);
  }
  return definitions;
}

/**
 * Valores admitidos de un atributo: los publicados si existen, si no el fallback
 * local.
 *
 * **Este es el único lugar donde se razona el modo degradado de las listas.** Sin
 * definiciones —el snapshot, o una API que todavía no las publica— el sitio sigue
 * dibujando sus filtros con las listas de `data/wines.ts`. Una lista publicada
 * vacía también cae al fallback: dejar la tienda sin ningún filtro es peor que
 * mostrar los seis de siempre.
 */
export function optionsFor(
  definitions: readonly AttributeDefinition[],
  clave: string,
  fallback: readonly string[],
): readonly string[] {
  const published = definitions.find((definition) => definition.clave === clave)?.opciones;
  return published && published.length > 0 ? published : fallback;
}

/**
 * Valor de un atributo de lista cerrada, comprobado contra la lista de runtime.
 *
 * Reemplaza al viejo `readUnion`, que comparaba contra una unión de TypeScript
 * escrita en el repo: esa unión dejó de ser la autoridad el día que la lista pasó
 * a vivir en Afeleia. La semántica no cambia — un valor ajeno vuelve `undefined`,
 * el mismo caso que "sin valor", y el consumidor ya sabe no dibujar la etiqueta.
 */
export function readOptionValue(
  attrs: Record<string, AttributeValue>,
  clave: string,
  allowed: readonly string[],
): string | undefined {
  const value = attrs[clave];
  if (typeof value !== "string" || value === "") return undefined;
  return allowed.includes(value) ? value : undefined;
}

/**
 * Los productos que NO están declarados en otra categoría del catálogo.
 *
 * El catálogo de Afeleia no es solo de vinos: el cliente puede vender delicatessen,
 * merchandising o cualquier otra cosa desde el mismo panel, y esos productos
 * llegan por la misma API. La página de vinos no puede mostrarlos —tendrían
 * «Notas de cata» y «Cosecha» encima de un huevo de avestruz— y esta es la
 * puerta que lo impide.
 *
 * Un producto **sin categoría asignada sigue entrando**: es como nace en el panel,
 * y esconderlo por no estar clasificado rompería el invariante de que todo
 * producto del cliente es visible. Dicho al revés: lo que excluye a un producto
 * es una declaración explícita de que pertenece a otra cosa, nunca un olvido.
 *
 * La consecuencia operativa importa y hay que decirla: **el guard solo funciona
 * si el cliente le pone categoría a lo que no es vino.** Es un clic en el panel,
 * y es el mismo clic que va a necesitar cuando esos productos tengan su propia
 * sección.
 */
export function excludingOtherCategories<T extends { catalogCategory?: string }>(
  items: readonly T[],
  category: string,
): T[] {
  return items.filter(
    (item) => item.catalogCategory === undefined || item.catalogCategory === category,
  );
}

/**
 * Los productos que ninguna de `lines` reclama — **incluidos los que no tienen
 * línea**.
 *
 * Sostiene un invariante que el sitio promete y que nada más comprueba: *todo
 * producto del catálogo aparece en /vinos*. Las bandas editoriales se arman con
 * activos de diseño locales (fotos, copy de marca, anclas de URL) y solo existen
 * para las seis líneas curadas; sin esta lista, un producto con una línea nueva
 * —o sin línea, que es como nace en el panel— quedaba invisible en la página de
 * catálogo de su propio dueño.
 *
 * Estructural y genérica a propósito: acá no se importa el tipo de la web, y así
 * la regla se puede probar sin cargar el módulo que trae React y el snapshot.
 */
export function winesOutsideLines<T extends { line?: string }>(
  wines: readonly T[],
  lines: readonly string[],
): T[] {
  return wines.filter((wine) => !wine.line || !lines.includes(wine.line));
}

/** Una fila de la ficha técnica ya lista para dibujar. */
export type TechnicalRow = {
  clave: string;
  etiqueta: string;
  valor: string;
};

/**
 * Filas de un atributo de tipo `grupo`, **en el orden que declaró la definición**.
 *
 * El orden importa y no puede salir del objeto de valores: el panel guarda las
 * claves en el orden en que las tocó el cliente, así que recorrer el objeto
 * dibujaría la ficha técnica distinta en cada producto. La definición es la que
 * dice que «Composición» va antes que «Alcohol».
 *
 * Solo sobreviven los subcampos con texto: un grupo a medio llenar no dibuja
 * filas vacías. Sin definición o sin grupo no hay ficha — `[]`, y la sección
 * entera se oculta.
 */
export function technicalRowsFrom(
  definitions: readonly AttributeDefinition[],
  attrs: Record<string, AttributeValue>,
  clave = "ficha_tecnica",
): TechnicalRow[] {
  const subcampos = definitions.find((definition) => definition.clave === clave)?.subcampos;
  if (!subcampos || subcampos.length === 0) return [];

  const group = attrs[clave];
  if (typeof group !== "object" || group === null || Array.isArray(group)) return [];
  const values = group as Record<string, unknown>;

  const rows: TechnicalRow[] = [];
  for (const { clave: subclave, etiqueta } of subcampos) {
    const valor = nonEmptyString(values[subclave]);
    if (valor) rows.push({ clave: subclave, etiqueta, valor });
  }
  return rows;
}
