import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Sprout, Grape, Wine, Leaf, Users, type LucideIcon } from "lucide-react";
import Reveal from "@/components/Reveal";

type MilestoneKey = "m1998" | "m2000" | "m2003" | "m2012" | "today";

/**
 * Hitos del legado (B4) — "sendero" vertical: foto grande + texto alternando
 * lados, unidos por una curva serpenteante con un badge de ícono por hito.
 * La imagen es un asset (no va en i18n); año, título, descripción y alt viven
 * en messages. Fotos provisionales del proyecto hasta tener las definitivas.
 */
const milestones: readonly {
  key: MilestoneKey;
  image: string;
  Icon: LucideIcon;
  /** object-position del <Image> cuando el encuadre por defecto (centro) recorta mal. */
  position?: string;
}[] = [
  // origins.jpg es casi cuadrada (1163×1157) y el slot es 4:3: centrado le cortaba
  // la cabeza a Nelson. Subimos el foco para que se vea la cara.
  { key: "m1998", image: "/images/home/casa/origins.jpg", Icon: Sprout, position: "50% 6%" },
  { key: "m2000", image: "/images/home/casa/teaching.webp", Icon: Grape },
  { key: "m2003", image: "/images/historia/primera-produccion.webp", Icon: Wine },
  { key: "m2012", image: "/images/home/cta-parras.jpg", Icon: Leaf },
  { key: "today", image: "/images/home/casa/family.webp", Icon: Users },
] as const;

// Curva serpenteante (desktop). El path está calculado para estos 5 hitos:
// vértices al 10/30/50/70/90 % del alto, alternando lado (x=0 izq. / x=100 der.).
// Si cambia la cantidad de hitos, hay que regenerar este path.
const CURVE_PATH =
  "M50,0 C50,50 0,50 0,100 C0,200 100,200 100,300 C100,400 0,400 0,500 " +
  "C0,600 100,600 100,700 C100,800 0,800 0,900 C0,950 50,950 50,1000";

export default async function HistoriaTimeline() {
  const t = await getTranslations("historia.timeline");

  return (
    <section
      aria-labelledby="timeline-title"
      className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop"
    >
      <div className="max-w-(--container-max) mx-auto">
        <Reveal className="text-center mb-16 md:mb-24">
          <h2
            id="timeline-title"
            className="font-display text-headline-h1-mobile md:text-headline-h1 text-primary"
          >
            {t("title")}
          </h2>
        </Reveal>

        <div className="tl-wrap">
          <svg
            className="tl-path"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={CURVE_PATH}
              fill="none"
              stroke="#7a2530"
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <ol className="tl">
            {milestones.map(({ key, image, Icon, position }, idx) => {
              const side = idx % 2 === 0 ? "left" : "right";
              const year = t(`milestones.${key}.year`);
              const isNumericYear = /^\d{4}$/.test(year);

              return (
                <Reveal
                  as="li"
                  key={key}
                  delay={60}
                  className={`tl-item tl-item--${side}`}
                >
                  <span className="tl-badge" aria-hidden="true">
                    <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
                  </span>

                  <figure className="tl-figure">
                    <Image
                      src={image}
                      alt={t(`milestones.${key}.imageAlt`)}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 84vw, 44vw"
                      className="object-cover"
                      style={position ? { objectPosition: position } : undefined}
                    />
                  </figure>

                  <div className="tl-text">
                    {isNumericYear ? (
                      <time dateTime={year} className="tl-year">
                        {year}
                      </time>
                    ) : (
                      <span className="tl-year">{year}</span>
                    )}
                    <h3 className="font-display text-headline-h2 text-primary mb-3">
                      {t(`milestones.${key}.title`)}
                    </h3>
                    <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
                      {t(`milestones.${key}.description`)}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
