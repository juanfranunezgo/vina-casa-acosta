/**
 * La reserva de la Vendimia contra Afeleia: leer el evento del catálogo, calcular el total
 * orientativo, validar, armar el cuerpo y clasificar la respuesta de `POST /iniciar`. Puro: sin
 * React ni `window`, y por eso se prueba con `node --test`.
 *
 * **Las reglas de validación son copia de `apps/checkout/src/lib/reservation-input.ts` de Afeleia.**
 * No es por gusto: el checkout revisa la forma antes de identificar la tienda, así que esos errores
 * salen sin CORS y un `fetch` no los puede leer. Lo que aquí se deje pasar y allá se rechace termina
 * en el respaldo por WhatsApp sin que la persona sepa qué campo corregir.
 *
 * **Datos de salud:** una restricción alimentaria existe solo en el estado del formulario y en el
 * cuerpo del `POST`. Nada de este archivo la registra, la guarda ni la pone en una URL.
 */

import { STORAGE_PUBLIC_PREFIX } from "@/lib/afeleia/contract";
import { checkoutIniciarUrl, mismoOrigen, postIniciar } from "@/lib/checkout";

export const MAX_ASISTENTES = 20;
export const MAX_MASCOTAS = 10;
/** El checkout no lee cuerpos de más de 16 KB. */
export const MAX_CUERPO_BYTES = 16 * 1024;

const EDAD_ADULTA = 18;
/** Cuántas personas menores de edad puede traer cada adulto (pedido de la viña, 2026-11). */
export const MENORES_POR_ADULTO = 2;
const EDAD_MAXIMA = 120;

