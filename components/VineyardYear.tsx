type Stage = { season: string; name: string; description: string };

/** Tramo que ocupa una etapa dentro de la banda, en columnas de 1 a 12. */
type Span = { start: number; span: number };

type Props = {
  /** Las etapas del ciclo, en el orden del año. */
  stages: Stage[];
  /** Tramo de cada etapa, alineado por índice con `stages`. */
  spans: Span[];
  /** Meses (1-12) en que la jornada se ofrece al visitante. */
  harvestMonths: number[];
  /** Índice de la etapa que esta página vende. */
  highlight: number;
  locale: string;
  labels: {
    /** Lleva `{months}` — la enumeración la arma este componente. */
    availableIn: string;
    aria: string;
  };
};

/**
 * Dv3 — El año de la viña.
 *
 * Una sola pieza donde antes había dos secciones: la grilla de cinco etapas del
 * ciclo y la franja de doce meses. Separadas decían lo mismo dos veces y ninguna
 * de las dos decía lo que importa — que el trabajo dura todo el año y que el
 * visitante llega al final.
 *
 * **La banda arranca en junio, no en enero.** El copy dice que la vendimia es
 * "el final de una historia que empieza en invierno", y en el hemisferio sur el
 * invierno es junio. Un año calendario partiría la historia al medio y dejaría
 * la cosecha en la mitad de la línea en vez de en su remate.
 *
 * No usa `SeasonStrip`: ese componente es de las fichas (Dd3), donde la franja
 * responde "¿lo puedo hacer en julio?" y nada más. Acá el dato de temporada es
 * el desenlace del ciclo, no una casilla suelta. Tocar `SeasonStrip` para servir
 * a los dos casos habría empeorado el suyo.
 *
 * Accesibilidad: la banda de meses va `aria-hidden` y el dato viaja en la frase
 * de abajo — doce abreviaturas leídas en voz alta no dicen nada. Es el mismo
 * criterio que ya aplica `SeasonStrip`.
 */

/**
 * El año agrícola, de invierno a cosecha. El índice de cada mes en este arreglo
 * ES su columna en la banda.
 */
const BAND = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5];

