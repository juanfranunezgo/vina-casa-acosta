"use client";

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, ChevronDown, MessageCircle, Minus, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";
import { PRIVACIDAD_VENDIMIA_PDF } from "@/lib/legal";
import {
  aperturaVendimia,
  elegirFechaVendimia,
  recargarEventoVendimia,
  urlCheckoutVendimia,
  useAperturaPendiente,
  useEventoVendimia,
  useFechaVendimia,
} from "@/lib/eventoVendimia";
import {
  MAX_ASISTENTES,
  MAX_MASCOTAS,
  ajustarFichas,
  enlaceLegal,
  formatoApertura,
  formatoFecha,
  formatoPrecio,
  hayRestriccion,
  indicePrimerAdulto,
  iniciarReserva,
  precioDeRango,
  totalAproximado,
  urlRespaldoWhatsApp,
  validarReserva,
  type CodigoError,
  type EventoReserva,
  type Ficha,
  type RangoEvento,
} from "@/lib/vendimiaReserva";

const inputClass =
  "h-12 w-full scroll-mt-28 rounded-lg border border-outline-variant bg-white px-3 font-body text-base text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 read-only:bg-neutro-claro read-only:text-on-surface-variant aria-[invalid=true]:border-error";
const labelClass = "mb-1.5 block font-body text-sm font-medium text-on-surface-variant";
const hintClass = "mt-1.5 font-body text-xs leading-relaxed text-on-surface-variant/90";
const errorClass = "mt-1.5 font-body text-xs font-medium text-error";
const legendClass = "font-body text-lg font-bold text-primary";
const tituloClass =
  "text-center font-body text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-primary md:text-[2.25rem]";

const idDeCampo = (campo: string) => `vr-${campo.replaceAll(".", "-")}`;

type CampoProps = {
  campo: string;
  label: string;
  value: string;
  onChange?: (valor: string) => void;
  error?: string;
  hint?: string;
  readOnly?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  labelOculto?: boolean;
};

function Campo({
  campo,
  label,
  value,
  onChange,
  error,
  hint,
  readOnly,
  className = "",
  labelOculto = false,
  ...input
}: CampoProps) {
  const id = idDeCampo(campo);
  const describe = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ");
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={labelOculto ? "sr-only" : labelClass}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe || undefined}
        className={inputClass}
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}

function Opcion({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-body text-body-md text-on-surface">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-primary"
      />
      {children}
    </label>
  );
}

