"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
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

  return (
    <section className="relative bg-surface py-section-gap px-margin-mobile md:px-margin-desktop overflow-hidden md:overflow-visible">
      <div className="max-w-(--container-max) mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
          <Reveal className="md:col-span-5 md:col-start-8 mb-12 md:mb-0">
            <span className="font-body text-label-sm text-outline uppercase tracking-widest block mb-3">
              {eyebrow}
            </span>
            <h2 className="font-display text-headline-h1 text-primary mb-6 leading-tight">
              {title}
            </h2>
            <p className="font-body text-body-md text-on-surface-variant mb-6 leading-relaxed">
              {paragraph1}
            </p>
            <p className="font-body text-body-md text-on-surface-variant mb-8 leading-relaxed">
              {paragraph2}
            </p>
            {cta}
          </Reveal>
          <Reveal className="md:col-span-4 md:col-start-2 md:row-start-1 relative z-10" delay={120}>
            <StackedPhotos photos={photos} activeIndex={activeIndex} />
          </Reveal>
        </div>

        {length > 1 && (
          <div className="flex gap-4 justify-center mt-10 md:mt-14">
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
      </div>
    </section>
  );
}
