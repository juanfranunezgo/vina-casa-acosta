/**
 * El short de YouTube de la Vendimia (Dv4).
 *
 * Para publicarlo, pega acá su id: en `youtube.com/shorts/AbCdEfGhIjK` es
 * `AbCdEfGhIjK`. Con `null` la página muestra una foto y avisa que el video
 * viene. La CSP abre YouTube solo cuando hay un id (`next.config.ts`).
 */
export const VENDIMIA_SHORT_ID: string | null = null;

/** Sin cookies hasta que la persona decide ver el video. */
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

/** La URL del reproductor, o `null` si el id no tiene la forma de un id de YouTube. */
export function urlShortVendimia(id: string | null = VENDIMIA_SHORT_ID): string | null {
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?autoplay=1&playsinline=1&rel=0`;
}
