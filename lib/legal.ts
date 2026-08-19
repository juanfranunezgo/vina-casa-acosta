/**
 * Documentos legales publicados en `public/documentos/`.
 *
 * Una sola fuente para las tres superficies que los nombran: los enlaces del
 * footer, el consentimiento de los formularios y los tests. Antes el mapa vivía
 * dentro de `Footer.tsx` y el consentimiento habría tenido que repetir la ruta,
 * que es como una versión nueva termina publicada en un lugar y no en el otro.
 *
 * Los nombres de archivo son estables a propósito: una edición nueva reemplaza
 * el PDF sin tocar este archivo ni romper enlaces ya compartidos. Lo que sí
 * cambia acá es `PRIVACIDAD_VERSION`, porque viaja en cada consentimiento.
 */

/** Documentos por idioma. Un idioma sin entrada no enlaza nada. */
export const DOCUMENTOS_LEGALES: Record<
  string,
  { privacy: string; terms: string; cookies: string }
> = {
  es: {
    privacy: "/documentos/politica-de-privacidad.pdf",
    terms: "/documentos/terminos-y-condiciones.pdf",
    cookies: "/documentos/politica-de-cookies.pdf",
  },
};

/**
 * Política de Privacidad que se muestra al pedir el consentimiento.
 *
 * Los tres documentos existen sólo en español. En el footer eso significa dejar
 * la etiqueta como texto —no prometer un documento que el visitante no puede
 * leer—, pero en un consentimiento la disyuntiva es otra: pedir que acepten algo
 * sin poder abrirlo es peor que ofrecerlo en un idioma que quizá no sea el suyo.
 * Así que en `en` y `pt` se enlaza el de español y la etiqueta lo dice.
 */
export const PRIVACIDAD_PDF = DOCUMENTOS_LEGALES.es.privacy;

/**
 * Edición vigente de la Política de Privacidad, tal como la declara el propio
 * documento. Viaja en cada envío para que el registro diga **qué** se aceptó y
 * no sólo que se aceptó: cuando salga una v1.2, los consentimientos viejos
 * siguen diciendo la verdad.
 */
export const PRIVACIDAD_VERSION = "v1.1 (16-08-2026)";
