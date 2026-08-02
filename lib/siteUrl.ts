/**
 * URL pública del sitio, resuelta en tiempo de build.
 *
 * Se lee en este orden:
 * 1. `NEXT_PUBLIC_SITE_URL` — el dominio definitivo cuando exista
 *    (ej. `https://casaacosta.cl`). Se define a mano en Netlify →
 *    Project configuration → Environment variables.
 * 2. `URL` — la inyecta Netlify en cada build con el dominio principal del
 *    proyecto (ej. `https://casa-acosta.netlify.app`).
 * 3. `DEPLOY_PRIME_URL` — deploy previews y branch deploys de Netlify.
 * 4. `http://localhost:3000` — desarrollo local.
 *
 * Solo se usa desde server components (metadata y JSON-LD), por eso `URL` y
 * `DEPLOY_PRIME_URL` alcanzan aunque no lleven el prefijo `NEXT_PUBLIC_`.
 */
function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "http://localhost:3000";

  // Sin barra final: todo el código concatena rutas que ya empiezan con "/".
  return raw.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl();
