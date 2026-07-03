"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutGrid, Map, Wine, CalendarDays, Clock } from "lucide-react";

type TourItem = {
  slug: string;
  name: string;
  price: string;
  duration: string;
  image: string;
  premium?: boolean;
};

type ExperienceItem = {
  slug: string;
  name: string;
  badge: string;
  image: string;
};

type EventsBlock = {
  title: string;
  description: string;
  cta: string;
  image: string;
  href: string;
};

type Labels = {
  all: string;
  tours: string;
  experiences: string;
  events: string;
  catTour: string;
  catExperience: string;
};

type Props = {
  locale: string;
  labels: Labels;
  tours: TourItem[];
  experiences: ExperienceItem[];
  events: EventsBlock;
  experiencesHref: string;
};

type Filter = "all" | "tours" | "experiences" | "events";

type Card = {
  slug: string;
  name: string;
  image: string;
  href: string;
  badge: string;
  premium?: boolean;
  price?: string;
  duration?: string;
  tag?: string;
};

export default function HomeActivitiesShowcase({
  locale,
  labels,
  tours,
  experiences,
  events,
  experiencesHref,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const tourCards: Card[] = tours.map((tr) => ({
    slug: tr.slug,
    name: tr.name,
    image: tr.image,
    href: `/${locale}/actividades/${tr.slug}`,
    badge: labels.catTour,
    premium: tr.premium,
    price: tr.price,
    duration: tr.duration,
  }));

  const experienceCards: Card[] = experiences.map((ex) => ({
    slug: ex.slug,
    name: ex.name,
    image: ex.image,
    href: experiencesHref,
    badge: labels.catExperience,
    tag: ex.badge,
  }));

  // Carménère (premium) primero → queda como la card destacada del mosaico.
  const orderedTours = [...tourCards].sort(
    (a, b) => Number(b.premium ?? false) - Number(a.premium ?? false),
  );

  const cards =
    filter === "tours"
      ? orderedTours
      : filter === "experiences"
        ? experienceCards
        : [...orderedTours, ...experienceCards];

  const filters: { key: Filter; label: string; icon: typeof Map }[] = [
    { key: "all", label: labels.all, icon: LayoutGrid },
    { key: "tours", label: labels.tours, icon: Map },
    { key: "experiences", label: labels.experiences, icon: Wine },
    { key: "events", label: labels.events, icon: CalendarDays },
  ];

  return (
    <div>
      {/* Filtros */}
      <nav className="flex justify-center mb-10">
        <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-full bg-surface border border-outline-variant/40 ambient-shadow">
          {filters.map((f) => {
            const isActive = filter === f.key;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 px-4 md:px-5 py-2 rounded-full font-body text-label-sm uppercase tracking-wider font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-on-primary shadow-[0_4px_14px_-4px_rgba(42,0,2,0.4)]"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {f.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mosaico bento */}
      {filter !== "events" && (
        <div
          key={filter}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:auto-rows-[236px] motion-safe:animate-[reveal-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          {cards.map((card, i) => {
            const featured = i === 0;
            return (
              <Link
                key={`${card.slug}-${card.badge}`}
                href={card.href}
                className={`group relative block rounded-2xl overflow-hidden ambient-shadow hover:ambient-shadow-lg transition-all duration-300 min-h-[236px] ${
                  featured ? "sm:col-span-2 sm:row-span-2" : ""
                } ${
                  card.premium ? "ring-1 ring-primary/25" : ""
                }`}
              >
                <Image
                  src={card.image}
                  alt={card.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes={featured ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 1024px) 100vw, 33vw"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />

                <span className="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm text-primary px-3 py-1 rounded-full text-label-sm uppercase tracking-wider font-semibold">
                  {card.premium ? `★ ${card.badge}` : card.badge}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex flex-col justify-end">
                  <h3
                    className={`font-display text-on-primary leading-tight mb-3 ${
                      featured ? "text-3xl md:text-4xl" : "text-2xl"
                    }`}
                  >
                    {card.name}
                  </h3>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      {card.duration && (
                        <span className="inline-flex items-center gap-1.5 font-body text-body-md text-on-primary/85">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          {card.duration}
                        </span>
                      )}
                      {card.tag && (
                        <span className="font-body text-body-md text-on-primary/85">{card.tag}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {card.price && (
                        <span className="font-body text-body-lg font-semibold text-on-primary tabular-nums">
                          {card.price}
                        </span>
                      )}
                      <span className="h-10 w-10 rounded-full border border-on-primary/50 flex items-center justify-center text-on-primary group-hover:bg-on-primary group-hover:text-primary transition-colors duration-200">
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Banner de eventos — en "Todas" abajo, o solo (filtro Eventos) */}
      {(filter === "all" || filter === "events") && (
        <Link
          href={events.href}
          className={`group relative grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden ambient-shadow-lg hover:-translate-y-0.5 transition-transform duration-300 bg-surface-container-low border border-outline-variant/25 ${
            filter === "all" ? "mt-4" : ""
          }`}
        >
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <span className="font-body text-label-sm uppercase tracking-[0.3em] text-primary/70 mb-3">
              {labels.events}
            </span>
            <h3 className="font-display text-primary text-3xl md:text-4xl mb-4 leading-tight">
              {events.title}
            </h3>
            <p className="font-body text-body-lg text-on-surface-variant mb-7 max-w-md">
              {events.description}
            </p>
            <span className="inline-flex items-center gap-2 self-start bg-primary text-on-primary px-6 h-11 rounded-md font-body font-semibold text-body-md group-hover:-translate-y-0.5 group-hover:bg-primary-container transition-all duration-200">
              {events.cta}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
          <div className="relative min-h-[260px] md:min-h-[340px] overflow-hidden">
            <Image
              src={events.image}
              alt={events.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Blend suave solo en la costura izquierda (desktop), para fundir con el panel de texto */}
            <div className="absolute inset-0 hidden md:block bg-[linear-gradient(to_right,var(--color-surface-container-low)_0%,transparent_20%)]" />
          </div>
        </Link>
      )}
    </div>
  );
}
