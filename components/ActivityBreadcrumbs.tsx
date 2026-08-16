import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { href: string; label: string };

type Props = {
  /** En orden: Inicio → Actividades → Categoría → Actividad. */
  items: Crumb[];
  aria: string;
};

/**
 * Miga visible. Existe por dos motivos a la vez: orienta a quien llega desde
 * Google a una ficha suelta —sin pasar por el índice—, y es lo que hace honesto
 * el `BreadcrumbList` del JSON-LD. Marcar una jerarquía que la página no muestra
 * es marcado inventado.
 *
 * Reemplaza al enlace "Volver a actividades": el segundo nivel de la miga hace
 * exactamente eso y además dice dónde estás.
 *
 * Va sobre foto, así que el color es claro con sombra de texto.
 */
export default function ActivityBreadcrumbs({ items, aria }: Props) {
  return (
    <nav aria-label={aria}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-label-sm text-white/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            // La clave es la posición y no el href: dos migas pueden compartir
            // destino. Mientras una categoría no tenga sección propia en el
            // índice, "Actividades" y su categoría apuntan las dos a
            // `/actividades` (ver CATEGORIES_WITH_INDEX_ANCHOR), y React avisa
            // por clave duplicada. La lista es fija y ordenada: el índice la
            // identifica bien.
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-white/40"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span aria-current="page" className="text-white/90">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
