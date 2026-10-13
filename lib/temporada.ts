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

/**
 * El año de la próxima temporada de una actividad: el de este año mientras la
 * temporada no haya terminado, y el siguiente desde el mes después.
 *
 * Es para decir "Vendimia 2027" sin escribir el año: un año puesto a mano en
 * un título queda viejo el día después de la última jornada, y nadie lo ve
 * hasta que alguien busca la del año siguiente y encuentra la anterior.
 *
 * El mes se mira en hora de Chile, que es donde ocurre. Supone una temporada
 * que cabe en un año calendario (la vendimia: abril y mayo); una que cruce el
 * año nuevo necesitaría otra regla.
 */
export function anioDeTemporada(months: number[], hoy: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "numeric",
  }).formatToParts(hoy);
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return parte("month") <= Math.max(...months) ? parte("year") : parte("year") + 1;
}