export default function VineyardYear({
  stages,
  spans,
  harvestMonths,
  highlight,
  locale,
  labels,
}: Props) {
  // Los nombres de mes salen de `Intl` y no de `messages`: son doce strings por
  // idioma que el navegador ya sabe (mismo criterio que `SeasonStrip`). El año
  // de referencia da igual, solo se usa para pedir el nombre.
  const short = new Intl.DateTimeFormat(locale, { month: "short" });
  const long = new Intl.DateTimeFormat(locale, { month: "long" });
  const nameOf = (month: number, fmt: Intl.DateTimeFormat) =>
    fmt.format(new Date(2026, month - 1, 1));
  // Intl devuelve "mar." en español: el punto sobra en una banda de doce.
  const abbr = (month: number) => nameOf(month, short).replace(".", "");

  const harvest = new Set(harvestMonths);

  const summary = labels.availableIn.replace(
    "{months}",
    new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
      harvestMonths.map((month) => nameOf(month, long)),
    ),
  );

  /**
   * "Junio — Agosto" para el listado vertical de móvil, donde no hay banda de
   * doce columnas que ubique la etapa. Se arma del tramo y no de `messages`
   * para que no haya dos fuentes de verdad sobre cuándo pasa cada cosa.
   */
  const rangeOf = ({ start, span }: Span) => {
    const first = BAND[start - 1];
    const last = BAND[start + span - 2];
    const capitalize = (text: string) =>
      text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
    return first === last
      ? capitalize(nameOf(first, long))
      : `${capitalize(nameOf(first, long))} — ${capitalize(nameOf(last, long))}`;
  };

  // Si alguien agrega una etapa al mensaje y olvida su tramo, la banda reparte
  // el año en partes iguales en vez de romper el build o mentir el calendario.
  const safeSpans: Span[] =
    spans.length === stages.length
      ? spans
      : stages.map((_, index) => ({
          start: Math.round((index * 12) / stages.length) + 1,
          span: Math.max(
            1,
            Math.round(((index + 1) * 12) / stages.length) -
              Math.round((index * 12) / stages.length),
          ),
        }));

  return (
    <div aria-label={labels.aria} role="group">
      {/* ── Escritorio: el año como una sola línea de doce meses ───────────── */}
      <div className="hidden md:block">
        <ul
          aria-hidden="true"
          className="grid grid-cols-12 font-body text-[12px] uppercase tracking-[0.14em]"
        >
          {BAND.map((month) => (
            <li
              key={month}
              className={
                harvest.has(month)
                  ? "pb-2.5 font-semibold text-wine-accent"
                  : "pb-2.5 font-normal text-on-surface-variant/60"
              }
            >
              {abbr(month)}
            </li>
          ))}
        </ul>

        {/* La línea del año. Los meses de cosecha la engrosan y la tiñen: es el
            único relleno de color de la pieza, y marca dónde entra el visitante. */}
        <div aria-hidden="true" className="grid h-[3px] grid-cols-12 items-center">
          {BAND.map((month) => (
            <span
              key={month}
              className={
                harvest.has(month) ? "h-[3px] bg-wine-accent" : "h-px bg-outline-variant"
              }
            />
          ))}
        </div>

        <ol className="grid grid-cols-12 pt-7">
          {stages.map((stage, index) => {
            const { start, span } = safeSpans[index];
            const esVendimia = index === highlight;
            return (
              <li
                key={stage.name}
                style={{ gridColumn: `${start} / span ${span}` }}
                // El filete a la izquierda es lo que separa las etapas. No hay
                // caja, ni fondo, ni sombra: la etapa destacada se distingue por
                // el color del filete y de la tinta, no por un relleno.
                className={`border-l pr-6 pl-5 ${
                  esVendimia ? "border-wine-accent" : "border-outline-variant"
                }`}
              >
                <span
                  className={`block font-accent text-[15px] font-light italic ${
                    esVendimia ? "text-wine-accent" : "text-on-surface-variant/70"
                  }`}
                >
                  {stage.season}
                </span>
                <h3
                  className={`mt-1 mb-2.5 font-display text-[19px] leading-tight ${
                    esVendimia ? "text-wine-accent" : "text-primary"
                  }`}
                >
                  {stage.name}
                </h3>
                <p className="font-body text-[14px] leading-[1.6] text-on-surface-variant">
                  {stage.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Móvil: el mismo año, girado. Doce abreviaturas no entran en 375px
             sin volverse ilegibles, así que la línea baja y cada etapa dice su
             tramo con todas las letras. ──────────────────────────────────── */}
      <ol className="md:hidden">
        {stages.map((stage, index) => {
          const esVendimia = index === highlight;
          return (
            <li
              key={stage.name}
              className={`border-l pb-8 pl-5 last:pb-0 ${
                esVendimia ? "border-wine-accent" : "border-outline-variant"
              }`}
            >
              <span
                className={`block font-body text-[12px] uppercase tracking-[0.14em] ${
                  esVendimia
                    ? "font-semibold text-wine-accent"
                    : "font-medium text-on-surface-variant/70"
                }`}
              >
                {rangeOf(safeSpans[index])}
              </span>
              <span
                className={`mt-2 block font-accent text-base font-light italic ${
                  esVendimia ? "text-wine-accent" : "text-on-surface-variant/70"
                }`}
              >
                {stage.season}
              </span>
              <h3
                className={`mt-0.5 mb-2 font-display text-xl leading-tight ${
                  esVendimia ? "text-wine-accent" : "text-primary"
                }`}
              >
                {stage.name}
              </h3>
              {/* 16px en móvil: por debajo de eso iOS hace zoom solo y el
                  cuerpo deja de ser cómodo de leer. La versión de escritorio
                  puede bajar a 14 porque va en columna angosta y a distancia de
                  monitor. */}
              <p className="font-body text-base leading-[1.6] text-on-surface-variant">
                {stage.description}
              </p>
            </li>
          );
        })}
      </ol>

      {/* El dato de temporada, en una frase. Es lo que lee un lector de pantalla
          y lo que un buscador puede citar. */}
      <p className="mt-10 border-t border-outline-variant pt-5 font-body text-body-md text-on-surface-variant md:mt-12">
        {summary}
      </p>
    </div>
  );
}
