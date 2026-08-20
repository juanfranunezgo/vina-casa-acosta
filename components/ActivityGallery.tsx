import Image from "next/image";

type Photo = { src: string; alt: string };

type Props = {
  title: string;
  /** Apertura 16:9. */
  wide: Photo;
  /** Hasta tres verticales 2:3, en una sola fila. */
  portraits: Photo[];
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
export default function ActivityGallery({ title, wide, portraits }: Props) {
  return (
    <>
      <span className="mb-5 block h-px w-12 bg-wine-accent/60" />
      <h2 className="mb-8 font-display text-headline-h2 text-primary">{title}</h2>

      <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
        <Image
          src={wide.src}
          alt={wide.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 1280px"
        />
      </div>

      {portraits.length > 0 && (
        <div className="mt-gutter grid grid-cols-3 gap-3 md:gap-gutter">
          {portraits.map(({ src, alt }) => (
            <div
              key={src}
              className="group relative aspect-[2/3] overflow-hidden rounded-xl"
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                sizes="(max-width: 1280px) 33vw, 420px"
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
