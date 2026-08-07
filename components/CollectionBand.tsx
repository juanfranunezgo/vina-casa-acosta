import Reveal from "@/components/Reveal";
import CollectionPhotos from "@/components/CollectionPhotos";
import WineCard, { type WineCardProps } from "@/components/WineCard";

export type CollectionWine = WineCardProps & { slug: string };

type CollectionBandProps = {
  id: string;
  kicker: string;
  name: string;
  description: string;
  /** Fotos del carrusel de la colección, en orden. */
  photos: string[];
  photosAlt: string;
  photoPrevLabel: string;
  photoNextLabel: string;
  photoGoToLabels: string[];
  wines: CollectionWine[];
  altBackground?: boolean;
  flip?: boolean;
  priorityImage?: boolean;
};

/**
 * Banda editorial de una línea: carrusel de fotos de ambiente + toda la colección.
 *
 * Muestra siempre todos los vinos (sin "ver más"): el carrusel conserva su
 * proporción fija 4:5, así que en líneas de 3+ vinos queda aire bajo la foto.
 */
export default function CollectionBand({
  id,
  kicker,
  name,
  description,
  photos,
  photosAlt,
  photoPrevLabel,
  photoNextLabel,
  photoGoToLabels,
  wines,
  altBackground = false,
  flip = false,
  priorityImage = false,
}: CollectionBandProps) {
  const titleId = `coleccion-${id}`;
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
          <Reveal className={flip ? "lg:order-2" : ""}>
            <CollectionPhotos
              photos={photos}
              alt={photosAlt}
              prevLabel={photoPrevLabel}
              nextLabel={photoNextLabel}
              goToLabels={photoGoToLabels}
              priority={priorityImage}
            />
          </Reveal>

          <div className={`min-w-0 ${flip ? "lg:order-1" : ""}`}>
            <ul id={`${titleId}-wines`} className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
              {wines.map((wine, idx) => (
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
                    agotado={wine.agotado}
                    soldOutLabel={wine.soldOutLabel}
                  />
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
