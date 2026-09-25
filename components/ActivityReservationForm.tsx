"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Send, MessageCircle, CalendarDays, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import { CONTACT_WHATSAPP_URL } from "@/lib/contact";
import { submitToNetlifyForms } from "@/lib/netlifyForms";
import PrivacyConsent from "@/components/PrivacyConsent";
import { PRIVACIDAD_VERSION, TERMINOS_VERSION } from "@/lib/legal";
import { primeraFechaReservable } from "@/lib/fechaReserva";
import type { BookingField } from "@/data/activities";

type Status = "idle" | "submitting" | "success" | "error";

type Props = {
  /** Nombre de la actividad, para el prefill del mensaje de WhatsApp. */
  activityName: string;
  /**
   * Piso de personas por reserva (`minPeople` en data/activities.ts). Ausente
   * cuando la actividad no declara mínimo —el hub de Vendimia— : el campo
   * arranca vacío y no se muestra la ayuda "desde N personas". Poner 1 para
   * rellenar el hueco afirmaría un mínimo que el cliente no dio.
   */
  minPeople?: number;
  /**
   * Días de anticipación con que se reserva (`minAdvanceDays` en
   * data/activities.ts). El calendario no deja elegir antes de hoy + N, y la
   * ayuda del campo lo dice. Ausente = desde hoy.
   */
  minAdvanceDays?: number;
  /**
   * Qué le está pidiendo el visitante a la viña. Cambia los textos y el campo
   * `tipo` del envío; los datos que se piden son casi los mismos, porque son los
   * que la viña necesita para responder cualquiera de los tres.
   *
   * - `reserva` — la actividad publica precio y fecha: se reserva.
   * - `cotizacion` — no publica precio y se arma a pedido (grupo privado).
   * - `temporada` — la actividad se repite cada temporada y sus fechas todavía
   *   no están confirmadas (el hub de Vendimia). Acá no se cotiza nada: el
   *   visitante deja sus datos para que le avisen cuándo es la próxima, y por
   *   eso el formulario esconde el campo de fecha — no hay día que elegir.
   */
  mode: "reserva" | "cotizacion" | "temporada";
  /**
   * Textos propios de la actividad que pisan a los genéricos del modo. El yoga
   * trae los del documento de la viña ("¿Listos para vivir Yoga entre
   * Viñas?", "Consultar disponibilidad"); el resto de las fichas no manda nada.
   */
  copy?: { title?: string; subtitle?: string; submit?: string; waIntro?: string };
  /** Campos que la actividad pide además de los de siempre. */
  extraFields?: readonly BookingField[];
  /**
   * Rótulo, ejemplo y ayuda del campo `eleccion`. Cambian con la actividad —en
   * el yoga es el sándwich—, así que llegan con ella y no desde este bundle.
   */
  choiceCopy?: { label: string; placeholder: string; hint: string };
};

const inputClass =
  "w-full bg-transparent border-0 border-b border-outline focus:border-primary focus:outline-none px-0 py-2 font-body text-body-md transition-colors";
const labelClass =
  "font-body text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2";
const hintClass = "mt-2 font-body text-xs text-on-surface-variant/80";

type DateFieldProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
  /** Ausente = desde hoy. */
  minAdvanceDays?: number;
  placeholder: string;
  openLabel: string;
};

/**
 * Un campo de fecha del formulario. Está aparte porque el yoga pide dos —la
 * preferida y una segunda posible— y cada uno necesita su propio `ref` para
 * abrir el calendario y para ponerle el mínimo.
 */
function DateField({
  id,
  label,
  hint,
  value,
  onChange,
  required,
  minAdvanceDays,
  placeholder,
  openLabel,
}: DateFieldProps) {
  const ref = useRef<HTMLInputElement>(null);

  // El mínimo de fecha se pone al montar: calcularlo en el render rompería la
  // hidratación (la página es estática y se genera en el build, así que un
  // `min` escrito en el HTML sería el del día del deploy). "Hoy" es el de Chile:
  // ver lib/fechaReserva.ts.
  useEffect(() => {
    const input = ref.current;
    if (input) input.min = primeraFechaReservable(minAdvanceDays ?? 0);
  }, [minAdvanceDays]);

  /** Abre el calendario nativo desde el ícono. */
  const openDatePicker = () => {
    const input = ref.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.focus();
  };

  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      {/* Sin fecha por defecto: se muestra un placeholder propio y un
          calendario clickeable para que se lea como campo editable. */}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          required={required}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-hint`}
          className={`${inputClass} tabular-nums pr-10 ${value ? "" : "text-transparent"} [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
        />
        {!value && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 font-body text-body-md tabular-nums text-on-surface-variant/60"
          >
            {placeholder}
          </span>
        )}
        <button
          type="button"
          onClick={openDatePicker}
          aria-label={openLabel}
          className="absolute right-0 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p id={`${id}-hint`} className={hintClass}>
        {hint}
      </p>
    </div>
  );
}

