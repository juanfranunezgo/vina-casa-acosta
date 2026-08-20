/**
 * URL pública del sitio, resuelta en tiempo de build.
 *
 * Se lee en este orden:
 * 1. `NEXT_PUBLIC_SITE_URL` — el dominio definitivo cuando exista
 *    (ej. `https://vinacasaacosta.cl`). Se define a mano en Netlify →
 *    Project configuration → Environment variables.
 * 2. `URL` — la inyecta Netlify en cada build con el dominio principal del
 *    proyecto (ej. `https://vinacasaacosta.netlify.app`).
 * 3. `DEPLOY_PRIME_URL` — deploy previews y branch deploys de Netlify.
 * 4. `http://localhost:3000` — desarrollo local.
 *
 * Solo se usa desde server components (metadata y JSON-LD), por eso `URL` y
 * `DEPLOY_PRIME_URL` alcanzan aunque no lleven el prefijo `NEXT_PUBLIC_`.
 */

/**
 * Hosts que sirven el sitio pero no son su dominio: el subdominio del
 * proveedor y el de desarrollo. Valen en cualquier contexto menos en el build
 * de producción — ver `verificarDominioDeProduccion`.
 */
const HOSTS_PROVISIONALES = /(^|\.)netlify\.app$|^localhost$|^127\.0\.0\.1$/;

/**
 * Rompe el build de producción si el dominio resuelto es provisional.
 *
 * Esto ya pasó una vez y costó la portada: entre el 2 y el 6 de agosto de 2026
 * el sitio se construyó sin `NEXT_PUBLIC_SITE_URL` y con el subdominio de
 * Netlify como dominio principal, así que los canonical, el hreflang, el
 * sitemap y el JSON-LD salieron apuntando a `vinacasaacosta.netlify.app`.
 * Google los leyó al pie de la letra y eligió ese host como canónico de `/es`:
 * la portada quedó indexada bajo el subdominio del proveedor y fuera del
 * dominio propio. El 301 de `netlify.toml` corrigió el síntoma, pero recuperar
 * la canónica depende de que Google vuelva a rastrear, y eso tarda semanas.
 *
 * Un canonical equivocado no rompe nada visible: el sitio se ve igual. Por eso
 * el fallo tiene que ser el build y no la página.
 *
 * Solo aplica al contexto `production` de Netlify. Los deploy previews y los
 * branch deploys viven en `*.netlify.app` legítimamente y tienen que seguir
 * construyéndose.
 */
function verificarDominioDeProduccion(url: string, contexto?: string): void {
  if (contexto !== "production") return;

  const host = new URL(url).hostname;
  if (!HOSTS_PROVISIONALES.test(host)) return;

  throw new Error(
    `El build de producción resolvió el dominio público como "${url}", que es ` +
      `un host provisional. Con eso los canonical, el hreflang, el sitemap y el ` +
      `JSON-LD saldrían apuntando fuera del dominio propio y Google indexaría ese ` +
      `host en su lugar.\n` +
      `Definí NEXT_PUBLIC_SITE_URL = https://vinacasaacosta.cl (sin barra final) ` +
      `en Netlify → Project configuration → Environment variables y volvé a desplegar.`,
  );
}

export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw =
    env.NEXT_PUBLIC_SITE_URL ||
    env.URL ||
    env.DEPLOY_PRIME_URL ||
    "http://localhost:3000";

  // Sin barra final: todo el código concatena rutas que ya empiezan con "/".
  const url = raw.replace(/\/+$/, "");

  verificarDominioDeProduccion(url, env.CONTEXT);

  return url;
}

export const SITE_URL = resolveSiteUrl();
