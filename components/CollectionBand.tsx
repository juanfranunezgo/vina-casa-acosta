"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/Reveal";
import Button from "@/components/ui/Button";
import WineCard, { type WineCardProps } from "@/components/WineCard";

export type CollectionWine = WineCardProps & { slug: string };

type CollectionBandProps = {
  id: string;
  kicker: string;
  name: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  wines: CollectionWine[];
  moreLabel: string;
  lessLabel: string;
  altBackground?: boolean;
  flip?: boolean;
  priorityImage?: boolean;
};

/** Presenta dos vinos en primer plano y expande el resto bajo demanda. */
export default function CollectionBand({
  id,
  kicker,
  name,
  description,
  heroImage,
  heroAlt,
  wines,
  moreLabel,
  lessLabel,
  altBackground = false,
  flip = false,
  priorityImage = false,
}: CollectionBandProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const titleId = `coleccion-${id}`;
  const visibleWines = isExpanded ? wines : wines.slice(0, 2);
  const hasMoreWines = wines.length > 2;
  const singleWineAtOuterEdge = wines.length === 1 && !flip;
  const stageColumns = flip
    ? "lg:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]"
    : "lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]";

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`scroll-mt-24 ${altBackground ? "bg-surface-container-low" : "bg-surface"}`}
    >
      <div className="mx-auto max-w-(--container-max) px-margin-mobile py-14 md:px-margin-desktop lg:py-20">
        <header className="max-w-3xl">
          <p className="mb-1 block font-accent text-xl font-light italic text-primary md:text-2xl">{kicker}</p>
          <h2
            id={titleId}
            className="font-display text-headline-h1-mobile text-primary md:text-headline-h1"
          >
            {name}
          </h2>
          <p className="mt-3 font-body text-body-md text-on-surface-variant">{description}</p>
        </header>

        <div className={`mt-8 grid grid-cols-1 items-start gap-6 lg:mt-10 lg:gap-10 ${stageColumns}`}>
          <Reveal
            as="figure"
            className={`relative m-0 aspect-[4/5] overflow-hidden rounded-[1.25rem] ${
              flip ? "lg:order-2" : ""
            }`}
          >
            <Image
              src={heroImage}
              alt={heroAlt}
              fill
              priority={priorityImage}
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center"
            />
          </Reveal>

          <div className={`min-w-0 ${flip ? "lg:order-1" : ""}`}>
            <ul id={`${titleId}-wines`} className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
              {visibleWines.map((wine, idx) => (
                <Reveal
                  as="li"
                  key={wine.slug}
                  delay={idx * 80}
                  className={`list-none min-w-0 ${singleWineAtOuterEdge ? "sm:col-start-2" : ""}`}
                >
                  <WineCard
                    href={wine.href}
                    image={wine.image}
                    name={wine.name}
                    eyebrow={wine.eyebrow}
                  />
                </Reveal>
              ))}
            </ul>

            {hasMoreWines && (
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  iconRight={<ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />}
                  aria-expanded={isExpanded}
                  aria-controls={`${titleId}-wines`}
                  onClick={() => setIsExpanded((expanded) => !expanded)}
                >
                  {isExpanded ? lessLabel : moreLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
