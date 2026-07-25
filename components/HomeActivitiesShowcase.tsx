"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, LayoutGrid, Map, Wine, CalendarDays, Clock } from "lucide-react";

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
  book: string;
  more: string;
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
  reserveHref?: string;
  badge: string;
  premium?: boolean;
  price?: string;
  duration?: string;
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
    reserveHref: `/${locale}/actividades/${tr.slug}#reserva`,
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
                className={`inline-flex min-h-11 items-center gap-2 px-4 md:px-5 py-2 rounded-full font-body text-label-sm uppercase tracking-wider font-semibold transition-all duration-300 ${
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 motion-safe:animate-[reveal-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          {cards.map((card, i) => {
            const featured = i === 0;
            const isTour = Boolean(card.duration);

            // Destacada: foto full-bleed + CTAs sobre la imagen.
            if (featured) {
              return (
                <article
                  key={`${card.slug}-${card.badge}`}
                  className={`group relative flex flex-col justify-end overflow-hidden rounded-2xl ambient-shadow transition-all duration-300 hover:ambient-shadow-lg sm:col-span-2 sm:row-span-2 min-h-[380px] sm:min-h-[560px] ${
                    card.premium ? "ring-1 ring-primary/25" : ""
                  }`}
                >
                  <Link href={card.href} className="absolute inset-0 z-0" aria-label={card.name}>
                    <Image
                      src={card.image}
                      alt={card.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5" />

                  <span className="absolute left-4 top-4 z-10 rounded-full bg-primary/90 px-3 py-1 text-label-sm font-semibold uppercase tracking-wider text-on-primary backdrop-blur-sm">
                    {card.premium ? `★ ${card.badge}` : card.badge}
                  </span>

                  <div className="relative z-10 p-6 md:p-8">
                    {card.duration && (
                      <span className="mb-2 inline-flex items-center gap-1.5 font-body text-body-md text-on-primary/85">
                        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {card.duration}
                      </span>
                    )}
                    <h3 className="mb-5 font-display text-3xl leading-tight text-on-primary md:text-4xl">
                      {card.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4">
                      {card.reserveHref && (
                        <Link
                          href={card.reserveHref}
                          className="inline-flex h-11 items-center gap-2 rounded-md bg-primary-container px-5 font-body text-body-md font-semibold text-on-primary shadow-[0_4px_14px_-4px_rgba(42,0,2,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary"
                        >
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                          {labels.book}
                        </Link>
                      )}
                      <Link
                        href={card.href}
                        className="inline-flex items-center gap-1 font-body text-body-md font-semibold text-on-primary/90 transition-colors hover:text-on-primary"
                      >
                        {labels.more} {card.name}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            }

            // Secundarias: panel blanco (foto arriba + info abajo).
            return (
              <article
                key={`${card.slug}-${card.badge}`}
                className={`group flex flex-col overflow-hidden rounded-2xl bg-surface ambient-shadow transition-all duration-300 hover:ambient-shadow-lg ${
                  isTour ? "min-h-[320px]" : "min-h-[300px]"
                } ${card.premium ? "ring-1 ring-primary/25" : ""}`}
              >
                <Link
                  href={card.href}
                  className="relative block min-h-[150px] grow overflow-hidden"
                  aria-label={card.name}
                >
                  <Image
                    src={card.image}
                    alt={card.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                </Link>
                <div className="flex flex-col gap-2 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-body text-label-sm font-semibold uppercase tracking-wider text-primary">
                      {card.premium ? `★ ${card.badge}` : card.badge}
                    </span>
                    {card.duration && (
                      <span className="inline-flex items-center gap-1.5 font-body text-label-sm text-on-surface-variant">
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {card.duration}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl leading-tight text-primary">
                    <Link href={card.href} className="transition-colors hover:text-primary-container">
                      {card.name}
                    </Link>
                  </h3>
                  <div className="mt-1 flex items-center gap-4">
                    {card.reserveHref && (
                      <Link
                        href={card.reserveHref}
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-container px-4 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary transition-colors duration-200 hover:bg-primary"
                      >
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        {labels.book}
                      </Link>
                    )}
                    <Link
                      href={card.href}
                      className="inline-flex items-center gap-1 font-body text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary"
                    >
                      {labels.more} {card.name}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Separador: eventos es un bloque de otro estilo (banner horizontal), lo
          despegamos del mosaico con aire + una fina línea centrada. */}
      {filter === "all" && (
        <div className="mt-10 mb-8 flex justify-center md:mt-16 md:mb-12" aria-hidden="true">
          <span className="h-px w-16 rounded-full bg-outline-variant/60" />
        </div>
      )}

      {/* Banner de eventos — en "Todas" abajo, o solo (filtro Eventos) */}
      {(filter === "all" || filter === "events") && (
        <Link
          href={events.href}
          className="group relative grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden ambient-shadow-lg hover:-translate-y-0.5 transition-transform duration-300 bg-surface-container-low border border-outline-variant/25"
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