export default function ActivityReservationForm({
  activityName,
  minPeople,
  minAdvanceDays,
  mode,
  copy,
  extraFields = [],
  choiceCopy,
}: Props) {
  const t = useTranslations("activities.labels.form");
  const locale = useLocale();
  // Sufijo de las claves de copy: `title`, `titleQuote`, `titleSeason`. Una sola
  // tabla para los cinco textos que cambian, en vez de cinco ternarios que se
  // pueden desincronizar.
  const suffix = mode === "reserva" ? "" : mode === "cotizacion" ? "Quote" : "Season";
  const pideFecha = mode !== "temporada";
  const pideSegundaFecha = pideFecha && extraFields.includes("segundaFecha");
  // Sin rótulo no hay campo: un input de "elección" sin decir de qué sería
  // una pregunta vacía.
  const pideEleccion = extraFields.includes("eleccion") && choiceCopy !== undefined;
  const pideRestricciones = extraFields.includes("restricciones");
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState(minPeople === undefined ? "" : String(minPeople));
  const [date, setDate] = useState("");
  const [date2, setDate2] = useState("");
  const [choice, setChoice] = useState("");
  const [dietary, setDietary] = useState("");
  const [note, setNote] = useState("");
  const [botField, setBotField] = useState("");
  const [consent, setConsent] = useState(false);

  // Grupo por debajo del mínimo publicado. El campo dejó de corregir el número
  // hacia arriba a propósito: si lo sube solo, la persona nunca puede declarar
  // que son menos y la viña pierde justo la solicitud que quería recibir —la
  // que se resuelve sumándola a otro grupo.
  const peopleCount = Number.parseInt(people, 10);
  const belowMin =
    minPeople !== undefined &&
    Number.isFinite(peopleCount) &&
    peopleCount > 0 &&
    peopleCount < minPeople;

  /**
   * La solicitud va a Netlify Forms: queda en el panel del proyecto y dispara
   * la notificación por correo. Los campos tienen que estar declarados en
   * `public/__forms.html` o Netlify los descarta en silencio.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");

    try {
      await submitToNetlifyForms("reserva-actividad", {
        actividad: activityName,
        tipo: mode,
        nombre: name,
        email,
        telefono: phone,
        personas: people,
        fecha: date,
        // Los tres campos extra van siempre, vacíos en las actividades que no
        // los piden: así la declaración de `__forms.html` es una sola y el
        // panel de Netlify muestra las mismas columnas para todas.
        fecha2: date2,
        eleccion: choice,
        restricciones: dietary,
        nota: note,
        idioma: locale,
        // Qué ediciones se aceptaron, no sólo que se aceptaron: cuando salga
        // una v1.2, los consentimientos ya guardados siguen diciendo la verdad
        // sobre lo que esta persona leyó. Son dos campos porque los dos
        // documentos se versionan por separado.
        terminos: TERMINOS_VERSION,
        privacidad: PRIVACIDAD_VERSION,
        "bot-field": botField,
      });
      setStatus("success");
      window.setTimeout(() => {
        setName("");
        setEmail("");
        setPhone("");
        setPeople(minPeople === undefined ? "" : String(minPeople));
        setDate("");
        setDate2("");
        setChoice("");
        setDietary("");
        setNote("");
        setConsent(false);
        setStatus("idle");
      }, 5000);
    } catch {
      setStatus("error");
    }
  };

  // Con segunda fecha, la primera deja de ser "la" fecha: es la preferida.
  const dateLabel = pideSegundaFecha ? t("datePreferred") : t("date");

  const whatsappUrl = () => {
    const lines = [
      copy?.waIntro ?? t(`waIntro${suffix}`, { activity: activityName }),
      name && `${t("name")}: ${name}`,
      people && `${t("people")}: ${people}`,
      date && `${dateLabel}: ${date}`,
      date2 && `${t("secondDate")}: ${date2}`,
      choice && choiceCopy && `${choiceCopy.label}: ${choice}`,
      dietary && `${t("dietary")}: ${dietary}`,
      note && `${t("note")}: ${note}`,
    ].filter(Boolean);
    return `${CONTACT_WHATSAPP_URL}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-primary mb-2">
          {copy?.title ?? t(`title${suffix}`)}
        </h2>
        <p className="font-body text-body-md text-on-surface-variant">
          {copy?.subtitle ?? t(`subtitle${suffix}`)}
        </p>
      </div>

      {/* Honeypot: invisible para personas, tentador para bots. Si llega con
          algo, Netlify descarta el envío como spam. */}
      <p className="hidden" aria-hidden="true">
        <label>
          No llenar este campo
          <input
            tabIndex={-1}
            autoComplete="off"
            value={botField}
            onChange={(e) => setBotField(e.target.value)}
          />
        </label>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>{t("name")}</label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("email")}</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t("phone")}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="tour-people">
            {t("people")}
          </label>
          <input
            id="tour-people"
            required
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            onBlur={() =>
              setPeople((current) => {
                const parsed = Number.parseInt(current, 10);
                if (Number.isNaN(parsed)) return minPeople === undefined ? "" : String(minPeople);
                // Sólo se corrige lo imposible (cero, negativos). Un número por
                // debajo del mínimo se respeta: es una solicitud válida que se
                // coordina, y el aviso de abajo explica cómo.
                return String(Math.max(1, parsed));
              })
            }
            aria-describedby={
              [
                minPeople === undefined ? "" : "tour-people-hint",
                belowMin ? "tour-people-below" : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={`${inputClass} tabular-nums`}
          />
          {minPeople !== undefined && (
            <p id="tour-people-hint" className="mt-2 font-body text-xs text-on-surface-variant/80">
              {t("peopleHint", { min: minPeople })}
            </p>
          )}
        </div>
        {/* Ocupa la fila entera: son tres frases y en media columna quedan seis
            renglones. `aria-live` porque aparece sin que nadie navegue hasta
            él — el disparador es el número que se acaba de escribir. */}
        {minPeople !== undefined && belowMin && (
          <div className="sm:col-span-2">
            <p
              id="tour-people-below"
              aria-live="polite"
              className="flex items-start gap-3 rounded-md border-l-[3px] border-wine-accent bg-wine-accent/8 px-4 py-3 font-body text-xs leading-relaxed text-on-surface"
            >
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-wine-accent" aria-hidden="true" />
              <span>{t("peopleBelowMin", { min: minPeople })}</span>
            </p>
          </div>
        )}
        {/* En modo temporada no se pide fecha: las de la próxima jornada todavía
            no están confirmadas, así que un calendario obligatorio le haría
            elegir un día que no existe. Se desmonta en vez de ocultarse — un
            campo `required` con `display:none` bloquea el envío sin poder
            mostrar dónde está el error. */}
        {pideFecha && (
          <div className={pideSegundaFecha ? "" : "sm:col-span-2"}>
            {/* Con anticipación, la ayuda dice por qué los próximos días no se
                pueden elegir: un calendario que los bloquea sin explicar parece
                roto. */}
            <DateField
              id="tour-date"
              label={dateLabel}
              hint={
                minAdvanceDays
                  ? t("dateHintAdvance", { days: minAdvanceDays })
                  : t("dateHint")
              }
              value={date}
              onChange={setDate}
              required
              minAdvanceDays={minAdvanceDays}
              placeholder={t("datePlaceholder")}
              openLabel={t("dateOpen")}
            />
          </div>
        )}
        {pideSegundaFecha && (
          <DateField
            id="tour-date-2"
            label={t("secondDate")}
            hint={t("secondDateHint")}
            value={date2}
            onChange={setDate2}
            required={false}
            minAdvanceDays={minAdvanceDays}
            placeholder={t("datePlaceholder")}
            openLabel={t("dateOpen")}
          />
        )}
        {pideEleccion && (
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="tour-choice">
              {choiceCopy.label}
            </label>
            <input
              id="tour-choice"
              type="text"
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              placeholder={choiceCopy.placeholder}
              aria-describedby="tour-choice-hint"
              className={inputClass}
            />
            <p id="tour-choice-hint" className={hintClass}>
              {choiceCopy.hint}
            </p>
          </div>
        )}
        {pideRestricciones && (
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="tour-dietary">
              {t("dietary")}
            </label>
            <input
              id="tour-dietary"
              type="text"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder={t("dietaryPlaceholder")}
              className={inputClass}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelClass}>{t("note")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <PrivacyConsent
        id={`reserva-privacidad-${mode}`}
        checked={consent}
        onChange={setConsent}
      />

      {/* Una acción principal y una alternativa. Antes eran dos cajas del mismo
          peso —relleno oscuro y contorno, las dos en negrita y a lo ancho— y la
          de WhatsApp partía el texto en dos líneas dentro del marco en las
          tarjetas angostas. Ahora el envío es el `Button` del sitio y WhatsApp
          va como enlace subrayado (`link`), centrado bajo el botón en celular:
          no compite con el que manda la solicitud. No va en `ghost` porque su
          relleno lateral no deja caber "Consultar por WhatsApp" en una tarjeta
          de 320px (medido: 217px de contenido en 208 de caja), y `Button` no
          deja partir el texto. Por lo mismo va a 14px en celular: a 16px el
          enlace medía 225px y sobresalía del botón de arriba.

          `disabled` va explícito y no sólo `loading`: `Button` esparce `rest`
          después de calcular el suyo, así que el de acá es el que manda. */}
      <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-center sm:gap-7">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          className="sm:w-auto"
          loading={status === "submitting"}
          disabled={status === "submitting" || status === "success"}
          iconRight={
            status === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )
          }
        >
          {status === "idle" && (copy?.submit ?? t(`submitIdle${suffix}`))}
          {status === "submitting" && t("submitting")}
          {status === "success" && t("success")}
          {status === "error" && t("error")}
        </Button>

        <Button
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          variant="link"
          className="self-center text-[14px] sm:self-auto sm:text-body-md"
          iconLeft={<MessageCircle className="h-4 w-4" />}
        >
          {t(`whatsapp${suffix}`)}
        </Button>
      </div>

      <p aria-live="polite" className="font-body text-body-md">
        {status === "success" && <span className="text-primary">{t("successMessage")}</span>}
        {status === "error" && <span className="text-error">{t("errorMessage")}</span>}
      </p>
    </form>
  );
}
