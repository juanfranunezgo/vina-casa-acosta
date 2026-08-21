"use client";

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
import WineBottleImage from "@/components/WineBottleImage";

export type FeaturedLineWine = {
  /** Nombre completo (para el alt de la imagen). */
  name: string;
  /** Nombre corto/distintivo mostrado bajo la botella (ej. "Sam", "Carmenere"). */
  label: string;
  /** Ausente si el producto se creó en el panel sin foto. */
  image?: string;
  href: string;
};

export type FeaturedLineDetail = { label: string; value: string };

export type FeaturedLineCard = {
  slug: string;
  name: string;
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
                aria-current={i === index ? "true" : undefined}
                className="grid h-11 w-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  aria-hidden="true"
                  className={`block h-2.5 rounded-full transition-all duration-300 ${
                    i === index
                      ? "w-6 bg-primary"
                      : "w-2.5 bg-outline-variant hover:bg-primary/50"
                  }`}
                />
              </button>
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
    <article className="grid h-full grid-cols-1 items-center gap-6 rounded-3xl border border-outline-variant/40 bg-surface p-6 ambient-shadow md:grid-cols-[0.75fr_1.7fr_0.7fr] md:gap-8 md:px-9 md:py-7">
      {/* Identidad de la colección.
          Apilada —o sea en móvil— va centrada: el bloque ocupa el ancho entero de
          la tarjeta y las botellas que van debajo ya estaban centradas, así que a
          la izquierda quedaba como una columna que perdió a su vecina. En
          escritorio vuelve a la izquierda, que ahí sí es una columna con dos al
          lado. */}
      <div className="text-center md:text-left">
        <h3 className="mb-3 font-display text-headline-h1-mobile leading-none text-primary md:text-headline-h1">
          {line.name}
        </h3>
        <p className="mb-4 font-body text-body-md text-on-surface-variant">
          {line.description}
        </p>
        {line.chips.length > 0 && (
          <ul className="mb-6 flex list-none flex-wrap justify-center gap-2 p-0 md:justify-start">
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
      </div>

      {/* Line-up de botellas — lista semántica (ul/li). Fila única centrada: cada
          botella se reparte el ancho (grow-0 basis) y encoge hasta caber, sin scroll
          horizontal (que chocaba con el swipe) y con alto estable entre colecciones. */}
      <ul className="flex list-none items-end justify-center gap-3 py-2 sm:gap-5 md:border-x md:border-outline-variant/40 md:px-5">
        {line.wines.map((wine) => (
          <li key={wine.href} className="flex min-w-0 grow-0 basis-[76px] md:basis-[100px]">
            <Link
              href={wine.href}
              className="group flex w-full flex-col items-center gap-2"
            >
              {/* Caja de ALTURA FIJA (no derivada del ancho) + object-cover: recorta el
                  margen transparente (la botella real ocupa ~25% del ancho del PNG y
                  está centrada), así se ve grande sin fotos nuevas. Altura fija = todas
                  las filas miden igual sin importar cuántas botellas → sin blancos por
                  diferencia de alto entre colecciones, y botellas del mismo tamaño. */}
              <span className="relative block h-[216px] w-full md:h-[264px]">
              {/* Sombra de apoyo: la botella "se posa" sobre el piso. No se mueve en
                  hover, así al levantarse la botella se despega del pedestal. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-2 bottom-0 h-2.5 rounded-[50%] bg-primary/25 blur-md sm:inset-x-3 sm:h-3"
              />
              <WineBottleImage
                src={wine.image}
                alt={wine.name}
                className="object-cover object-bottom drop-shadow-[0_10px_14px_rgba(74,14,14,0.22)] transition-transform duration-500 group-hover:-translate-y-2 motion-reduce:transition-none"
                sizes="300px"
              />
              </span>
              <span className="flex min-h-[2.5em] items-start justify-center text-center font-body text-xs leading-tight text-on-surface-variant">
                {wine.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Los datos de la colección y la llamada a la acción.
          El botón bajó de la columna del nombre a esta: cierra la columna que da
          los datos, que es donde termina de leerse la ficha. En móvil, apilado,
          eso lo deja al final de la tarjeta, después de las botellas. */}
      <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
        {line.details.length > 0 && (
          <dl className="m-0 flex w-full flex-col gap-2.5 md:gap-3">
            {line.details.map((detail) => (
              // Iba en una caja gris de 24px de radio y sin borde, sobre el papel
              // de la tarjeta: a 254px de ancho se leía como una pastilla vacía
              // más que como un dato. Ahora la sostiene un filete —el mismo
              // `outline-variant` del resto del sitio— sobre un fondo un punto
              // más claro y con la mitad de radio: una ficha, no una píldora.
              //
              // Y el valor pasa a la serif del sitio. Son frases de catálogo
              // —"Barricas de roble francés"—, no cifras: en Work Sans a 14px
              // quedaban como el pie de una tabla, y en Libre Caslon a 15px
              // responden al nombre de la colección. El rótulo se queda en la de
              // cuerpo, que es la que sostiene bien la versalita.
              <div
                key={detail.label}
                className="rounded-lg border border-outline-variant/50 bg-surface-container-low px-4 py-3"
              >
                <dt className="mb-1 font-body text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-wine-accent">
                  {detail.label}
                </dt>
                <dd className="m-0 font-display text-[0.9375rem] leading-snug text-on-surface">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
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
    </article>
  );
}
