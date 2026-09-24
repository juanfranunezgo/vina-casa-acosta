/**
 * El primer día que el formulario de reserva deja elegir (`min` del campo de
 * fecha), como "AAAA-MM-DD".
 *
 * "Hoy" es el día en Chile, no en UTC. El formulario usaba
 * `new Date().toISOString()`, y desde las 20:00 o 21:00 de Chile —según el
 * horario de verano— UTC ya está en el día siguiente: esa noche el calendario
 * no dejaba reservar para hoy. Los días se suman sobre una fecha UTC pura,
 * sin hora, para que el cambio de horario no corra el resultado.
 *
 * Es puro y no importa nada de React para que `node --test` lo pueda cargar.
 */
const ZONA_VINA = "America/Santiago";

export function primeraFechaReservable(diasDeAnticipacion = 0, ahora = new Date()): string {
  // en-CA formatea como AAAA-MM-DD.
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_VINA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  const [anio, mes, dia] = hoy.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + diasDeAnticipacion)).toISOString().slice(0, 10);
}
