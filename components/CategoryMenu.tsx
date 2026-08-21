"use client";

import { useEffect, type RefObject } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type CategoryMenuItem = { href: string; label: string };

/**
 * El menú que despliegan las tarjetas-puerta de una categoría. Lo abren las
 * tres tarjetas de D3 (índice de Actividades) y las mismas tres del mosaico A4
 * (Inicio), que antes no abrían nada: mandaban al índice, o sea a la página
 * donde están las tarjetas que sí despliegan. Vive acá para que las dos
 * superficies abran **el mismo** menú y no dos parecidos.
 *
 * Los enlaces se renderizan SIEMPRE y se ocultan con el atributo `hidden`. Es
 * lo que hace que estas tarjetas cuenten como enlazado interno y no sólo como
 * interfaz — ver `tests/navegacion-enlaces-source.test.mjs` y el caso real del
 * desplegable del navbar, que durante meses no enlazó nada.
 */
export function CategoryMenuPanel({
  id,
  items,
  abierto,
  alElegir,
}: {
  id: string;
  items: CategoryMenuItem[];
  abierto: boolean;
  alElegir: () => void;
}) {
  return (
    // Sin clase de display en este elemento: pisaría el display:none que aplica
    // `hidden`.
    <div
      id={id}
      hidden={!abierto}
      className="absolute inset-x-0 bottom-0 z-30 max-h-72 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface p-2 ambient-shadow-lg"
    >
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={alElegir}
              className="group/item flex min-h-11 items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 font-body text-body-md text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
            >
              {item.label}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Cierra el menú con Escape y con un clic fuera. Es un menú, no un diálogo: no
 * atrapa el foco.
 *
 * `cerrar` conviene que venga memorizado (`useCallback`): si cambia de
 * identidad en cada render, los listeners se dan de baja y de alta también en
 * cada render.
 */
export function useCerrarAlSalir(
  abierto: boolean,
  contenedor: RefObject<HTMLElement | null>,
  cerrar: () => void,
) {
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    const alClickear = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) cerrar();
    };
    window.addEventListener("keydown", alTeclear);
    window.addEventListener("mousedown", alClickear);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      window.removeEventListener("mousedown", alClickear);
    };
  }, [abierto, contenedor, cerrar]);
}
