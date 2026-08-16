type Props = {
  /** Pasos en el orden del catálogo. El orden ES la información. */
  steps: string[];
  title: string;
};

/**
 * Dd4, variante de talleres y experiencias.
 *
 * Los tours entregan una lista de tickets canjeables, sin orden. Un taller
 * entrega una jornada: desayuno campesino → introducción al oficio → tejido
 * guiado → cierre. Esa secuencia es lo que quien lee quiere saber, y mostrarla
 * como bullets sueltos la perdería.
 *
 * `<ol>` y no `<ul>` por lo mismo. La numeración la pinta el componente a
 * partir del índice: escribirla dentro del texto la volvería intraducible y
 * dejaría los números desalineados apenas se agregue un paso al medio.
 */
export default function ActivityProgram({ steps, title }: Props) {
  return (
    <>
      <h3 className="mb-6 font-body text-label-sm font-semibold uppercase tracking-widest text-wine-accent">
        {title}
      </h3>
      <ol className="mb-10">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step} className="relative flex gap-5 pb-7 last:pb-0">
              {/* Hilo vertical que une los pasos. En el último sobra: no lleva
                  a ninguna parte. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-[15px] top-9 w-px bg-wine-accent/25"
                />
              )}
              <span
                aria-hidden="true"
                className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wine-accent/10 font-body text-label-sm font-bold tabular-nums text-wine-accent ring-1 ring-wine-accent/25"
              >
                {index + 1}
              </span>
              <p className="pt-1 font-body text-body-md leading-relaxed text-on-surface">
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}
