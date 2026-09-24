import ActivityMenu, { type MenuCopy } from "@/components/ActivityMenu";
import type { ScheduleTone } from "@/data/activities";

export type ScheduleStageView = {
  minutes: number;
  tone: ScheduleTone;
  title: string;
  text: string;
  menu?: MenuCopy;
};

type Props = {
  stages: ScheduleStageView[];
  title: string;
  locale: string;
};

/**
 * El color de cada tono sale de la paleta del sitio y dice de qué está hecha
 * la etapa: el agua saborizada de la recepción (verde pálido), la hoja de la
 * parra (oliva), el pan y el café del brunch (ocre) y el vino. En el yoga eso
 * hace que la regla se lea como la mañana misma, del agua al vino.
 *
 * El verde pálido lleva un anillo interior porque sobre el papel del sitio,
 * solo, casi no se distingue del fondo.
 */
const TONE: Record<ScheduleTone, string> = {
  agua: "bg-secondary-container ring-1 ring-inset ring-secondary/25",
  parra: "bg-secondary",
  mesa: "bg-on-tertiary-container",
  vino: "bg-wine-accent",
};

/** Tiempo transcurrido desde la llegada, como en un cronómetro: 0:00, 1:15. */
function elapsed(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Dd4 con horario: el programa de una actividad que declara `schedule`.
 *
 * `ActivityProgram` numera los pasos y nada más, y alcanza cuando el catálogo
 * sólo dice el orden. Acá el cliente dio también cuánto dura cada etapa, y eso
 * cambia lo que el visitante quiere saber: que el yoga es una hora y no toda la
 * mañana, o que la cata no es un brindis al pasar. Por eso la sección abre con
 * una regla donde cada tramo mide lo que dura, con el tiempo transcurrido
 * debajo, y cada etapa repite su color y sus minutos.
 *
 * La regla es decorativa para un lector de pantalla (`aria-hidden`): todo lo
 * que dice está en la lista de abajo, que sigue siendo un `<ol>` porque el orden
 * es información. Las marcas de tiempo no se traducen: 1:15 se lee igual en los
 * tres idiomas.
 */
export default function ActivitySchedule({ stages, title, locale }: Props) {
  const total = stages.reduce((sum, stage) => sum + stage.minutes, 0);
  const minutes = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "minute",
    unitDisplay: "short",
  });

  // Dónde empieza cada etapa, y al final el total: son las marcas de la regla.
  const marks = stages.reduce<number[]>(
    (acc, stage) => [...acc, acc[acc.length - 1] + stage.minutes],
    [0],
  );

  return (
    <>
      <h3 className="mb-6 font-body text-label-sm font-semibold uppercase tracking-widest text-wine-accent">
        {title}
      </h3>

      <div aria-hidden="true" className="mb-4">
        <div className="flex h-2.5 gap-[3px]">
          {stages.map((stage, index) => (
            <span
              key={index}
              className={`min-w-0 first:rounded-l-full last:rounded-r-full ${TONE[stage.tone]}`}
              style={{ flexGrow: stage.minutes, flexBasis: 0 }}
            />
          ))}
        </div>
        <div className="relative mt-2.5 h-4 font-body text-[12px] tabular-nums text-on-surface-variant">
          {marks.map((mark, index) => {
            const isFirst = index === 0;
            const isLast = index === marks.length - 1;
            // Una marca pegada a la anterior (menos del 12% de la regla) se
            // esconde en celular: en 327px, "0:00" y "0:15" se pisan.
            const crowded = !isFirst && (mark - marks[index - 1]) / total < 0.12;
            return (
              <span
                key={mark}
                className={`absolute top-0 ${
                  isFirst ? "" : isLast ? "-translate-x-full" : "-translate-x-1/2"
                } ${crowded && !isLast ? "hidden sm:inline" : ""} ${
                  isLast ? "font-semibold text-on-surface" : ""
                }`}
                style={{ left: `${(mark / total) * 100}%` }}
              >
                {elapsed(mark)}
              </span>
            );
          })}
        </div>
      </div>

      {/* `last:mb-0`: cuando la actividad no trae cierre ni maridaje, el
          programa termina la columna y el margen sólo agrandaba el hueco
          antes de la galería. */}
      <ol className="mb-10 last:mb-0">
        {stages.map((stage, index) => (
          <li
            key={index}
            className="grid grid-cols-1 gap-y-3 border-t border-outline-variant/70 py-7 md:grid-cols-[8rem_1fr] md:gap-x-8"
          >
            <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-3 md:pt-1.5">
              <span
                aria-hidden="true"
                className={`h-2 w-8 shrink-0 rounded-full ${TONE[stage.tone]}`}
              />
              <p className="font-body text-[13px] font-semibold uppercase tracking-[0.14em] tabular-nums text-wine-accent">
                {minutes.format(stage.minutes)}
              </p>
            </div>
            <div>
              <h4 className="font-display text-[1.4rem] leading-snug text-primary md:text-[1.55rem]">
                {stage.title}
              </h4>
              <p className="mt-2.5 max-w-[60ch] font-body text-[17px] leading-[1.7] text-on-surface-variant">
                {stage.text}
              </p>
              {stage.menu && <ActivityMenu {...stage.menu} />}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
