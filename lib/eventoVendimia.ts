"use client";

import { useSyncExternalStore } from "react";
import { catalogEndpoint, isOwnCatalog, isValidCatalog } from "@/lib/afeleia/contract";
import { leerEventoVendimia, type EventoReserva } from "@/lib/vendimiaReserva";

/**
 * El evento de la vendimia, leído en el navegador y compartido por la página.
 *
 * Va del lado del cliente porque la página se regenera una vez al día y la disponibilidad cambia
 * en minutos. Mientras carga, y si no hay evento, la página muestra lo que ya trae del servidor.
 */

export type EstadoEvento = { cargando: boolean; evento: EventoReserva | null };

const INICIAL: EstadoEvento = { cargando: true, evento: null };

let estado = INICIAL;
let pedido: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function publicar(siguiente: EstadoEvento) {
  estado = siguiente;
  oyentes.forEach((oyente) => oyente());
}

async function leerDelCatalogo(cache: RequestCache): Promise<EventoReserva | null> {
  const endpoint = catalogEndpoint();
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint, { cache, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const catalogo: unknown = await res.json();
    if (!isValidCatalog(catalogo)) return null;
    if (!isOwnCatalog(catalogo, process.env.NEXT_PUBLIC_AFELEIA_SITIO)) return null;
    return leerEventoVendimia(catalogo);
  } catch {
    return null;
  }
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  pedido ??= leerDelCatalogo("default").then((evento) => publicar({ cargando: false, evento }));
  return () => {
    oyentes.delete(oyente);
  };
}

/**
 * Vuelve a pedir el catálogo después de un `400` o `409`. Si la respuesta no trae el evento se
 * conserva el que había: un corte de Afeleia esconde la clave unos minutos, y eso no puede borrarle
 * el formulario a quien lo está llenando.
 */
export async function recargarEventoVendimia(): Promise<void> {
  const evento = await leerDelCatalogo("no-cache");
  if (evento) publicar({ cargando: false, evento });
}

export function useEventoVendimia(): EstadoEvento {
  return useSyncExternalStore(suscribir, () => estado, () => INICIAL);
}
