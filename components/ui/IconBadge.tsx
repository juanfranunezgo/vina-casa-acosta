import type { ReactNode } from "react";

type Size = "sm" | "step" | "md";

type Props = {
  /** Un ícono de lucide sin clases de tamaño, o un número corto. */
  children: ReactNode;
  size?: Size;
  className?: string;
};

/**
 * El círculo vino con el ícono en blanco. Es el único fondo de ícono del sitio:
 * reemplazó al círculo vino al 10% con el ícono en vino, que sobre el papel se
 * leía como una mancha plana — pedido de Juan Francisco del 2026-09-24, sobre
 * la referencia de las casillas de Quorum Legal, pero redondo.
 *
 * El volumen sale de tres capas y ninguna es un color nuevo: el degradado va
 * del `wine-accent` arriba al `primary-container` abajo, un filete de luz en el
 * borde superior y una sombra corta del mismo vino. El tamaño del ícono lo pone
 * el círculo, para que dos llamadas no dibujen íconos distintos.
 *
 * Siempre `aria-hidden`: lo que el ícono dice lo dice el texto de al lado.
 * `tests/icon-badge-source.test.mjs` impide volver al círculo teñido.
 */
const SIZE: Record<Size, string> = {
  sm: "h-7 w-7 text-[11px] [&>svg]:h-3.5 [&>svg]:w-3.5",
  // Los números del programa (ActivityProgram): 32px, porque el hilo que une
  // los pasos se centra a 16px del borde.
  step: "h-8 w-8 text-label-sm",
  md: "h-10 w-10 text-label-sm md:h-11 md:w-11 [&>svg]:h-[18px] [&>svg]:w-[18px] md:[&>svg]:h-5 md:[&>svg]:w-5",
};

export default function IconBadge({ children, size = "md", className = "" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-wine-accent to-primary-container font-body font-bold tabular-nums text-on-primary shadow-[0_6px_14px_-6px_rgba(74,14,14,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] [&>svg]:shrink-0 [&>svg]:stroke-[1.75] ${SIZE[size]} ${className}`}
    >
      {children}
    </span>
  );
}
