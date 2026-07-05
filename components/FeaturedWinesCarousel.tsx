"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export type FeaturedWineCard = {
  slug: string;
  name: string;
  lineLabel: string;
  shortDescription: string;
  vintage: number;
  image: string;
  href: string;
};

type Labels = {
  vintageLabel: string;
  cardCta: string;
  prevLabel: string;
  nextLabel: string;
};

type Props = {
  wines: FeaturedWineCard[];
  labels: Labels;
  /** Slug del vino que arranca al centro (ej. el Gran Reserva). */
  initialSlug?: string;
};

export default function FeaturedWinesCarousel({ wines, labels, initialSlug }: Props) {
  const n = wines.length;
  const [active, setActive] = useState(() => {
    const i = wines.findIndex((w) => w.slug === initialSlug);
    return i >= 0 ? i : n > 1 ? 1 : 0; // por defecto, el del medio
  });
  const touchStartX = useRef<number | null>(null);

  const go = (dir: 1 | -1) => setActive((a) => (a + dir + n) % n);

  // offset relativo de cada card respecto del centro: -1 (izq) · 0 (centro) · 1 (der)
  const offsetOf = (i: number) => {
    const rel = (i - active + n) % n;
    return rel === n - 1 ? -1 : rel; // n=3 → 2 se trata como -1
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  return (
    <div className="relative">
      {/* Ilustraciones de fondo: ramas de vid grabadas (neutro) + sello CA */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <VineArt
          src="/ilustraciones/rama-vertical.svg"
          className="absolute left-0 top-1/2 hidden h-[660px] w-[300px] -translate-y-1/2 bg-on-surface-variant opacity-[0.16] md:block lg:left-[1%] xl:left-[4%]"
        />
        <VineArt
          src="/ilustraciones/rama-vertical.svg"
          className="absolute right-0 top-1/2 hidden h-[660px] w-[300px] -translate-y-1/2 -scale-x-100 bg-on-surface-variant opacity-[0.16] md:block lg:right-[1%] xl:right-[4%]"
        />
        <Image
          src="/brand/logo-negro.png"
          alt=""
          width={460}
          height={460}
          aria-hidden="true"
          className="w-[min(46vw,460px)] opacity-[0.05] select-none"
        />
      </div>

      {/* Escenario coverflow */}
      <div
        className="relative mx-auto h-[560px] max-w-(--container-max) select-none sm:h-[600px] md:h-[640px]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {wines.map((wine, i) => {
          const off = offsetOf(i);
          const isCenter = off === 0;
          const translate = `calc(-50% + ${off * 78}%)`;
          const scale = isCenter ? 1 : 0.84;
          return (
            <div
              key={wine.slug}
              className="absolute left-1/2 top-1/2 w-[78%] max-w-[380px] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:w-[58%] md:w-[34%]"
              style={{
                transform: `translate(${translate}, -50%) scale(${scale})`,
                opacity: isCenter ? 1 : 0.55,
                zIndex: isCenter ? 20 : 10,
                filter: isCenter ? "none" : "saturate(0.9)",
              }}
              aria-hidden={!isCenter}
            >
              <WineCard wine={wine} labels={labels} highlighted={isCenter} />
            </div>
          );
        })}
      </div>

      {/* Flechas */}
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.prevLabel}
            className="group absolute left-0 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/60 bg-surface/90 text-primary shadow-[0_8px_24px_-12px_rgba(74,14,14,0.35)] backdrop-blur transition hover:border-primary/30 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:left-2 lg:left-[2%]"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.nextLabel}
            className="group absolute right-0 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/60 bg-surface/90 text-primary shadow-[0_8px_24px_-12px_rgba(74,14,14,0.35)] backdrop-blur transition hover:border-primary/30 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:right-2 lg:right-[2%]"
          >
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </>
      )}
    </div>
  );
}

function WineCard({
  wine,
  labels,
  highlighted,
}: {
  wine: FeaturedWineCard;
  labels: Labels;
  highlighted: boolean;
}) {
  return (
    <Link
      href={wine.href}
      tabIndex={highlighted ? 0 : -1}
      className={`group relative block overflow-hidden rounded-2xl border bg-surface transition-all duration-500 ${
        highlighted
          ? "ambient-shadow-lg border-outline-variant/40 hover:-translate-y-1 hover:border-primary/20"
          : "border-outline-variant/25"
      }`}
    >
      {/* Serifs decorativos */}
      {(["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"] as const).map(
        (pos) => (
          <span
            key={pos}
            className={`pointer-events-none absolute z-20 h-3 w-3 border-primary/15 ${pos}`}
            aria-hidden="true"
          />
        )
      )}

      {/* Stage de botella */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-surface-container-low via-surface-container to-surface-container-high">
        <span className="absolute right-6 top-5 z-10 flex flex-col items-end leading-tight">
          <span className="font-body text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70">
            {labels.vintageLabel}
          </span>
          <span className="font-display text-lg text-primary tabular-nums">{wine.vintage}</span>
        </span>

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.55) 0%, transparent 55%)",
          }}
          aria-hidden="true"
        />

        <Image
          src={wine.image}
          alt={wine.name}
          fill
          quality={95}
          className="object-contain p-8 drop-shadow-[0_24px_28px_rgba(74,14,14,0.22)] transition-transform duration-700 group-hover:-rotate-1 group-hover:scale-105"
          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 58vw, 380px"
        />

        <div
          className="absolute bottom-0 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-primary/15 opacity-60 blur-xl transition-opacity duration-500 group-hover:opacity-80"
          aria-hidden="true"
        />
      </div>

      {/* Contenido */}
      <div className="relative bg-surface p-6 pt-7">
        <p className="mb-1 font-body text-label-sm uppercase tracking-[0.2em] text-on-surface-variant">
          {wine.lineLabel}
        </p>
        <h3 className="mb-2 font-display text-2xl leading-tight text-primary">{wine.name}</h3>
        <p className="mb-6 line-clamp-2 font-body text-body-md text-on-surface-variant">
          {wine.shortDescription}
        </p>

        <span className="inline-flex w-full items-center justify-between border-t border-outline-variant/40 pt-4 font-body text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">
          {labels.cardCta}
          <span className="inline-flex items-center gap-1 transition-transform duration-300 group-hover:translate-x-1">
            <span className="h-px w-4 bg-primary" aria-hidden="true" />
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
      </div>
    </Link>
  );
}

/**
 * Ilustración de vid del cliente (silueta con alpha) teñida al vino de marca
 * vía máscara CSS. `cover` para que la vid ocupe todo el alto del recuadro.
 */
function VineArt({ src, className = "" }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "cover",
        maskSize: "cover",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
