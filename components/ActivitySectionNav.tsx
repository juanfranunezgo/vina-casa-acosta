"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

type Item = { id: string; label: string };

type Props = {
  /** Secciones en el orden de la página. */
  items: Item[];
  /** La reserva: va aparte, como botón vino, y cierra la píldora. */
  cta: Item;
  aria: string;
};

/**
 * Alto del navbar fijo: `py-4` más el logo de 56px (64 desde `md`). Es también
 * el `top` de la píldora cuando se pega; si cambia uno, cambia el otro.
 */
const navHeight = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches ? 96 : 88;

/**
 * Dd2 — La píldora de secciones de la ficha.
 *
 * Nace bajo la ficha rápida y, al bajar, se queda pegada bajo el navbar hasta
 * el final del formulario: en celular y en escritorio, pedido de Juan Francisco
 * del 2026-09-24 sobre la barra de Quorum Legal. La que había era una fila
 * estática en medio de la página: servía una vez y el resto del recorrido no
 * estaba.
 *
 * Lo que la hace "cobrar vida" es que sigue la lectura: la sección en pantalla
 * se marca con una pastilla oscura que se desliza de un rótulo al siguiente, en
 * vez de saltar. Antes de llegar al detalle no hay ninguna marcada — todavía no
 * se está en ninguna. La reserva no se marca así: es el botón vino del final,
 * siempre a la vista, porque es la acción de la página y no una sección más.
 *
 * El `sticky` necesita un contenedor que abarque todas las secciones: por eso
 * la ficha envuelve desde la introducción hasta la reserva en un `div`, y la
 * píldora deja de acompañar al llegar a "otras actividades".
 *
 * La detección de sección copia la de `ActivitiesTabs` (D1b): una línea a la
 * altura del navbar más la píldora, y la sección activa es la última cuyo
 * borde superior ya la cruzó.
 */
export default function ActivitySectionNav({ items, cta, aria }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    const sections = [...items, cta]
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (!sections.length) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const row = rowRef.current;
      const top = navHeight();
      // Pegada = su borde superior llegó al del navbar. Medirlo evita un
      // centinela y un IntersectionObserver para un solo dato.
      setStuck(row !== null && row.getBoundingClientRect().top <= top + 1);

      const line = top + (row?.offsetHeight ?? 0) + 24;
      let current: string | null = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
        else break;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items, cta]);

  // La pastilla oscura se mide contra el rótulo activo. `useLayoutEffect` para
  // moverla en el mismo cuadro en que cambia el texto a blanco: con
  // `useEffect` se alcanza a ver un cuadro de texto blanco sobre fondo claro.
  useLayoutEffect(() => {
    const measure = () => {
      const element = active ? itemRefs.current[active] : null;
      setIndicator(element ? { x: element.offsetLeft, w: element.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  return (
    <div
      ref={rowRef}
      className="pointer-events-none sticky top-[88px] z-30 flex justify-center px-4 py-3 md:top-24 md:py-4"
    >
      {/* En pantallas de 360px o menos los cuatro rótulos pueden no caber: ahí
          la píldora se desliza de lado en vez de partir un rótulo en dos. Sólo
          ahí, porque el `overflow` recorta la sombra del botón vino. */}
      <nav
        aria-label={aria}
        className={`pointer-events-auto max-w-full rounded-full border p-1 transition-[background-color,box-shadow,border-color] duration-300 max-[380px]:overflow-x-auto max-[380px]:[scrollbar-width:none] ${
          stuck
            ? "border-outline-variant/50 bg-surface-container-lowest/85 shadow-[0_18px_40px_-16px_rgba(42,0,2,0.32)] backdrop-blur-xl"
            : "border-outline-variant/40 bg-surface-container-lowest shadow-[0_12px_32px_-18px_rgba(42,0,2,0.28)]"
        }`}
      >
        <ul className="relative flex items-center gap-0.5">
          {/* La pastilla que se desliza. Detrás de los rótulos (z-0) y sin
              ancho mientras no hay sección activa. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 rounded-full bg-primary shadow-[0_6px_16px_-6px_rgba(42,0,2,0.55)] transition-[transform,width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{
              width: indicator?.w ?? 0,
              transform: `translateX(${indicator?.x ?? 0}px)`,
              opacity: indicator ? 1 : 0,
            }}
          />
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <li
                key={item.id}
                ref={(element) => {
                  itemRefs.current[item.id] = element;
                }}
                className="relative z-10"
              >
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => setActive(item.id)}
                  className={`inline-flex h-10 items-center whitespace-nowrap rounded-full px-2.5 font-body text-[13px] font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-5 sm:text-[14px] ${
                    isActive ? "text-on-primary" : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
          <li className="relative z-10 ml-1">
            <a
              href={`#${cta.id}`}
              aria-current={active === cta.id ? "location" : undefined}
              onClick={() => setActive(cta.id)}
              className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-b from-wine-accent to-primary-container px-3.5 font-body text-[13px] font-semibold text-on-primary shadow-[0_8px_18px_-8px_rgba(74,14,14,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_12px_22px_-8px_rgba(74,14,14,0.65),inset_0_1px_0_rgba(255,255,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 motion-reduce:transition-none sm:px-5 sm:text-[14px]"
            >
              {cta.label}
              <ArrowDown className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
