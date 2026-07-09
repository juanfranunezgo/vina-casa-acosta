"use client";

import { useEffect, useState } from "react";

type Props = {
  labels: {
    tours: string;
    experiences: string;
    events: string;
  };
};

const tabs = [
  { id: "tours", key: "tours" as const },
  { id: "experiencias", key: "experiences" as const },
  { id: "eventos", key: "events" as const },
];

/**
 * Sub-nav de sección para la página de Actividades (D1b). Barra sticky que se
 * ancla bajo el navbar al scrollear; el scroll-spy resalta la sección visible
 * (Tours / Experiencias / Eventos). Va DEBAJO del hero, no encima de la foto.
 */
export default function ActivitiesTabs({ labels }: Props) {
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
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => obs.observe(s));

    return () => obs.disconnect();
  }, []);

  return (
    // top-[88px]/[96px] = alto del navbar fijo, para que la barra se pegue justo
    // debajo. Fondo claro translúcido + blur para leerse sobre el contenido crema.
    <nav className="sticky top-[88px] z-30 border-b border-outline-variant/25 bg-surface/85 backdrop-blur-xl md:top-[96px]">
      <div className="mx-auto flex max-w-(--container-max) justify-center px-margin-mobile md:justify-start md:px-margin-desktop">
        {/* Scroll horizontal propio: en pantallas angostas las tres pastillas
            desplazan dentro de esta caja en vez de romper el ancho de la página. */}
        <div className="max-w-full overflow-x-auto hide-scrollbar">
          <div className="flex w-max items-center gap-1 py-3">
            {tabs.map((tab) => {
              const isActive = active === tab.id;
              return (
                <a
                  key={tab.id}
                  href={`#${tab.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`whitespace-nowrap rounded-full px-5 py-2 font-body text-label-sm font-semibold uppercase tracking-wider transition-colors duration-300 ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                  }`}
                >
                  {labels[tab.key]}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
