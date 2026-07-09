"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

export type FeaturedLineWine = {
  /** Nombre completo (para el alt de la imagen). */
  name: string;
  /** Nombre corto/distintivo mostrado bajo la botella (ej. "Sam", "Carmenere"). */
  label: string;
  image: string;
  href: string;
};

export type FeaturedLineDetail = { label: string; value: string };

export type FeaturedLineCard = {
  slug: string;
  name: string;
  tag: string;
  description: string;
  chips: string[];
  details: FeaturedLineDetail[];
  collectionHref: string;
  wines: FeaturedLineWine[];
};

type Labels = {
  prev: string;
  next: string;
  viewCollection: string;
};

type Props = {
  lines: FeaturedLineCard[];
  labels: Labels;
};

const SWIPE_THRESHOLD = 44;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
// La opacidad cierra antes que el desplazamiento: la tarjeta entrante se vuelve
// opaca rápido (slide sólido) y la saliente desaparece antes de terminar su viaje.
const SLIDE = `transform 550ms ${EASE}, opacity 350ms ${EASE}`;

export default function FeaturedLinesCarousel({ lines, labels }: Props) {
  const count = lines.length;

  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Índice modular puro: siempre válido (0..count-1). Las tarjetas se apilan en
  // una sola celda de grid y se posicionan por su offset firmado respecto al
  // índice actual. Sin clones, sin track: es imposible "quedarse sin tarjeta".
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = (target: number) => {
    if (count < 2) return;
    setIndex(((target % count) + count) % count);
  };
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  // Distancia firmada más corta en el anillo (p.ej. count=3 → {0, 1, -1}): así
  // la entrante viene del lado del movimiento y la saliente se va al opuesto.
  const offsetOf = (i: number) => {
    const raw = (((i - index) % count) + count) % count;
    return raw > count / 2 ? raw - count : raw;
  };

  const handleTouchStart = (e: ReactTouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: ReactTouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Solo swipes claramente horizontales: así el scroll vertical de la página
    // (con leve deriva lateral) no cambia de colección sin querer.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      (dx < 0 ? next : prev)();
    }
  };

  return (
    <div className="relative">
      <div
        className="overflow-hidden rounded-3xl"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Todas las tarjetas apiladas en la misma celda → altura estable = la
            más alta, sin saltos verticales al navegar. */}
        <div className="grid">
          {lines.map((line, i) => {
            const off = offsetOf(i);
            const active = off === 0;
            const style: CSSProperties = {
              gridArea: "1 / 1",
              transform: `translateX(${off * 100}%)`,
              opacity: active ? 1 : 0,
              zIndex: active ? 10 : 0,
              transition: prefersReduced ? "none" : SLIDE,
              willChange: "transform",
            };
            return (
              <div key={line.slug} style={style} aria-hidden={!active} inert={!active}>
                <LineCard line={line} viewCollectionLabel={labels.viewCollection} />
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label={labels.prev}
            className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/60 bg-surface/90 text-primary shadow-[0_8px_24px_-12px_rgba(74,14,14,0.35)] backdrop-blur transition hover:border-primary/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:-left-3 md:flex lg:-left-5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={labels.next}
            className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/60 bg-surface/90 text-primary shadow-[0_8px_24px_-12px_rgba(74,14,14,0.35)] backdrop-blur transition hover:border-primary/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:-right-3 md:flex lg:-right-5"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-8 flex justify-center gap-2">
            {lines.map((line, i) => (
              <button
                key={line.slug}
                type="button"
                onClick={() => go(i)}
                aria-label={line.name}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-primary"
                    : "w-2.5 bg-outline-variant hover:bg-primary/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LineCard({
  line,
  viewCollectionLabel,
}: {
  line: FeaturedLineCard;
  viewCollectionLabel: string;
}) {
  return (
    <article className="grid grid-cols-1 items-center gap-6 rounded-3xl border border-outline-variant/40 bg-surface p-6 ambient-shadow md:grid-cols-[0.8fr_1.5fr_0.7fr] md:gap-8 md:p-9">
      {/* Identidad de la colección */}
      <div>
        <span className="mb-1 block font-accent text-lg font-light italic text-wine-accent md:text-xl">
          {line.tag}
        </span>
        <h3 className="mb-3 font-display text-headline-h1-mobile leading-none text-primary md:text-headline-h1">
          {line.name}
        </h3>
        <p className="mb-4 font-body text-body-md text-on-surface-variant">
          {line.description}
        </p>
        {line.chips.length > 0 && (
          <ul className="mb-6 flex list-none flex-wrap gap-2 p-0">
            {line.chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-outline-variant/60 px-3 py-1 font-body text-label-sm uppercase tracking-wider text-wine-accent"
              >
                {chip}
              </li>
            ))}
          </ul>
        )}
        <Button
          href={line.collectionHref}
          variant="primary"
          size="sm"
          iconRight={<ArrowRight className="h-4 w-4" />}
        >
          {viewCollectionLabel}
        </Button>
      </div>

      {/* Line-up de botellas — fila única centrada. Las botellas se reparten el
          ancho por igual (flex-1 basis-0) y encogen hasta caber: sin scroll
          horizontal (que chocaba con el swipe del carrusel y dejaba la primera
          botella fuera de alcance) y con altura/ancho estables. */}
      <div className="flex items-end justify-center gap-3 py-2 sm:gap-5 md:border-x md:border-outline-variant/40 md:px-5">
        {line.wines.map((wine) => (
          <Link
            key={wine.href}
            href={wine.href}
            className="group flex min-w-0 max-w-[136px] flex-1 basis-0 flex-col items-center gap-2"
          >
            <span className="relative block aspect-[3/4] w-full">
              <Image
                src={wine.image}
                alt={wine.name}
                fill
                className="object-contain object-bottom drop-shadow-[0_14px_18px_rgba(74,14,14,0.2)] transition-transform duration-500 group-hover:-translate-y-1.5 motion-reduce:transition-none"
                sizes="150px"
              />
            </span>
            <span className="flex min-h-[2.5em] items-start justify-center text-center font-body text-xs leading-tight text-on-surface-variant">
              {wine.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Detalles de la colección */}
      {line.details.length > 0 && (
        <dl className="m-0 flex flex-col gap-2.5 md:gap-3">
          {line.details.map((detail) => (
            <div
              key={detail.label}
              className="rounded-xl bg-surface-container px-3.5 py-2.5"
            >
              <dt className="mb-0.5 font-body text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-wine-accent">
                {detail.label}
              </dt>
              <dd className="m-0 font-body text-sm leading-snug text-on-surface">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
