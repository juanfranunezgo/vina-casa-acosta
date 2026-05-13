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

export default function ActivitiesTabs({ labels }: Props) {
  const [active, setActive] = useState<string>("tours");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sections = tabs.map((t) => document.getElementById(t.id)).filter(Boolean);

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
    sections.forEach((s) => s && obs.observe(s));
    observers.push(obs);

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  return (
    <nav className="inline-flex items-center gap-1 p-1 rounded-full bg-surface-container-low border border-outline-variant/40">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={isActive ? "page" : undefined}
            className={`px-5 py-2 rounded-full font-body text-label-sm uppercase tracking-wider font-semibold transition-all duration-300 ${
              isActive
                ? "bg-primary text-on-primary shadow-[0_4px_14px_-4px_rgba(42,0,2,0.4)]"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {labels[tab.key]}
          </a>
        );
      })}
    </nav>
  );
}
