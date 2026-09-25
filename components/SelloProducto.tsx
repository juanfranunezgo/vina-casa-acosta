import type { ReactNode } from "react";

/**
 * El sello de un vino sobre su foto: "Edición Limitada", "Insignia",
 * "Espumante". Lo usan la tarjeta de la tienda y el panel de la botella en la
 * ficha de vino, y la posición la pone cada uno.
 *
 * Pastilla blanca con el texto en vino, en letra normal. Hasta el 2026-09-25
 * era un rectángulo oscuro en mayúsculas espaciadas y negrita, y Juan
 * Francisco lo vio "demasiado recto y grande". El texto va tal como lo escribe
 * el panel (o su traducción), sin `uppercase`.
 */
export default function SelloProducto({
  children,
  className = "",
}: {
  children: ReactNode;
  /** Posición dentro del contenedor de la foto, ej. `top-4 left-4`. */
  className?: string;
}) {
  return (
    <span
      className={`absolute inline-flex items-center rounded-full bg-surface-container-lowest/95 px-3 py-1 font-body text-[12px] font-semibold text-primary shadow-[0_6px_16px_-8px_rgba(74,14,14,0.35)] ${className}`}
    >
      {children}
    </span>
  );
}
