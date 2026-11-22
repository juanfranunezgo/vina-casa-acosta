"use client";

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, MessageCircle, Minus, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";
import { checkoutIniciarUrl } from "@/lib/checkout";
import { recargarEventoVendimia, useEventoVendimia } from "@/lib/eventoVendimia";
import {
  MAX_ASISTENTES,
  MAX_MASCOTAS,
  ajustarFichas,
  enlaceLegal,
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

// Se lee una vez: `NEXT_PUBLIC_*` se incrusta en build, igual que la CSP que lo autoriza.
const checkoutUrl = checkoutIniciarUrl(process.env.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL);

const inputClass =
  "w-full scroll-mt-44 bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors read-only:text-on-surface-variant aria-[invalid=true]:border-error";
const labelClass =
  "font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2";
const hintClass = "mt-2 font-body text-xs text-on-surface-variant/80";
const errorClass = "mt-2 font-body text-xs text-error";
const legendClass = "font-accent text-lg font-light italic text-wine-accent";

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
  ...input
}: CampoProps) {
  const id = idDeCampo(campo);
  const describe = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ");
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={labelClass}>
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

/**
 * Dv7 — La reserva. Con un evento publicado y el checkout configurado reemplaza a la consulta; sin
 * ellos (el estado de hoy) la consulta sigue tal cual. Si la persona ya empezó a escribir en la
 * consulta cuando llega el evento, no se la cambia bajo los dedos.
 */
export default function VendimiaReserva({
  consulta,
  foto,
}: {
  consulta: ReactNode;
  foto: ReactNode;
}) {
  const { evento } = useEventoVendimia();
  const [consultaEnUso, setConsultaEnUso] = useState(false);

  if (!evento || !checkoutUrl || consultaEnUso) {
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
  return <FormularioReserva evento={evento} urlCheckout={checkoutUrl} foto={foto} />;
}

type Aviso = "fecha" | "cupo" | "edad" | "revisar" | "total_cero" | "campos" | "muy_largo";

function FormularioReserva({
  evento,
  urlCheckout,
  foto,
}: {
  evento: EventoReserva;
  urlCheckout: string;
  foto: ReactNode;
}) {
  const t = useTranslations("activities.vendimia.reserva");
  const locale = useLocale();
  const grupoFechas = useId();
  const tituloDatos = useRef<HTMLHeadingElement>(null);
  const enviando = useRef(false);

  const [paso, setPaso] = useState<1 | 2>(1);
  const [fechaClave, setFechaClave] = useState("");
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
    setPaso(2);
    requestAnimationFrame(() => tituloDatos.current?.focus());
  };

  const cambiarFicha = (indice: number, cambios: Partial<Ficha>) => {
    const siguientes = fichas.map((f, i) => (i === indice ? { ...f, ...cambios } : f));
    setFichas(siguientes);
    // Sin restricciones escritas el permiso no queda dado para la próxima que se escriba.
    if (!hayRestriccion(siguientes)) setPermiso(false);
  };

  const enfocar = (campo: string) =>
    requestAnimationFrame(() => document.getElementById(idDeCampo(campo))?.focus());

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
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-surface ambient-shadow-lg ring-1 ring-outline-variant/40 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0 p-6 sm:p-8 md:p-12">
          <p className={legendClass}>{evento.nombre}</p>
          <h2 className="mt-1 font-display text-3xl text-primary">{t("titulo")}</h2>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">{evento.lugar}</p>

          <fieldset className="mt-8">
            <legend className={labelClass}>{t("eligeFecha")}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {evento.fechas.map((f) => {
                const abierta = f.disponible && elegible(f.clave);
                const { dia, inicio, termino } = formatoFecha(f, locale);
                return (
                  <label
                    key={f.clave}
                    className={`relative block rounded-lg border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${
                      !abierta
                        ? "cursor-not-allowed border-outline-variant/50 opacity-60"
                        : f.clave === fechaClave
                          ? "cursor-pointer border-primary bg-primary/5 ring-1 ring-primary"
                          : "cursor-pointer border-outline-variant hover:border-primary"
                    }`}
                  >
                    <input
                      type="radio"
                      name={grupoFechas}
                      value={f.clave}
                      checked={abierta && f.clave === fechaClave}
                      disabled={!abierta}
                      onChange={() => {
                        setFechaClave(f.clave);
                        setAviso(null);
                      }}
                      className="sr-only"
                    />
                    <span className="block font-display text-lg leading-snug text-primary first-letter:uppercase">
                      {dia}
                    </span>
                    <span className="mt-1 block font-body text-xs text-on-surface-variant tabular-nums">
                      {t("horario", { inicio, termino })}
                    </span>
                    <span className="mt-1 block font-body text-xs font-semibold text-on-surface-variant">
                      {abierta ? t("quedanCupos") : t("noDisponible")}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {hayFechas ? (
            <>
              <fieldset className="mt-8">
                <legend className={labelClass}>{t("cuantosVan")}</legend>
                <ul>
                  {evento.rangos.map((rango) => {
                    const cantidad = conteos[rango.nombre] ?? 0;
                    const precio = precioDeRango(evento, rango, fecha);
                    return (
                      <li
                        key={rango.nombre}
                        className="flex items-center justify-between gap-4 border-t border-outline-variant py-2"
                      >
                        <span className="min-w-0">
                          <span className="block font-body text-body-md text-on-surface">
                            {rango.nombre}
                          </span>
                          <span className="block font-body text-xs text-on-surface-variant tabular-nums">
                            {precio === 0 ? t("gratis") : dinero(precio)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => cambiarConteo(rango, -1)}
                            disabled={cantidad === 0}
                            aria-label={t("quitar", { rango: rango.nombre })}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span
                            aria-live="polite"
                            className="w-7 text-center font-body text-body-md tabular-nums"
                          >
                            {cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => cambiarConteo(rango, 1)}
                            disabled={personas >= MAX_ASISTENTES}
                            aria-label={t("agregar", { rango: rango.nombre })}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
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

              <div className="mt-6 border-t border-outline-variant pt-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-body text-body-md text-on-surface">{t("totalLabel")}</span>
                  <span className="font-display text-2xl text-primary tabular-nums">
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
                    fullWidth
                    className="sm:w-auto"
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
            </>
          ) : (
            <div className="mt-6 space-y-4">
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
        <div className="relative order-first min-h-[220px] lg:order-none lg:min-h-[300px]">
          {foto}
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
      className="rounded-2xl bg-surface p-6 ambient-shadow-lg ring-1 ring-outline-variant/40 sm:p-8 md:p-12"
    >
      <p className={legendClass}>{evento.nombre}</p>
      <h2
        ref={tituloDatos}
        tabIndex={-1}
        className="mt-1 scroll-mt-32 font-display text-3xl text-primary focus:outline-none"
      >
        {t("tituloDatos")}
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <fieldset>
            <legend className={legendClass}>{t("encargado")}</legend>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
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
            return (
              <fieldset key={`${ficha.rango}-${i}`} className="border-t border-outline-variant pt-6">
                <legend className="float-left mb-4 w-full font-display text-xl text-primary">
                  {t("asistente", { numero: i + 1 })}{" "}
                  <span className="font-body text-sm text-on-surface-variant">· {ficha.rango}</span>
                </legend>
                <div className="clear-both grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6">
                  <Campo
                    campo={`${ruta}.nombre`}
                    className="col-span-2 sm:col-span-1"
                    label={t("nombre")}
                    value={esHeredada ? encargado.nombre : ficha.nombre}
                    readOnly={esHeredada}
                    autoComplete="off"
                    hint={esHeredada ? t("heredado") : undefined}
                    error={textoError(`${ruta}.nombre`)}
                    onChange={(nombre) => {
                      cambiarFicha(i, { nombre });
                      limpiarError(`${ruta}.nombre`);
                    }}
                  />
                  <Campo
                    campo={`${ruta}.edad`}
                    label={t("edad")}
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
                  {evento.tallas.length > 0 && (
                    <div className="min-w-0 sm:order-last">
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
                  <Campo
                    campo={`${ruta}.telefono`}
                    className="col-span-2 sm:col-span-1"
                    label={`${t("celular")}${opcional}`}
                    value={esHeredada ? encargado.telefono : ficha.telefono}
                    readOnly={esHeredada}
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
                    value={esHeredada ? encargado.email : ficha.email}
                    readOnly={esHeredada}
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    error={textoError(`${ruta}.email`)}
                    onChange={(email) => {
                      cambiarFicha(i, { email });
                      limpiarError(`${ruta}.email`);
                    }}
                  />
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
              </fieldset>
            );
          })}

          <fieldset className="border-t border-outline-variant pt-6">
            <legend className="float-left mb-2 w-full font-display text-xl text-primary">
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

        <aside className="min-w-0 border-t border-outline-variant pt-6 lg:sticky lg:top-44 lg:self-start lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className={labelClass}>{t("tuReserva")}</p>
          {fecha && (
            <p className="font-display text-lg leading-snug text-primary first-letter:uppercase">
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
            <span className="font-display text-2xl text-primary tabular-nums">{dinero(total)}</span>
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
        </aside>
      </div>
    </form>
  );
}
