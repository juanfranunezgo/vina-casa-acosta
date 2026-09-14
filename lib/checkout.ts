/**
 * El puente entre el carrito del sitio y el checkout de Afeleia. Puro: sin React, sin `window`,
 * sin leer `process.env`. Lo que lee del entorno lo recibe por parámetro, y por eso se prueba con
 * `node --test` sin montar nada. Contrato: manual de conexión de Afeleia, §11.
 */

export type CarritoCheckout = { items: Array<{ slug: string; cantidad: number }> };

export type ResultadoInicio =
  | { ok: true; url: string }
  | { ok: false; motivo: "carrito" | "no_disponible" };

const TIMEOUT_MS = 4_000;

/** `https://<host>/iniciar`, o `http://localhost…/iniciar` para desarrollo. Cualquier otra cosa es `null`. */
export function checkoutIniciarUrl(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
    if (url.pathname !== "/iniciar") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function carritoParaCheckout(
  lineas: ReadonlyArray<{ slug: string; quantity: number }>,
): CarritoCheckout {
  return {
    items: lineas
      .filter(({ quantity }) => Number.isInteger(quantity) && quantity > 0)
      .map(({ slug, quantity }) => ({ slug, cantidad: quantity })),
  };
}

/** `checkout.compra_minima_unidades` del catálogo v1 si es un entero positivo; si no, el respaldo. */
export function minBottlesFrom(catalogo: unknown, respaldo: number): number {
  if (typeof catalogo !== "object" || catalogo === null) return respaldo;
  const checkout = (catalogo as Record<string, unknown>).checkout;
  if (typeof checkout !== "object" || checkout === null) return respaldo;
  const min = (checkout as Record<string, unknown>).compra_minima_unidades;
  return typeof min === "number" && Number.isInteger(min) && min > 0 ? min : respaldo;
}

/**
 * `POST /iniciar` con JSON y timeout. 200 con `url` del mismo origen ⇒ a esa URL. 400/409 ⇒ el
 * carrito cambió (avisar y refrescar). Todo lo demás (404, 429, 5xx, timeout, red, CORS) ⇒ el
 * checkout no está disponible: respaldo WhatsApp. Nunca sondea.
 */
export async function iniciarCheckout(
  url: string,
  carrito: CarritoCheckout,
  deps: { fetch: typeof fetch; timeoutMs?: number },
): Promise<ResultadoInicio> {
  try {
    const res = await deps.fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(carrito),
      signal: AbortSignal.timeout(deps.timeoutMs ?? TIMEOUT_MS),
    });
    if (res.ok) {
      const cuerpo: unknown = await res.json();
      const destino =
        typeof cuerpo === "object" && cuerpo !== null
          ? (cuerpo as Record<string, unknown>).url
          : undefined;
      if (typeof destino === "string" && mismoOrigen(destino, url)) return { ok: true, url: destino };
      return { ok: false, motivo: "no_disponible" };
    }
    if (res.status === 400 || res.status === 409) return { ok: false, motivo: "carrito" };
    return { ok: false, motivo: "no_disponible" };
  } catch {
    return { ok: false, motivo: "no_disponible" };
  }
}

function mismoOrigen(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}
