/**
 * Envío de formularios a Netlify Forms.
 *
 * Se apunta a `/__forms.html` y no a una ruta de Next a propósito: cualquier
 * path que maneje el servidor de Next se lo lleva OpenNext antes de que el
 * handler de Netlify Forms llegue a verlo. `public/__forms.html` es estático,
 * así que el POST lo intercepta Netlify.
 *
 * Los campos válidos de cada formulario están declarados en
 * `public/__forms.html`. Netlify descarta en silencio los que no figuren ahí:
 * si agregás un input en el componente, agregalo también en ese archivo.
 *
 * ⚠️ En `npm run dev` esto siempre falla (405/404): el handler de Forms es
 * parte del runtime de Netlify, no de Next. Se prueba en un deploy preview.
 */

const ENDPOINT = "/__forms.html";

export type NetlifyFormName = "contacto" | "reserva-actividad";

export async function submitToNetlifyForms(
  formName: NetlifyFormName,
  fields: Record<string, string>,
): Promise<void> {
  const body = new URLSearchParams({ "form-name": formName, ...fields });

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Netlify Forms respondió ${response.status}`);
  }
}
