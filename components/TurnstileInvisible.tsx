"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { crearTurnstile } from "@/lib/turnstile";

export type TurnstileInvisibleHandle = {
  /** Un token de Cloudflare para este envío. Si no se puede, rechaza con `ErrorTurnstile`. */
  obtenerToken: () => Promise<string>;
};

/**
 * El widget de Cloudflare Turnstile de los formularios. No se ve, salvo que
 * Cloudflare necesite que la persona marque la casilla (`interaction-only`): ahí
 * aparece en este lugar, arriba del botón de envío. La lógica está en
 * `lib/turnstile.ts`.
 */
export default function TurnstileInvisible({ ref }: { ref: Ref<TurnstileInvisibleHandle> }) {
  const contenedor = useRef<HTMLDivElement>(null);
  // Literal, para que Next la incruste en el bundle del navegador. Es la clave
  // pública del widget: no es secreta.
  const [turnstile] = useState(() =>
    crearTurnstile({ sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY }),
  );

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    turnstile.montar(el);
    // Cloudflare se carga recién con el primer foco dentro del formulario, no al
    // abrir la página: el formulario de reservas está al pie de cada ficha de
    // actividad, y así ni la velocidad de la página ni la IP de quien solo mira
    // pasan por Cloudflare. Mientras la persona escribe, el script llega; y si
    // envía sin haber enfocado nada, `obtenerToken()` lo carga igual.
    const formulario = el.closest("form");
    const preparar = () => turnstile.preparar();
    formulario?.addEventListener("focusin", preparar, { once: true });
    return () => {
      formulario?.removeEventListener("focusin", preparar);
      turnstile.desmontar();
    };
  }, [turnstile]);

  useImperativeHandle(ref, () => ({ obtenerToken: () => turnstile.obtenerToken() }), [turnstile]);

  // Mientras no se ve mide 0 y sus márgenes colapsan con los vecinos: no mueve
  // nada del formulario (medido en /contacto, 22 px con y sin él).
  return <div ref={contenedor} />;
}
