/**
 * Envío de los formularios del sitio a la puerta de formularios de Afeleia
 * (`formularios-publico`). Afeleia guarda cada mensaje, lo muestra en el panel de
 * la viña (Formularios, y quien escribió en Clientes) y manda el aviso por correo a
 * los correos que tenga configurados ese formulario.
 *
 * El contrato v1 vive en el repo de Afeleia y **no se copia acá**: la fuente es
 * `supabase/functions/formularios-publico/README.md`, resumido en el capítulo 12
 * de `docs/conexiones-web/manual-conexion.md`. Lo que este archivo toma de él:
 * la URL, la forma del cuerpo (`campos`, `turnstile`, `trampa`), el timeout de
 * 10 s y que solo `200` con `{ ok: true }` es un envío hecho.
 *
 * Los nombres de campo importan: `nombre`, `email` y `telefono` son los que
 * Afeleia usa para sumar a quien escribió a los contactos de la viña y para que
 * el aviso traiga "Responder a" con su correo. `tests/formularios-afeleia.test.mjs`
 * cuida que los dos formularios los manden.
 *
 * No hay nada secreto: la URL y el slug del sitio son públicos, igual que los del
 * catálogo, y la verificación la hace el token de Cloudflare Turnstile.
 */

import { edgeFunctionUrlFor } from "@/lib/afeleia/contract";

/** Los formularios registrados en Afeleia para este sitio (admin → Formularios). */
export type FormularioAfeleia = "contacto" | "reserva-actividad";

/**
 * Tope de caracteres por campo del contrato. Va como `maxLength` en los textos
 * largos: un mensaje más largo es un 400 para todo el envío.
 */
export const LARGO_MAXIMO_CAMPO = 5000;

const TIMEOUT_MS = 10_000;

/** Largo máximo de la trampa en el contrato, contado como la puerta: `string.length`. */
const TRAMPA_MAXIMA = 200;

/**
 * Por qué no se pudo enviar. `codigo` es el de la puerta (`datos_invalidos`,
 * `verificacion_fallida`, `demasiados_envios`…) o uno de este lado:
 * `configuracion` (faltan las variables), `red` (no hubo respuesta, o no llegó en
 * 10 s), `respuesta_invalida` (un 200 que no es de la puerta) o `http_<status>`.
 * El formulario los trata a todos igual —muestra la alternativa—, como pide el
 * contrato para cualquier código que la web no conozca.
 */
export class ErrorEnvioFormulario extends Error {
  // Sin `constructor(public readonly codigo…)`: los tests corren este archivo en
  // Node, que solo borra tipos y no admite propiedades de parámetro.
  readonly codigo: string;

  constructor(codigo: string) {
    super(codigo);
    this.name = "ErrorEnvioFormulario";
    this.codigo = codigo;
  }
}

/** La URL de la puerta para un formulario, o `null` si con esa base no se puede armar. */
export function formularioEndpointFor(
  base: string | undefined,
  sitio: string | undefined,
  formulario: FormularioAfeleia,
): string | null {
  if (!sitio) return null;
  const url = edgeFunctionUrlFor(base, "formularios-publico");
  if (!url) return null;
  url.searchParams.set("sitio", sitio);
  url.searchParams.set("formulario", formulario);
  return url.toString();
}

/**
 * Manda un formulario. Resuelve solo si Afeleia lo guardó (o si la trampa vino
 * llena, que la puerta descarta en silencio con el mismo `200`); si no, rechaza
 * con un `ErrorEnvioFormulario`.
 *
 * `token` es el de Turnstile, pedido para este envío (dura 300 s y sirve una
 * vez). `trampa` es el valor del campo oculto que solo llenan los bots.
 */
export async function enviarFormularioAfeleia(
  formulario: FormularioAfeleia,
  campos: Record<string, string>,
  token: string,
  trampa: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  // Literales, para que Next los incruste en el bundle del navegador.
  const url = formularioEndpointFor(
    process.env.NEXT_PUBLIC_AFELEIA_API_URL,
    process.env.NEXT_PUBLIC_AFELEIA_SITIO,
    formulario,
  );
  if (!url) throw new ErrorEnvioFormulario("configuracion");

  // El plazo cubre el pedido y la lectura de la respuesta. Va con `setTimeout` y no
  // con `AbortSignal.timeout`: así se prueba con tiempo simulado
  // (`tests/formularios-afeleia.test.mjs`) y se apaga apenas termina el envío.
  const controlador = new AbortController();
  const plazo = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    let respuesta: Response;
    try {
      respuesta = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // La puerta mide `trampa.length` y con más de 200 responde 400: el bot se
        // enteraría de que lo vieron. Recortada sigue llena y se descarta con 200.
        body: JSON.stringify({ campos, turnstile: token, trampa: trampa.slice(0, TRAMPA_MAXIMA) }),
        // La puerta no redirige. Si algo en el camino lo hiciera, un 307 o un 308
        // reenviarían el mensaje entero a otra URL: se corta como error de red.
        redirect: "error",
        signal: controlador.signal,
      });
    } catch {
      throw new ErrorEnvioFormulario("red");
    }

    const cuerpo = (await respuesta.json().catch(() => null)) as { ok?: unknown; codigo?: unknown } | null;
    // Un cuerpo que no terminó de llegar en el plazo es la misma falla que la red.
    if (controlador.signal.aborted) throw new ErrorEnvioFormulario("red");
    // El contrato dice `200`, no "cualquier 2xx": `respuesta.ok` aceptaría un 204.
    if (respuesta.status === 200) {
      // Un 200 que no dice `ok: true` no es de la puerta (un portal cautivo, un
      // proxy): dar el mensaje por enviado sería perderlo sin que nadie lo sepa.
      if (cuerpo?.ok === true) return;
      throw new ErrorEnvioFormulario("respuesta_invalida");
    }
    const codigo = typeof cuerpo?.codigo === "string" && /^[a-z_]{1,64}$/.test(cuerpo.codigo) ? cuerpo.codigo : null;
    throw new ErrorEnvioFormulario(codigo ?? `http_${respuesta.status}`);
  } finally {
    clearTimeout(plazo);
  }
}
