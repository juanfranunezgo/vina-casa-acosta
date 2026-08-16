import { CalendarDays } from "lucide-react";

type Props = {
  /** Meses en que se realiza, 1-12. */
  months: number[];
  locale: string;
  labels: {
    title: string;
    allYear: string;
    /** Lleva `{months}` — la enumeración la arma este componente. */
    availableIn: string;
    aria: string;
  };
};

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Dd3 — Estacionalidad.
 *
 * El dato ya venía en el catálogo del cliente y no se usaba en ninguna parte.
 * Responde la duda concreta de quien lee ("¿lo puedo hacer en julio?"), da
 * contenido propio a cada ficha y es lo que alimenta `validFrom`/`validThrough`
 * cuando el structured data lo necesite.
 *
 * Los nombres de mes salen de `Intl` y no de `messages`: son doce strings por
 * idioma que el navegador ya sabe. El año de referencia da igual, solo se usa
 * para pedirle a Intl el nombre.
 *
 * Cuando son los doce meses la franja se colapsa a una frase: pintar doce
 * casillas idénticas no comunica nada.
 */
export default function SeasonStrip({ months, locale, labels }: Props) {
  const allYear = months.length === ALL_MONTHS.length;

  // `short` y no `narrow`: narrow da una sola letra y en español deja cuatro
  // meses llamados "M", "J", "J" y "A" sin forma de distinguirlos.
  const short = new Intl.DateTimeFormat(locale, { month: "short" });
  const long = new Intl.DateTimeFormat(locale, { month: "long" });
  const nameOf = (month: number, fmt: Intl.DateTimeFormat) =>
    fmt.format(new Date(2026, month - 1, 1));

  // El dato lo lleva esta frase, no la grilla: doce abreviaturas leídas en voz
  // alta no dicen nada. Por eso la grilla va `aria-hidden` y esto va visible.
  const summary = allYear
    ? labels.allYear
    : labels.availableIn.replace(
        "{months}",
        new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
          months.map((month) => nameOf(month, long)),
        ),
      );

  return (
    <section
      aria-label={labels.aria}
      className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-6 ambient-shadow md:p-7"
    >
      <h2 className="mb-4 flex items-center gap-2.5 font-body text-label-sm font-semibold uppercase tracking-wider text-primary">
        <CalendarDays className="h-4 w-4 text-wine-accent" aria-hidden="true" />
        {labels.title}
      </h2>

      {!allYear && (
        <ul aria-hidden="true" className="mb-4 grid grid-cols-6 gap-1.5 md:grid-cols-12">
          {ALL_MONTHS.map((month) => {
            const active = months.includes(month);
            return (
              <li
                key={month}
                title={nameOf(month, long)}
                className={`flex h-10 items-center justify-center rounded-md font-body text-label-sm uppercase transition-colors ${
                  active
                    ? "bg-wine-accent/12 font-bold text-wine-accent ring-1 ring-wine-accent/35"
                    : "bg-surface-container/60 font-light text-on-surface-variant/45"
                }`}
              >
                {nameOf(month, short)}
              </li>
            );
          })}
        </ul>
      )}

      <p
        className={
          allYear
            ? "font-body text-body-lg text-on-surface"
            : "font-body text-body-md text-on-surface-variant"
        }
      >
        {summary}
      </p>
    </section>
  );
}
