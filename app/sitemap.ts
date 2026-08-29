import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/afeleia/catalog";
import { sitemapEntries, sitemapPaths } from "@/lib/sitemap";

/**
 * Sitemap del sitio.
 *
 * Las fichas de producto salen del catálogo que publica Afeleia, no de la lista
 * escrita en `data/wines.ts`: hasta acá, un producto cargado en el panel tenía
 * página —`generateStaticParams` sí lee el catálogo— pero no entraba al listado
 * que lee Google. Existía y era invisible.
 *
 * Qué se anuncia y qué no lo decide `lib/sitemap.ts`, que es puro y está
 * cubierto por `tests/sitemap-catalogo.test.mjs`. Acá solo se lee el catálogo.
 *
 * `getCatalog()` no tira: si la API no contesta sirve el snapshot committeado, y
 * si hasta el snapshot está roto, un catálogo vacío. En ese último caso el
 * sitemap conserva las rutas estáticas y las actividades: el sitio no se queda
 * sin sitemap porque una API de otro proveedor esté caída.
 */

// Se revalida con la misma ventana que las fichas que anuncia (`revalidate = 60`
// en `/vinos/[slug]`). Sin esto el sitemap se congelaría en el build: un producto
// nuevo tendría ficha viva y URL ausente del sitemap hasta el próximo deploy, que
// es el mismo bug con otro disfraz.
// Tiene que ser un literal: Next lee la config de segmento estáticamente.
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(sitemapPaths(await getCatalog()));
}
