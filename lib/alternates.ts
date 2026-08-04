import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Canonical + hreflang de una ruta, en los tres locales.
 *
 * `path` es la ruta SIN prefijo de idioma y sin barra final: `""` para la home,
 * `"/vinos"`, `"/vinos/ombu-carmenere"`. El prefijo lo agrega esta función.
 *
 * Por qué existe: `alternates` no se hereda por partes. Una página que declara
 * `alternates: { canonical }` reemplaza el objeto entero del padre, y una que no
 * declara nada hereda el del padre tal cual. Mientras el canonical vivió en el
 * layout, las 78 URLs del sitio declararon la portada como su canónica — es
 * decir, le pedían a Google que indexara una sola página. Centralizarlo acá
 * hace que ese desvío no pueda repetirse en silencio.
 *
 * `x-default` apunta al locale por defecto: con `localePrefix: "always"` no
 * existe una URL sin prefijo que pueda cumplir ese rol.
 *
 * Los hreflang son de idioma a secas (`es`, no `es-CL`) a propósito: la viña
 * exporta, y `es-CL` le diría a Google que prefiera esta URL solo dentro de
 * Chile. El `lang` del `<html>` sí lleva región, porque ahí describe el dialecto
 * del texto para lectores de pantalla, no el público objetivo.
 */
export function alternatesFor(locale: string, path = ""): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}
