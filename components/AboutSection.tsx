"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Reveal from "./Reveal";
import StackedPhotos, { type StackedPhoto } from "./StackedPhotos";

interface AboutSectionProps {
  photos: StackedPhoto[];
  eyebrow: string;
  title: string;
  paragraph1: string;
  paragraph2: string;
  cta: ReactNode;
  prevLabel?: string;
  nextLabel?: string;
  autoplay?: boolean;
  interval?: number;
}

export default function AboutSection({
  photos,
  eyebrow,
  title,
  paragraph1,
  paragraph2,
  cta,
  prevLabel = "Foto anterior",
  nextLabel = "Foto siguiente",
  autoplay = true,
  interval = 7000,
}: AboutSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const length = photos.length;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (!autoplay || length < 2 || reducedMotionRef.current) return;
    clearTimer();
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % length);
    }, interval);
  }, [autoplay, interval, length, clearTimer]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  const handleNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % length);
    startTimer();
  }, [length, startTimer]);

  const handlePrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + length) % length);
    startTimer();
  }, [length, startTimer]);

  // Swipe táctil: cambia de foto con el dedo sin bloquear el scroll vertical.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    touchStartRef.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Solo swipes claramente horizontales (para no interferir con el scroll).
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) handleNext();
      else handlePrev();
    }
  };

  return (
    <section className="relative bg-surface py-section-gap px-margin-mobile md:px-margin-desktop overflow-hidden md:overflow-visible">
      <div className="max-w-(--container-max) mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
          {/* Texto + CTA. En móvil el wrapper es `display:contents`, así sus hijos
              entran a la grilla y se reordenan alrededor de la foto (texto arriba,
              CTA debajo de la foto). En desktop vuelve a un bloque en la columna derecha. */}
          <div className="contents md:block md:col-span-5 md:col-start-8 md:row-start-1">
            <Reveal className="order-1">
              <span
                className="font-accent italic font-light text-primary block mb-3 tracking-wide"
                style={{ fontSize: "clamp(1.25rem, 2vw, 1.6rem)" }}
              >
                {eyebrow}
              </span>
              <h2 className="font-display text-headline-h1-mobile md:text-headline-h1 text-primary mb-6 leading-tight">
                {title}
              </h2>
              <p className="font-body text-body-md text-on-surface-variant mb-6 leading-relaxed">
                {paragraph1}
              </p>
              <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
                {paragraph2}
              </p>
            </Reveal>
            <Reveal className="order-3 md:mt-8 flex justify-center md:block" delay={160}>
              {cta}
            </Reveal>
          </div>

          {/* Foto — carrusel: swipe táctil + flechas pegadas debajo de la imagen */}
          <Reveal className="order-2 md:col-span-4 md:col-start-2 md:row-start-1 relative z-10" delay={120}>
            <div
              className="relative aspect-[4/5] w-[88%] max-w-[24rem] mx-auto md:w-full md:max-w-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <StackedPhotos photos={photos} activeIndex={activeIndex} />
            </div>

            {length > 1 && (
              <div className="flex gap-3 justify-center mt-3">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={prevLabel}
                  className="h-11 w-11 rounded-full bg-primary text-on-primary flex items-center justify-center transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={nextLabel}
                  className="h-11 w-11 rounded-full bg-primary text-on-primary flex items-center justify-center transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
