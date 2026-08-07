"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Lleva el scroll al principio cuando cambia la ruta.
 *
 * Next ya hace esto solo... salvo en `/[locale]/vinos/[slug]`, la única ruta del
 * sitio que combina segmento dinámico con ISR (`revalidate = 60`). En esa
 * combinación su restauración de scroll no llega a correr: medido en producción
 * instrumentando `scrollIntoView`, `window.scrollTo` y `html.scrollTop` — cero
 * llamadas. El resultado es que la ficha del vino abría en la posición que traía
 * la tienda, recortada al alto del documento nuevo: en móvil la persona caía
 * cerca del footer y nunca veía la botella que acababa de tocar.
 *
 * Va acá y no en la ficha porque el que se rompió fue el comportamiento por
 * defecto: cualquier ruta futura que también quede dinámica + ISR heredaría el
 * mismo bug en silencio.
 *
 * Dos cosas que NO tiene que hacer, y que son la razón de que no sea una línea:
 *
 * 1. **Pisar las anclas.** `#reserva` en la ficha de tour y `#experiencias` /
 *    `#eventos` en el submenú del navbar navegan a una sección, no a la cabecera.
 *    Si hay hash, el destino es el hash.
 *
 * 2. **Romper el botón atrás.** Volver de la ficha a la tienda tiene que dejar a
 *    la persona en el vino que estaba mirando, no arriba de todo: si no, en móvil
 *    hay que volver a bajar por 14 vinos cada vez. En `popstate` el navegador ya
 *    restaura la posición, así que ese caso se deja pasar.
 *
 * El `behavior: "instant"` es necesario, no decorativo: `globals.css` declara
 * `html { scroll-behavior: smooth }`, y sin anularlo el salto se animaría durante
 * casi dos mil píxeles mientras la ficha ya está en pantalla.
 */
export default function ScrollReset() {
  const pathname = usePathname();
  /** Ruta a la que llevó el último atrás/adelante, si hubo uno sin consumir. */
  const rutaDeVuelta = useRef<string | null>(null);

  useEffect(() => {
    // En `popstate` la URL ya es la nueva, así que esto guarda el destino del
    // atrás. Se compara contra el pathname en vez de usar un booleano porque un
    // atrás que solo cambia el hash no dispara el efecto de abajo: con un flag
    // suelto, ese caso se quedaría encendido y se comería el próximo reset.
    const alVolver = () => {
      rutaDeVuelta.current = window.location.pathname;
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  useEffect(() => {
    const vuelta = rutaDeVuelta.current;
    rutaDeVuelta.current = null;

    if (vuelta === pathname) return;
    if (window.location.hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
