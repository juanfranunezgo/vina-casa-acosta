"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Wine, CalendarDays } from "lucide-react";

type Props = {
  labels: {
    tours: string;
    experiences: string;
    events: string;
    aria: string;
  };
};

const tabs = [
  { id: "tours", key: "tours" as const, Icon: Map },
  { id: "experiencias", key: "experiences" as const, Icon: Wine },
  { id: "eventos", key: "events" as const, Icon: CalendarDays },
];

// Alto del navbar fijo (logo h-14/h-16 + py-4): 88px mobile / 96px desktop.
// La pastilla se ancla justo debajo (top-[88px]/[96px]) — mantener en sync con Navbar.
const navHeight = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 768px)").matches
    ? 96
    : 88;

/**
 * Sub-nav de sección para Actividades (D1b). Misma pastilla segmentada flotante
 * que la sección de actividades del Inicio (HomeActivitiesShowcase), pero sticky:
 * se ancla bajo el navbar al scrollear y un scroll-spy determinista resalta la
 * sección visible (Tours / Experiencias / Eventos).
 *
 * - Wrapper transparente + `pointer-events-none`: la pastilla flota sobre el
 *   contenido y las zonas laterales vacías NO capturan clics (van al contenido).
 * - Scroll-spy por posición (no una banda de IntersectionObserver): no parpadea
 *   entre secciones ni se queda pegado en "Eventos" —corto— al llegar al fondo.
 * - `stuck` sube la sombra al fijarse, dándole profundidad de barra flotante.
 */
export default function ActivitiesTabs({ labels }: Props) {
  const [active, setActive] = useState<string>(tabs[0].id);
  const [stuck, setStuck] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const bar = navRef.current;
      const barBottom = bar
        ? bar.getBoundingClientRect().bottom
        : navHeight();

      // Elevada solo cuando quedó fijada (su borde superior alcanzó el navbar).
      setStuck(!!bar && bar.getBoundingClientRect().top <= navHeight() + 1);

      // Al tocar fondo de página la última sección manda (arregla el caso de una
      // sección final corta que nunca cruzaría la línea de referencia).
      const scrollBottom = window.scrollY + window.innerHeight;
      if (scrollBottom >= document.documentElement.scrollHeight - 2) {
        setActive(sections[sections.length - 1].id);
        return;
      }

      // La activa es la última sección cuyo tope ya pasó bajo la pastilla.
      const line = barBottom + 8;
      let current = sections[0].id;
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
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label={labels.aria}
      className="pointer-events-none sticky top-[88px] z-30 flex justify-center px-margin-mobile py-3 md:top-[96px] md:py-4"
    >
      {/* Misma pastilla que el Inicio: inline-flex ⇒ ocupa solo el ancho de su
          contenido y el `justify-center` del <nav> la centra. En pantallas muy
          angostas envuelve a dos filas (flex-wrap) en vez de estirarse. */}
      <div
        className={`pointer-events-auto inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-outline-variant/40 bg-surface/90 p-1 backdrop-blur-xl transition-shadow duration-300 ${
          stuck ? "ambient-shadow-lg" : "ambient-shadow"
        }`}
      >
        {tabs.map(({ id, key, Icon }) => {
          const isActive = active === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActive(id)}
              className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 font-body text-label-sm font-semibold uppercase tracking-wider transition-all duration-300 md:px-5 ${
                isActive
                  ? "bg-primary text-on-primary shadow-[0_4px_14px_-4px_rgba(42,0,2,0.4)]"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {labels[key]}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
