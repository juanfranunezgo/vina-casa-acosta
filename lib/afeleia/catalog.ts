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
  createOutageMemo,
  crearVueloUnico,
  emptyCatalog,
  isOwnCatalog,
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
  /**
   * Nivel del vino («Reserva», «Gran Reserva»). Sale del atributo `nivel`.
   *
   * ⚠️ NO confundir con `catalogCategory`, que es la categoría de tienda. Los dos
   * se llaman parecido en castellano y significan cosas distintas: esta es una
   * etiqueta del vino, la otra dice qué clase de producto es.
   */
  category?: string;
  /**
   * Categoría del catálogo (`producto.categoria`): «vinos», «delicatessen», lo
   * que el cliente haya creado en el panel. `undefined` cuando no le asignó
   * ninguna.
   *
   * La usa `/vinos` para no mostrar productos que no son vino — ver
   * `excludingOtherCategories`.
   */
  catalogCategory?: string;
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
    catalogCategory: product.categoria ?? undefined,
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
  const sitio = process.env.NEXT_PUBLIC_AFELEIA_SITIO;

  if (!isValidCatalog(snapshot)) {
    console.error(
      "[afeleia] el snapshot committeado NO cumple el contrato: se sirve un catálogo vacío " +
        "para no tumbar el sitio. Regenerarlo con `npm run catalogo:snapshot`.",
    );
    return emptyCatalog(sitio ?? "");
  }

  // Y tiene que ser DE ESTE SITIO. La respuesta viva ya se comprobaba; el archivo
  // no, y esa era la mitad que faltaba: un snapshot ajeno —committeado por error,
  // copiado de otra web del mismo cliente, generado contra el slug equivocado—
  // se servía tal cual, con la web mostrando el catálogo de otra bodega y todos
  // los controles en verde. Publicar productos ajenos es peor que no publicar
  // ninguno, así que acá se degrada a la tienda vacía, que es ruidosa y no miente.
  if (!isOwnCatalog(snapshot, sitio)) {
    console.error(
      `[afeleia] el snapshot committeado es del sitio ${JSON.stringify(snapshot.sitio)} y este ` +
        `sitio es ${JSON.stringify(sitio)}: NO se sirve. Se sirve un catálogo vacío en vez de ` +
        "publicar el catálogo de otro cliente. Regenerarlo con `npm run catalogo:snapshot`.",
    );
    return emptyCatalog(sitio ?? "");
  }

  return snapshot;
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
function reportFallback(reason: string, catalog: ApiCatalog): void {
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

/**
 * Lo que ya se sabe de una caída, recordado por proceso y por la misma ventana
 * que dura el ISR.
 *
 * Next cachea las respuestas de la API pero no los fallos, así que sin esto cada
 * página y cada worker vuelven a intentar contra el servicio caído: medido, **53
 * intentos** en un build que sano hace **una sola consulta**. Con cien sitios
 * conectados eso convierte una caída de Afeleia en miles de intentos de sus
 * propios clientes. Ver `createOutageMemo`.
 */
const caidaReciente = createOutageMemo<CatalogLoad>(CATALOG_REVALIDATE_SECONDS * 1000);

function degraded(reason: string): CatalogLoad {
  // Se lee UNA vez y se pasa: `reportFallback` lo llamaba por su cuenta para
  // medir la edad, asi que cada degradacion validaba el snapshot dos veces y —con
  // un snapshot ajeno— gritaba dos veces la misma linea.
  const catalog = fallbackCatalog();
  reportFallback(reason, catalog);
  const load: CatalogLoad = { catalog, origin: "snapshot" };
  // Se recuerda DESPUÉS de reportar: el log sale una vez por proceso y por
  // ventana, en vez de una vez por página. La misma señal, sin el ruido que hacía
  // ilegibles los logs del build justo cuando había que leerlos.
  caidaReciente.remember(load);
  return load;
}

/**
 * La consulta compartida: una sola en vuelo por proceso.
 *
 * `crearVueloUnico` vive en el contrato y está probado ejecutándolo (30 llamadas
 * simultáneas, un solo disparo). Acá arriba se le agrega la red que el resto
 * necesita: **esta promesa no puede rechazar**, porque de ella pueden estar
 * colgados treinta renders y un rechazo los tumbaría a todos. `consultarCatalogo`
 * ya termina todos sus caminos en `degraded()`, pero un invariante del que
 * dependen otros tiene que ser mecanismo y no comentario.
 */
const consultaCompartida = crearVueloUnico(async (): Promise<CatalogLoad> => {
  try {
    return await consultarCatalogo();
  } catch (error) {
    // Último escalón: ni siquiera se pasa por `degraded()`, que es lo único que
    // podría haber tirado. Catálogo vacío, ruidoso, y el sitio en pie.
    const detalle = error instanceof Error ? error.message : String(error);
    console.error(
      `[afeleia] la lectura del catálogo tiró (${detalle}): se sirve un catálogo vacío. ` +
        "Esto no debería pasar: `consultarCatalogo` degrada por su cuenta.",
    );
    return {
      catalog: emptyCatalog(process.env.NEXT_PUBLIC_AFELEIA_SITIO ?? ""),
      origin: "snapshot",
    };
  }
});

/**
 * `cache()` de React: dentro de UN mismo render, la página y el `<meta>` que
 * declara el origen comparten la misma lectura. Sin esto, emitir el origen
 * costaría un fetch extra por página solo para poder informarlo.
 *
 * Y por encima, el vuelo único, que es lo mismo pero entre renders del mismo
 * proceso.
 *
 * ⚠️ Toda ruta que consuma el catálogo tiene que declarar su propio
 * `export const revalidate = 60`. Next propaga el `revalidate` del `fetch` al
 * segmento **del render que lo inició**, y con el vuelo compartido los demás no
 * ejecutan esa propagación: una ruta que se apoyara en el fetch quedaría con ISR
 * de 60 s cuando inicia el vuelo y estática para siempre cuando se cuelga de
 * otro, según el orden de render del build. Lo asserta
 * `tests/afeleia-modo-degradado.test.mjs`.
 */
const loadCatalog = cache(async (): Promise<CatalogLoad> => {
  // Preguntar por la caída ANTES del fetch: consultarla después no ahorraría
  // ningún intento, que es exactamente lo que hay que ahorrar.
  const recordada = caidaReciente.current();
  if (recordada) return recordada;

  return consultaCompartida();
});

/**
 * La consulta de verdad. Vive aparte de `loadCatalog` para que el single-flight
 * envuelva SIEMPRE a la única función que abre una conexión.
 *
 * No tira nunca: todos los caminos de falla terminan en `degraded()`, que es lo
 * que permite compartir la promesa sin que un rechazo se propague a treinta
 * renders a la vez.
 */
async function consultarCatalogo(): Promise<CatalogLoad> {
  const url = catalogEndpoint();
  if (!url) {
    return degraded(
      "no hay endpoint utilizable: NEXT_PUBLIC_AFELEIA_API_URL / NEXT_PUBLIC_AFELEIA_SITIO " +
        "faltan o no arman una URL válida",
    );
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
    // El catálogo tiene que ser DE ESTE SITIO. Se pide por `?sitio=`, así que
    // recibir otro significa que algo del otro lado está mal —un endpoint mal
    // configurado, una redirección, un slug equivocado— y ninguna de esas
    // posibilidades justifica publicar los nombres y los precios de otro
    // cliente. Ante la duda, el catálogo propio de ayer le gana al ajeno de hoy.
    //
    // Es la MISMA función que aplican el generador, el prebuild y el fallback:
    // cuando la regla estaba escrita una vez por capa, faltaba en dos de las
    // cuatro (`isOwnCatalog`).
    const sitio = process.env.NEXT_PUBLIC_AFELEIA_SITIO;
    if (!isOwnCatalog(payload, sitio)) {
      return degraded(`la respuesta es del sitio "${payload.sitio}" y se pidió "${sitio}"`);
    }
    // La API contestó: si este proceso venía sirviendo el snapshot por una caída
    // anterior, ese recuerdo deja de mandar ahora mismo y no cuando venza.
    caidaReciente.forget();
    return { catalog: payload, origin: "api" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return degraded(`no se pudo consultar la API: ${detail}`);
  }
}

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

/**
 * Lo que hace falta para auditar este sitio DESDE AFUERA, en una sola lectura.
 *
 * Los cuatro datos salen del mismo `loadCatalog()` a propósito: pedirlos por
 * separado permitiría que el `<meta>` se contradijera —«origen api» junto a la
 * cantidad de productos del snapshot— y un control que puede mentir no es un
 * control.
 *
 * `sitio` y `products` los agregó la segunda ronda de review: con origen y fecha
 * se detecta que un sitio está degradado, pero no que esté sirviendo el catálogo
 * de OTRO cliente ni que se haya quedado sin productos. Las dos son fallas
 * silenciosas —la web se ve sana— y las dos escalan mal: con cien sitios nadie
 * va a mirar cien paneles de logs, pero un chequeo automático sí puede leer un
 * `<meta>` en la URL pública.
 */
export type CatalogMeta = {
  origin: CatalogOrigin;
  generatedAt?: string;
  sitio: string;
  products: number;
};

export async function getCatalogMeta(): Promise<CatalogMeta> {
  const { catalog, origin } = await loadCatalog();
  return {
    origin,
    generatedAt:
      typeof catalog.generado_en === "string" && catalog.generado_en !== ""
        ? catalog.generado_en
        : undefined,
    sitio: catalog.sitio,
    products: catalog.productos.length,
  };
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
