#!/usr/bin/env node
/**
 * Primer paso del prebuild: en el build de PRODUCCIÓN, los formularios tienen que
 * poder enviar.
 *
 * Los formularios de contacto y de reservas mandan a la puerta de formularios de
 * Afeleia con un token de Cloudflare Turnstile, y el widget necesita
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, que Next incrusta al compilar. Sin esa clave, o
 * con una clave de prueba de Cloudflare, el sitio compila igual y **cada envío
 * falla**: para siempre y en verde, que es la clase de error que este repo frena en
 * el prebuild (ver `catalogo-validacion.mjs`). Acá se corta el build, y Netlify deja
 * publicado el deploy anterior.
 *
 * Solo en producción (`CONTEXT=production`, que define Netlify). Los deploy
 * previews y el local no tienen el widget —la clave solo sirve en los dominios de
 * producción—, así que ahí la clave falta a propósito y el formulario termina en
 * su alternativa.
 *
 * `NEXT_PUBLIC_AFELEIA_API_URL` y `NEXT_PUBLIC_AFELEIA_SITIO`, que los formularios
 * también usan, ya las valida el paso del catálogo para todo despliegue.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// `@next/env` es CommonJS: el named import no existe desde ESM.
import entornoDeNext from "@next/env";

/** Las claves de prueba de Cloudflare (developers.cloudflare.com/turnstile, "Testing"). */
const CLAVE_DE_PRUEBA = /^[1-3]x0{20}[A-Z]{2}$/;

/**
 * La forma de una site key de producción. La API de widgets de Cloudflare
 * (developers.cloudflare.com/api/resources/turnstile/subresources/widgets) la
 * documenta como un string de hasta 32 caracteres, con el ejemplo
 * `0x4AAF00AAAABn0R22HWm-YUc`: `0x` y después letras, dígitos, `-` y `_`. Las de
 * prueba empiezan con `1x`, `2x` o `3x`, y se rechazan aparte con su propio aviso.
 * El piso de 16 después de `0x` deja afuera lo que claramente no es una clave (las
 * reales tienen 23); no es un largo documentado.
 */
const FORMA_DE_CLAVE = /^0x[0-9A-Za-z_-]{16,30}$/;

/**
 * Motivo por el que los formularios no podrían enviar en este build, o `null`.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
export function razonFormulariosSinConfigurar(env) {
  if (env.CONTEXT?.toLowerCase() !== "production") return null;
  const clave = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (clave === undefined || clave.trim() === "") {
    return (
      "falta NEXT_PUBLIC_TURNSTILE_SITE_KEY en el build de produccion: sin la clave publica " +
      "del widget de Cloudflare Turnstile, los formularios de contacto y de reservas fallan " +
      "en cada envio."
    );
  }
  // Se exige, no se recorta: un espacio de más al pegarla es un error de configuración
  // que tiene que verse, igual que en las variables del catálogo.
  if (/\s/.test(clave)) {
    return `NEXT_PUBLIC_TURNSTILE_SITE_KEY tiene espacios: ${JSON.stringify(clave)}`;
  }
  if (CLAVE_DE_PRUEBA.test(clave)) {
    return (
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY es una clave de prueba de Cloudflare (${clave}): con ella ` +
      "la puerta de formularios rechaza cada token. Va la clave publica del widget de Afeleia."
    );
  }
  if (!FORMA_DE_CLAVE.test(clave)) {
    return (
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY no tiene la forma de una site key de Turnstile ` +
      `(${JSON.stringify(clave)}): empieza con 0x, sigue con letras, digitos, - o _, y tiene ` +
      "hasta 32 caracteres. Copiar la site key del widget, no la secreta ni otro dato."
    );
  }
  return null;
}

const esElPrograma = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (esElPrograma) {
  // Las MISMAS variables que va a ver `next build` (ver `catalogo-snapshot-build.mjs`).
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  entornoDeNext.loadEnvConfig(raiz, false, {
    info: (mensaje) => console.info(`[formularios] ${mensaje}`),
    error: (mensaje) => console.error(`[formularios] ${mensaje}`),
  });

  const razon = razonFormulariosSinConfigurar(process.env);
  if (razon) {
    console.error(
      `[formularios] configuracion invalida: ${razon}\n` +
        "[formularios] Se corta el build: Netlify deja publicado el deploy anterior. Cargar la " +
        "clave en Netlify -> Project configuration -> Environment variables (Production, Builds).",
    );
    process.exit(1);
  }
}
