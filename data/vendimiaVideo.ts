/**
 * El short de YouTube de la Vendimia (Dv4).
 *
 * `VENDIMIA_SHORT_ID` es el id del video: en `youtube.com/shorts/AbCdEfGhIjK` es
 * `AbCdEfGhIjK`. Con `null` la página muestra una foto y avisa que el video viene.
 *
 * `VENDIMIA_SHORT_EMBEBIBLE` dice si se puede reproducir dentro de la página. Hoy
 * es `false`: el video tiene restricción de edad, y YouTube no reproduce esos
 * videos en otros sitios (medido el 2026-11-22). La página ofrece abrirlo en
 * YouTube. Cuando se quite la restricción en YouTube Studio, pasa a `true` y la CSP
 * abre el reproductor sola (`next.config.ts`).
 */
export const VENDIMIA_SHORT_ID: string | null = "PpOdJgVFZpc";
export const VENDIMIA_SHORT_EMBEBIBLE: boolean = false;

/** Sin cookies hasta que la persona decide ver el video. */
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

const idValido = (id: string | null): id is string => id !== null && /^[\w-]{11}$/.test(id);

/** La URL del reproductor, o `null` si no se puede reproducir dentro de la página. */
export function urlShortVendimia(
  id: string | null = VENDIMIA_SHORT_ID,
  embebible: boolean = VENDIMIA_SHORT_EMBEBIBLE,
): string | null {
  if (!embebible || !idValido(id)) return null;
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?autoplay=1&playsinline=1&rel=0`;
}

/** El video en YouTube, para cuando no se puede reproducir acá. */
export function urlVerEnYoutube(id: string | null = VENDIMIA_SHORT_ID): string | null {
  return idValido(id) ? `https://www.youtube.com/shorts/${id}` : null;
}
