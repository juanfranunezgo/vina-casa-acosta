import Image from "next/image";
import ShowMore from "@/components/ShowMore";

type Photo = { src: string; alt: string };

type Props = {
  title: string;
  /** Apertura 16:9. */
  wide: Photo;
  /**
   * Verticales 2:3, en una sola fila: hasta cuatro (de a dos en celular si son
   * cuatro). Puede ir vacía. Con una sola, va al lado de la apertura.
   */
  portraits: Photo[];
  /**
   * Las que no caben en el mosaico, detrás de "Ver más fotos": 3:2, o 2:3 si
   * `vertical`. Con los rótulos del botón y del bloque, ya traducidos.
   */
  more?: {
    id: string;
    label: string;
    regionLabel: string;
    photos: (Photo & { vertical?: boolean })[];
  };
};

/**
 * Galería de una ficha con fotos propias (Dd6).
 *
 * Mismo mosaico del hub de Vendimia (Dv6) —una apertura ancha y una fila de
 * apoyo— con dos diferencias deliberadas:
 *
 * - Las de apoyo son 2:3 y no 4:5: son verticales de cámara, y esa es su
 *   proporción nativa. Forzarlas al 4:5 obliga a recortar un 17% del alto, que
 *   en un retrato es la cabeza o las manos. Igual que el tríptico de Dv2.
 * - Van en fila de tres también en móvil. A un tercio del ancho una vertical
 *   sigue leyéndose, y apilarlas mandaba el formulario de reserva bien abajo
 *   del pliegue.
 *
 * El `alt` llega ya traducido: el componente no toca messages. La ficha lo
 * resuelve porque es quien sabe de qué actividad son las fotos.
 */
export default function ActivityGallery({ title, wide, portraits, more }: Props) {
  const aperture = (className: string, sizes: string) => (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <Image src={wide.src} alt={wide.alt} fill className="object-cover" sizes={sizes} />
    </div>
  );

  return (
    <>
      <span className="mb-5 block h-px w-12 bg-wine-accent/60" />
      <h2 className="mb-8 font-display text-headline-h2 text-primary">{title}</h2>

      {/* Con una sola vertical (Berá), apertura y vertical van lado a lado:
          debajo, sola a la izquierda, dejaba dos tercios de la fila vacíos. La
          apertura toma el alto de la vertical y se recorta a ~4:3 desde el
          centro. */}
      {portraits.length === 1 ? (
        <div className="grid grid-cols-[2fr_1fr] gap-3 md:gap-gutter">
          {aperture("h-full", "(max-width: 1280px) 66vw, 850px")}
          <Portrait photo={portraits[0]} sizes="(max-width: 1280px) 33vw, 420px" />
        </div>
      ) : (
        <>
          {aperture("aspect-[16/9]", "(max-width: 1280px) 100vw, 1280px")}
          {portraits.length > 0 && (
            <div
              className={`mt-gutter grid gap-3 md:gap-gutter ${
                portraits.length === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"
              }`}
            >
              {portraits.map((photo) => (
                <Portrait
                  key={photo.src}
                  photo={photo}
                  sizes={
                    portraits.length === 4
                      ? "(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 320px"
                      : "(max-width: 1280px) 33vw, 420px"
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {more && more.photos.length > 0 && (
        <ShowMore id={more.id} label={more.label} regionLabel={more.regionLabel}>
          <MoreGrid photos={more.photos} />
        </ShowMore>
      )}
    </>
  );
}

function Portrait({ photo, sizes }: { photo: Photo; sizes: string }) {
  return (
    <div className="group relative aspect-[2/3] overflow-hidden rounded-xl">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        sizes={sizes}
      />
    </div>
  );
}

type ExtraPhoto = Photo & { vertical?: boolean };

/**
 * "Ver más fotos". Dos casos, porque cada ficha trae entre tres y trece fotos y
 * una sola regla dejaba huecos (medido en las capturas del 2026-09-29):
 *
 * - **Todas de una misma orientación**: grilla de tres (dos en celular) que
 *   completa la última fila. Si sobra una, las cuatro últimas van de a dos, más
 *   grandes; si sobran dos, las dos últimas.
 * - **Mezcladas**: dos columnas, cada foto a la más corta y las verticales
 *   primero. Con columnas de CSS, las cinco del mimbre quedaban 3 · 1 · 1 y un
 *   hueco de 600 px abajo a la derecha. Aun repartidas por alto, los espacios
 *   entre fotos hacen que una columna termine ~80 px antes: las horizontales
 *   crecen (`grow`) hasta emparejarla, recortando un poco sus costados.
 */
function MoreGrid({ photos }: { photos: ExtraPhoto[] }) {
  const verticales = photos.filter((photo) => photo.vertical).length;

  if (verticales > 0 && verticales < photos.length) {
    const columnas: ExtraPhoto[][] = [[], []];
    const altos = [0, 0];
    const ordenadas = [...photos.filter((p) => p.vertical), ...photos.filter((p) => !p.vertical)];
    for (const photo of ordenadas) {
      const i = altos[0] <= altos[1] ? 0 : 1;
      columnas[i].push(photo);
      altos[i] += photo.vertical ? 3 / 2 : 2 / 3;
    }
    return (
      <div className="mt-gutter grid grid-cols-2 gap-3 md:gap-gutter">
        {columnas.map((columna, i) => (
          <div key={i} className="flex flex-col gap-3 md:gap-gutter">
            {columna.map((photo) => (
              <Extra
                key={photo.src}
                photo={photo}
                className={photo.vertical ? "" : "grow"}
                sizes="(max-width: 1280px) 50vw, 640px"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Cuántas de las últimas van de a dos por fila para que la grilla de tres
  // no termine en una fila coja.
  const n = photos.length;
  const deADos = n % 3 === 1 && n > 1 ? 4 : n % 3 === 2 ? 2 : 0;
  return (
    <div className="mt-gutter grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-gutter">
      {photos.map((photo, i) => {
        const ancha = i >= n - deADos;
        // En celular, dos por fila; si son impares, la última a lo ancho.
        const celular = n % 2 === 1 && i === n - 1 ? "col-span-2" : "col-span-1";
        return (
          <Extra
            key={photo.src}
            photo={photo}
            className={`${celular} ${ancha ? "md:col-span-3" : "md:col-span-2"}`}
            sizes={ancha ? "(max-width: 768px) 50vw, 640px" : "(max-width: 768px) 50vw, 420px"}
          />
        );
      })}
    </div>
  );
}

function Extra({ photo, sizes, className = "" }: { photo: ExtraPhoto; sizes: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${photo.vertical ? "aspect-[2/3]" : "aspect-[3/2]"} ${className}`}
    >
      <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes={sizes} />
    </div>
  );
}
