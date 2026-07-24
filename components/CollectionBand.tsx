import Image from "next/image";
import Reveal from "@/components/Reveal";
import WineCard, { type WineCardProps } from "@/components/WineCard";

/** Datos ya traducidos de una tarjeta, más su slug para la key de React. */
export type CollectionWine = WineCardProps & { slug: string };

type CollectionBandProps = {
  /** Slug de la línea, usado como ancla (#ombu) y para ids de accesibilidad. */
  id: string;
  /** Antetítulo ya traducido, ej. "Línea · Reserva". */
  kicker: string;
  /** Nombre de la línea, ej. "Ombú". */
  name: string;
  /** Descripción de la línea ya traducida. */
  description: string;
  /** Foto de ambiente que da identidad a la colección. */
  heroImage: string;
  /** Alt descriptivo ya traducido de la foto de ambiente. */
  heroAlt: string;
  /** Vinos de la línea, ya traducidos. */
  wines: CollectionWine[];
  /** Alterna el fondo de la sección para dar ritmo entre líneas. */
  altBackground?: boolean;
  /** Invierte los lados (foto a la derecha) para dar ritmo entre líneas. */
  flip?: boolean;
  /** Prioriza la carga de la foto (solo la primera banda, por LCP). */
  priorityImage?: boolean;
};

/**
 * Banda editorial de una colección, en dos columnas (lado a lado en desktop):
 * la foto de ambiente da identidad a la línea y, al costado, la identidad
 * (antetítulo + nombre + descripción) con la grilla de tarjetas de vino. Cada
 * tarjeta enlaza a la ficha del producto. En móvil las columnas se apilan.
 */
export default function CollectionBand({
  id,
  kicker,
  name,
  description,
  heroImage,
  heroAlt,
  wines,
  altBackground = false,
  flip = false,
  priorityImage = false,
}: CollectionBandProps) {
  const titleId = `coleccion-${id}`;
  const wineGridColumns = id === "ombu" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`scroll-mt-24 ${altBackground ? "bg-surface-container-low" : "bg-surface"}`}
    >
      <div className="mx-auto grid max-w-(--container-max) grid-cols-1 items-stretch lg:grid-cols-[38fr_62fr]">
        <Reveal
          as="figure"
          className={`relative m-0 aspect-[4/3] overflow-hidden lg:aspect-auto ${
            flip ? "lg:order-2" : ""
          }`}
        >
          <Image
            src={heroImage}
            alt={heroAlt}
            fill
            priority={priorityImage}
            sizes="(max-width: 1024px) 100vw, 38vw"
            className="object-cover"
          />
        </Reveal>

        <div
          className={`flex flex-col justify-center px-margin-mobile py-12 md:px-margin-desktop lg:py-16 ${
            flip ? "lg:order-1" : ""
          }`}
        >
          <header className="mb-8 lg:mb-10">
            <p className="mb-2 font-body text-label-sm uppercase tracking-[0.3em] text-wine-accent">
              {kicker}
            </p>
            <h2
              id={titleId}
              className="font-display text-headline-h1-mobile text-primary md:text-headline-h1"
            >
              {name}
            </h2>
            <p className="mt-3 max-w-xl font-body text-body-md text-on-surface-variant">
              {description}
            </p>
          </header>

          <ul className={`m-0 grid list-none gap-gutter p-0 ${wineGridColumns}`}>
            {wines.map((wine, idx) => (
              <Reveal
                as="li"
                key={wine.slug}
                delay={idx * 80}
                className="list-none min-w-0"
              >
                <WineCard
                  href={wine.href}
                  image={wine.image}
                  name={wine.name}
                  eyebrow={wine.eyebrow}
                  description={wine.description}
                  badge={wine.badge}
                />
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
