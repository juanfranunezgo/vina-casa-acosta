import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  href: string;
  image: string;
  name: string;
  description: string;
  /** "Detalle" — el texto del enlace, ya traducido por quien la usa. */
  cta: string;
};

/**
 * Tarjeta horizontal de actividad: foto a la izquierda, nombre, bajada y
 * enlace. La dibujan el bloque "otras actividades de la misma categoría" de la
 * ficha (Dd8) y "otras formas de vivir el ciclo" del hub de Vendimia (Dv5).
 *
 * Recibe los textos ya traducidos y no el slug: así sirve para una actividad del
 * catálogo y para cualquier otra cosa que se quiera enlazar igual, sin que el
 * componente tenga que saber de dónde sale el nombre.
 */
export default function ActivityRowCard({ href, image, name, description, cta }: Props) {
  return (
    <Link
      href={href}
      className="group flex gap-5 overflow-hidden rounded-xl border border-outline-variant/25 bg-surface ambient-shadow transition-all duration-300 hover:-translate-y-1 hover:ambient-shadow-lg"
    >
      <div className="relative w-32 shrink-0 overflow-hidden sm:w-44">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="176px"
        />
      </div>
      <div className="flex flex-col justify-center py-5 pr-5">
        <h3 className="mb-1 font-display text-xl text-primary">{name}</h3>
        <p className="mb-2 line-clamp-2 font-body text-body-md text-on-surface-variant">
          {description}
        </p>
        <span className="inline-flex items-center gap-1 font-body text-label-sm font-semibold uppercase tracking-wider text-primary">
          {cta}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
