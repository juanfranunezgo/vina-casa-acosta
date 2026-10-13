/**
 * Las clases del botón del sitio, sin nada de Next ni de React.
 *
 * Viven aparte de `Button.tsx` para poder ejecutarlas en los tests: ese
 * archivo importa `next/link`, que no carga en Node pelado
 * (`tests/boton.test.mjs`).
 */

export type Variant = "primary" | "outline" | "ghost" | "glass" | "link";
export type Size = "sm" | "md" | "lg";

const baseClass =
  "group/btn relative inline-flex items-center justify-center gap-2 font-body font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none select-none";


const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-label-sm uppercase tracking-wider rounded",
  md: "h-11 px-6 text-body-md rounded-md",
  lg: "h-14 px-8 text-body-md rounded-md",
};


/**
 * Los mismos tamaños con alto MÍNIMO en vez de fijo, para `multiline`: con el
 * texto en dos renglones, un alto fijo lo deja fuera del botón. El relleno
 * vertical es el que hace que un solo renglón mida lo mismo que antes.
 */
const multilineSizeClass: Record<Size, string> = {
  sm: "min-h-9 px-4 py-2 text-label-sm uppercase tracking-wider rounded",
  md: "min-h-11 px-6 py-2.5 text-body-md rounded-md",
  lg: "min-h-14 px-8 py-3.5 text-body-md rounded-md",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_12px_-4px_rgba(42,0,2,0.4)]",
  outline:
    "border border-primary text-primary bg-transparent hover:bg-primary hover:text-on-primary",
  ghost:
    "text-primary bg-transparent hover:bg-primary/5",
  glass:
    "bg-white/12 text-on-primary border border-white/30 backdrop-blur-md hover:bg-white/22 hover:border-white/50 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]",
  link:
    "h-auto px-0 text-primary font-semibold border-b border-primary pb-0.5 rounded-none hover:gap-3",
};


/**
 * `multiline` — el texto puede partirse en renglones y el botón no pasa del
 * ancho de su contenedor.
 *
 * Existe por un desborde real (2026-10-12): en la vendimia, "Inscríbete, ven a
 * vivir la vendimia en Casa Acosta" medía 478 px en una pantalla de 375, y con
 * `whitespace-nowrap` no se partía: empujaba el ancho de la página y dejaba
 * scroll horizontal. No es el comportamiento por defecto porque un botón que se
 * parte cambia de alto, y hay filas del sitio armadas contando con que no.
 * Usarlo en todo botón cuyo texto no quepa en 327 px (un celular de 375).
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  multiline = false,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  multiline?: boolean;
  className?: string;
}): string {
  const isLink = variant === "link";
  return [
    baseClass,
    multiline ? "max-w-full whitespace-normal text-left" : "whitespace-nowrap",
    isLink ? "" : (multiline ? multilineSizeClass : sizeClass)[size],
    variantClass[variant],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
