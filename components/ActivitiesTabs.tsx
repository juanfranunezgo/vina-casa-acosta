"use client";

import { useEffect, useState } from "react";

type Props = {
  labels: {
    tours: string;
    experiences: string;
    events: string;
  };
  /** "onDark" para el hero cinematográfico (fondo foto); "light" para fondos claros. */
  variant?: "light" | "onDark";
};

const tabs = [
  { id: "tours", key: "tours" as const },
  { id: "experiencias", key: "experiences" as const },
  { id: "eventos", key: "events" as const },
];

export default function ActivitiesTabs({ labels, variant = "light" }: Props) {
  const [active, setActive] = useState<string>("tours");

  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => obs.observe(s));

    return () => obs.disconnect();
  }, []);

  const onDark = variant === "onDark";

  return (
    // Contenedor con scroll horizontal propio: en pantallas ≤375px las tres
    // pastillas no entran en una fila, pero desplazan dentro de esta caja en
    // vez de romper el ancho de la página (regla: sin scroll horizontal global).
    // `py-3 -my-3`: overflow-x fuerza overflow-y:auto y recortaría la sombra de
    // la pastilla activa; el padding le da aire y el margen negativo lo cancela.
    <div className="-my-3 max-w-full overflow-x-auto py-3 hide-scrollbar">
      <nav
        className={`inline-flex w-max items-center gap-1 rounded-full p-1 ${
          onDark
            ? "border border-white/15 bg-black/30 backdrop-blur-md"
            : "border border-outline-variant/40 bg-surface-container-low"
        }`}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              aria-current={isActive ? "true" : undefined}
              className={`whitespace-nowrap rounded-full px-5 py-2 font-body text-label-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
                isActive
                  ? onDark
                    ? "bg-on-primary text-primary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]"
                    : "bg-primary text-on-primary shadow-[0_4px_14px_-4px_rgba(42,0,2,0.4)]"
                  : onDark
                    ? "text-on-primary/85 hover:bg-white/10 hover:text-on-primary"
                    : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {labels[tab.key]}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
