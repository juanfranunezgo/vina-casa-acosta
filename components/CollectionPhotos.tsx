"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Cada cuánto avanza solo el carrusel. */
const AUTOPLAY_MS = 3000;

type Props = {
  /** Fotos 4:5 de la colección, en orden. La primera es la portada. */
  photos: string[];
  alt: string;
  /** Etiquetas accesibles de los controles. */
  prevLabel: string;
  nextLabel: string;
  /** aria-label de cada punto, ya traducido (mismo orden que `photos`). */
  goToLabels: string[];
  /** Solo para la primera banda de la página: precarga la portada (LCP). */
  priority?: boolean;
};

/**
 * Carrusel de la banda de colección (C2). Crossfade dentro del marco 4:5 fijo,
 * con flechas siempre visibles, puntos y swipe táctil.
 *
 * Avanza solo cada 3s, pero solo mientras la banda está a la vista: así las seis
 * de la página no corren a la vez. Se pausa al pasar el mouse o al enfocar con
 * teclado, y se detiene del todo cuando la persona toma el control.
 */
export default function CollectionPhotos({
  photos,
  alt,
  prevLabel,
  nextLabel,
  goToLabels,
  priority = false,
}: Props) {
  const [active, setActive] = useState(0);
  // Las fotos se montan al mostrarlas: así cada banda parte pidiendo una sola
  // imagen y no las 3-4 del carrusel. Las ya vistas quedan montadas para que el
  // crossfade de vuelta sea instantáneo.
  const [visited, setVisited] = useState<number[]>([0]);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [userTookOver, setUserTookOver] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const total = photos.length;

  const go = (index: number) => {
    const next = (index + total) % total;
    setActive(next);
    setVisited((current) => (current.includes(next) ? current : [...current, next]));
  };

  /** Click/swipe de la persona: manda ella, el autoplay se apaga. */
  const takeOver = (index: number) => {
    setUserTookOver(true);
    go(index);
  };

  // El autoplay corre solo cuando la banda está a la vista.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (total < 2 || userTookOver || paused || !inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // setTimeout re-armado en cada cambio: evita closures viejas del índice.
    const timer = setTimeout(() => go(active + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, total, userTookOver, paused, inView]);

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    setTouchStart(null);
    // Solo swipes claramente horizontales, para no pelear con el scroll.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) takeOver(active + (dx < 0 ? 1 : -1));
  };

  const arrowClass =
    "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-black/65 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <figure
        className="relative m-0 aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-surface-container-low"
        onTouchStart={(event) =>
          setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY })
        }
        onTouchEnd={handleTouchEnd}
      >
        {photos.map((photo, index) =>
          visited.includes(index) ? (
            <Image
              key={photo}
              src={photo}
              alt={index === active ? alt : ""}
              aria-hidden={index !== active}
              fill
              priority={priority && index === 0}
              loading={priority && index === 0 ? undefined : "lazy"}
              sizes="(max-width: 1024px) 100vw, 40vw"
              className={`object-cover object-center transition-opacity duration-700 motion-reduce:transition-none ${
                index === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null,
        )}

        {total > 1 && (
          <>
            {/* Sombras: sostienen flechas y puntos sobre fotos claras. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent"
            />

            <button
              type="button"
              onClick={() => takeOver(active - 1)}
              aria-label={prevLabel}
              className={`${arrowClass} left-3`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => takeOver(active + 1)}
              aria-label={nextLabel}
              className={`${arrowClass} right-3`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => takeOver(index)}
                  aria-label={goToLabels[index]}
                  aria-current={index === active}
                  className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                    index === active ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </figure>
    </div>
  );
}
