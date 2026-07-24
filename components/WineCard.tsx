import Image from "next/image";
import Link from "next/link";

export type WineCardProps = {
  /** Ruta interna a la ficha del producto (para comprar). */
  href: string;
  /** Imagen de la botella (PNG con fondo transparente en /public). */
  image: string;
  /** Nombre comercial del vino, ej. "Ombú Carmenere". */
  name: string;
  /** Antetítulo tipo·cepa ya traducido, ej. "Tinto · Carmenere". */
  eyebrow: string;
  /** Etiqueta destacada opcional ya traducida, ej. "Insignia". */
  badge?: string;
};

/**
 * Tarjeta de producto de vino. Toda la tarjeta es un enlace a la ficha del
 * producto. Presentacional y sin estado: recibe strings ya traducidos.
 */
export default function WineCard({
  href,
  image,
  name,
  eyebrow,
  badge,
}: WineCardProps) {
  return (
    <article>
      <Link
        href={href}
        className="group flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest ambient-shadow transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(74,14,14,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-gradient-to-br from-surface-container-low to-surface-container p-6">
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-contain p-6 drop-shadow-[0_12px_18px_rgba(74,14,14,0.18)] transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          {badge && (
            <span className="absolute left-4 top-4 rounded bg-primary px-3 py-1 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary">
              {badge}
            </span>
          )}
        </div>
        <div className="p-5">
          <p className="mb-2 font-body text-label-sm uppercase tracking-widest text-on-surface-variant">
            {eyebrow}
          </p>
          <h3 className="font-display text-2xl text-primary">{name}</h3>
        </div>
      </Link>
    </article>
  );
}
