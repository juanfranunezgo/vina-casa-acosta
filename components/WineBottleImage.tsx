import Image from "next/image";

type Props = {
  /** Foto del vino. Ausente cuando el producto se creó en el panel sin imagen. */
  src?: string;
  alt: string;
  sizes: string;
  /** Clases del `<Image>`. El marcador de posición usa las suyas. */
  className?: string;
  priority?: boolean;
};

/**
 * Foto de botella, con un marcador de posición para el producto que no tiene.
 *
 * Existe porque `<Image src="">` no falla de forma visible: Next 16 cae a
 * `unoptimized` y emite `<img src="">`, que el navegador resuelve volviendo a
 * pedir la URL de la página actual — un request de una página HTML entera por
 * cada tarjeta sin foto, servido como si fuera una imagen.
 *
 * El marcador NO es un archivo en `public/`: `next/image` rechaza los SVG salvo
 * que se active `dangerouslyAllowSVG` (que abre su propio agujero de XSS), y un
 * PNG committeado es un binario más que mantener. Un SVG inline evita las dos
 * cosas y además se tiñe con la paleta de la marca.
 */
export default function WineBottleImage({ src, alt, sizes, className, priority }: Props) {
  if (src) {
    return (
      <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className="absolute inset-0 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-1/2 w-auto text-primary/15"
        fill="currentColor"
      >
        <path d="M10 2h4v5.2c0 .6.2 1.1.6 1.6l1.2 1.5c.8 1 1.2 2.2 1.2 3.4V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6.3c0-1.2.4-2.4 1.2-3.4l1.2-1.5c.4-.5.6-1 .6-1.6V2z" />
      </svg>
    </div>
  );
}
