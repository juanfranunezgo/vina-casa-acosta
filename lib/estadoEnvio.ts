/**
 * El recorrido de un envío de los formularios, sin React: pasa a `submitting`,
 * pide el token al widget de Cloudflare, manda, y termina en `success` o en
 * `error`. **Nunca queda en `submitting`**: cualquier falla —el widget sin montar,
 * el token que no llega, la puerta que rechaza, un error al armar los campos—
 * termina en `error`, y el formulario muestra su alternativa en vez de un botón
 * girando para siempre.
 *
 * Vive fuera de los componentes para probarlo ejecutándolo en Node
 * (`tests/formularios-afeleia.test.mjs`); `ContactForm` y
 * `ActivityReservationForm` lo usan tal cual.
 */

export type EstadoEnvio = "idle" | "submitting" | "success" | "error";

/** Lo que se usa del widget (`components/TurnstileInvisible.tsx`). */
type Widget = { obtenerToken(): Promise<string> };

/** `true` si se envió. Los efectos de un envío hecho (limpiar el formulario) quedan para el componente. */
export async function enviarConVerificacion(
  widget: Widget | null,
  enviar: (token: string) => Promise<void>,
  alCambiar: (estado: EstadoEnvio) => void,
): Promise<boolean> {
  alCambiar("submitting");
  try {
    if (!widget) throw new Error("el widget de Cloudflare no está montado");
    // El token se pide en cada envío: dura 300 s y sirve una sola vez.
    const token = await widget.obtenerToken();
    await enviar(token);
  } catch {
    alCambiar("error");
    return false;
  }
  alCambiar("success");
  return true;
}