/** En qué parte de la reserva va la persona. El pago ocurre en el checkout. */
function Pasos({ actual, etiquetas }: { actual: 1 | 2; etiquetas: string[] }) {
  return (
    <ol className="flex items-center justify-center gap-2">
      {etiquetas.map((etiqueta, i) => {
        const numero = i + 1;
        const hecho = numero < actual;
        const activo = numero === actual;
        return (
          <li
            key={etiqueta}
            aria-current={activo ? "step" : undefined}
            className="flex min-w-0 items-center gap-2"
          >
            {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-outline-variant sm:w-8" />}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-body text-sm font-bold tabular-nums ${
                activo || hecho
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {hecho ? <Check className="h-4 w-4" aria-hidden="true" /> : numero}
            </span>
            <span
              className={`font-body text-sm ${
                activo ? "font-semibold text-primary" : "text-on-surface-variant max-sm:sr-only"
              }`}
            >
              {etiqueta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Dv7 — La reserva. Con un evento publicado y el checkout configurado reemplaza a la consulta; sin
 * ellos (el estado de hoy) la consulta sigue tal cual. Si la persona ya empezó a escribir en la
 * consulta cuando llega el evento, no se la cambia bajo los dedos.
 */
export default function VendimiaReserva({ consulta }: { consulta: ReactNode }) {
  const { evento } = useEventoVendimia();
  const [consultaEnUso, setConsultaEnUso] = useState(false);

  if (!evento || !urlCheckoutVendimia || consultaEnUso) {
    return (
      <div
        onFocusCapture={() => {
          if (!evento) setConsultaEnUso(true);
        }}
      >
        {consulta}
      </div>
    );
  }
  return <FormularioReserva evento={evento} urlCheckout={urlCheckoutVendimia} />;
}

type Aviso = "fecha" | "cupo" | "edad" | "revisar" | "total_cero" | "campos" | "muy_largo";

function FormularioReserva({
  evento,
  urlCheckout,
}: {
  evento: EventoReserva;
  urlCheckout: string;
}) {
  const t = useTranslations("activities.vendimia.reserva");
  const locale = useLocale();
  const grupoFechas = useId();
  const tituloDatos = useRef<HTMLHeadingElement>(null);
  const enviando = useRef(false);

  const [paso, setPaso] = useState<1 | 2>(1);
  const pendiente = useAperturaPendiente(evento);
  const fechaClave = useFechaVendimia();
  const [fichaAbierta, setFichaAbierta] = useState(0);
  const [cerradas, setCerradas] = useState<string[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [encargado, setEncargado] = useState({ nombre: "", email: "", telefono: "", comuna: "" });
  const [yoVoy, setYoVoy] = useState(true);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [conMascotas, setConMascotas] = useState(false);
  const [mascotas, setMascotas] = useState("");
  const [permiso, setPermiso] = useState(false);
  const [errores, setErrores] = useState<Record<string, CodigoError>>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [estadoEnvio, setEstadoEnvio] = useState<"idle" | "enviando" | "respaldo">("idle");

  // Al volver con Atrás desde el checkout, el navegador puede restaurar la página tal cual.
  useEffect(() => {
    const alVolver = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      enviando.current = false;
      setEstadoEnvio("idle");
    };
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
  }, []);

  const elegible = (clave: string) => !cerradas.includes(clave);
  const fecha = evento.fechas.find(
    (f) => f.clave === fechaClave && f.disponible && elegible(f.clave),
  );
  const hayFechas = evento.fechas.some((f) => f.disponible && elegible(f.clave));
  // Si la fecha elegida se cerró, se vuelve a elegir: las fichas quedan guardadas.
  const pasoVisible = fecha ? paso : 1;

  const personas = evento.rangos.reduce((n, r) => n + (conteos[r.nombre] ?? 0), 0);
  const total = totalAproximado(evento, fecha, conteos);
  const soloGratis = fecha !== undefined && personas > 0 && total === 0;
  const puedeContinuar = fecha !== undefined && personas > 0 && !soloGratis;
  const conLanzamiento =
    fecha?.queda_lanzamiento === true &&
    evento.lanzamiento !== null &&
    evento.rangos.some((r) => r.lanzamiento);

  const dinero = (monto: number) => formatoPrecio(monto, evento.moneda, locale);
  const apertura =
    pendiente && aperturaVendimia !== null ? formatoApertura(aperturaVendimia, locale) : null;
  const heredada = yoVoy ? indicePrimerAdulto(evento, fichas) : -1;
  const hayAdulto = indicePrimerAdulto(evento, fichas) !== -1;
  const primeraConRestriccion = fichas.findIndex(
    (f) => f.conRestriccion && f.restriccion.trim() !== "",
  );

  const condiciones = evento.condiciones ? enlaceLegal(evento.condiciones.url) : null;
  const terminos = evento.terminos ? enlaceLegal(evento.terminos.url) : null;

  const limpiarError = (campo: string) =>
    setErrores((actuales) => {
      if (!(campo in actuales)) return actuales;
      const resto = { ...actuales };
      delete resto[campo];
      return resto;
    });

  const cambiarConteo = (rango: RangoEvento, delta: number) => {
    setAviso(null);
    setConteos((actuales) => ({
      ...actuales,
      [rango.nombre]: Math.max(0, (actuales[rango.nombre] ?? 0) + delta),
    }));
  };

  const continuar = () => {
    if (!puedeContinuar) return;
    const siguientes = ajustarFichas(evento, conteos, fichas);
    setFichas(siguientes);
    // Los índices de las fichas pudieron cambiar, y quitar una persona puede quitar la última
    // restricción: el permiso no queda dado para la próxima.
    setErrores({});
    if (!hayRestriccion(siguientes)) setPermiso(false);
    setAviso(null);
    setFichaAbierta(0);
    setPaso(2);
    requestAnimationFrame(() => tituloDatos.current?.focus());
  };

  const cambiarFicha = (indice: number, cambios: Partial<Ficha>) => {
    const siguientes = fichas.map((f, i) => (i === indice ? { ...f, ...cambios } : f));
    setFichas(siguientes);
    // Sin restricciones escritas el permiso no queda dado para la próxima que se escriba.
    if (!hayRestriccion(siguientes)) setPermiso(false);
  };

  const enfocar = (campo: string) => {
    const ficha = campo.match(/^asistentes\.(\d+)\./);
    if (ficha) setFichaAbierta(Number(ficha[1]));
    else if (campo === "permiso_restricciones") setFichaAbierta(primeraConRestriccion);
    requestAnimationFrame(() => document.getElementById(idDeCampo(campo))?.focus());
  };

  const revision = validarReserva(evento, {
    fecha: fechaClave,
    encargado,
    yoVoy,
    fichas,
    conMascotas,
    mascotas,
    permiso,
  });
  const fichaLista = (indice: number) =>
    revision.ok ||
    !Object.keys(revision.errores).some((campo) => campo.startsWith(`asistentes.${indice}.`));
  const pasosReserva = (
    <Pasos actual={pasoVisible} etiquetas={[t("pasoFecha"), t("pasoDatos"), t("pasoPago")]} />
  );

  const textoError = (campo: string, indice?: number): string | undefined => {
    const codigo = errores[campo];
    if (!codigo) return undefined;
    if (codigo === "edad_rango" && indice !== undefined) {
      const rango = evento.rangos.find((r) => r.nombre === fichas[indice]?.rango);
      if (rango) {
        return rango.edad_max === null
          ? t("errores.edadDesde", { min: rango.edad_min })
          : t("errores.edadEntre", { min: rango.edad_min, max: rango.edad_max });
      }
    }
    return t(`errores.${codigo}`, { max: MAX_MASCOTAS });
  };

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando.current) return;

    const validacion = validarReserva(evento, {
      fecha: fechaClave,
      encargado,
      yoVoy,
      fichas,
      conMascotas,
      mascotas,
      permiso,
    });
    if (!validacion.ok) {
      setErrores(validacion.errores);
      setAviso(
        validacion.errores.cuerpo
          ? "muy_largo"
          : validacion.errores.total
            ? "total_cero"
            : "campos",
      );
      const primero = Object.keys(validacion.errores)[0];
      if (primero) enfocar(primero);
      return;
    }

    enviando.current = true;
    setErrores({});
    setAviso(null);
    setEstadoEnvio("enviando");
    const resultado = await iniciarReserva(urlCheckout, validacion.cuerpo, {
      fetch: window.fetch.bind(window),
    });
    if (resultado.ok) {
      // Sigue en «enviando» hasta que el navegador cambie de página.
      window.location.assign(resultado.url);
      return;
    }

    enviando.current = false;
    if (resultado.tipo === "respaldo") {
      setEstadoEnvio("respaldo");
      return;
    }
    setEstadoEnvio("idle");
    if (resultado.tipo === "campo") {
      // Una ficha heredada no se edita: el dato se corrige en el encargado.
      const heredado = resultado.campo.match(/^asistentes\.(\d+)\.(nombre|email|telefono)$/);
      const campo =
        heredado && Number(heredado[1]) === heredada
          ? `encargado.${heredado[2]}`
          : resultado.campo;
      if (document.getElementById(idDeCampo(campo))) {
        setErrores({ [campo]: campo.endsWith(".talla") ? "talla" : "texto" });
        setAviso("campos");
        enfocar(campo);
      } else {
        setAviso("revisar");
      }
    } else if (resultado.tipo === "edad") {
      setAviso("edad");
      if (resultado.asistente !== null) {
        const campo = `asistentes.${resultado.asistente}.edad`;
        setErrores({ [campo]: "edad_tarifa" });
        enfocar(campo);
      }
    } else if (resultado.tipo === "fecha") {
      // El catálogo puede tardar minutos en mostrarla cerrada: aquí queda cerrada desde ya.
      setCerradas((actuales) => [...actuales, fechaClave]);
      setAviso("fecha");
    } else {
      setAviso(resultado.tipo);
    }
    void recargarEventoVendimia();
  }

  const respaldoHref = urlRespaldoWhatsApp(
    CONTACT_WHATSAPP_URL,
    (valores) => t("whatsapp", valores),
    { evento: evento.nombre, fecha: fecha ? formatoFecha(fecha, locale).dia : "", personas },
  );

  const avisoVisible = aviso && (
    <p
      role="alert"
      className="rounded-md border-l-[3px] border-wine-accent bg-wine-accent/8 px-4 py-3 font-body text-sm text-on-surface"
    >
      {t(`avisos.${aviso}`)}
    </p>
  );

  if (pasoVisible === 1) {
    return (
      <div className="rounded-2xl bg-surface p-5 sm:p-8 md:p-10">
        {pasosReserva}
        <h2 className={`mt-6 ${tituloClass}`}>{t("titulo")}</h2>
        <p className="mt-1.5 text-center font-body text-base text-on-surface-variant">
          {evento.lugar}
        </p>

        <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <fieldset>
            <legend className={`mb-3 ${legendClass}`}>{t("eligeFecha")}</legend>
            <div className="grid grid-cols-1 gap-3">
              {evento.fechas.map((f) => {
                const abierta = f.disponible && elegible(f.clave);
                const { dia, inicio, termino } = formatoFecha(f, locale);
                return (
                  <label
                    key={f.clave}
                    className={`relative block rounded-xl border-2 px-4 py-3.5 transition-colors focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2 ${
                      !abierta
                        ? "cursor-not-allowed border-transparent bg-neutro-claro text-on-surface-variant/70"
                        : f.clave === fechaClave
                          ? "cursor-pointer border-primary bg-primary text-on-primary"
                          : "cursor-pointer border-outline-variant text-primary hover:border-primary"
                    }`}
                  >
                    <input
                      type="radio"
                      name={grupoFechas}
                      value={f.clave}
                      checked={abierta && f.clave === fechaClave}
                      disabled={!abierta}
                      onChange={() => {
                        elegirFechaVendimia(f.clave);
                        setAviso(null);
                      }}
                      className="sr-only"
                    />
                    <span className="block font-body text-lg font-bold leading-snug first-letter:uppercase">
                      {dia}
                    </span>
                    <span className="mt-0.5 block font-body text-sm tabular-nums opacity-85">
                      {t("horario", { inicio, termino })}
                    </span>
                    <span className="mt-0.5 block font-body text-sm font-semibold opacity-85">
                      {abierta
                        ? t("quedanCupos")
                        : apertura
                          ? t("abreCorto", { dia: apertura.corta, hora: apertura.hora })
                          : t("noDisponible")}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {hayFechas ? (
            <div>
              <fieldset>
                <legend className={`mb-2 ${legendClass}`}>{t("cuantosVan")}</legend>
                <ul>
                  {evento.rangos.map((rango) => {
                    const cantidad = conteos[rango.nombre] ?? 0;
                    const precio = precioDeRango(evento, rango, fecha);
                    return (
                      <li
                        key={rango.nombre}
                        className="flex items-center justify-between gap-4 border-b border-outline-variant/60 py-1.5"
                      >
                        <span className="min-w-0">
                          <span className="block font-body text-base font-semibold text-on-surface">
                            {rango.nombre}
                          </span>
                          <span className="block font-body text-sm text-on-surface-variant tabular-nums">
                            {precio === 0 ? t("gratis") : dinero(precio)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => cambiarConteo(rango, -1)}
                            disabled={cantidad === 0}
                            aria-label={t("quitar", { rango: rango.nombre })}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/[0.07] text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:bg-neutro-claro disabled:text-on-surface-variant disabled:opacity-50"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span
                            aria-live="polite"
                            className="w-9 text-center font-body text-lg font-bold tabular-nums"
                          >
                            {cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => cambiarConteo(rango, 1)}
                            disabled={personas >= MAX_ASISTENTES}
                            aria-label={t("agregar", { rango: rango.nombre })}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/[0.07] text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:bg-neutro-claro disabled:text-on-surface-variant disabled:opacity-50"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {personas >= MAX_ASISTENTES && (
                  <p className={hintClass}>{t("maximo", { max: MAX_ASISTENTES })}</p>
                )}
                {conLanzamiento && evento.lanzamiento && (
                  <p className={hintClass}>
                    {t("lanzamiento", {
                      regalo:
                        evento.lanzamiento.regalo === "copa"
                          ? t("regaloCopa")
                          : evento.lanzamiento.regalo,
                    })}
                  </p>
                )}
              </fieldset>

              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-body text-body-md text-on-surface">{t("totalLabel")}</span>
                  <span className="font-body font-bold text-2xl text-primary tabular-nums">
                    {fecha && personas > 0 ? dinero(total) : "—"}
                  </span>
                </div>
                <p className={hintClass}>{t("totalNota")}</p>
                {soloGratis && <p className={errorClass}>{t("avisos.total_cero")}</p>}
                {avisoVisible && <div className="mt-4">{avisoVisible}</div>}
                <div className="mt-5">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={continuar}
                    disabled={!puedeContinuar}
                    iconRight={<ArrowRight className="h-4 w-4" />}
                  >
                    {t("continuar")}
                  </Button>
                  {!puedeContinuar && !soloGratis && (
                    <p className={hintClass}>{fecha ? t("faltanPersonas") : t("faltaFecha")}</p>
                  )}
                </div>
              </div>
            </div>
          ) : apertura ? (
            <div role="status" className="space-y-2">
              <p className="font-body text-lg font-bold leading-snug text-primary">
                {t("abreAviso", { dia: apertura.larga, hora: apertura.hora })}
              </p>
              <p className="font-body text-body-md text-on-surface-variant">{t("abreDetalle")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* «Elige otra» no tiene sentido cuando ya no queda ninguna. */}
              {aviso !== "fecha" && avisoVisible}
              <p role="status" className="font-body text-body-md text-on-surface-variant">
                {t("sinFechas")}
              </p>
              <Button
                href={`${CONTACT_WHATSAPP_URL}?text=${encodeURIComponent(
                  t("whatsappSinFecha", { evento: evento.nombre }),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                multiline
                iconLeft={<MessageCircle className="h-4 w-4" />}
              >
                {t("pedirWhatsapp")}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      method="post"
      noValidate
      data-reserva-datos
      onSubmit={enviar}
      className="rounded-2xl bg-surface p-5 sm:p-8 md:p-10"
    >
      {pasosReserva}
      <h2
        ref={tituloDatos}
        tabIndex={-1}
        className={`mt-6 scroll-mt-32 focus:outline-none ${tituloClass}`}
      >
        {t("tituloDatos")}
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <fieldset className="pb-4">
            <legend className={legendClass}>{t("encargado")}</legend>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo
                campo="encargado.nombre"
                label={t("nombre")}
                value={encargado.nombre}
                autoComplete="name"
                error={textoError("encargado.nombre")}
                onChange={(nombre) => {
                  setEncargado((e) => ({ ...e, nombre }));
                  limpiarError("encargado.nombre");
                }}
              />
              <Campo
                campo="encargado.telefono"
                label={t("celular")}
                value={encargado.telefono}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("celularEjemplo")}
                error={textoError("encargado.telefono")}
                onChange={(telefono) => {
                  setEncargado((e) => ({ ...e, telefono }));
                  limpiarError("encargado.telefono");
                }}
              />
              <Campo
                campo="encargado.email"
                label={t("correo")}
                value={encargado.email}
                type="email"
                inputMode="email"
                autoComplete="email"
                hint={t("correoEntrada")}
                error={textoError("encargado.email")}
                onChange={(email) => {
                  setEncargado((e) => ({ ...e, email }));
                  limpiarError("encargado.email");
                }}
              />
              <Campo
                campo="encargado.comuna"
                label={t("comuna")}
                value={encargado.comuna}
                autoComplete="address-level2"
                error={textoError("encargado.comuna")}
                onChange={(comuna) => {
                  setEncargado((e) => ({ ...e, comuna }));
                  limpiarError("encargado.comuna");
                }}
              />
            </div>
            {hayAdulto && (
              <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-3 font-body text-body-md text-on-surface">
                <input
                  type="checkbox"
                  checked={yoVoy}
                  onChange={(e) => setYoVoy(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {t("yoVoy")}
              </label>
            )}
          </fieldset>

          {fichas.map((ficha, i) => {
            const ruta = `asistentes.${i}`;
            const esHeredada = i === heredada;
            const rango = evento.rangos.find((r) => r.nombre === ficha.rango);
            // La regla del checkout mira la edad escrita; sin ella, la del rango.
            const edadEscrita = ficha.edad.trim();
            const edadVista = /^\d{1,3}$/.test(edadEscrita)
              ? Number(edadEscrita)
              : (rango?.edad_min ?? 0);
            const opcional = edadVista >= 18 ? "" : ` ${t("opcional")}`;
            const abierta = i === fichaAbierta;
            const lista = fichaLista(i);
            const nombreVisible = (esHeredada ? encargado.nombre : ficha.nombre).trim();
            return (
              <fieldset
                key={`${ficha.rango}-${i}`}
                className="overflow-hidden rounded-xl border border-outline-variant/80"
              >
                <legend className="sr-only">
                  {t("asistente", { numero: i + 1 })}, {ficha.rango}
                </legend>
                <button
                  type="button"
                  aria-expanded={abierta}
                  aria-controls={`vr-ficha-${i}`}
                  onClick={() => setFichaAbierta(abierta ? -1 : i)}
                  className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutro-claro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-body text-base font-bold text-primary">
                      {nombreVisible || t("asistente", { numero: i + 1 })}
                    </span>
                    <span className="block font-body text-sm text-on-surface-variant">
                      {ficha.rango}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 font-body text-xs font-semibold ${
                        lista ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {lista && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {lista ? t("fichaLista") : t("fichaPendiente")}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-on-surface-variant transition-transform motion-reduce:transition-none ${
                        abierta ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
                <div id={`vr-ficha-${i}`} hidden={!abierta} className="border-t border-outline-variant/60 p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                  {esHeredada ? (
                    <p className="col-span-2 font-body text-sm text-on-surface-variant">
                      {t("heredado")}
                    </p>
                  ) : (
                    <Campo
                      campo={`${ruta}.nombre`}
                      className="col-span-2 sm:col-span-1"
                      label={t("nombre")}
                      value={ficha.nombre}
                      autoComplete="off"
                      error={textoError(`${ruta}.nombre`)}
                      onChange={(nombre) => {
                        cambiarFicha(i, { nombre });
                        limpiarError(`${ruta}.nombre`);
                      }}
                    />
                  )}
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <p className={labelClass}>{t("edad")}</p>
                    <div role="radiogroup" aria-label={t("edad")} className="flex flex-wrap gap-x-5">
                      <Opcion
                        name={`${ruta}-edad-modo`}
                        checked={!ficha.edadPorRango}
                        onChange={() => cambiarFicha(i, { edadPorRango: false })}
                      >
                        {t("edadAnios")}
                      </Opcion>
                      {rango && (
                        <Opcion
                          name={`${ruta}-edad-modo`}
                          checked={ficha.edadPorRango}
                          onChange={() => {
                            cambiarFicha(i, { edadPorRango: true, edad: "" });
                            limpiarError(`${ruta}.edad`);
                          }}
                        >
                          {rango.edad_max === null
                            ? t("rangoDesde", { min: rango.edad_min })
                            : t("rangoEntre", { min: rango.edad_min, max: rango.edad_max })}
                        </Opcion>
                      )}
                    </div>
                    {ficha.edadPorRango ? (
                      <>
                        <p className={hintClass}>{t("edadAyuda")}</p>
                        {textoError(`${ruta}.edad`, i) && (
                          <p className={errorClass}>{textoError(`${ruta}.edad`, i)}</p>
                        )}
                      </>
                    ) : (
                      <Campo
                        campo={`${ruta}.edad`}
                        label={t("edadAnios")}
                        labelOculto
                        value={ficha.edad}
                        inputMode="numeric"
                        autoComplete="off"
                        hint={t("edadAyuda")}
                        error={textoError(`${ruta}.edad`, i)}
                        onChange={(edad) => {
                          cambiarFicha(i, { edad });
                          limpiarError(`${ruta}.edad`);
                        }}
                      />
                    )}
                  </div>
                  {evento.tallas.length > 0 && (
                    <div className="col-span-2 min-w-0 sm:col-span-1 sm:order-last">
                      <label htmlFor={idDeCampo(`${ruta}.talla`)} className={labelClass}>
                        {t("talla")}
                      </label>
                      <select
                        id={idDeCampo(`${ruta}.talla`)}
                        value={ficha.talla}
                        aria-invalid={errores[`${ruta}.talla`] ? true : undefined}
                        aria-describedby={`${idDeCampo(`${ruta}.talla`)}-hint`}
                        onChange={(e) => {
                          cambiarFicha(i, { talla: e.target.value });
                          limpiarError(`${ruta}.talla`);
                        }}
                        className={inputClass}
                      >
                        <option value="">{t("sinTalla")}</option>
                        {evento.tallas.map((talla) => (
                          <option key={talla} value={talla}>
                            {talla}
                          </option>
                        ))}
                      </select>
                      <p id={`${idDeCampo(`${ruta}.talla`)}-hint`} className={hintClass}>
                        {t("tallaAyuda")}
                      </p>
                      {textoError(`${ruta}.talla`) && (
                        <p className={errorClass}>{textoError(`${ruta}.talla`)}</p>
                      )}
                    </div>
                  )}
                  {!esHeredada && (
                    <>
                      <Campo
                        campo={`${ruta}.telefono`}
                        className="col-span-2 sm:col-span-1"
                        label={`${t("celular")}${opcional}`}
                        value={ficha.telefono}
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        error={textoError(`${ruta}.telefono`)}
                        onChange={(telefono) => {
                          cambiarFicha(i, { telefono });
                          limpiarError(`${ruta}.telefono`);
                        }}
                      />
                      <Campo
                        campo={`${ruta}.email`}
                        className="col-span-2 sm:col-span-1"
                        label={`${t("correo")}${opcional}`}
                        value={ficha.email}
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        error={textoError(`${ruta}.email`)}
                        onChange={(email) => {
                          cambiarFicha(i, { email });
                          limpiarError(`${ruta}.email`);
                        }}
                      />
                    </>
                  )}
                  <div className="col-span-2 min-w-0 sm:order-last">
                    <p className={labelClass}>{t("restriccion")}</p>
                    <div className="flex gap-6">
                      <Opcion
                        name={`${ruta}-restriccion`}
                        checked={!ficha.conRestriccion}
                        onChange={() => {
                          cambiarFicha(i, { conRestriccion: false, restriccion: "" });
                          limpiarError(`${ruta}.restriccion`);
                          limpiarError("permiso_restricciones");
                        }}
                      >
                        {t("no")}
                      </Opcion>
                      <Opcion
                        name={`${ruta}-restriccion`}
                        checked={ficha.conRestriccion}
                        onChange={() => cambiarFicha(i, { conRestriccion: true })}
                      >
                        {t("si")}
                      </Opcion>
                    </div>
                    {ficha.conRestriccion && (
                      <div className="mt-3">
                        <Campo
                          campo={`${ruta}.restriccion`}
                          label={t("queEvitar")}
                          value={ficha.restriccion}
                          autoComplete="off"
                          error={textoError(`${ruta}.restriccion`)}
                          onChange={(restriccion) => {
                            cambiarFicha(i, { restriccion });
                            limpiarError(`${ruta}.restriccion`);
                          }}
                        />
                      </div>
                    )}
                    {i === primeraConRestriccion && (
                      <div className="mt-4">
                        <label className="flex cursor-pointer items-start gap-3 font-body text-sm text-on-surface">
                          <input
                            id={idDeCampo("permiso_restricciones")}
                            type="checkbox"
                            checked={permiso}
                            aria-invalid={errores.permiso_restricciones ? true : undefined}
                            onChange={(e) => {
                              setPermiso(e.target.checked);
                              limpiarError("permiso_restricciones");
                            }}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                          />
                          {t("permiso")}
                        </label>
                        {textoError("permiso_restricciones") && (
                          <p className={errorClass}>{textoError("permiso_restricciones")}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {i < fichas.length - 1 && (
                  <div className="mt-5">
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      className="sm:w-auto"
                      onClick={() => enfocar(`asistentes.${i + 1}.nombre`)}
                    >
                      {t("siguientePersona")}
                    </Button>
                  </div>
                )}
                </div>
              </fieldset>
            );
          })}

          <fieldset className="rounded-xl border border-outline-variant/80 p-4">
            <legend className="float-left mb-1 w-full font-body text-base font-bold text-primary">
              {t("mascotas")}
            </legend>
            <div className="clear-both flex gap-6">
              <Opcion
                name="vr-mascotas"
                checked={!conMascotas}
                onChange={() => {
                  setConMascotas(false);
                  setMascotas("");
                  limpiarError("perros");
                }}
              >
                {t("no")}
              </Opcion>
              <Opcion name="vr-mascotas" checked={conMascotas} onChange={() => setConMascotas(true)}>
                {t("si")}
              </Opcion>
            </div>
            {conMascotas && (
              <div className="mt-3 max-w-40">
                <Campo
                  campo="perros"
                  label={t("cuantasMascotas")}
                  value={mascotas}
                  inputMode="numeric"
                  autoComplete="off"
                  error={textoError("perros")}
                  onChange={(valor) => {
                    setMascotas(valor);
                    limpiarError("perros");
                  }}
                />
              </div>
            )}
          </fieldset>
        </div>

        <aside className="min-w-0 border-t border-outline-variant pt-6 lg:sticky lg:top-28 lg:self-start lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className={labelClass}>{t("tuReserva")}</p>
          {fecha && (
            <p className="font-body font-bold text-lg leading-snug text-primary first-letter:uppercase">
              {formatoFecha(fecha, locale).dia}
            </p>
          )}
          {fecha && (
            <p className="mt-1 font-body text-xs text-on-surface-variant tabular-nums">
              {t("horario", {
                inicio: formatoFecha(fecha, locale).inicio,
                termino: formatoFecha(fecha, locale).termino,
              })}
            </p>
          )}
          <ul className="mt-4 space-y-1">
            {evento.rangos
              .filter((r) => (conteos[r.nombre] ?? 0) > 0)
              .map((r) => (
                <li
                  key={r.nombre}
                  className="flex justify-between gap-3 font-body text-sm text-on-surface tabular-nums"
                >
                  <span>{r.nombre}</span>
                  <span>× {conteos[r.nombre]}</span>
                </li>
              ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAviso(null);
              setPaso(1);
            }}
            className="mt-2 font-body text-sm text-primary underline underline-offset-4"
          >
            {t("cambiar")}
          </button>

          <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-outline-variant pt-4">
            <span className="font-body text-body-md text-on-surface">{t("totalLabel")}</span>
            <span className="font-body font-bold text-2xl text-primary tabular-nums">{dinero(total)}</span>
          </div>
          <p className={hintClass}>{t("totalNota")}</p>

          {avisoVisible && <div className="mt-4">{avisoVisible}</div>}

          {estadoEnvio === "respaldo" && (
            <div className="mt-4 space-y-3">
              <p role="alert" className="font-body text-sm text-on-surface">
                {t("avisos.respaldo")}
              </p>
              <Button
                href={respaldoHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                fullWidth
                multiline
                iconLeft={<MessageCircle className="h-4 w-4" />}
              >
                {t("pedirWhatsapp")}
              </Button>
            </div>
          )}

          <div className="mt-4">
            <Button
              type="submit"
              variant={estadoEnvio === "respaldo" ? "outline" : "primary"}
              fullWidth
              multiline
              loading={estadoEnvio === "enviando"}
              disabled={estadoEnvio === "enviando"}
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {estadoEnvio === "enviando"
                ? t("enviando")
                : estadoEnvio === "respaldo"
                  ? t("reintentar")
                  : t("irAPagar")}
            </Button>
          </div>

          {(condiciones || terminos) && (
            <p className={hintClass}>
              {t("legalIntro")}{" "}
              {condiciones && evento.condiciones && (
                <a
                  href={condiciones}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {t("condiciones", { version: evento.condiciones.version })}
                </a>
              )}
              {condiciones && terminos && " · "}
              {terminos && evento.terminos && (
                <a
                  href={terminos}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {t("terminos", { version: evento.terminos.version })}
                </a>
              )}
            </p>
          )}
          <p className={hintClass}>
            {t("privacidadIntro")}{" "}
            <a
              href={PRIVACIDAD_VENDIMIA_PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {t("privacidadEnlace")}
            </a>
          </p>
        </aside>
      </div>
    </form>
  );
}
