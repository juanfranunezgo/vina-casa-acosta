import Emphasis from "@/components/Emphasis";

export type MenuGroup = {
  label: string;
  items: string[];
  /**
   * Presente cuando los ítems del grupo son alternativas y no suman: se elige
   * uno. Es la palabra que las separa en el idioma de la página ("o", "or",
   * "ou"), y por eso viaja con el copy y no con el componente.
   */
  or?: string;
};

export type MenuCopy = {
  title: string;
  lead: string;
  groups: MenuGroup[];
  note: string;
};

/**
 * La carta de una etapa del programa (Dd4) — en el yoga, la del brunch.
 *
 * Se dibuja como la carta impresa que es: centrada, con doble marco y los
 * platos en Caslon. Es la única caja de la sección y va a propósito: el resto
 * del programa se separa con filetes, y la carta es un objeto que el grupo
 * tiene en la mesa, no un párrafo más.
 *
 * Los dos sándwiches no son dos ítems de una lista: son una elección. Por eso
 * van separados por la "o" y no con viñetas, y por eso el formulario de
 * reserva pregunta cuántos de cada uno.
 */
export default function ActivityMenu({ title, lead, groups, note }: MenuCopy) {
  return (
    <div className="mt-7 max-w-[34rem] rounded-lg bg-surface-container-lowest p-1.5 ring-1 ring-outline-variant/70">
      <div className="rounded-[5px] border border-outline-variant/60 px-5 py-8 text-center sm:px-10 sm:py-10">
        <p className="font-display text-[1.45rem] leading-none text-primary">
          {title}
        </p>
        <p className="mx-auto mt-4 max-w-[40ch] text-balance font-body text-[15px] leading-relaxed text-on-surface-variant">
          <Emphasis text={lead} />
        </p>

        {groups.map((group) => (
          <div key={group.label} className="mt-8">
            <h5 className="font-body text-[12px] font-semibold uppercase tracking-[0.2em] text-wine-accent">
              {group.label}
            </h5>
            <ul className="mt-3.5 space-y-2 text-balance font-body text-[15.5px] font-medium leading-snug text-on-surface">
              {group.items.map((item, index) => (
                <li key={item}>
                  {/* La "o" va entre las alternativas y no después de la
                      última. Es parte de la lectura —"esto o esto"—, así que
                      queda visible para el lector de pantalla. */}
                  {group.or && index > 0 && (
                    <span className="mb-2 flex items-center justify-center gap-3 font-body text-[12px] font-semibold uppercase tracking-[0.2em] text-wine-accent before:h-px before:w-8 before:bg-outline-variant after:h-px after:w-8 after:bg-outline-variant">
                      {group.or}
                    </span>
                  )}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="mx-auto mt-9 max-w-[44ch] text-balance border-t border-outline-variant/60 pt-5 font-body text-[13px] leading-relaxed text-on-surface-variant">
          {note}
        </p>
      </div>
    </div>
  );
}
