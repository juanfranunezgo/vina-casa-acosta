import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * robots.txt del sitio.
 *
 * No hay nada que bloquear: no existen rutas de API ni panel. Si algún día
 * aparece un archivo que no debe indexarse, va con su propio
 * `<meta name="robots" content="noindex">` y no en `Disallow`: al no poder
 * rastrearlo, Google nunca leería ese `noindex` y la URL podría indexarse igual
 * si alguien la enlaza. Bloquear e impedir la indexación son cosas distintas.
 *
 * La línea `Sitemap` es absoluta porque el estándar lo exige — no admite rutas
 * relativas.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
