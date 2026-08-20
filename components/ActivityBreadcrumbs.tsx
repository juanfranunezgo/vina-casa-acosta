import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { href: string; label: string };

/** Dónde se dibuja la miga: encima de una foto o sobre papel. */
type Tone = "foto" | "papel";

type Props = {
  /** En orden: Inicio → Actividades → Categoría → Actividad. */
  items: Crumb[];
  aria: string;
  /**
   * Por defecto `foto`, que es de donde viene: el hub de Vendimia la sigue
   * montando sobre su hero.
   */
  tone?: Tone;
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
 * **Dos tonos, y no es decoración.** Sobre foto va en blanco con sombra de
 * texto; sobre papel, en tinta. Las fichas la bajaron del hero porque cuatro
 * niveles no entran en una línea de 375px y el nombre de la actividad caía
 * solo, en blanco y sobre una foto cualquiera. Pintarla clara sobre papel la
 * dejaría ilegible, así que el tono viaja con el lugar.
 */
export default function ActivityBreadcrumbs({ items, aria, tone = "foto" }: Props) {
  const sobreFoto = tone === "foto";

  const listaClass = sobreFoto
    ? "text-white/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
    : "text-on-surface-variant";
  const separadorClass = sobreFoto ? "text-white/40" : "text-outline";
  const actualClass = sobreFoto ? "text-white/90" : "text-primary";
  const enlaceClass = sobreFoto
    ? "hover:text-white focus-visible:ring-white/70"
    : "hover:text-primary focus-visible:ring-primary/50";

  return (
    <nav aria-label={aria}>
      <ol
        className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-label-sm ${listaClass}`}
      >
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
                  className={`h-3.5 w-3.5 shrink-0 ${separadorClass}`}
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span aria-current="page" className={actualClass}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={`rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 ${enlaceClass}`}
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
