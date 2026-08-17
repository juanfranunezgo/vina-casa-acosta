import type { MetadataRoute } from "next";
import { wines } from "@/data/wines";
import { activities, activityPath, VENDIMIA_HUB } from "@/data/activities";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Rutas estáticas, sin prefijo de idioma. Las dinámicas salen de `data/`, así
 * que agregar un vino o un tour lo mete solo en el sitemap.
 */
const STATIC_PATHS = [
  "",
  "/vinos",
  "/tienda",
  "/actividades",
  "/historia",
  "/staff",
  "/contacto",
] as const;

/**
 * Sitemap del sitio: una entrada por ruta y locale, cada una con el set
 * completo de hreflang (los tres idiomas + `x-default`).
 *
 * El total no se escribe acá a propósito: las rutas dinámicas salen de `data/`
 * y el número cambia con cada vino o actividad que se agregue. Un comentario
 * con una cifra que envejece es peor que ninguno —este decía 78 hasta que las
 * actividades pasaron a vivir bajo su categoría—. `tests/actividades-sitemap.test.mjs`
 * verifica la cobertura, que es lo que de verdad importa.
 *
 * Sin `lastmod`, `changefreq` ni `priority`, y es deliberado:
 *
 * - `lastmod` tendría que ser la fecha real de modificación de cada página, y
 *   hoy no existe ese dato: ni `data/wines.ts` ni `data/activities.ts` guardan
 *   fechas. Estampar la hora del build en todas las URLs sería mentirle al
 *   crawler, y como cambiaría en cada deploy, Google aprende a ignorar el campo.
 *   Un sitemap sin `lastmod` es válido; uno con `lastmod` falso es peor que nada.
 *   Cuando el catálogo venga de Afeleia con `updated_at`, se agrega acá.
 * - `changefreq` y `priority` Google los ignora casi por completo.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths: string[] = [
    ...STATIC_PATHS,
    ...wines.map((wine) => `/vinos/${wine.slug}`),
    ...activities.map(activityPath),
    // El hub de temporada no es una actividad del catálogo: entra por su propia
    // constante, y si vuelve a `null` desaparece del sitemap con la página.
    ...(VENDIMIA_HUB ? [VENDIMIA_HUB] : []),
  ];

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`]),
          ),
          "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
        },
      },
    })),
  );
}
