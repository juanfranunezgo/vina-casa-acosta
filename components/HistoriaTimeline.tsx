import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import VineConnector from "@/components/VineConnector";

type MilestoneKey = "m1998" | "m2000" | "m2003" | "m2012" | "today";

/**
 * Hitos del legado (B4). La imagen es un asset (no va en i18n); el resto del
 * contenido —año, título, descripción, alt— vive en messages. Fotos provisionales
 * reutilizadas del proyecto hasta tener las definitivas de la familia.
 */
const milestones: readonly { key: MilestoneKey; image: string }[] = [
  { key: "m1998", image: "/images/home/casa/origins.jpg" },
  { key: "m2000", image: "/images/home/casa/teaching.jpg" },
  { key: "m2003", image: "/images/home/casa/tractor.jpg" },
  { key: "m2012", image: "/images/home/cta-parras.jpg" },
  { key: "today", image: "/images/home/casa/family.jpg" },
] as const;

export default async function HistoriaTimeline() {
  const t = await getTranslations("historia.timeline");

  return (
    <section
      aria-labelledby="timeline-title"
      className="bg-surface-container-low py-section-gap px-margin-mobile md:px-margin-desktop"
    >
      {/* Filtro reutilizable: borde rasgado orgánico de las fotos (decorativo). */}
      <svg
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute h-0 w-0"
      >
        <filter id="historia-torn" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.014"
            numOctaves="3"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div className="max-w-(--container-max) mx-auto">
        <Reveal className="text-center mb-16 md:mb-24">
          <h2
            id="timeline-title"
            className="font-display text-headline-h1-mobile md:text-headline-h1 text-primary"
          >
            {t("title")}
          </h2>
        </Reveal>

        <ol className="timeline">
          {milestones.map(({ key, image }, idx) => {
            const side = idx % 2 === 0 ? "left" : "right";
            const isLast = idx === milestones.length - 1;
            const year = t(`milestones.${key}.year`);
            const isNumericYear = /^\d{4}$/.test(year);

            return (
              <li key={key} className="timeline-item" data-side={side}>
                <Reveal
                  as="article"
                  delay={80}
                  className={`timeline-card timeline-card--${side}`}
                >
                  <figure className="timeline-figure">
                    <Image
                      src={image}
                      alt={t(`milestones.${key}.imageAlt`)}
                      fill
                      sizes="(max-width: 768px) 78vw, 40vw"
                      className="torn-edge object-cover"
                    />
                  </figure>
                  <div className="timeline-text">
                    {isNumericYear ? (
                      <time dateTime={year} className="timeline-year">
                        {year}
                      </time>
                    ) : (
                      <span className="timeline-year">{year}</span>
                    )}
                    <h3 className="font-display text-headline-h2 text-primary timeline-title-h3">
                      {t(`milestones.${key}.title`)}
                    </h3>
                    <p className="font-body text-body-md text-on-surface-variant">
                      {t(`milestones.${key}.description`)}
                    </p>
                  </div>
                </Reveal>

                {!isLast && <VineConnector flip={side === "right"} />}
              </li>
            );
          })}
        </ol>

        <p className="mt-10 text-xs text-on-surface-variant/70 text-center">
          {t("photoNote")}
        </p>
      </div>
    </section>
  );
}
