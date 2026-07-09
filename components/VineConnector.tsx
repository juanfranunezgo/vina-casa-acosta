"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Espeja la guirnalda para que la serpentina ondule hacia el lado opuesto. */
  flip?: boolean;
};

/**
 * Guirnalda de vid decorativa que conecta dos hitos del timeline.
 * Se revela con un barrido (clip-path) al entrar al viewport; es puramente
 * ornamental, por eso queda fuera del árbol de accesibilidad (aria-hidden).
 */
export default function VineConnector({ flip = false }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-grown");
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-grown");
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <span ref={ref} aria-hidden="true" className="vine-connector">
      <span
        className="vine vine-anim"
        style={{ transform: flip ? "scale(-1, -1)" : "scaleY(-1)" }}
      />
    </span>
  );
}
