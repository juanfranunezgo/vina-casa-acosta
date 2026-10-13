import Image from "next/image";

/**
 * Una medalla o un puntaje de un vino (`data/medallas.ts`).
 *
 * La usan la tarjeta de la tienda, la de `/vinos` y la ficha del vino. El
 * tamaño y la posición los pone cada uno, igual que con `SelloProducto`: acá
 * sólo está la imagen y su sombra.
 *
 * Sin medalla no dibuja nada: la mayoría de los llamados es "la de este vino,
 * si tiene", y así no hace falta un condicional en cada tarjeta.
 */
export default function MedallaVino({
  medalla,
  sizes,
  className = "",
}: {
  /** Ausente cuando el vino no tiene ninguna. */
  medalla?: { src: string; alt: string };
  /** El ancho al que se dibuja, ej. `28px`: el master mide 256. */
  sizes: string;
  /** Tamaño y posición, ej. `absolute bottom-4 right-4 h-7 w-7`. */
  className?: string;
}) {
  if (!medalla) return null;
  return (
    <Image
      src={medalla.src}
      alt={medalla.alt}
      width={256}
      height={256}
      sizes={sizes}
      className={`drop-shadow-[0_2px_5px_rgba(27,28,28,0.28)] ${className}`}
    />
  );
}
