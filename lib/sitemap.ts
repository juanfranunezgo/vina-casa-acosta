import type { MetadataRoute } from "next";
import { activities, activityPath, VENDIMIA_HUB } from "@/data/activities";
import { WINE_CATEGORY } from "@/data/wines";
import { excludingOtherCategories } from "@/lib/afeleia/contract";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Qué URLs anuncia el sitio, y cuáles se niega a anunciar.
 *
 * Vive acá y no dentro de `app/sitemap.ts` por una razón concreta: la página
 * lee el catálogo con `getCatalog()`, que importa React y el snapshot JSON, y
 * `node --test` no puede cargar ese módulo. Todo lo que decide qué entra al
 * sitemap es puro y recibe los productos ya leídos, así que se prueba
 * ejecutándolo —con un producto de otra categoría, con un slug envenenado, con
 * el catálogo vacío— en vez de con un guard que lea el texto del archivo.
 *
 * `app/sitemap.ts` queda en tres líneas: leer el catálogo y pasarlo por acá.
 */

/**
 * Rutas estáticas, sin prefijo de idioma. Las de producto salen del catálogo
 * publicado y las de actividad de `data/activities.ts`, así que agregar un vino
 * en el panel o un tour en el repo lo mete solo en el sitemap.
 */
export const STATIC_PATHS = [
  "",
  "/vinos",
  "/tienda",
  "/actividades",
  "/historia",
  "/staff",
  "/contacto",
] as const;

/**
 * Tope del estándar de sitemaps: 50.000 URLs por archivo.
 *
 * Pasarlo no degrada nada gradualmente —invalida el archivo entero y el crawler
 * lo descarta completo—, así que el exceso se corta y se avisa. Hoy el sitio
 * anda por las 108 URLs (medido en el build); el día que esto se acerque al tope, la salida es
 * `generateSitemaps()` de Next, que parte el sitemap en varios archivos.
 */
export const SITEMAP_URL_LIMIT = 50_000;

/**
 * Lo único que se acepta dentro del segmento de una URL: letras (de cualquier
 * alfabeto), dígitos, guion, guion bajo, punto y tilde.
 *
 * Es una lista de permitidos y no de prohibidos a propósito. El `slug` lo
 * escribe el cliente en el panel de Afeleia y el contrato solo exige que sea un
 * string no vacío (`isValidProduct`): todo lo demás que llegue en ese campo
 * termina, sin este guard, dentro de una URL que este sitio le pide a Google que
 * rastree. Con una lista de prohibidos, cada carácter que no se me ocurrió hoy
 * es un agujero; con una de permitidos, es un descarte.
 *
 * Las letras acentuadas entran: una eñe no cambia de segmento y dejar afuera un
 * producto real lo vuelve invisible para el buscador. Un chequeo que reprueba lo
 * correcto es peor que no tenerlo.
 */
const SEGMENTO_PERMITIDO = /^[\p{L}\p{N}._~-]+$/u;

/**
 * Si el slug puede viajar dentro de `/vinos/<slug>` sin cambiar de significado.
 *
 * `.` y `..` se rechazan aparte: los dos pasan la lista de permitidos y los dos
 * son saltos de directorio.
 */
export function isSafeSlug(slug: string): boolean {
  if (slug === "." || slug === "..") return false;
  return SEGMENTO_PERMITIDO.test(slug);
}

/** Un producto del catálogo, reducido a lo que el sitemap necesita mirar. */
export type SitemapProduct = {
  slug: string;
  catalogCategory?: string;
};

