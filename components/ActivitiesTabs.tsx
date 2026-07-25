"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Map, Wine } from "lucide-react";

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

const navHeight = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
    ? 96
    : 88;

/** Barra estÃ¡tica: conserva contexto sin cubrir contenido al desplazarse. */
export default function ActivitiesTabs({ labels }: Props) {
  const [active, setActive] = useState(tabs[0].id);

  useEffect(() => {
    const sections = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((element): element is HTMLElement => element !== null);
    if (!sections.length) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActive(sections[sections.length - 1].id);
        return;
      }

      const line = navHeight() + 24;
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
      aria-label={labels.aria}
      className="relative z-20 border-y border-outline-variant/30 bg-surface px-margin-mobile py-3 md:px-margin-desktop md:py-4"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-1 rounded-full border border-outline-variant/40 bg-surface-container-low p-1 ambient-shadow">
        {tabs.map(({ id, key, Icon }) => {
          const isActive = active === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActive(id)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-2 py-2 text-center font-body text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 sm:text-label-sm sm:tracking-wider md:px-5 ${
                isActive
                  ? "bg-primary text-on-primary shadow-[0_4px_14px_-4px_rgba(42,0,2,0.4)]"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              <Icon className="hidden h-4 w-4 shrink-0 md:block" aria-hidden="true" />
              {labels[key]}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
