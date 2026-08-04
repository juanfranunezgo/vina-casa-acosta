import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * robots.txt del sitio.
 *
 * No hay nada que bloquear: no existen rutas de API ni panel, y el único
 * archivo que no debe indexarse (`public/__forms.html`, las definiciones de
 * Netlify Forms) ya trae su propio `<meta name="robots" content="noindex">`.
 * Meterlo en `Disallow` sería contraproducente: al no poder rastrearlo, Google
 * nunca leería ese `noindex` y la URL podría indexarse igual si alguien la
 * enlaza. Bloquear e impedir la indexación son cosas distintas.
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
