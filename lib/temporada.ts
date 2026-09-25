const LOCALE_INTL: Record<string, string> = { es: "es-CL", en: "en-US", pt: "pt-BR" };

/**
 * Los meses en que se hace una actividad, enumerados en el idioma de la página
 * ("septiembre, octubre y noviembre"). `undefined` cuando son los doce: "todo
 * el año" no distingue una actividad de otra y la ficha no lo dice.
 *
 * Los nombres los da Intl y la enumeración Intl.ListFormat, que sabe dónde va
 * la "y", la "and" con coma de serie o la "e": escribirlos a mano eran 36
 * strings más por mantener. El año de referencia es fijo y el día es 15 para
 * que ningún huso horario corra el mes.
 */
export function mesesDeTemporada(months: number[], locale: string): string | undefined {
  if (months.length >= 12) return undefined;
  const intl = LOCALE_INTL[locale] ?? locale;
  const mes = new Intl.DateTimeFormat(intl, { month: "long", timeZone: "UTC" });
  const nombres = [...months]
    .sort((a, b) => a - b)
    .map((m) => mes.format(new Date(Date.UTC(2026, m - 1, 15))));
  return new Intl.ListFormat(intl, { style: "long", type: "conjunction" }).format(nombres);
}