// Copias exactas del checkout. El carácter de control incluye los invisibles que entran al pegar
// desde Word o WhatsApp (bidi, ancho cero, BOM), salvo los unidores de los emoji de familia.
const CONTROL_RE = /(?![‌‍])[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const SURROGATE_SUELTO_RE = /\p{Cs}/u;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_ENCARGADO_RE = /^[^@\s",;<>()]+@[^@\s",;<>()]+\.[^@\s",;<>()]+$/;
const TELEFONO_RE = /^\+?[0-9 ]{8,20}$/;
const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const CLAVE_FECHA_RE = /^[a-z0-9-]{1,60}$/;

/** Dominios de la viña donde pueden vivir las condiciones y los términos. */
const HOSTS_LEGALES: ReadonlySet<string> = new Set([
  "vinacasaacosta.cl",
  "www.vinacasaacosta.cl",
  "casaacosta.cl",
  "www.casaacosta.cl",
]);

const LOCALE_INTL: Record<string, string> = { es: "es-CL", en: "en-US", pt: "pt-BR" };
const ZONA_CHILE = "America/Santiago";

/** Con zona explícita: una hora sin zona se leería distinto según el navegador. */
const APERTURA_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
/** El aviso sigue un rato tras la hora anunciada: abrir en el panel y la caché toman unos minutos. */
const GRACIA_APERTURA_MS = 60 * 60 * 1000;

export type RangoEvento = {
  nombre: string;
  edad_min: number;
  edad_max: number | null;
  precio: number;
  lanzamiento: boolean;
};

export type FechaEvento = {
  clave: string;
  inicio: string;
  termino: string;
  disponible: boolean;
  queda_lanzamiento: boolean;
};

export type DocumentoEvento = { url: string; version: string };

export type EventoReserva = {
  slug: string;
  nombre: string;
  lugar: string;
  moneda: string;
  tallas: string[];
  condiciones: DocumentoEvento | null;
  terminos: DocumentoEvento | null;
  rangos: RangoEvento[];
  lanzamiento: { precio: number; regalo: string } | null;
  fechas: FechaEvento[];
};

/**
 * La URL del checkout para reservar, o `null` con la venta cerrada.
 *
 * **Apagada por defecto, a propósito.** Que exista el evento en Afeleia y que el
 * sitio tenga checkout (lo usa la tienda de vinos) no significa que la venta esté
 * abierta. Se abre solo con `NEXT_PUBLIC_VENDIMIA_RESERVAS=abierta` en Netlify y un
 * deploy nuevo: cualquier otro valor, o ninguno, deja la consulta de temporada.
 */
export function checkoutDeReservas(
  interruptor: string | undefined,
  url: string | undefined,
): string | null {
  return interruptor === "abierta" ? checkoutIniciarUrl(url) : null;
}

/** La hora anunciada de apertura en milisegundos, o `null` si falta o no trae zona. */
export function leerApertura(valor: string | undefined): number | null {
  const limpio = valor?.trim();
  if (!limpio || !APERTURA_RE.test(limpio)) return null;
  const ms = Date.parse(limpio);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Si corresponde mostrar «abre tal día». Es solo un aviso: lo que permite reservar es la venta
 * abierta en el panel, que Afeleia vuelve a comprobar. Apenas una fecha abre, el aviso se va.
 */
export function aperturaPendiente(
  evento: Pick<EventoReserva, "fechas">,
  apertura: number | null,
  ahora: number,
): boolean {
  if (apertura === null || ahora >= apertura + GRACIA_APERTURA_MS) return false;
  return !evento.fechas.some((f) => f.disponible);
}

/** Pasada la hora anunciada, quien espera con la página abierta vuelve a pedir el catálogo. */
export function debeRevisarApertura(
  evento: Pick<EventoReserva, "fechas">,
  apertura: number | null,
  ahora: number,
): boolean {
  return apertura !== null && ahora >= apertura && aperturaPendiente(evento, apertura, ahora);
}

/** Qué dice el popup: anuncia la apertura, invita a reservar, o no aparece sin nada que ofrecer. */
export function estadoPopupVendimia(
  evento: Pick<EventoReserva, "fechas">,
  pendiente: boolean,
): "abre" | "abierta" | null {
  if (evento.fechas.some((f) => f.disponible)) return "abierta";
  return pendiente ? "abre" : null;
}

/** La apertura en hora de Chile: «lun 23» y «lunes 23 de noviembre», con su hora. */
export function formatoApertura(
  apertura: number,
  locale: string,
): { corta: string; larga: string; hora: string } {
  const intl = LOCALE_INTL[locale] ?? locale;
  const fecha = new Date(apertura);
  const corta = new Intl.DateTimeFormat(intl, {
    timeZone: ZONA_CHILE,
    weekday: "short",
    day: "numeric",
  }).format(fecha);
  const larga = new Intl.DateTimeFormat(intl, {
    timeZone: ZONA_CHILE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fecha);
  const hora = new Intl.DateTimeFormat(intl, {
    timeZone: ZONA_CHILE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(fecha);
  return { corta: corta.replace(/[,.]/g, ""), larga: larga.replace(",", ""), hora };
}

// --- Lectura del catálogo -----------------------------------------------------

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

function esMonto(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isSafeInteger(valor) && valor >= 0;
}

function esEdad(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= EDAD_MAXIMA;
}

function leerRango(valor: unknown): RangoEvento | null {
  if (!esObjeto(valor)) return null;
  const { nombre, edad_min, edad_max, precio, lanzamiento } = valor;
  if (!esTexto(nombre) || !esEdad(edad_min) || !esMonto(precio)) return null;
  if (typeof lanzamiento !== "boolean") return null;
  if (edad_max !== null && (!esEdad(edad_max) || edad_max < edad_min)) return null;
  return { nombre, edad_min, edad_max, precio, lanzamiento };
}

function leerFecha(valor: unknown): FechaEvento | null {
  if (!esObjeto(valor)) return null;
  const { clave, inicio, termino, disponible, queda_lanzamiento } = valor;
  if (typeof clave !== "string" || !CLAVE_FECHA_RE.test(clave)) return null;
  if (typeof inicio !== "string" || Number.isNaN(Date.parse(inicio))) return null;
  if (typeof termino !== "string" || Number.isNaN(Date.parse(termino))) return null;
  if (typeof disponible !== "boolean" || typeof queda_lanzamiento !== "boolean") return null;
  return { clave, inicio, termino, disponible, queda_lanzamiento };
}

function leerDocumento(valor: unknown): DocumentoEvento | null {
  if (!esObjeto(valor) || !esTexto(valor.url) || !esTexto(valor.version)) return null;
  return { url: valor.url, version: valor.version };
}

/** Todo o nada, como el catálogo: un evento con una pieza rota no se puede vender a medias. */
function leerEvento(valor: unknown): EventoReserva | null {
  if (!esObjeto(valor)) return null;
  const { slug, nombre, lugar, moneda, tallas, rangos, fechas, lanzamiento } = valor;
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) return null;
  if (!esTexto(nombre) || !esTexto(lugar)) return null;
  if (typeof moneda !== "string" || !/^[A-Z]{3}$/.test(moneda)) return null;
  if (!Array.isArray(tallas) || !tallas.every(esTexto)) return null;
  if (!Array.isArray(rangos) || rangos.length === 0) return null;
  if (!Array.isArray(fechas) || fechas.length === 0) return null;

  const rangosLeidos = rangos.map(leerRango);
  const fechasLeidas = fechas.map(leerFecha);
  if (rangosLeidos.some((r) => r === null) || fechasLeidas.some((f) => f === null)) return null;
  const rangosOk = rangosLeidos as RangoEvento[];
  // Cada ficha se identifica por el nombre de su rango.
  if (new Set(rangosOk.map((r) => r.nombre)).size !== rangosOk.length) return null;

  let promo: EventoReserva["lanzamiento"] = null;
  if (lanzamiento !== null) {
    if (!esObjeto(lanzamiento) || !esMonto(lanzamiento.precio) || !esTexto(lanzamiento.regalo)) {
      return null;
    }
    promo = { precio: lanzamiento.precio, regalo: lanzamiento.regalo };
  }

  return {
    slug,
    nombre,
    lugar,
    moneda,
    tallas: tallas as string[],
    condiciones: leerDocumento(valor.condiciones),
    terminos: leerDocumento(valor.terminos),
    rangos: rangosOk,
    lanzamiento: promo,
    fechas: fechasLeidas as FechaEvento[],
  };
}

/**
 * El evento de la vendimia del catálogo, o `null`. Sin la clave `eventos` (el estado de hoy) o con
 * un evento roto, la página sigue con su información y la consulta. Con más de una vendimia
 * publicada, manda la más próxima.
 */
export function leerEventoVendimia(catalogo: unknown): EventoReserva | null {
  if (!esObjeto(catalogo) || !Array.isArray(catalogo.eventos)) return null;
  const vendimias = catalogo.eventos
    .filter(
      (e) => esObjeto(e) && typeof e.slug === "string" && /^vendimia(-|$)/.test(e.slug),
    )
    .map(leerEvento)
    .filter((e): e is EventoReserva => e !== null);
  const primeraFecha = (e: EventoReserva) => Math.min(...e.fechas.map((f) => Date.parse(f.inicio)));
  return vendimias.sort((a, b) => primeraFecha(a) - primeraFecha(b))[0] ?? null;
}

/**
 * El enlace de condiciones o términos, solo si apunta a la viña o al Storage de Afeleia. El host se
 * compara ya parseado: `https://www.casaacosta.cl@otro.com/x` es una URL válida que va a `otro.com`.
 */
export function enlaceLegal(
  valor: string,
  apiUrl: string | undefined = process.env.NEXT_PUBLIC_AFELEIA_API_URL,
): string | null {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (HOSTS_LEGALES.has(url.hostname)) return url.href;
  if (!apiUrl) return null;
  try {
    const api = new URL(apiUrl);
    return url.origin === api.origin && url.pathname.startsWith(STORAGE_PUBLIC_PREFIX)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

// --- Precios y fechas en pantalla ---------------------------------------------

export function precioDeRango(
  evento: EventoReserva,
  rango: RangoEvento,
  fecha: FechaEvento | undefined,
): number {
  if (rango.lanzamiento && fecha?.queda_lanzamiento && evento.lanzamiento) {
    return evento.lanzamiento.precio;
  }
  return rango.precio;
}

/** Orientativo: la web no sabe cuántos cupos de lanzamiento quedan. El que vale lo calcula Afeleia. */
export function totalAproximado(
  evento: EventoReserva,
  fecha: FechaEvento | undefined,
  conteos: Readonly<Record<string, number>>,
): number {
  return evento.rangos.reduce(
    (total, rango) => total + precioDeRango(evento, rango, fecha) * (conteos[rango.nombre] ?? 0),
    0,
  );
}

export function formatoPrecio(monto: number, moneda: string, locale: string): string {
  return new Intl.NumberFormat(LOCALE_INTL[locale] ?? locale, {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto);
}

/** Día y horario en hora de Chile, con la zona de ese día (el cambio de hora cae entre las fechas). */
export function formatoFecha(
  fecha: Pick<FechaEvento, "inicio" | "termino">,
  locale: string,
): { dia: string; inicio: string; termino: string } {
  const intl = LOCALE_INTL[locale] ?? locale;
  const dia = new Intl.DateTimeFormat(intl, {
    timeZone: ZONA_CHILE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hora = new Intl.DateTimeFormat(intl, {
    timeZone: ZONA_CHILE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return {
    dia: dia.format(new Date(fecha.inicio)),
    inicio: hora.format(new Date(fecha.inicio)),
    termino: hora.format(new Date(fecha.termino)),
  };
}

/** Las piezas de una fecha para dibujarla en la entrada: «sábado», «3», «abril». */
export function partesFecha(
  fecha: Pick<FechaEvento, "inicio">,
  locale: string,
): { semana: string; dia: string; mes: string } {
  const partes = new Intl.DateTimeFormat(LOCALE_INTL[locale] ?? locale, {
    timeZone: ZONA_CHILE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date(fecha.inicio));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "";
  return { semana: parte("weekday"), dia: parte("day"), mes: parte("month") };
}

/**
 * El precio de entrada que se anuncia: el menor de un adulto entre las fechas
 * abiertas, con el de lanzamiento si le toca. `null` si no hay fecha abierta o
 * ningún rango de adulto con precio. Antes de la apertura, `conCerradas` lo
 * anuncia igual.
 */
export function precioAdultoDesde(
  evento: EventoReserva,
  conCerradas = false,
): { precio: number; lanzamiento: boolean } | null {
  const abiertas = conCerradas ? evento.fechas : evento.fechas.filter((f) => f.disponible);
  const adultos = evento.rangos.filter((r) => r.edad_min >= EDAD_ADULTA && r.precio > 0);
  let mejor: { precio: number; lanzamiento: boolean } | null = null;
  for (const fecha of abiertas) {
    for (const rango of adultos) {
      const precio = precioDeRango(evento, rango, fecha);
      if (precio > 0 && (mejor === null || precio < mejor.precio)) {
        mejor = { precio, lanzamiento: precio !== rango.precio };
      }
    }
  }
  return mejor;
}

/** El horario, si todas las fechas comparten el mismo en hora de Chile. */
export function horarioComun(
  evento: Pick<EventoReserva, "fechas">,
  locale: string,
): { inicio: string; termino: string } | null {
  const horarios = evento.fechas.map((f) => formatoFecha(f, locale));
  const [primero] = horarios;
  if (!primero) return null;
  const iguales = horarios.every(
    (h) => h.inicio === primero.inicio && h.termino === primero.termino,
  );
  return iguales ? { inicio: primero.inicio, termino: primero.termino } : null;
}

/** Las fechas del evento en una línea, con el año al final: «3 de abril y 17 de abril de 2027». */
export function formatoFechasEvento(evento: Pick<EventoReserva, "fechas">, locale: string): string {
  const intl = LOCALE_INTL[locale] ?? locale;
  const orden = [...evento.fechas].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const corta = new Intl.DateTimeFormat(intl, {
    timeZone: ZONA_CHILE,
    day: "numeric",
    month: "long",
  });
  const conAnio = new Intl.DateTimeFormat(intl, {
    timeZone: ZONA_CHILE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const partes = orden.map((f, i) =>
    (i === orden.length - 1 ? conAnio : corta).format(new Date(f.inicio)),
  );
  return new Intl.ListFormat(intl, { style: "long", type: "conjunction" }).format(partes);
}

// --- Fichas --------------------------------------------------------------------

export type Ficha = {
  rango: string;
  nombre: string;
  edad: string;
  /** Prefirió no decir su edad: viaja la mínima de su rango. */
  edadPorRango: boolean;
  email: string;
  telefono: string;
  talla: string;
  conRestriccion: boolean;
  restriccion: string;
};

export function fichaVacia(rango: string): Ficha {
  return {
    rango,
    nombre: "",
    edad: "",
    edadPorRango: false,
    email: "",
    telefono: "",
    talla: "",
    conRestriccion: false,
    restriccion: "",
  };
}

/** La edad más alta que ofrece la lista de un rango abierto, como «18 o más». */
const EDAD_TOPE_LISTA = 99;

/** Las edades que se pueden elegir en la ficha de un rango. */
export function edadesDeRango(rango: Pick<RangoEvento, "edad_min" | "edad_max">): number[] {
  const tope = Math.min(rango.edad_max ?? EDAD_TOPE_LISTA, EDAD_TOPE_LISTA);
  return Array.from({ length: Math.max(tope - rango.edad_min + 1, 0) }, (_, i) => rango.edad_min + i);
}

/**
 * Una ficha por persona, en el orden de los rangos, conservando lo ya escrito. La de un adulto
 * parte en «Prefiero no decirlo»: su tarifa no depende de la edad exacta y así nadie tiene que
 * recorrer una lista de ochenta números. En un menor la lista es corta y se elige.
 */
export function ajustarFichas(
  evento: EventoReserva,
  conteos: Readonly<Record<string, number>>,
  previas: readonly Ficha[],
): Ficha[] {
  return evento.rangos.flatMap((rango) => {
    const cantidad = conteos[rango.nombre] ?? 0;
    const delRango = previas.filter((f) => f.rango === rango.nombre).slice(0, cantidad);
    const faltan = Array.from({ length: cantidad - delRango.length }, () => ({
      ...fichaVacia(rango.nombre),
      edadPorRango: rango.edad_min >= EDAD_ADULTA,
    }));
    return [...delRango, ...faltan];
  });
}

/** La ficha que «Yo también voy» llena con los datos del encargado, o -1 si no hay de adulto. */
export function indicePrimerAdulto(evento: EventoReserva, fichas: readonly Ficha[]): number {
  return fichas.findIndex((ficha) => {
    const rango = evento.rangos.find((r) => r.nombre === ficha.rango);
    return rango !== undefined && rango.edad_min >= EDAD_ADULTA;
  });
}

export type Acompanantes = {
  adultos: number;
  menores: number;
  /** Cuántos menores puede haber con los adultos que van. */
  maximo: number;
  /** Las edades de los rangos de menores, para explicar la regla. `null` si no hay. */
  edades: { desde: number; hasta: number } | null;
  problema: "sin_adulto" | "exceso" | null;
};

const esAdulto = (rango: Pick<RangoEvento, "edad_min">) => rango.edad_min >= EDAD_ADULTA;

/**
 * Que no reserve un grupo de puros menores: tiene que ir al menos un adulto, y cada adulto puede
 * traer hasta `MENORES_POR_ADULTO` menores, de cualquier edad. Afeleia no lo revisa: lo hace la web.
 */
export function revisarAcompanantes(
  evento: Pick<EventoReserva, "rangos">,
  conteos: Readonly<Record<string, number>>,
): Acompanantes {
  let adultos = 0;
  let menores = 0;
  for (const rango of evento.rangos) {
    const cantidad = conteos[rango.nombre] ?? 0;
    if (esAdulto(rango)) adultos += cantidad;
    else menores += cantidad;
  }
  const deMenores = evento.rangos.filter((r) => !esAdulto(r));
  const edades =
    deMenores.length > 0
      ? {
          desde: Math.min(...deMenores.map((r) => r.edad_min)),
          hasta: Math.min(Math.max(...deMenores.map((r) => r.edad_max ?? EDAD_ADULTA - 1)), EDAD_ADULTA - 1),
        }
      : null;
  const maximo = adultos * MENORES_POR_ADULTO;
  const problema = menores > 0 && adultos === 0 ? "sin_adulto" : menores > maximo ? "exceso" : null;
  return { adultos, menores, maximo, edades, problema };
}

/** Si se puede sumar una persona más a este rango sin romper la regla de los adultos. */
export function puedeSumar(
  evento: Pick<EventoReserva, "rangos">,
  conteos: Readonly<Record<string, number>>,
  rango: RangoEvento,
): boolean {
  if (esAdulto(rango)) return true;
  const { menores, maximo } = revisarAcompanantes(evento, conteos);
  return menores < maximo;
}

export function hayRestriccion(fichas: readonly Ficha[]): boolean {
  return fichas.some((f) => f.conRestriccion && f.restriccion.trim() !== "");
}

// --- Validación y armado --------------------------------------------------------

export type DatosReserva = {
  fecha: string;
  encargado: { nombre: string; email: string; telefono: string; comuna: string };
  yoVoy: boolean;
  fichas: Ficha[];
  conMascotas: boolean;
  mascotas: string;
  permiso: boolean;
};

export type CodigoError =
  | "requerido"
  | "nombre"
  | "email"
  | "telefono"
  | "texto"
  | "edad"
  | "edad_rango"
  | "edad_tarifa"
  | "talla"
  | "mascotas"
  | "permiso"
  | "fecha"
  | "personas"
  | "acompanantes"
  | "total_cero"
  | "muy_largo";

export type AsistenteCuerpo = {
  nombre: string;
  edad: number;
  email?: string;
  telefono?: string;
  talla?: string;
  restriccion?: string;
};

export type CuerpoReserva = {
  reserva: {
    evento: string;
    fecha: string;
    encargado: { nombre: string; email: string; telefono: string; comuna?: string };
    asistentes: AsistenteCuerpo[];
    perros: number;
    permiso_restricciones?: true;
  };
};

export type ResultadoValidacion =
  | { ok: true; cuerpo: CuerpoReserva }
  | { ok: false; errores: Record<string, CodigoError> };

/** Los largos cuentan puntos de código, como `char_length` en la base: un emoji es uno. */
const largo = (texto: string) => [...texto].length;
const textoSano = (texto: string) => !CONTROL_RE.test(texto) && !SURROGATE_SUELTO_RE.test(texto);

/** Guiones, puntos y paréntesis son la forma común de escribir un celular: pasan a espacios. */
export function normalizarTelefono(valor: string): string {
  return valor.replace(/[\s\-().]+/g, " ").trim();
}

function errorNombre(valor: string): CodigoError | null {
  if (valor === "") return "requerido";
  return textoSano(valor) && largo(valor) >= 2 && largo(valor) <= 120 ? null : "nombre";
}

function errorEmail(valor: string, regla: RegExp): CodigoError | null {
  if (valor === "") return "requerido";
  return textoSano(valor) && largo(valor) <= 254 && regla.test(valor) ? null : "email";
}

function errorTelefono(valor: string): CodigoError | null {
  if (valor === "") return "requerido";
  // Ocho espacios cumplen la expresión del checkout, pero no son un celular.
  const cifras = valor.replace(/\D/g, "").length;
  return TELEFONO_RE.test(valor) && cifras >= 8 ? null : "telefono";
}

function leerEdad(valor: string): number | null {
  const limpio = valor.trim();
  if (!/^\d{1,3}$/.test(limpio)) return null;
  const edad = Number(limpio);
  return edad <= EDAD_MAXIMA ? edad : null;
}

/**
 * La edad que viaja. El checkout exige un número y con él busca la tarifa: quien prefiere no decirla
 * manda la mínima de su rango, que cae en la misma tarifa.
 */
function edadDeFicha(ficha: Ficha, rango: RangoEvento | undefined): number | null {
  return ficha.edadPorRango && rango ? rango.edad_min : leerEdad(ficha.edad);
}

function errorEdad(
  ficha: Ficha,
  rango: RangoEvento | undefined,
  edad: number | null,
): CodigoError | null {
  if (ficha.edadPorRango && rango) return null;
  if (ficha.edad.trim() === "") return "requerido";
  if (edad === null) return "edad";
  if (!rango || edad < rango.edad_min || edad > (rango.edad_max ?? EDAD_MAXIMA)) {
    return "edad_rango";
  }
  return null;
}

/** Valida igual que el checkout y arma el cuerpo. Las claves de `errores` son las rutas de la API. */
export function validarReserva(evento: EventoReserva, datos: DatosReserva): ResultadoValidacion {
  const errores: Record<string, CodigoError> = {};
  const marcar = (campo: string, error: CodigoError | null) => {
    if (error) errores[campo] = error;
  };

  const fecha = evento.fechas.find((f) => f.clave === datos.fecha && f.disponible);
  if (!fecha) errores.fecha = "fecha";

  const nombre = datos.encargado.nombre.trim();
  const email = datos.encargado.email.trim();
  const telefono = normalizarTelefono(datos.encargado.telefono);
  const comuna = datos.encargado.comuna.trim();
  marcar("encargado.nombre", errorNombre(nombre));
  // En el orden de la pantalla: el foco va al primer error.
  marcar("encargado.telefono", errorTelefono(telefono));
  marcar("encargado.email", errorEmail(email, EMAIL_ENCARGADO_RE));
  if (comuna !== "" && (!textoSano(comuna) || largo(comuna) > 120)) {
    errores["encargado.comuna"] = "texto";
  }

  if (datos.fichas.length < 1 || datos.fichas.length > MAX_ASISTENTES) {
    errores.personas = "personas";
  }

  const heredada = datos.yoVoy ? indicePrimerAdulto(evento, datos.fichas) : -1;
  const asistentes: AsistenteCuerpo[] = [];
  const conteos: Record<string, number> = {};

  datos.fichas.forEach((ficha, i) => {
    const ruta = `asistentes.${i}`;
    const rango = evento.rangos.find((r) => r.nombre === ficha.rango);
    conteos[ficha.rango] = (conteos[ficha.rango] ?? 0) + 1;
    const esHeredada = i === heredada;

    const nombreFicha = esHeredada ? nombre : ficha.nombre.trim();
    const emailFicha = esHeredada ? email : ficha.email.trim();
    const telefonoFicha = esHeredada ? telefono : normalizarTelefono(ficha.telefono);

    // Lo heredado ya se marcó en el encargado, cuya regla es igual o más estricta.
    if (!esHeredada) marcar(`${ruta}.nombre`, errorNombre(nombreFicha));

    const edad = edadDeFicha(ficha, rango);
    marcar(`${ruta}.edad`, errorEdad(ficha, rango, edad));

    // Sin edad válida, lo que dice si el contacto es obligatorio es el rango de la ficha.
    const adulto = (edad ?? rango?.edad_min ?? 0) >= EDAD_ADULTA;
    if (!esHeredada && (adulto || telefonoFicha !== "")) {
      marcar(`${ruta}.telefono`, errorTelefono(telefonoFicha));
    }
    if (!esHeredada && (adulto || emailFicha !== "")) {
      marcar(`${ruta}.email`, errorEmail(emailFicha, EMAIL_RE));
    }

    if (ficha.talla !== "" && !evento.tallas.includes(ficha.talla)) {
      errores[`${ruta}.talla`] = "talla";
    }

    const restriccion = ficha.conRestriccion ? ficha.restriccion.trim() : "";
    if (ficha.conRestriccion) {
      if (restriccion === "") errores[`${ruta}.restriccion`] = "requerido";
      else if (!textoSano(restriccion) || largo(restriccion) > 200) {
        errores[`${ruta}.restriccion`] = "texto";
      }
    }

    asistentes.push({
      nombre: nombreFicha,
      edad: edad ?? 0,
      ...(emailFicha !== "" ? { email: emailFicha } : {}),
      ...(telefonoFicha !== "" ? { telefono: telefonoFicha } : {}),
      ...(ficha.talla !== "" ? { talla: ficha.talla } : {}),
      ...(restriccion !== "" ? { restriccion } : {}),
    });
  });

  const conRestricciones = asistentes.some((a) => a.restriccion !== undefined);
  if (conRestricciones && !datos.permiso) errores.permiso_restricciones = "permiso";

  let perros = 0;
  if (datos.conMascotas) {
    const limpio = datos.mascotas.trim();
    const cantidad = /^\d{1,2}$/.test(limpio) ? Number(limpio) : 0;
    if (limpio === "") errores.perros = "requerido";
    else if (cantidad < 1 || cantidad > MAX_MASCOTAS) errores.perros = "mascotas";
    else perros = cantidad;
  }

  if (revisarAcompanantes(evento, conteos).problema !== null) {
    errores.acompanantes = "acompanantes";
  }

  // Un total 0 no se puede cobrar: el checkout responde `total_cero`.
  if (fecha && datos.fichas.length > 0 && totalAproximado(evento, fecha, conteos) === 0) {
    errores.total = "total_cero";
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  const cuerpo: CuerpoReserva = {
    reserva: {
      evento: evento.slug,
      fecha: datos.fecha,
      encargado: { nombre, email, telefono, ...(comuna !== "" ? { comuna } : {}) },
      asistentes,
      perros,
      ...(conRestricciones ? { permiso_restricciones: true as const } : {}),
    },
  };

  if (new TextEncoder().encode(JSON.stringify(cuerpo)).length > MAX_CUERPO_BYTES) {
    return { ok: false, errores: { cuerpo: "muy_largo" } };
  }
  return { ok: true, cuerpo };
}

// --- Envío ----------------------------------------------------------------------

export type ResultadoReserva =
  | { ok: true; url: string }
  | { ok: false; tipo: "campo"; campo: string }
  | { ok: false; tipo: "edad"; asistente: number | null }
  | { ok: false; tipo: "fecha" | "cupo" | "total_cero" | "revisar" | "respaldo" };

async function leerError(res: Response): Promise<{ error?: unknown; detalle: Record<string, unknown> }> {
  try {
    const cuerpo: unknown = await res.json();
    if (!esObjeto(cuerpo)) return { detalle: {} };
    return { error: cuerpo.error, detalle: esObjeto(cuerpo.detalle) ? cuerpo.detalle : {} };
  } catch {
    return { detalle: {} };
  }
}

/**
 * `POST /iniciar` con la reserva. 200 con `url` del mismo origen ⇒ a esa URL. 400 y 409 ⇒ algo que la
 * persona puede corregir. Todo lo demás (429, 5xx, timeout, red, CORS) ⇒ respaldo por WhatsApp.
 * Nunca reintenta solo: un reintento podría abrir dos reservas.
 */
export async function iniciarReserva(
  url: string,
  cuerpo: CuerpoReserva,
  deps: { fetch: typeof fetch; timeoutMs?: number },
): Promise<ResultadoReserva> {
  try {
    const res = await postIniciar(url, cuerpo, deps);
    if (res.ok) {
      const datos: unknown = await res.json();
      const destino = esObjeto(datos) ? datos.url : undefined;
      if (typeof destino === "string" && mismoOrigen(destino, url)) {
        return { ok: true, url: destino };
      }
      return { ok: false, tipo: "respaldo" };
    }
    if (res.status !== 400 && res.status !== 409) return { ok: false, tipo: "respaldo" };

    const { error, detalle } = await leerError(res);
    if (res.status === 409) {
      if (error === "fecha_no_disponible") return { ok: false, tipo: "fecha" };
      if (error === "sin_cupo") return { ok: false, tipo: "cupo" };
      if (error === "edad_sin_tarifa") {
        const { asistente } = detalle;
        return {
          ok: false,
          tipo: "edad",
          asistente: typeof asistente === "number" && Number.isInteger(asistente) ? asistente : null,
        };
      }
      return { ok: false, tipo: "revisar" };
    }
    if (error === "reserva_invalida") {
      if (detalle.motivo === "total_cero") return { ok: false, tipo: "total_cero" };
      if (typeof detalle.campo === "string") {
        return { ok: false, tipo: "campo", campo: detalle.campo };
      }
    }
    return { ok: false, tipo: "revisar" };
  } catch {
    return { ok: false, tipo: "respaldo" };
  }
}

/** El respaldo nombra solo evento, fecha y personas: el tipo no deja pasarle nada más. */
export function urlRespaldoWhatsApp(
  base: string,
  plantilla: (valores: { evento: string; fecha: string; personas: number }) => string,
  valores: { evento: string; fecha: string; personas: number },
): string {
  const { evento, fecha, personas } = valores;
  return `${base}?text=${encodeURIComponent(plantilla({ evento, fecha, personas }))}`;
}