/**
 * Las fichas de producto que corresponde anunciar.
 *
 * Dos filtros, por dos motivos distintos:
 *
 * 1. **Categoría** — la misma puerta que usa `/vinos` (`excludingOtherCategories`).
 *    Los productos que no son vino todavía no tienen dirección propia: es la
 *    etapa siguiente y sus URLs las decide el cliente. Anunciar hoy
 *    `/vinos/huevos-de-avestruz` convierte esa decisión en permanente, porque
 *    una vez que el buscador la indexa moverla cuesta una redirección para
 *    siempre. Un producto **sin** categoría sí entra: lo que excluye es una
 *    declaración, nunca un olvido.
 * 2. **Slug** — ver `isSafeSlug`.
 *
 * Un descarte se grita en los logs del build, y no rompe: que un slug raro
 * impida desplegar le daría al contenido del panel la llave del deploy, que es
 * justo lo que la Etapa D vino a sacarle. Pero tampoco se descarta en silencio:
 * un producto que desaparece del sitemap sin dejar rastro es el mismo bug que
 * esta rama vino a cerrar —existe y Google no lo ve— con otro disfraz.
 */
export function catalogPaths(products: readonly SitemapProduct[]): string[] {
  const paths: string[] = [];
  for (const product of excludingOtherCategories(products, WINE_CATEGORY)) {
    if (!isSafeSlug(product.slug)) {
      console.error(
        `[sitemap] el producto con slug ${JSON.stringify(product.slug)} NO se anuncia: ` +
          "ese texto no es un segmento de URL. Corregir el slug en el panel.",
      );
      continue;
    }
    paths.push(`/vinos/${product.slug}`);
  }
  return paths;
}

/** Todas las rutas del sitio, sin prefijo de idioma, dado el catálogo leído. */
export function sitemapPaths(products: readonly SitemapProduct[]): string[] {
  return [
    ...STATIC_PATHS,
    ...catalogPaths(products),
    ...activities.map(activityPath),
    // El hub de temporada no es una actividad del catálogo: entra por su propia
    // constante, y si vuelve a `null` desaparece del sitemap con la página.
    ...(VENDIMIA_HUB ? [VENDIMIA_HUB] : []),
  ];
}

/**
 * Cada URL absoluta, normalizada igual que el canonical.
 *
 * `new URL(...).href` escapa lo que haya que escapar (una eñe sale
 * `%C3%B1`), que es lo mismo que hace Next al resolver el `canonical` contra
 * `metadataBase`. Si el sitemap anunciara la forma cruda y el canonical la
 * escapada, serían dos URLs distintas para la misma página.
 */
function absolute(path: string): string {
  return new URL(`${SITE_URL}${path}`).href;
}

/**
 * Una entrada por ruta y locale, cada una con el set completo de hreflang (los
 * tres idiomas + `x-default`).
 *
 * Sin `lastmod`, `changefreq` ni `priority`, y es deliberado:
 *
 * - `lastmod` tendría que ser la fecha real de modificación de cada página, y
 *   ese dato **sigue sin existir**: el contrato v1 no publica `updated_at` por
 *   producto, y `generado_en` es cuándo se armó el catálogo entero, no cuándo
 *   cambió esta ficha. Estamparlo en todas las URLs sería mentirle al crawler, y
 *   como cambiaría en cada deploy, Google aprende a ignorar el campo. Un sitemap
 *   sin `lastmod` es válido; uno con `lastmod` falso es peor que nada.
 * - `changefreq` y `priority` Google los ignora casi por completo.
 *
 * El corte por el tope es **por ruta y no por URL**: una página anunciada en dos
 * idiomas de tres declararía hreflang hacia una URL que el sitemap nunca
 * menciona.
 */
export function sitemapEntries(paths: readonly string[]): MetadataRoute.Sitemap {
  const unicas = [...new Set(paths)];
  const tope = Math.floor(SITEMAP_URL_LIMIT / routing.locales.length);

  if (unicas.length > tope) {
    console.error(
      `[sitemap] ${unicas.length} rutas × ${routing.locales.length} idiomas pasan las ` +
        `${SITEMAP_URL_LIMIT} URLs del estándar: se anuncian las primeras ${tope} rutas y ` +
        "el resto queda afuera. Partir el sitemap con `generateSitemaps()`.",
    );
  }

  return unicas.slice(0, tope).flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absolute(`/${locale}${path}`),
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((l) => [l, absolute(`/${l}${path}`)]),
          ),
          "x-default": absolute(`/${routing.defaultLocale}${path}`),
        },
      },
    })),
  );
}
