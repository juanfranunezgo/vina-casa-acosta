import type { MetadataRoute } from "next";
import { wines } from "@/data/wines";
import { tours } from "@/data/activities";
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
 * Sitemap del sitio: 26 rutas × 3 locales = 78 URLs, cada una con el set
 * completo de hreflang (los tres idiomas + `x-default`).
 *
 * Sin `lastmod`, `changefreq` ni `priority`, y es deliberado:
 *
 * - `lastmod` tendría que ser la fecha real de modificación de cada página, y
 *   hoy no existe ese dato: ni `data/wines.ts` ni `data/activities.ts` guardan
 *   fechas. Estampar la hora del build en las 78 URLs sería mentirle al crawler,
 *   y como cambiaría en cada deploy, Google aprende a ignorar el campo. Un
 *   sitemap sin `lastmod` es válido; uno con `lastmod` falso es peor que nada.
 *   Cuando el catálogo venga de Afeleia con `updated_at`, se agrega acá.
 * - `changefreq` y `priority` Google los ignora casi por completo.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths: string[] = [
    ...STATIC_PATHS,
    ...wines.map((wine) => `/vinos/${wine.slug}`),
    ...tours.map((tour) => `/actividades/${tour.slug}`),
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
